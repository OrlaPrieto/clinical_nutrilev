import io
import json
import traceback
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
from flask import Blueprint, request, send_file, jsonify
from docx import Document
from config import GEMINI_API_KEY, INTERNAL_API_KEY

from services.extraction_service import detect_format, extract_menu_data
from services.ai_service import generate_full_menu_docx, get_base_menu_text
from services.document_service import (
    find_image_slots_equivalencias,
    insert_image_in_cell_equivalencias,
    find_image_slots_semanal,
    find_image_slots_menu123,
    insert_image_in_cell,
    replace_shopping_tables
)
import requests
# import pypdf (Moved inside route to avoid import-time crashes)

menu_bp = Blueprint('menu_routes', __name__)

@menu_bp.before_request
def check_internal_key():
    if request.method == 'OPTIONS':
        return
    key = request.headers.get('x-internal-key')
    if INTERNAL_API_KEY and key != INTERNAL_API_KEY:
        return jsonify({"error": "Unauthorized inter-service request"}), 401

@menu_bp.route('/generate-ai-menu', methods=['POST', 'OPTIONS'])
def generate_ai_menu():
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        from services.ai_service import generate_full_menu_docx, get_base_menu_text
        
        patient_context = json.loads(request.form.get('patient_context', '{}'))
        calories = int(request.form.get('calories', 2000))
        extra_notes = request.form.get('extra_notes', '')
        
        # Obtenemos el texto base para referencia estructural
        base_text = get_base_menu_text()

        docx_bytes = generate_full_menu_docx(
            historial_paciente=patient_context,
            calorias_objetivo=calories,
            notas_personalizadas=extra_notes,
            menu_base_texto=base_text,
            gemini_key=GEMINI_API_KEY
        )

        return send_file(
            io.BytesIO(docx_bytes),
            as_attachment=True,
            download_name=f"Menu_Nutrilev_{datetime.now().strftime('%Y%m%d')}.docx",
            mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )

    except Exception as e:
        print(f"ERROR [generate-ai-menu]: {str(e)}")
        traceback.print_exc()
        return jsonify({
            "error": "Error al generar el menú clínico",
            "details": str(e)
        }), 500

@menu_bp.route('/process-menu', methods=['POST', 'OPTIONS'])
def process_menu():
    if request.method == 'OPTIONS':
        return '', 200
    if 'file' not in request.files:
        return jsonify({"error": "No file received"}), 400

    file = request.files['file']
    gemini_key = GEMINI_API_KEY # Strictly from environment

    try:
        doc = Document(io.BytesIO(file.read()))
        fmt = detect_format(doc)
        print(f"[Format Detected] {fmt}")

        # 1. IMAGES (Disabled in v2.0 for stability)
        print("[v2.7] Image generation skipped (Disabled in favor of Clinical Menu accuracy)")

        # 2. SHOPPING LIST (Disabled in v2.0 for stability)
        print("[v2.7] Shopping list skipped (Disabled in favor of Clinical Menu accuracy)")

        # 3. SAVE AND RETURN
        out = io.BytesIO()
        doc.save(out)
        out.seek(0)

        return send_file(
            out,
            as_attachment=True,
            download_name=f"processed_{file.filename}",
            mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )

    except Exception as e:
        print(f"Error processing menu: {e}")
        return jsonify({"error": str(e)}), 500

@menu_bp.route('/shopping-list', methods=['POST', 'OPTIONS'])
def get_shopping_list():
    if request.method == 'OPTIONS':
        return '', 200
    
    data = request.json
    menu_url = data.get('menu_url')
    gemini_key = GEMINI_API_KEY # Strictly from environment

    try:
        # 1. Download the file
        response = requests.get(menu_url)
        response.raise_for_status()
        file_bytes = response.content
        
        # 2. Identify and extract
        # Simple detection by extension or magic bytes
        content_type = response.headers.get('Content-Type', '')
        
        menu_data = {"menus": {}, "todos_ingredientes": []}
        
        if 'officedocument.wordprocessingml.document' in content_type or menu_url.endswith('.docx'):
            doc = Document(io.BytesIO(file_bytes))
            menu_data = extract_menu_data(doc)
        elif 'pdf' in content_type or menu_url.endswith('.pdf'):
            print("[ShoppingList] Processing PDF...")
            try:
                from pypdf import PdfReader
            except ImportError:
                print("[ShoppingList] ERROR: pypdf not found in environment!")
                return jsonify({"error": "PDF support is not installed (pypdf missing)"}), 500
                
            reader = PdfReader(io.BytesIO(file_bytes))
            full_text = ""
            for page in reader.pages:
                text = page.extract_text() or ""
                full_text += text + "\n"
            
            if not full_text.strip():
                print("[ShoppingList] WARNING: No text extracted from PDF")
                
            menu_data["todos_ingredientes"] = [full_text]
        else:
            print(f"[ShoppingList] Unsupported format: {content_type}")
            return jsonify({"error": "Unsupported file format. Please use .docx or .pdf"}), 400

        # 3. Generate JSON
        from services.ai_service import generate_shopping_list_json
        shopping_json = generate_shopping_list_json(menu_data, gemini_key)
        
        if isinstance(shopping_json, list) and len(shopping_json) > 0 and "ERROR" in shopping_json[0].get("category", ""):
            return jsonify(shopping_json), 500
            
        return jsonify(shopping_json)

    except Exception as e:
        print(f"Error generating shopping list: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

