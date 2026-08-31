from __future__ import annotations
import os
import json
from typing import Optional, List, Dict, Any

from services.docx_utils import (
    Document, _build_docx, GRUPOS_PERMITIDOS, _norm_g
)
from services.gemini_engine import _call_gemini, _resolve_model

def extract_retry_delay(e: Exception) -> float:
    import re
    err_str = str(e)
    
    # 1. Match 'Please retry in X.XXs'
    match = re.search(r"retry\s+in\s+(\d+(?:\.\d+)?)s", err_str, re.IGNORECASE)
    if match:
        try:
            return float(match.group(1))
        except ValueError:
            pass
            
    # 2. Match 'retryDelay': 'Xs'
    match = re.search(r"'retryDelay':\s*'(\d+(?:\.\d+)?)s'", err_str)
    if match:
        try:
            return float(match.group(1))
        except ValueError:
            pass
            
    return 0.0

def _normalizar_menu(menu_json: dict) -> dict:
    """Garantiza que los 3 menús tengan las mismas equivalencias que el esquema_dia."""
    esquema = menu_json.get("esquema_dia", {})
    menus   = menu_json.get("menus", menu_json)
    MK      = ["menu_1", "menu_2", "menu_3"]

    tiempo_map = {
        "desayuno":          ("platillo_solido",  "desayuno_platillo"),
        "desayuno_licuado":  (None,               "desayuno_licuado"),
        "comida":            (None,               "comida"),
        "cena":              (None,               "cena"),
        "colacion_matutina": (None,               "colacion_matutina"),
        "colacion_vespertina": (None,             "colacion_vespertina"),
    }

    for mk in MK:
        menu = menus.get(mk, {})
        for tiempo_key, (sub_key, esquema_key) in tiempo_map.items():
            eq_fijas = esquema.get(esquema_key, {}).get("equivalencias_fijas", [])
            if not eq_fijas: continue

            if tiempo_key == "desayuno" and sub_key:
                bloque = menu.get("desayuno", {}).get("platillo_solido", {})
            elif tiempo_key == "desayuno_licuado":
                bloque = menu.get("desayuno", {}).get("licuado", {})
            else:
                bloque = menu.get(tiempo_key, {})

            if not bloque: continue

            desc_map = { _norm_g(eq.get("grupo", "")): eq.get("descripcion", "") 
                         for eq in bloque.get("equivalencias", []) 
                         if _norm_g(eq.get("grupo", "")) in GRUPOS_PERMITIDOS }

            nuevas_eq = []
            for eq_f in eq_fijas:
                g = eq_f.get("grupo", ""); g_flex = _norm_g(g)
                if g_flex not in GRUPOS_PERMITIDOS: continue
                desc = desc_map.get(g_flex) or desc_map.get(g) or (bloque.get("descripcion", g) if not bloque.get("equivalencias") else g)
                nuevas_eq.append({ "grupo": g, "porciones": eq_f.get("porciones", 0), "descripcion": desc })
            
            if nuevas_eq: bloque["equivalencias"] = nuevas_eq
    return menu_json

def sanitize_copilot_response(data: dict) -> dict:
    """
    Sanitizador y Guardraíl Post-IA para Copiloto Nutrilev:
    1. Normaliza sinónimos de grupos SMAE a ['Cereales', 'POA', 'Grasas', 'Frutas', 'Verduras'].
    2. Normaliza cadenas de porciones ('1/2' -> '0.5', '2.0' -> '2').
    3. Garantiza la simetría de los 5 grupos SMAE en cada tiempo principal (Desayuno, Comida, Cena) de los 3 menús.
    """
    if not isinstance(data, dict):
        return data

    format_type = data.get("format_type", "equivalencias")
    if format_type != "equivalencias":
        return data

    group_synonyms = {
        "cereal": "Cereales", "cereales": "Cereales", "cereal sin grasa": "Cereales", "cereales sin grasa": "Cereales",
        "harina": "Cereales", "harinas": "Cereales", "pan": "Cereales",
        "poa": "POA", "proteina": "POA", "proteína": "POA", "proteinas": "POA", "origen animal": "POA",
        "carne": "POA", "carnes": "POA", "pollo": "POA", "pescado": "POA",
        "grasa": "Grasas", "grasas": "Grasas", "grasa sin proteína": "Grasas", "grasas sin proteína": "Grasas", "aceite": "Grasas",
        "fruta": "Frutas", "frutas": "Frutas",
        "verdura": "Verduras", "verduras": "Verduras", "vegetal": "Verduras", "vegetales": "Verduras"
    }

    standard_groups = ["Cereales", "POA", "Grasas", "Frutas", "Verduras"]

    def _normalize_group(g_str: str) -> str:
        if not g_str:
            return "Cereales"
        g_clean = str(g_str).strip().lower()
        return group_synonyms.get(g_clean, g_str.strip().capitalize())

    def _normalize_porciones(p_str) -> str:
        if p_str is None:
            return "1"
        s = str(p_str).strip()
        if s == "1/2": return "0.5"
        if s == "1 1/2": return "1.5"
        if s == "2.0": return "2"
        if s == "1.0": return "1"
        if s.endswith(".0"): return s[:-2]
        return s if s else "1"

    menus = data.get("menus", [])
    if isinstance(menus, list):
        for m in menus:
            if not isinstance(m, dict):
                continue
            for meal_key in ["desayuno", "colacion_matutina", "comida", "colacion_vespertina", "cena"]:
                meal_data = m.get(meal_key)
                if not isinstance(meal_data, dict):
                    continue
                
                eqs = meal_data.get("equivalencias", [])
                normalized_eqs = []
                seen_groups = set()

                if isinstance(eqs, list):
                    for eq in eqs:
                        if not isinstance(eq, dict):
                            continue
                        norm_g = _normalize_group(eq.get("grupo"))
                        norm_p = _normalize_porciones(eq.get("porciones"))
                        desc = eq.get("descripcion", "")

                        if norm_g in standard_groups and norm_g not in seen_groups:
                            normalized_eqs.append({
                                "porciones": norm_p,
                                "grupo": norm_g,
                                "descripcion": desc
                            })
                            seen_groups.add(norm_g)

                # Para comidas principales, rellenar los 5 grupos SMAE para mantener simetría
                if meal_key in ["desayuno", "comida", "cena"]:
                    for g in standard_groups:
                        if g not in seen_groups:
                            normalized_eqs.append({
                                "porciones": "1",
                                "grupo": g,
                                "descripcion": "—"
                            })
                    # Ordenar por el orden estándar SMAE: Cereales, POA, Grasas, Frutas, Verduras
                    normalized_eqs.sort(key=lambda x: standard_groups.index(x["grupo"]) if x["grupo"] in standard_groups else 99)
                elif meal_key in ["colacion_matutina", "colacion_vespertina"]:
                    # Si no hay equivalencias en la colación pero hay descripción
                    if not normalized_eqs and meal_data.get("descripcion"):
                        desc = str(meal_data.get("descripcion"))
                        normalized_eqs.append({
                            "porciones": "1",
                            "grupo": "Frutas",
                            "descripcion": desc
                        })
                    elif not normalized_eqs:
                        default_desc = "1 taza de fresas o manzana rebanada (150g)" if meal_key == "colacion_matutina" else "1 taza de pepino y jícama con limón (120g)"
                        default_grp = "Frutas" if meal_key == "colacion_matutina" else "Verduras"
                        normalized_eqs.append({
                            "porciones": "1",
                            "grupo": default_grp,
                            "descripcion": default_desc
                        })
                    normalized_eqs.sort(key=lambda x: standard_groups.index(x["grupo"]) if x["grupo"] in standard_groups else 99)

                meal_data["equivalencias"] = normalized_eqs

                # Asegurar nombre_platillo
                if not meal_data.get("nombre_platillo") and not meal_data.get("platillo"):
                    if meal_key == "colacion_matutina":
                        meal_data["nombre_platillo"] = "Fruta fresca con verdura"
                    elif meal_key == "colacion_vespertina":
                        meal_data["nombre_platillo"] = "Snack saludable"
                    elif meal_data.get("descripcion"):
                        meal_data["nombre_platillo"] = str(meal_data.get("descripcion"))[:40]

            # Garantizar que existan los objetos de colación en el menú
            for col_k, def_title, def_grp, def_desc in [
                ("colacion_matutina", "Fruta de temporada", "Frutas", "1 pza de manzana o 1.5 tazas de fresas (150g)"),
                ("colacion_vespertina", "Verdura con limón", "Verduras", "1 taza de jícama y pepino picado (130g)")
            ]:
                if col_k not in m or not isinstance(m.get(col_k), dict):
                    m[col_k] = {
                        "nombre_platillo": def_title,
                        "equivalencias": [{
                            "porciones": "1",
                            "grupo": def_grp,
                            "descripcion": def_desc
                        }]
                    }

    return data

def get_base_menu_text() -> str:
    try:
        import os
        base_path = "/Users/orla09i/Desktop/Projects/clinical_nutrilev/apps/api-python/utils/menu_examples/menu edited.docx"
        if not os.path.exists(base_path): return "Standard Nutrilev Structure"
        doc = Document(base_path)
        text = "\n".join([p.text for p in doc.paragraphs] + [c.text for t in doc.tables for r in t.rows for c in r.cells])
        return text[:3000]
    except Exception: return "Standard Nutrilev Structure"

def generate_full_menu_docx(historial_paciente, calorias_objetivo, notas_personalizadas, menu_base_texto, gemini_key):
    print(f"[NutriArchitect v4.0] Generando para: {historial_paciente.get('nombre', '?')}")
    
    # 1. Llamar a Gemini
    menu_json = _call_gemini(historial_paciente, calorias_objetivo, notas_personalizadas, menu_base_texto, gemini_key)
    if not menu_json:
        raise ValueError("No se pudo generar el menú con IA.")

    # 2. Normalizar
    menu_json = _normalizar_menu(menu_json)

    # 3. Construir .docx
    return _build_docx(menu_json, historial_paciente, calorias_objetivo)

def generate_shopping_list_json(menu_data: dict, gemini_key: str) -> list:
    """
    Genera la lista de compras en formato JSON estructurado.
    """
    import re
    import json
    import traceback
    from google import genai
    from google.genai import types

    todos_ingredientes = menu_data.get("todos_ingredientes", [])
    print(f"[ShoppingList AI] Input ingredients count: {len(todos_ingredientes)}")
    ingredientes_str = "\n".join(todos_ingredientes)

    # Define schema as a raw dict to ensure absolute compatibility across Pydantic/Python versions
    shopping_schema = {
        "type": "OBJECT",
        "properties": {
            "categories": {
                "type": "ARRAY",
                "description": "Lista de categorías principales de compras.",
                "items": {
                    "type": "OBJECT",
                    "properties": {
                        "category": {
                            "type": "STRING",
                            "description": "Categoría con su emoji respectivo (ej. 🥩 PROTEÍNAS, 🥛 LÁCTEOS Y SUSTITUTOS, 🥦 VERDURAS Y HORTALIZAS, 🍎 FRUTAS FRESCAS, 🍞 CEREALES Y TUBÉRCULOS, 🥜 GRASAS Y SEMILLAS, 🧂 DESPENSA Y CONDIMENTOS, 🍵 BEBIDAS)."
                        },
                        "items": {
                            "type": "ARRAY",
                            "description": "Lista de ingredientes de esta categoría.",
                            "items": {
                                "type": "OBJECT",
                                "properties": {
                                    "icon": {
                                        "type": "STRING",
                                        "description": "Un único emoji del alimento (ej. 🥬, 🍗, 🥛, 🍚)."
                                    },
                                    "name": {
                                        "type": "STRING",
                                        "description": "Nombre del ingrediente (ej. Pechuga de pollo, Brócoli)."
                                    },
                                    "amount": {
                                        "type": "STRING",
                                        "description": "Cantidad consolidada total (ej. 1.2 kg, 8 rebanadas)."
                                    },
                                    "tip": {
                                        "type": "STRING",
                                        "description": "Consejo clínico o de compra práctico."
                                    }
                                },
                                "required": ["icon", "name", "amount", "tip"]
                            }
                        }
                    },
                    "required": ["category", "items"]
                }
            }
        },
        "required": ["categories"]
    }
    
    system_prompt = (
        "Eres un asistente experto en nutrición clínica y compras de supermercado inteligentes. "
        "Tu tarea es analizar los ingredientes semanales del plan alimenticio de un paciente y "
        "devolver una lista consolidada, optimizada y agrupada en formato JSON estricto."
    )
    
    prompt = f"""
Analiza los siguientes ingredientes extraídos del plan de alimentación de 7 días del paciente:

{ingredientes_str}

Instrucciones de consolidación:
1. **Suma matemática precisa**: Agrupa y unifica los ingredientes repetidos. Por ejemplo, si el plan pide espinacas el lunes, miércoles y viernes, súmalas en un único ingrediente "Espinacas" consolidando sus porciones en una unidad de supermercado (ej. '2 manojos' o '500g').
2. **Unidades de compra realistas**: Si la suma de proteínas da '1400g', conviértela a una unidad de compra lógica como '1.4 kg'.
3. **Clasificación estricta**: Clasifica cada ingrediente en la categoría correcta de la lista proporcionada en la descripción de 'category'.
4. **Consejos prácticos (`tip`)**: Agrega recomendaciones de selección fresca o de perfil saludable (ej. 'Elegir jamón bajo en sodio', 'Yogur griego sin endulzantes artificiales').

Genera el JSON usando el esquema definido.
"""
    
    import time

    client = genai.Client(api_key=gemini_key)
    models_to_try = _resolve_model(client)

    for model in models_to_try:
        for attempt in range(3):
            try:
                print(f"[ShoppingList AI] Calling Gemini using model: {model} (attempt {attempt + 1})...")
                response = client.models.generate_content(
                    model=model,
                    contents=[{"role": "user", "parts": [{"text": system_prompt + "\n\n" + prompt}]}],
                    config=types.GenerateContentConfig(
                        temperature=0.1,
                        response_mime_type="application/json",
                        response_schema=shopping_schema
                    ),
                )
                text = response.text.strip()
                print(f"[ShoppingList AI] Response text length: {len(text)}")
                data = json.loads(text)
                return data.get("categories", [])
            except Exception as e:
                print(f"[Gemini JSON Shopping List] Error with model {model} on attempt {attempt + 1}: {e}")
                err_str = str(e).lower()
                
                # If it's a rate limit or transient service error, sleep and retry
                if any(kw in err_str for kw in ["429", "resource_exhausted", "quota", "503", "unavailable", "high demand"]):
                    retry_delay = extract_retry_delay(e)
                    sleep_time = retry_delay + 1.0 if retry_delay > 0 else 5.0 * (2 ** attempt)
                    print(f"[ShoppingList AI] Rate limit hit. Sleeping for {sleep_time:.2f}s before retrying...")
                    time.sleep(sleep_time)
                    continue
                
                traceback.print_exc()
                break
def _clean_and_trim_menu_text(raw_text: str) -> str:
    """
    Cleans extracted menu text before sending to LLM without losing clinical content:
    - Removes non-nutritional repetitive boilerplate (disclaimers, repeated page footers, contact links).
    - Compresses excessive blank lines and whitespace to reduce token bloat.
    - Preserves 100% of meals, options, ingredients, recommendations, and supplements.
    """
    if not raw_text:
        return ""
    import re
    text = raw_text.replace("\r\n", "\n").replace("\r", "\n")
    
    noise_patterns = [
        r"p[aá]gina\s+\d+\s+de\s+\d+",
        r"tel[ée]fono:\s*[\d\s\-]+",
        r"instagram:\s*@[\w\.\-]+",
        r"facebook:\s*[\w\.\-]+",
        r"www\.[\w\.\-]+\.com[\w\/\.\-]*",
        r"aviso de confidencialidad.*?(?=\n\n|\Z)",
        r"este documento es de car[aá]cter informativo.*?(?=\n\n|\Z)",
    ]
    for pattern in noise_patterns:
        text = re.sub(pattern, "", text, flags=re.IGNORECASE)
    
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]{2,}", " ", text)
    
    return text.strip()


def _enrich_raw_cooked_conversions(sections: list) -> None:
    """
    Enriquece de forma determinista en Python las conversiones crudo vs cocido
    según el Sistema Mexicano de Alimentos Equivalentes (SMAE).
    0ms de carga a la IA y 100% de precisión matemática.
    """
    import re
    for sec in sections:
        for meal in sec.get("tiempos_comida", []):
            for ing in meal.get("ingredientes", []):
                if ing.get("peso_cocido_crudo"):
                    continue
                
                name_lower = (ing.get("nombre") or "").lower()
                cant_str = (ing.get("cantidad") or "").lower()

                # 1. Carnes, Aves (25% merma promedio: 100g crudo ≈ 75g cocido)
                if any(k in name_lower for k in ["pollo", "pechuga", "res", "ternera", "cerdo", "bistec", "bisteck", "filete", "carne molida", "lomo"]):
                    g_match = re.search(r"(\d+(?:\.\d+)?)\s*g", cant_str)
                    if g_match:
                        val = float(g_match.group(1))
                        cooked_val = int(round(val * 0.75))
                        ing["peso_cocido_crudo"] = f"{int(val)}g crudo ≈ {cooked_val}g cocido"
                
                # 2. Pescados y Mariscos (20% merma: 100g crudo ≈ 80g cocido)
                elif any(k in name_lower for k in ["pescado", "atún", "atun", "salmón", "salmon", "camarón", "camaron", "tilapia", "mojarra"]):
                    g_match = re.search(r"(\d+(?:\.\d+)?)\s*g", cant_str)
                    if g_match:
                        val = float(g_match.group(1))
                        cooked_val = int(round(val * 0.80))
                        ing["peso_cocido_crudo"] = f"{int(val)}g crudo ≈ {cooked_val}g cocido"

                # 3. Arroz y Pastas (Expansión 2.5x)
                elif any(k in name_lower for k in ["arroz", "pasta", "fideo", "espagueti", "sopa de pasta"]):
                    if "1/2 taza" in cant_str:
                        ing["peso_cocido_crudo"] = "1/2 taza cocido ≈ 40g crudo"
                    elif "1 taza" in cant_str:
                        ing["peso_cocido_crudo"] = "1 taza cocida ≈ 80g cruda"
                    elif "1/3 taza" in cant_str:
                        ing["peso_cocido_crudo"] = "1/3 taza cocido ≈ 30g crudo"

                # 4. Avena
                elif "avena" in name_lower:
                    if "1/2 taza" in cant_str:
                        ing["peso_cocido_crudo"] = "1/2 taza cruda ≈ 1 taza cocida"
                    elif "1/3 taza" in cant_str:
                        ing["peso_cocido_crudo"] = "1/3 taza cruda ≈ 2/3 taza cocida"

                # 5. Leguminosas (Frijol, Lenteja, Garbanzo)
                elif any(k in name_lower for k in ["lenteja", "frijol", "frijoles", "garbanzo", "habas"]):
                    if "1/2 taza" in cant_str:
                        ing["peso_cocido_crudo"] = "1/2 taza cocida ≈ 35g cruda"
                    elif "1 taza" in cant_str:
                        ing["peso_cocido_crudo"] = "1 taza cocida ≈ 70g cruda"


def _segment_menu_document(full_text: str) -> dict:
    """
    Segmenta el documento de menú en bloques discretos e independientes:
    - metadata_text: Datos de paciente, calorías, introducción.
    - sections: Lista de secciones o días con su texto específico.
    - notes_text: Recomendaciones generales, suplementos y advertencias.
    """
    import re
    cleaned = _clean_and_trim_menu_text(full_text)
    
    # 1. Separar recomendaciones y suplementos
    notes_pattern = re.compile(
        r"(?i)\n(?:--- PÁGINA \d+ ---\s*)?(?:recomendaciones|suplementaci[oó]n|suplementos|indicaciones\s+generales|h[aá]bitos|lista\s+del\s+s[uú]per|lista\s+de\s+compras)\b"
    )
    notes_match = notes_pattern.search(cleaned)
    
    if notes_match:
        main_content = cleaned[:notes_match.start()].strip()
        notes_text = cleaned[notes_match.start():].strip()
    else:
        main_content = cleaned
        notes_text = ""

    # 2. Detectar encabezados de secciones/días (Lunes, Martes, Miércoles, Jueves, Viernes, Sábado, Domingo, DÍA X, Menú Opción X, Opción X)
    day_names = [
        r"lunes(?:\s*(?:/|-|y)\s*s[aá]bado)?",
        r"martes(?:\s*(?:/|-|y)\s*domingo)?",
        r"mi[eé]rcoles",
        r"jueves",
        r"viernes",
        r"s[aá]bado",
        r"domingo",
        r"d[ií]a\s*\d+",
        r"men[uú]\s*(?:opci[oó]n)?\s*\d+",
        r"opci[oó]n\s*\d+"
    ]
    combined_days = "|".join(day_names)
    sec_header_pattern = re.compile(
        rf"(?i)(?:^|\n)(?P<sec_title>(?:{combined_days})\b[^\n]*)",
        re.MULTILINE
    )
    
    matches = list(sec_header_pattern.finditer(main_content))
    
    sections = []
    if len(matches) >= 2:
        meta_text = main_content[:matches[0].start()].strip()
        for i, match in enumerate(matches):
            sec_title = match.group('sec_title').strip()
            clean_title = re.sub(r"^[#\*\-—\s]+", "", sec_title).strip().title()
            start_pos = match.end()
            end_pos = matches[i + 1].start() if i + 1 < len(matches) else len(main_content)
            sec_body = main_content[start_pos:end_pos].strip()
            if sec_body:
                sections.append({
                    "name": clean_title,
                    "text": f"{clean_title}\n{sec_body}"
                })
    else:
        # Fallback si no hay delimitadores estándar múltiples (menú único o formato libre)
        meta_text = main_content[:600].strip()
        sections.append({
            "name": "Menú Principal",
            "text": main_content
        })

    return {
        "metadata_text": meta_text,
        "sections": sections,
        "notes_text": notes_text
    }


def _call_gemini_micro_task(prompt: str, schema: dict, gemini_key: str, task_name: str = "MicroTask") -> dict:
    """Ejecuta una subtarea atómica de Gemini con conmutación inmediata ante 503/404."""
    import time
    import json
    from google import genai
    from google.genai import types
    from services.gemini_engine import _resolve_model

    client = genai.Client(
        api_key=gemini_key,
        http_options=types.HttpOptions(timeout=25000)
    )
    models_to_try = _resolve_model(client)
    last_exception = None

    for model in models_to_try:
        for attempt in range(2):
            try:
                print(f"[MenuParser AI] [{task_name}] Invoking {model} (attempt {attempt + 1})...")
                response = client.models.generate_content(
                    model=model,
                    contents=[{"role": "user", "parts": [{"text": prompt}]}],
                    config=types.GenerateContentConfig(
                        temperature=0.1,
                        max_output_tokens=8192,
                        response_mime_type="application/json",
                        response_schema=schema
                    ),
                )
                text = response.text.strip()
                return json.loads(text)
            except Exception as e:
                err_str = str(e).lower()
                print(f"[MenuParser AI] [{task_name}] Error with {model}: {e}")
                last_exception = e
                
                is_not_found = any(kw in err_str for kw in ["404", "not_found", "deprecated"])
                if is_not_found:
                    break

                is_unavailable = any(kw in err_str for kw in ["503", "unavailable", "high demand", "temporarily overloaded"])
                if is_unavailable:
                    if attempt == 0:
                        print(f"[MenuParser AI] [{task_name}] Transient 503 on {model}. Retrying in 1.5s...")
                        time.sleep(1.5)
                        continue
                    break

                is_rate_limit = any(kw in err_str for kw in ["429", "resource_exhausted", "quota"])
                is_zero_quota = "limit: 0" in err_str or "limit:0" in err_str
                if is_rate_limit:
                    delay = extract_retry_delay(e)
                    if delay > 10.0 or is_zero_quota:
                        print(f"[MenuParser AI] [{task_name}] Model {model} rate limit wait ({delay:.1f}s) is too long. Discarding immediately.")
                        break  # Fall back to next model immediately
                    if attempt == 0:
                        sleep_time = min(delay + 1.0 if delay > 0 else 3.0, 5.0)
                        time.sleep(sleep_time)
                        continue
                break

    if last_exception:
        raise last_exception
    return {}


def _parse_single_section_ai(sec_name: str, sec_text: str, gemini_key: str) -> dict:
    """Estructura un único menú/sección en un subproceso rápido y liviano."""
    section_schema = {
        "type": "OBJECT",
        "properties": {
            "nombre": {"type": "STRING", "description": "Nombre de la sección o día."},
            "tiempos_comida": {
                "type": "ARRAY",
                "items": {
                    "type": "OBJECT",
                    "properties": {
                        "tiempo": {"type": "STRING", "description": "Ej: 'Licuado', 'Desayuno', 'Colación 1', 'Comida', 'Colación 2', 'Cena', 'Bebida'"},
                        "hora_sugerida": {"type": "STRING"},
                        "emoji": {"type": "STRING", "description": "Emoji representativo (ej. 🍳, 🍏, 🥗, ☕, 🌙, 🥤)"},
                        "platillo": {"type": "STRING", "description": "Nombre EXACTO y literal del platillo tal como está escrito en el menú. PROHIBIDO inventar nombres."},
                        "preparacion": {"type": "STRING", "description": "Instrucciones de preparación si vienen en el texto."},
                        "termino_busqueda_imagen": {"type": "STRING", "description": "Término en inglés de 2 a 4 palabras para buscar la foto real en Unsplash (ej. 'mexican chilaquiles green salsa', 'chicken fajitas skillet', 'oatmeal bowl berries')."},
                        "ingredientes": {
                            "type": "ARRAY",
                            "items": {
                                "type": "OBJECT",
                                "properties": {
                                    "nombre": {"type": "STRING"},
                                    "cantidad": {"type": "STRING"},
                                    "grupo": {"type": "STRING"},
                                    "reemplazos": {"type": "ARRAY", "items": {"type": "STRING"}}
                                },
                                "required": ["nombre", "cantidad"]
                            }
                        }
                    },
                    "required": ["tiempo", "platillo", "ingredientes"]
                }
            }
        },
        "required": ["nombre", "tiempos_comida"]
    }

    prompt = f"""
    Eres un asistente de nutrición clínica de máxima precisión. Digitaliza el siguiente tiempo de comida o día en JSON:
    
    TEXTO DE LA SECCIÓN ({sec_name}):
    \"\"\"
    {sec_text}
    \"\"\"
    
    REGLAS ESTRICTAS OBLIGATORIAS:
    1. 'nombre': Usa '{sec_name}'.
    2. 'tiempos_comida': Extrae TODOS los tiempos de comida en orden cronológico:
       - Incluye Desayuno, Licuado/Batido, Colación Matutina / Colación 1, Comida, Colación Vespertina / Colación 2, Cena y Bebidas.
       - NUNCA omitas colaciones, snacks, licuados ni bebidas descritas en el texto.
    3. TÍTULOS DE PLATILLO EXACTOS:
       - El campo 'platillo' DEBE ser el título literal que aparece en el texto del documento (ej. 'Huevos con jamón de pavo', 'Licuado verde', 'Pechuga asada con verduras', 'Manzana con almendras').
       - PROHIBIDO inventar nombres creativos o modificarlos. Respeta el texto del nutriólogo al 100%.
    4. INGREDIENTES: Extrae cada ingrediente con su cantidad exacta y grupo si se especifica.
    5. FOTOGRAFÍA: Para cada comida incluye 'termino_busqueda_imagen' con 2 a 4 palabras en inglés para fotografía gastronómica.
    """
    return _call_gemini_micro_task(prompt, section_schema, gemini_key, task_name=f"Section:{sec_name[:15]}")


def _parse_metadata_and_notes_ai(meta_text: str, notes_text: str, gemini_key: str) -> dict:
    """Extrae metadatos del paciente, calorías, macronutrientes, recomendaciones y suplementos."""
    meta_schema = {
        "type": "OBJECT",
        "properties": {
            "paciente_nombre": {"type": "STRING"},
            "fecha_elaboracion": {"type": "STRING"},
            "calorias_totales": {"type": "INTEGER"},
            "macronutrientes": {
                "type": "OBJECT",
                "properties": {
                    "proteinas_g": {"type": "INTEGER"},
                    "carbohidratos_g": {"type": "INTEGER"},
                    "grasas_g": {"type": "INTEGER"}
                },
                "required": ["proteinas_g", "carbohidratos_g", "grasas_g"]
            },
            "tipo_plan": {"type": "STRING", "description": "'semanal' o 'equivalencias_opciones'"},
            "recomendaciones_generales": {"type": "ARRAY", "items": {"type": "STRING"}},
            "suplementos": {"type": "ARRAY", "items": {"type": "STRING"}}
        },
        "required": ["paciente_nombre"]
    }

    prompt = f"""
    Extrae la información general, recomendaciones clínicas y suplementos del plan nutricional:
    
    METADATOS / ENCABEZADO:
    \"\"\"
    {meta_text}
    \"\"\"
    
    RECOMENDACIONES Y SUPLEMENTOS:
    \"\"\"
    {notes_text}
    \"\"\"
    
    Instrucciones:
    - Extrae cada recomendación, hábito o indicación general en 'recomendaciones_generales'.
    - Extrae cada suplemento o indicación de suplementación en 'suplementos'.
    """
    return _call_gemini_micro_task(prompt, meta_schema, gemini_key, task_name="Metadata&Notes")


def _split_menu_into_sections_ai(full_text: str, gemini_key: str) -> tuple[list, str]:
    """
    Usa Gemini para segmentar inteligentemente cualquier formato de menú (tabla 2D semanal, columnas, opciones):
    Devuelve lista de objetos con: {"nombre": "Lunes", "texto": "..."} para cada día u opción.
    """
    schema = {
        "type": "OBJECT",
        "properties": {
            "tipo_plan": {
                "type": "STRING",
                "description": "'semanal' si el menú tiene días de la semana (Lunes a Domingo), o 'equivalencias_opciones' si son opciones (Menú 1, Menú 2, etc.)"
            },
            "secciones": {
                "type": "ARRAY",
                "description": "Lista con CADA UNO de los días (Lunes, Martes, Miércoles, Jueves, Viernes, Sábado, Domingo) o CADA opción de menú (Menú 1, Menú 2, Menú 3, etc.). DEBE contener TODOS los días/opciones sin omitir ninguno.",
                "items": {
                    "type": "OBJECT",
                    "properties": {
                        "nombre": {"type": "STRING", "description": "Ej: 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo', 'Menú 1', 'Menú 2', 'Menú 3', 'Opción 1'"},
                        "texto": {"type": "STRING", "description": "El texto completo de las comidas, platillos, colaciones, licuados, bebidas e ingredientes correspondientes a ese día u opción."}
                    },
                    "required": ["nombre", "texto"]
                }
            }
        },
        "required": ["tipo_plan", "secciones"]
    }

    prompt = f"""
    Eres un asistente clínico experto. Analiza el siguiente documento de nutrición y divídelo en sus días u opciones independientes:
    
    TEXTO DEL MENÚ:
    \"\"\"
    {full_text}
    \"\"\"
    
    INSTRUCCIONES CRÍTICAS:
    1. Si el menú es semanal o contiene días (LUNES, MARTES, MIÉRCOLES, JUEVES, VIERNES, SÁBADO, DOMINGO), aunque estén en columnas o tablas:
       - Crea una sección para CADA DÍA (Lunes, Martes, Miércoles, Jueves, Viernes, Sábado, Domingo).
       - En 'texto', coloca todos los alimentos, licuados, desayunos, colaciones 1 y 2, comidas, cenas y bebidas que le corresponden a ese día.
       - NUNCA agrupes en un solo día ni omitas días. Si hay 7 días, debes devolver exactamente las 7 secciones.
    2. Si el menú es por opciones (ej: Menú Opción 1, Menú Opción 2, Menú Opción 3, Opción 4, Opción 5...):
       - Crea una sección para CADA opción sin omitir ninguna (si hay 5 opciones en el texto, devuelve las 5 opciones completas).
       - En 'texto', incluye TODO lo correspondiente a esa opción: desayunos, licuados, colaciones, comidas, cenas y bebidas.
    3. Devuelve únicamente el JSON con el array 'secciones'.
    """

    res = _call_gemini_micro_task(prompt, schema, gemini_key, task_name="SectionSplitter")
    return res.get("secciones", []), res.get("tipo_plan", "semanal")


def parse_menu_document_to_json(menu_url: str, gemini_key: str) -> dict:
    """
    Descarga el PDF/DOCX de la dieta y estructura el menú por micro-tareas en paralelo:
    - Divide el texto por días/opciones (Lunes..Domingo o Opción 1..N) mediante IA de segmentación rápida.
    - Procesa metadatos y cada día de forma independiente en subprocesos ultra-rápidos (<1s c/u).
    - Une todo con enriquecimiento determinista SMAE y emojis.
    """
    import io
    import requests
    from concurrent.futures import ThreadPoolExecutor, as_completed
    from pypdf import PdfReader
    from docx import Document

    print(f"[MenuParser AI] Downloading menu from: {menu_url}")
    response = requests.get(menu_url, timeout=15)
    response.raise_for_status()
    file_bytes = response.content
    content_type = response.headers.get('Content-Type', '')

    # 1. Extraer texto plano de todas las páginas del PDF o tablas de DOCX
    full_text = ""
    if 'officedocument.wordprocessingml.document' in content_type or menu_url.endswith('.docx'):
        print("[MenuParser AI] Parsing DOCX...")
        doc = Document(io.BytesIO(file_bytes))
        full_text = "\n".join([p.text for p in doc.paragraphs] + [c.text for t in doc.tables for r in t.rows for c in r.cells])
    else:
        print("[MenuParser AI] Parsing PDF...")
        reader = PdfReader(io.BytesIO(file_bytes))
        for page_idx, page in enumerate(reader.pages):
            page_text = page.extract_text() or ""
            full_text += f"\n--- PÁGINA {page_idx + 1} ---\n" + page_text

    print(f"[MenuParser AI] Extracted raw text length: {len(full_text)}")
    cleaned_text = _clean_and_trim_menu_text(full_text)
    
    # 2. Segmentación con IA rápida (divide en Lunes..Domingo o Menú 1..N)
    sections_raw, tipo_plan_detected = _split_menu_into_sections_ai(cleaned_text, gemini_key)
    
    # Fallback a segmentación heurística si el splitter falló
    if not sections_raw:
        segmented_fallback = _segment_menu_document(cleaned_text)
        sections_raw = segmented_fallback.get("sections", [])
    
    print(f"[MenuParser AI] Segmented document into {len(sections_raw)} sections/days: {[s.get('nombre') for s in sections_raw]}")

    # 3. Procesar Metadatos y cada Sección en paralelo con ThreadPoolExecutor
    parsed_meta = {}
    parsed_sections_map = {}

    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = {}
        
        # Futuro para metadatos y recomendaciones
        meta_future = executor.submit(_parse_metadata_and_notes_ai, cleaned_text[:2000], cleaned_text, gemini_key)
        futures[meta_future] = ("meta", "Metadata")

        # Futuros para cada día/sección individual
        for idx, sec in enumerate(sections_raw):
            sec_name = sec.get("nombre", f"Sección {idx + 1}")
            sec_text = sec.get("texto", "")
            f = executor.submit(_parse_single_section_ai, sec_name, sec_text, gemini_key)
            futures[f] = ("section", idx, sec_name)

        for future in as_completed(futures):
            info = futures[future]
            try:
                res = future.result()
                if info[0] == "meta":
                    parsed_meta = res
                elif info[0] == "section":
                    sec_idx = info[1]
                    parsed_sections_map[sec_idx] = res
            except Exception as e:
                print(f"[MenuParser AI] Error in micro-task {info}: {e}")

    # Ordenar las secciones estructuradas según el orden original del documento
    structured_sections = []
    for idx in range(len(sections_raw)):
        if idx in parsed_sections_map and parsed_sections_map[idx].get("tiempos_comida"):
            sec_data = parsed_sections_map[idx]
            structured_sections.append(sec_data)

    if not structured_sections:
        raise ValueError("No se pudieron extraer las secciones del menú nutricional.")

    # 4. Enriquecimiento Determinista en Python (SMAE crudo vs cocido y Emojis)
    _enrich_raw_cooked_conversions(structured_sections)
    
    emoji_map = {
        "desayuno": "🍳",
        "colaci": "🍏",
        "snack": "🍏",
        "comida": "🥗",
        "almuerzo": "🥗",
        "cena": "🌙",
        "licuado": "🥤",
        "batido": "🥤",
        "bebida": "🍵",
        "infusion": "🍵",
        "infus": "🍵"
    }
    for sec in structured_sections:
        for meal in sec.get("tiempos_comida", []):
            if not meal.get("emoji"):
                t = (meal.get("tiempo") or "").lower()
                meal["emoji"] = next((v for k, v in emoji_map.items() if k in t), "🍽️")

    tipo_plan = "semanal" if any(d in s.get("nombre", "").lower() for s in structured_sections for d in ["lunes", "martes", "miércoles", "miercoles", "jueves", "viernes", "sábado", "sabado", "domingo"]) else "equivalencias_opciones"

    has_partial_error = len(structured_sections) < len(sections_raw)

    recs = parsed_meta.get("recomendaciones_generales") or parsed_meta.get("recomendaciones") or []

    result = {
        "paciente_nombre": parsed_meta.get("paciente_nombre") or "Paciente",
        "fecha_elaboracion": parsed_meta.get("fecha_elaboracion") or "",
        "calorias_totales": parsed_meta.get("calorias_totales") or 1800,
        "macronutrientes": parsed_meta.get("macronutrientes") or {
            "proteinas_g": 120,
            "carbohidratos_g": 180,
            "grasas_g": 50
        },
        "tipo_plan": tipo_plan,
        "secciones": structured_sections,
        "recomendaciones": recs,
        "recomendaciones_generales": recs,
        "suplementos": parsed_meta.get("suplementos") or [],
        "has_partial_error": has_partial_error,
        "expected_sections_count": len(sections_raw),
        "received_sections_count": len(structured_sections)
    }

    print(f"[MenuParser AI] Successfully structured {len(structured_sections)}/{len(sections_raw)} days/sections in parallel. Partial error: {has_partial_error}")
    return result


MEXICAN_DISH_SEARCH_MAP = {
    "chilaquiles": "mexican green chilaquiles with chicken",
    "enfrijoladas": "mexican enfrijoladas black bean sauce",
    "enmoladas": "mexican chicken mole enmoladas",
    "entomatadas": "mexican entomatadas tomato sauce",
    "molletes": "mexican molletes refried beans cheese toast",
    "nopal": "mexican nopal cactus salad tostada",
    "nopales": "mexican cooked nopal cactus dish",
    "sincronizada": "mexican ham cheese quesadilla panela",
    "sincronizadas": "mexican ham cheese quesadilla panela",
    "quesadilla": "mexican cheese quesadilla panela",
    "quesadillas": "mexican cheese quesadillas panela",
    "fajitas": "chicken beef fajitas skillet mexican",
    "picadillo": "mexican ground beef picadillo vegetables",
    "ceviche": "mexican fish ceviche tostada",
    "salpicon": "shredded beef salad mexican salpicon",
    "salpicón": "shredded beef salad mexican salpicon",
    "tinga": "mexican chicken tinga tostadas",
    "licuado": "healthy smoothie bowl oat fruit",
    "batido": "healthy smoothie bowl oat fruit",
    "avena": "oatmeal bowl berries cinnamon",
    "huevo": "mexican scrambled eggs salsa",
    "huevos": "mexican scrambled eggs salsa",
    "caldo": "chicken soup mexican caldo de pollo",
    "sopa": "vegetable chicken soup mexican",
    "pozole": "mexican pozole soup",
    "tacos": "mexican tacos guisado",
    "tostada": "mexican tostada avocado salsa",
    "tostadas": "mexican tostada avocado salsa",
    "panela": "panela cheese salad mexican",
    "atun": "tuna salad avocado bowl",
    "atún": "tuna salad avocado bowl",
    "pechuga": "grilled chicken breast salad",
    "bistec": "mexican steak fajitas skillet",
    "alambre": "mexican steak alambre skillet bell pepper",
}


def normalize_mexican_query(dish_name: str, search_term: str) -> str:
    """
    Normaliza y enriquece la consulta de búsqueda para asegurar que represente
    de forma hiper-precisa la gastronomía mexicana o clínica.
    """
    combined = f"{dish_name or ''} {search_term or ''}".lower()
    
    # 1. Buscar coincidencias en el diccionario gastronómico mexicano
    for key, mapped_query in MEXICAN_DISH_SEARCH_MAP.items():
        if key in combined:
            return mapped_query

    # 2. Si ya viene un término formateado en inglés por la IA, asegurar contexto si es platillo mexicano
    raw_term = (search_term or dish_name or "healthy food").lower()
    mexican_keywords = ["taco", "tostada", "nopal", "salsa", "chile", "frijol", "panela", "tortilla", "tamal", "guacamole"]
    if any(kw in combined for kw in mexican_keywords) and "mexican" not in raw_term:
        return f"mexican {raw_term}"
        
    return raw_term


def get_fallback_image(query: str) -> str:
    """
    Devuelve una imagen de comida saludable y mexicana de alta calidad en HD desde Unsplash
    cuando no hay API Keys configuradas o falla la red.
    """
    query_lower = (query or "").lower()
    
    # 1. Licuados / Batidos / Smoothies
    if any(kw in query_lower for kw in ["smoothie", "licuado", "batido", "juice", "jugo", "bebida"]):
        return "https://images.unsplash.com/photo-1553530666-ba11a7da3888?q=80&w=800&auto=format&fit=crop"
    
    # 2. Desayunos Mexicanos / Huevos / Avena / Molletes / Toast
    if any(kw in query_lower for kw in ["egg", "huevo", "chilaquiles", "mollete", "toast", "avocado", "aguacate", "desayuno", "breakfast", "pan", "avena", "oatmeal", "hotcake"]):
        return "https://images.unsplash.com/photo-1525351484163-7529414344d8?q=80&w=800&auto=format&fit=crop"
    
    # 3. Ensaladas / Bowls / Nopales / Ceviche / Panela
    if any(kw in query_lower for kw in ["salad", "ensalada", "nopal", "bowl", "ceviche", "panela", "verdura", "vegetal"]):
        return "https://images.unsplash.com/photo-1540420773420-3366772f4999?q=80&w=800&auto=format&fit=crop"
        
    # 4. Yogurt / Snacks / Fruta / Colaciones
    if any(kw in query_lower for kw in ["yogurt", "yogur", "fruit", "fruta", "snack", "colacion", "colación", "berries", "fresa", "manzana"]):
        return "https://images.unsplash.com/photo-1488477181946-6428a0291777?q=80&w=800&auto=format&fit=crop"
        
    # 5. Carnes / Pollo / Tacos / Fajitas / Picadillo / Tinga / Comida fuerte
    if any(kw in query_lower for kw in ["chicken", "pollo", "beef", "carne", "fish", "pescado", "tacos", "fajitas", "picadillo", "tinga", "tostadas", "comida", "lunch", "dinner"]):
        return "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?q=80&w=800&auto=format&fit=crop"
        
    # Default fotografía culinaria general
    return "https://images.unsplash.com/photo-1490645935967-10de6ba17061?q=80&w=800&auto=format&fit=crop"


def fetch_unsplash_image(query: str, access_key: str) -> Optional[str]:
    """Consulta la API oficial de Unsplash buscando fotografías gastronómicas landscape."""
    import urllib.parse
    import requests

    if not access_key or not query:
        return None

    try:
        safe_query = urllib.parse.quote(f"{query} food")
        url = f"https://api.unsplash.com/search/photos?query={safe_query}&per_page=3&orientation=landscape"
        headers = {"Authorization": f"Client-ID {access_key}"}
        
        resp = requests.get(url, headers=headers, timeout=4)
        if resp.status_code == 200:
            data = resp.json()
            results = data.get("results", [])
            if results:
                urls = results[0].get("urls", {})
                return urls.get("regular") or urls.get("small")
    except Exception as e:
        print(f"[MenuParser AI] Error consultando Unsplash API para '{query}': {e}")
        
    return None


def fetch_pexels_image(query: str, pexels_key: str) -> Optional[str]:
    """Consulta la API de Pexels buscando imágenes fotográficas landscape de alimentos."""
    import urllib.parse
    import requests

    if not pexels_key or not query:
        return None

    try:
        safe_query = urllib.parse.quote(query)
        url = f"https://api.pexels.com/v1/search?query={safe_query}&per_page=3&orientation=landscape"
        headers = {"Authorization": pexels_key}
        
        resp = requests.get(url, headers=headers, timeout=4)
        if resp.status_code == 200:
            data = resp.json()
            photos = data.get("photos", [])
            if photos:
                srcs = photos[0].get("src", {})
                return srcs.get("landscape") or srcs.get("large")
    except Exception as e:
        print(f"[MenuParser AI] Error consultando Pexels API para '{query}': {e}")

    return None


def fetch_dish_image_url(dish_name: str, search_term: str = "", unsplash_key: str = "", pexels_key: str = "") -> str:
    """
    Motor Híbrido de Imágenes (Unsplash + Pexels + Fallback Mexicano):
    Obtiene la fotografía culinaria más precisa y estética del platillo.
    """
    final_query = normalize_mexican_query(dish_name, search_term)
    
    # 1. Intentar Unsplash API (máxima calidad en fotografía gastronómica)
    if unsplash_key:
        img_url = fetch_unsplash_image(final_query, unsplash_key)
        if img_url:
            return img_url

    # 2. Intentar Pexels API (segundo nivel de respaldo)
    if pexels_key:
        img_url = fetch_pexels_image(final_query, pexels_key)
        if img_url:
            return img_url

    # 3. Fallback categorizado HD si no hay claves o falla la conexión
    return get_fallback_image(final_query)


def detect_target_menu_format(menu_format: str = "auto", previous_menu_summary: str = "") -> str:
    """Detecta si el formato objetivo debe ser 'equivalencias' u 'semanal'."""
    if menu_format in ("equivalencias", "semanal"):
        return menu_format

    summary_lower = (previous_menu_summary or "").lower()
    dias = ["lunes", "martes", "miercoles", "miércoles", "jueves", "viernes", "sabado", "sábado", "domingo", "semanal", "semana"]
    if sum(1 for d in dias if d in summary_lower) >= 2 or "semanal" in summary_lower:
        return "semanal"

    return "equivalencias"


_DISHES_CATALOG_CACHE = None

def get_nutrilev_dishes_catalog() -> list:
    """
    Carga y cachea en memoria el catálogo oficial de platillos y recetas clínicas de Nutrilev.
    """
    global _DISHES_CATALOG_CACHE
    if _DISHES_CATALOG_CACHE is not None:
        return _DISHES_CATALOG_CACHE
    try:
        catalog_path = os.path.join(os.path.dirname(__file__), "..", "data", "dishes_catalog.json")
        if os.path.exists(catalog_path):
            with open(catalog_path, "r", encoding="utf-8") as f:
                _DISHES_CATALOG_CACHE = json.load(f)
                return _DISHES_CATALOG_CACHE
    except Exception as e:
        print(f"[MenuCopilot] Advertencia al cargar catálogo de platillos: {e}")
    return []


def generate_menu_copilot_suggestion(
    patient_context: dict,
    prev_progress: Optional[dict] = None,
    latest_progress: Optional[dict] = None,
    previous_menu_summary: Optional[str] = "",
    target_calories: int = 1800,
    extra_notes: str = "",
    menu_format: str = "auto",
    num_options: int = 3,
    gemini_key: str = ""
) -> dict:
    """
    Copiloto Clínico IA: Genera sugerencias estructuradas de menús, macros y equivalencias
    basadas en el catálogo oficial de 203 platillos de Nutrilev, notas clínicas del paciente,
    delta de avance corporal, historial clínico, patologías y menú anterior.
    Soporta formato 'equivalencias' (3 o 5 opciones intercambiables) o 'semanal' (7 días Lunes a Domingo).
    """
    import json
    import time
    from google import genai
    from google.genai import types

    if not gemini_key:
        raise ValueError("GEMINI_API_KEY no está configurada")

    client = genai.Client(api_key=gemini_key)
    resolved_format = detect_target_menu_format(menu_format, previous_menu_summary or "")
    num_menus = 5 if int(num_options) == 5 else 3

    # 1. Formatear delta de progreso corporal
    delta_lines = []
    if prev_progress and latest_progress:
        prev_date = prev_progress.get("created_at", prev_progress.get("date", "Consulta Anterior"))
        curr_date = latest_progress.get("created_at", latest_progress.get("date", "Consulta Actual"))
        
        delta_lines.append(f"• Consulta previa ({prev_date}): Peso {prev_progress.get('weight', prev_progress.get('peso', 'N/A'))} kg, %Grasa {prev_progress.get('body_fat', prev_progress.get('pct_grasa', 'N/A'))}%, M. Muscular {prev_progress.get('muscle_mass', 'N/A')} kg, Grasa Visceral {prev_progress.get('visceral_fat', prev_progress.get('grasa_visceral', 'N/A'))}")
        delta_lines.append(f"• Consulta actual ({curr_date}): Peso {latest_progress.get('weight', latest_progress.get('peso', 'N/A'))} kg, %Grasa {latest_progress.get('body_fat', latest_progress.get('pct_grasa', 'N/A'))}%, M. Muscular {latest_progress.get('muscle_mass', 'N/A')} kg, Grasa Visceral {latest_progress.get('visceral_fat', latest_progress.get('grasa_visceral', 'N/A'))}")
    elif latest_progress:
        curr_date = latest_progress.get("created_at", latest_progress.get("date", "Reciente"))
        delta_lines.append(f"• Último registro ({curr_date}): Peso {latest_progress.get('weight', latest_progress.get('peso', 'N/A'))} kg, %Grasa {latest_progress.get('body_fat', latest_progress.get('pct_grasa', 'N/A'))}%, M. Muscular {latest_progress.get('muscle_mass', 'N/A')} kg")
    else:
        delta_lines.append("• Sin registros de bioimpedancia previos registrados.")

    progreso_context = "\n".join(delta_lines)

    # 2. Extraer y formatear Notas Clínicas y de Evolución del Paciente
    clinical_notes_parts = []
    if patient_context.get("notas"):
        clinical_notes_parts.append(f"• Notas generales del expediente: {patient_context.get('notas')}")
    if patient_context.get("motivos_consulta"):
        clinical_notes_parts.append(f"• Motivo de consulta / Metas del paciente: {patient_context.get('motivos_consulta')}")
    if patient_context.get("antecedentes_patologicos"):
        clinical_notes_parts.append(f"• Antecedentes patológicos / Cirugías: {patient_context.get('antecedentes_patologicos')}")
    if patient_context.get("medicamentos"):
        clinical_notes_parts.append(f"• Medicamentos actuales: {patient_context.get('medicamentos')}")
    if patient_context.get("dieta_especial"):
        clinical_notes_parts.append(f"• Dieta especial previa / requerimientos: {patient_context.get('dieta_especial')}")
    if patient_context.get("cambios_peso_detalle"):
        clinical_notes_parts.append(f"• Historial de peso / variaciones: {patient_context.get('cambios_peso_detalle')}")
    if patient_context.get("meta_objetivo"):
        clinical_notes_parts.append(f"• Meta u objetivo prioritario: {patient_context.get('meta_objetivo')}")
    if latest_progress and latest_progress.get("notes"):
        curr_date = latest_progress.get("created_at", latest_progress.get("date", "Última cita"))
        clinical_notes_parts.append(f"• Nota clínica de la última consulta ({curr_date}): {latest_progress.get('notes')}")
    if prev_progress and prev_progress.get("notes"):
        prev_date = prev_progress.get("created_at", prev_progress.get("date", "Cita anterior"))
        clinical_notes_parts.append(f"• Nota clínica de la consulta previa ({prev_date}): {prev_progress.get('notes')}")

    clinical_notes_context = "\n".join(clinical_notes_parts) if clinical_notes_parts else "• Sin notas clínicas específicas registradas."

    # 3. Cargar el Catálogo Oficial de Platillos Nutrilev
    dishes_catalog = get_nutrilev_dishes_catalog()
    catalog_lines = []
    for d in dishes_catalog:
        name = d.get("platillo", "")
        desc = d.get("ingredientes_detalle") or d.get("descripcion_ingredientes") or ""
        if desc and len(desc) > 120:
            desc = desc[:120] + "..."
        if name:
            catalog_lines.append(f"• [{name}]: {desc}")
    catalog_text = "\n".join(catalog_lines) if catalog_lines else "• Catálogo estándar SMAE disponible."

    # 4. Schema de respuesta JSON según formato
    meal_item_schema = {
        "type": "OBJECT",
        "properties": {
            "platillo": {"type": "STRING"},
            "ingredientes": {
                "type": "ARRAY",
                "description": "Lista de ingredientes especificando obligatoriamente su medida en tazas/piezas/cucharadas y su peso exacto en gramos (ej. '1/2 taza de avena (40g)', '120g de pechuga de pollo', '1 taza de espinaca baby (30g)').",
                "items": {"type": "STRING"}
            },
            "preparacion_rapida": {"type": "STRING"}
        },
        "required": ["platillo", "ingredientes"]
    }

    if resolved_format == "semanal":
        content_properties = {
            "format_type": {"type": "STRING", "enum": ["semanal"]},
            "clinical_analysis": {
                "type": "OBJECT",
                "properties": {
                    "delta_summary": {"type": "STRING"},
                    "clinical_rationale": {"type": "STRING"},
                    "macro_distribution": {
                        "type": "OBJECT",
                        "properties": {
                            "calories": {"type": "INTEGER"},
                            "protein_g": {"type": "INTEGER"},
                            "protein_pct": {"type": "INTEGER"},
                            "carbs_g": {"type": "INTEGER"},
                            "carbs_pct": {"type": "INTEGER"},
                            "fat_g": {"type": "INTEGER"},
                            "fat_pct": {"type": "INTEGER"}
                        },
                        "required": ["calories", "protein_g", "protein_pct", "carbs_g", "carbs_pct", "fat_g", "fat_pct"]
                    }
                },
                "required": ["delta_summary", "clinical_rationale", "macro_distribution"]
            },
            "days": {
                "type": "ARRAY",
                "description": "Menús para los 7 días de la semana (Lunes a Domingo).",
                "items": {
                    "type": "OBJECT",
                    "properties": {
                        "id": {"type": "INTEGER"},
                        "day_name": {"type": "STRING", "description": "Nombre del día (ej. Lunes, Martes)"},
                        "desayuno": meal_item_schema,
                        "colacion_matutina": meal_item_schema,
                        "comida": meal_item_schema,
                        "colacion_vespertina": meal_item_schema,
                        "cena": meal_item_schema
                    },
                    "required": ["id", "day_name", "desayuno", "colacion_matutina", "comida", "colacion_vespertina", "cena"]
                }
            },
            "formatted_clipboard_text": {
                "type": "STRING",
                "description": "Texto limpio, estructurado y elegante con separadores, listo para copiar y pegar directamente en Word/PDF."
            }
        }
        required_root = ["format_type", "clinical_analysis", "days", "formatted_clipboard_text"]
    else:
        eq_item_schema = {
            "type": "OBJECT",
            "properties": {
                "porciones": {"type": "STRING", "description": "Número de equivalentes/porciones SMAE (ej. '2', '1', '0.5')"},
                "grupo": {"type": "STRING", "enum": ["Cereales", "POA", "Grasas", "Frutas", "Verduras"], "description": "Grupo de alimentos SMAE"},
                "descripcion": {"type": "STRING", "description": "Alimento e ingrediente específico con medida en tazas/piezas y gramos (ej. '2 pzas de tostadas de maíz (30g)')"}
            },
            "required": ["porciones", "grupo", "descripcion"]
        }

        meal_eq_schema = {
            "type": "OBJECT",
            "properties": {
                "nombre_platillo": {"type": "STRING", "description": "Nombre o título breve del platillo o colación (ej. TOSTADAS CON COTTAGE)"},
                "equivalencias": {
                    "type": "ARRAY",
                    "description": "Desglose obligatorio de ingredientes por grupos SMAE (Cereales, POA, Grasas, Frutas, Verduras).",
                    "items": eq_item_schema
                }
            },
            "required": ["nombre_platillo", "equivalencias"]
        }

        content_properties = {
            "format_type": {"type": "STRING", "enum": ["equivalencias"]},
            "clinical_analysis": {
                "type": "OBJECT",
                "properties": {
                    "delta_summary": {"type": "STRING"},
                    "clinical_rationale": {"type": "STRING"},
                    "macro_distribution": {
                        "type": "OBJECT",
                        "properties": {
                            "calories": {"type": "INTEGER"},
                            "protein_g": {"type": "INTEGER"},
                            "protein_pct": {"type": "INTEGER"},
                            "carbs_g": {"type": "INTEGER"},
                            "carbs_pct": {"type": "INTEGER"},
                            "fat_g": {"type": "INTEGER"},
                            "fat_pct": {"type": "INTEGER"}
                        },
                        "required": ["calories", "protein_g", "protein_pct", "carbs_g", "carbs_pct", "fat_g", "fat_pct"]
                    }
                },
                "required": ["delta_summary", "clinical_rationale", "macro_distribution"]
            },
            "menus": {
                "type": "ARRAY",
                "description": f"{num_menus} propuestas completas de menú (MENÚ 1 a MENÚ {num_menus}) en formato oficial SMAE Nutrilev.",
                "items": {
                    "type": "OBJECT",
                    "properties": {
                        "id": {"type": "INTEGER"},
                        "title": {"type": "STRING", "description": "Título en mayúsculas del menú (ej. MENÚ 1 TOSTADAS DE POLLO)"},
                        "desayuno": meal_eq_schema,
                        "colacion_matutina": meal_eq_schema,
                        "comida": meal_eq_schema,
                        "colacion_vespertina": meal_eq_schema,
                        "cena": meal_eq_schema
                    },
                    "required": ["id", "title", "desayuno", "colacion_matutina", "comida", "colacion_vespertina", "cena"]
                }
            },
            "formatted_clipboard_text": {
                "type": "STRING",
                "description": "Texto limpio, estructurado y elegante con separadores, listo para copiar y pegar directamente en Word/PDF."
            }
        }
        required_root = ["format_type", "clinical_analysis", "menus", "formatted_clipboard_text"]

    copilot_schema = {
        "type": "OBJECT",
        "properties": content_properties,
        "required": required_root
    }

    from services.smae_calculator import calculate_smae_dietosintetico, build_smae_instruction_prompt

    smae_diet_data = calculate_smae_dietosintetico(target_calories)
    smae_prompt_instruction = build_smae_instruction_prompt(smae_diet_data) if resolved_format == "equivalencias" else ""

    from datetime import datetime
    WEEKDAYS_ES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
    today_idx = datetime.now().weekday()
    start_idx = (today_idx + 1) % 7
    ordered_days = [WEEKDAYS_ES[(start_idx + i) % 7] for i in range(7)]
    ordered_days_str = ", ".join([f"'{d}'" for d in ordered_days])

    format_instruction = (
        f"ESTRUCTURA OBJETIVO OBLIGATORIA: Generar un plan en formato 'SEMANAL'. El plan DEBE comenzar a partir de mañana ({ordered_days[0]}). Debes incluir EXACTAMENTE 7 días consecutivos en el arreglo 'days' con 'day_name' en este orden secuencial estricto iniciando mañana: {ordered_days_str} con platillos distintos y variados para cada día."
        if resolved_format == "semanal"
        else f"ESTRUCTURA OBJETIVO OBLIGATORIA: Generar un plan en formato 'EQUIVALENCIAS'. Debes incluir EXACTAMENTE {num_menus} opciones en el arreglo 'menus' (MENÚ 1 a MENÚ {num_menus}). Para Desayuno, Colación Matutina, Comida, Colación Vespertina y Cena en cada menú, debes desglosar en 'equivalencias' los grupos SMAE ('Cereales', 'POA', 'Grasas', 'Frutas', 'Verduras') con sus porciones 'porciones' (Eq) e ingredientes 'descripcion' con tazas/piezas y gramos.\n\n{smae_prompt_instruction}"
    )

    system_prompt = (
        "Eres NutriArchitect Copilot, un asistente clínico de élite especializado en nutrición de precisión (Sistema Mexicano de Alimentos Equivalentes - SMAE). "
        "Tu objetivo es asistir al nutriólogo generando propuestas de menús clínicas fundamentadas, variadas y listas para su revisión y copiado rápido.\n\n"
        "REGLAS INQUEBRANTABLES:\n"
        "1. CATÁLOGO OFICIAL DE PLATILLOS NUTRILIV (PRIORITARIO): Basa preferentemente los desayunos, comidas, cenas y colaciones en el 'CATÁLOGO OFICIAL DE PLATILLOS NUTRILIV' provisto más abajo. Utiliza los nombres de platillos y combinaciones de ingredientes de la clínica, adaptando las cantidades/porciones a las calorías objetivo del paciente.\n"
        "2. FORMATO EQUIVALENCIAS NUTRILIV SMAE: Cuando el formato sea 'EQUIVALENCIAS', clasifica estrictamente cada ingrediente de Desayuno, Comida y Cena en su grupo de alimento SMAE ('Cereales', 'POA', 'Grasas', 'Frutas', 'Verduras'). Especifica el número de equivalentes/porciones en 'porciones' (ej. '2', '1', '0.5') y la descripción detallada con medida en tazas/piezas Y gramos en 'descripcion'. Ejemplos obligatorios:\n"
        "   - Grupo: 'Cereales', porciones: '2', descripcion: '2 pzas de tostadas de maíz horneadas (30g)'\n"
        "   - Grupo: 'POA', porciones: '2', descripcion: '120g de pechuga de pollo a la plancha'\n"
        "   - Grupo: 'Grasas', porciones: '1', descripcion: '1/2 pza de aguacate (60g)'\n"
        "   - Grupo: 'Frutas', porciones: '1', descripcion: '1 taza de fresas rebanadas (150g)'\n"
        "   - Grupo: 'Verduras', porciones: '1', descripcion: '1 taza de pepino picado (120g)'\n"
        "3. NOTAS CLÍNICAS Y EVOLUCIÓN: Lee con extrema atención las notas del expediente y las notas de las consultas de seguimiento. Si las notas indican síntomas (ej. reflujo, estreñimiento, horarios complicados, pesadez nocturna, antojos de dulce o salado, etc.), adapta los alimentos para abordar directamente esas observaciones.\n"
        "4. EXCLUSIÓN ABSOLUTA: Jamás incluyas ingredientes reportados en 'alergias_alimentarias' ni en 'alimentos_no_agradan'.\n"
        "5. PREFERENCIAS: Incluye con frecuencia los alimentos en 'alimentos_preferidos'.\n"
        "6. PATOLOGÍAS: Adapta la selección a sus patologías (ej. hipotiroidismo, diabetes, hipertensión, SOP, colon irritable, etc.).\n"
        "7. ANTI-MONOTONÍA: Si se provee información del menú anterior, ofrece platillos frescos y variados sin repetir idénticamente la misma semana.\n"
        f"8. {format_instruction}\n"
        "9. TEXTO PARA PORTAPAPELES: 'formatted_clipboard_text' debe ser estéticamente impecable, organizado por filas de grupos SMAE y columnas de Menú 1, 2 y 3."
    )

    user_prompt = f"""
DATOS DEL PACIENTE:
• Nombre: {patient_context.get('nombre', 'Paciente')}
• Edad: {patient_context.get('edad', 'N/A')} años | Sexo: {patient_context.get('sexo', 'N/A')} | Estatura: {patient_context.get('estatura', 'N/A')} cm
• Ocupación / Estilo de vida: {patient_context.get('ocupacion', 'N/A')}
• Patologías / Diagnóstico: {patient_context.get('enfermedades', 'Ninguna reportada')}
• Alergias e intolerancias: {patient_context.get('alergias_alimentarias', 'Ninguna reportada')}
• Alimentos favoritos (Gusta): {patient_context.get('alimentos_preferidos', 'No especificado')}
• Alimentos que evita (No le gustan): {patient_context.get('alimentos_no_agradan', 'No especificado')}
• Número de comidas al día: {patient_context.get('comidas_dia', 5)}

NOTAS CLÍNICAS Y OBSERVACIONES DEL PACIENTE:
{clinical_notes_context}

EVOLUCIÓN CLÍNICA Y ANTROPOMETRÍA:
{progreso_context}

OBJETIVO CALÓRICO Y FORMATO:
• Formato solicitado: {resolved_format.upper()}
• Calorías objetivo: {target_calories} kcal
• Notas adicionales de la sesión: {extra_notes or 'Diseñar menú balanceado, variado y con preparaciones sencillas.'}
• Referencia de menú anterior: {previous_menu_summary or 'No especificado.'}

{smae_prompt_instruction}

CATÁLOGO OFICIAL DE PLATILLOS NUTRILIV (Selecciona y combina preferentemente de esta lista de recetas oficiales):
{catalog_text}

Genera la sugerencia clínica en formato JSON cumpliendo con el schema requerido.
"""

    models_to_try = ["gemini-2.5-flash", "gemini-3.1-flash-lite"]
    last_error = None

    for model in models_to_try:
        try:
            print(f"[MenuCopilot] Llamando a Gemini con modelo: {model} (formato: {resolved_format}, platillos catálogo: {len(dishes_catalog)})")
            response = client.models.generate_content(
                model=model,
                contents=[{"role": "user", "parts": [{"text": system_prompt + "\n\n" + user_prompt}]}],
                config=types.GenerateContentConfig(
                    temperature=0.2,
                    response_mime_type="application/json",
                    response_schema=copilot_schema
                )
            )
            raw_text = response.text.strip()
            parsed = json.loads(raw_text)
            parsed["format_type"] = resolved_format
            
            # Sanitizar y normalizar respuesta post-IA
            parsed = sanitize_copilot_response(parsed)
            return parsed
        except Exception as e:
            last_error = e
            delay = extract_retry_delay(e)
            print(f"[MenuCopilot] Error con modelo {model}: {e}")
            if delay > 0 and delay <= 10.0:
                print(f"[MenuCopilot] Esperando {delay}s por límite de tasa...")
                time.sleep(delay)
            else:
                print(f"[MenuCopilot] Descartando {model} inmediatamente y probando fallback...")

    raise RuntimeError(f"No fue posible generar la sugerencia con IA: {last_error}")