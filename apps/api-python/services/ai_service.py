"""
ai_service.py — Nutrilev AI Menu Orchestrator v4.0
====================================================
Orquestador principal que integra Gemini y la generación de DOCX.
"""

from services.docx_utils import (
    Document, _build_docx, GRUPOS_PERMITIDOS, _norm_g
)
from services.gemini_engine import _call_gemini

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