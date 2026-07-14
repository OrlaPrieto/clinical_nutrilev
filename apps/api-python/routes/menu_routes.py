import io
import json
import traceback
import threading
import uuid
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
from flask import Blueprint, request, send_file, jsonify
from docx import Document
from urllib.parse import urlparse
from config import GEMINI_API_KEY, INTERNAL_API_KEY
from utils.limiter import limiter

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

def is_safe_url(url: str) -> bool:
    try:
        import os
        parsed = urlparse(url)
        if parsed.scheme not in ('http', 'https'):
            return False
            
        hostname = parsed.hostname
        if not hostname:
            return False
            
        hostname_lower = hostname.lower()
        # Allow official Supabase domains
        if hostname_lower.endswith('.supabase.co'):
            return True
        # Allow Cloudflare R2 domains
        if hostname_lower.endswith('.r2.dev'):
            return True

        # Allow user's configured R2 Public URL custom domain if available
        r2_public_url = os.getenv('CLOUDFLARE_R2_PUBLIC_URL')
        if r2_public_url:
            try:
                r2_parsed = urlparse(r2_public_url)
                if r2_parsed.hostname and hostname_lower == r2_parsed.hostname.lower():
                    return True
            except Exception:
                pass

        # Allow local development hostnames
        if hostname_lower in ('localhost', '127.0.0.1', '::1'):
            return True
            
        return False
    except Exception:
        return False

menu_bp = Blueprint('menu_routes', __name__)

@menu_bp.before_request
def check_internal_key():
    if request.method == 'OPTIONS':
        return
    key = request.headers.get('x-internal-key')
    # Enforce strictly: key must match and cannot be missing or empty
    if not INTERNAL_API_KEY or key != INTERNAL_API_KEY:
        return jsonify({"error": "Unauthorized inter-service request"}), 401

@menu_bp.route('/generate-ai-menu', methods=['POST', 'OPTIONS'])
# @limiter.limit("10 per hour")  # Removed to prevent rate limit blocks on Render
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
        
        err_msg = str(e)
        if any(kw in err_msg for kw in ["429", "RESOURCE_EXHAUSTED", "quota", "503", "UNAVAILABLE", "high demand"]):
            return jsonify({
                "error": "AI_SERVICE_TEMPORARILY_UNAVAILABLE",
                "message": "El servicio de IA de Gemini está experimentando alta demanda o límites de cuota. Por favor, espera unos segundos e intenta nuevamente."
            }), 429
            
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
# @limiter.limit("10 per hour")  # Removed to prevent rate limit blocks on Render
def get_shopping_list():
    if request.method == 'OPTIONS':
        return '', 200
    
    data = request.json
    menu_url = data.get('menu_url')
    
    if not menu_url or not is_safe_url(menu_url):
        return jsonify({"error": "Invalid or restricted menu URL"}), 400
        
    gemini_key = GEMINI_API_KEY # Strictly from environment

    try:
        # 1. Download the file
        response = requests.get(menu_url, timeout=10)
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
        
        err_msg = str(e)
        if any(kw in err_msg for kw in ["429", "RESOURCE_EXHAUSTED", "quota", "503", "UNAVAILABLE", "high demand"]):
            return jsonify({
                "error": "AI_SERVICE_TEMPORARILY_UNAVAILABLE",
                "message": "El servicio de IA de Gemini está experimentando alta demanda o límites de cuota. Por favor, espera unos segundos e intenta nuevamente."
            }), 429
            
        return jsonify({"error": str(e)}), 500


tasks = {}
tasks_lock = threading.Lock()

def parse_menu_worker(task_id, menu_url, gemini_key):
    try:
        from services.ai_service import parse_menu_document_to_json
        parsed_json = parse_menu_document_to_json(menu_url, gemini_key)
        
        # Enriquecer con imágenes de Pexels si está configurado en el entorno
        import os
        pexels_key = os.getenv("PEXELS_API_KEY")
        
        def enrich_meal(meal):
            query = meal.get("termino_busqueda_imagen") or meal.get("platillo", "")
            from services.ai_service import fetch_dish_image_url
            meal["platillo_imagen_url"] = fetch_dish_image_url(query, pexels_key)

        meals_to_enrich = []
        for sec in parsed_json.get("secciones", []):
            for meal in sec.get("tiempos_comida", []):
                meals_to_enrich.append(meal)
                
        if meals_to_enrich:
            with ThreadPoolExecutor(max_workers=10) as executor:
                executor.map(enrich_meal, meals_to_enrich)
                
        with tasks_lock:
            if task_id in tasks:
                tasks[task_id].update({
                    "status": "completed",
                    "result": parsed_json,
                    "error": None
                })
    except Exception as e:
        import traceback
        print(f"Error in parse_menu_worker: {e}")
        traceback.print_exc()
        
        err_msg = str(e)
        is_transient = any(kw in err_msg for kw in ["429", "RESOURCE_EXHAUSTED", "quota", "503", "UNAVAILABLE", "high demand"])
        
        with tasks_lock:
            if task_id in tasks:
                tasks[task_id].update({
                    "status": "failed",
                    "result": None,
                    "error": err_msg,
                    "is_transient": is_transient
                })

@menu_bp.route('/parsed-menu', methods=['POST', 'OPTIONS'])
def get_parsed_menu():
    if request.method == 'OPTIONS':
        return '', 200

    data = request.json
    menu_url = data.get('menu_url')

    if not menu_url or not is_safe_url(menu_url):
        return jsonify({"error": "Invalid or restricted menu URL"}), 400

    gemini_key = GEMINI_API_KEY # Strictly from environment
    
    try:
        from services.ai_service import parse_menu_document_to_json
        parsed_json = parse_menu_document_to_json(menu_url, gemini_key)
        
        # Enriquecer con imágenes de Pexels si está configurado en el entorno
        import os
        pexels_key = os.getenv("PEXELS_API_KEY")
        
        def enrich_meal(meal):
            query = meal.get("termino_busqueda_imagen") or meal.get("platillo", "")
            from services.ai_service import fetch_dish_image_url
            meal["platillo_imagen_url"] = fetch_dish_image_url(query, pexels_key)

        meals_to_enrich = []
        for sec in parsed_json.get("secciones", []):
            for meal in sec.get("tiempos_comida", []):
                meals_to_enrich.append(meal)
                
        if meals_to_enrich:
            with ThreadPoolExecutor(max_workers=10) as executor:
                # Convertir a lista para forzar la evaluación sincrónica de map
                list(executor.map(enrich_meal, meals_to_enrich))
                
        return jsonify(parsed_json)

    except Exception as e:
        import traceback
        print(f"Error in synchronous get_parsed_menu: {e}")
        traceback.print_exc()
        
        err_msg = str(e)
        is_transient = any(kw in err_msg.lower() for kw in ["429", "resource_exhausted", "quota", "503", "unavailable", "high demand"])
        
        if is_transient:
            return jsonify({
                "error": "AI_SERVICE_TEMPORARILY_UNAVAILABLE",
                "message": "El servicio de IA de Gemini está experimentando alta demanda o límites de cuota. Por favor, espera unos segundos e intenta nuevamente.",
                "details": err_msg
            }), 429
            
        return jsonify({"error": err_msg}), 500

@menu_bp.route('/tasks/<task_id>', methods=['GET', 'OPTIONS'])
def get_task_status(task_id):
    if request.method == 'OPTIONS':
        return '', 200
        
    with tasks_lock:
        task = tasks.get(task_id)
        
    if not task:
        return jsonify({"error": "Task not found"}), 404
        
    if task["status"] == "failed":
        if task.get("is_transient"):
            return jsonify({
                "error": "AI_SERVICE_TEMPORARILY_UNAVAILABLE",
                "message": "El servicio de IA de Gemini está experimentando alta demanda o límites de cuota. Por favor, espera unos segundos e intenta nuevamente.",
                "details": task["error"]
            }), 429
        return jsonify({"error": task["error"]}), 500
        
    return jsonify(task)


