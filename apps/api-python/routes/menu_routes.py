import io
import traceback
from flask import Blueprint, request, send_file, jsonify
from docx import Document
from config import GEMINI_API_KEY

from services.extraction_service import detect_format, extract_menu_data
from services.ai_service import generate_image_gemini, generate_shopping_list
from services.document_service import (
    find_image_slots_equivalencias,
    insert_image_in_cell_equivalencias,
    find_image_slots_semanal,
    find_image_slots_menu123,
    insert_image_in_cell,
    replace_shopping_tables
)
import requests
from pypdf import PdfReader

menu_bp = Blueprint('menu_routes', __name__)

@menu_bp.route('/process-menu', methods=['POST', 'OPTIONS'])
def process_menu():
    if request.method == 'OPTIONS':
        return '', 200
    if 'file' not in request.files:
        return jsonify({"error": "No file received"}), 400

    file = request.files['file']
    gemini_key = request.form.get('api_key') or GEMINI_API_KEY

    if not gemini_key:
        return jsonify({"error": "Gemini API key is missing"}), 400

    try:
        doc = Document(io.BytesIO(file.read()))
        fmt = detect_format(doc)
        print(f"[Format Detected] {fmt}")

        # 1. IMAGES
        try:
            if fmt == "equivalencias":
                slots = find_image_slots_equivalencias(doc)
                empty = [(ti, name, sec) for ti, name, has, sec in slots if not has]
                print(f"[Images] {len(slots)} slots, {len(empty)} without image")
                for ti, meal_name, sec in empty:
                    print(f"  [{sec}] Generating: {meal_name}")
                    img_bytes = generate_image_gemini(meal_name, gemini_key)
                    if img_bytes:
                        insert_image_in_cell_equivalencias(doc, ti, img_bytes)
                        print(f"  ✓ {meal_name}")
                    else:
                        print(f"  ✗ {meal_name} — no image generated")
            else:
                if fmt == "semanal":
                    slots = find_image_slots_semanal(doc)
                else:
                    slots = find_image_slots_menu123(doc)
                
                empty = [(ti, ri, ci, name, sec) for ti, ri, ci, name, has, sec in slots if not has]
                print(f"[Images] {len(slots)} slots, {len(empty)} without image")
                for ti, ri, ci, meal_name, sec in empty:
                    print(f"  [{sec}] Generating: {meal_name}")
                    img_bytes = generate_image_gemini(meal_name, gemini_key)
                    if img_bytes:
                        insert_image_in_cell(doc, ti, ri, ci, img_bytes, fmt)
                        print(f"  ✓ {meal_name}")
                    else:
                        print(f"  ✗ {meal_name} — no image generated")
        except Exception as e:
            print(f"[Images Error] {e}")
            print(traceback.format_exc())

        # 2. SHOPPING LIST
        menu_data = extract_menu_data(doc)
        shopping_text = generate_shopping_list(menu_data, gemini_key)
        replace_shopping_tables(doc, shopping_text)

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
    gemini_key = data.get('api_key') or GEMINI_API_KEY

    if not menu_url:
        return jsonify({"error": "No menu_url provided"}), 400
    if not gemini_key:
        return jsonify({"error": "Gemini API key is missing"}), 400

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
            reader = PdfReader(io.BytesIO(file_bytes))
            full_text = ""
            for page in reader.pages:
                full_text += page.extract_text() + "\n"
            menu_data["todos_ingredientes"] = [full_text]
        else:
            return jsonify({"error": "Unsupported file format. Please use .docx or .pdf"}), 400

        # 3. Generate JSON
        from services.ai_service import generate_shopping_list_json
        shopping_json = generate_shopping_list_json(menu_data, gemini_key)

        return jsonify(shopping_json)

    except Exception as e:
        print(f"Error generating shopping list: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
