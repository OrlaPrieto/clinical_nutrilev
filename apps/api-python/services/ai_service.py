"""
ai_service.py — Nutrilev AI Menu Orchestrator v4.0
====================================================
Orquestador principal que integra Gemini y la generación de DOCX.
"""

from services.docx_utils import (
    Document, _build_docx, GRUPOS_PERMITIDOS, _norm_g
)
from services.gemini_engine import _call_gemini, _resolve_model

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

def generate_shopping_list_json(menu_data: dict, gemini_key: str) -> list:
    """
    Genera la lista de compras en formato JSON estructurado.
    """
    import re
    import json
    from google import genai
    from google.genai import types
    from pydantic import BaseModel, Field
    from typing import List, Optional

    class ShoppingItem(BaseModel):
        icon: str = Field(description="Un único emoji que represente de forma exacta el alimento (ej. 🥬 para lechuga, 🍗 para pollo, 🥛 para leche, 🍚 para arroz). Si es genérico, usar 🛒.")
        name: str = Field(description="Nombre del ingrediente (ej. Pechuga de pollo, Jamón de pavo, Atún en agua, Queso panela, Brócoli, Espinacas).")
        amount: str = Field(description="Cantidad consolidada total necesaria para toda la semana. Suma las porciones repetidas a lo largo de los 7 días y conviértelas a una unidad de compra realista y de supermercado (ej. 1.2 kg, 8 rebanadas, 2 latas grandes, 3 piezas).")
        tip: Optional[str] = Field(description="Consejo clínico o de compra sumamente práctico (ej. 'Elegir jamón bajo en sodio', 'Comprar en paquete familiar y congelar', 'Yogur sin azúcar añadida', 'Buscar hojas firmes y sin manchas').")

    class ShoppingCategoryGroup(BaseModel):
        category: str = Field(description="Categoría principal exacta con su emoji respectivo. Debe ser una de las siguientes opciones: 🥩 PROTEÍNAS, 🥛 LÁCTEOS Y SUSTITUTOS, 🥦 VERDURAS Y HORTALIZAS, 🍎 FRUTAS FRESCAS, 🍞 CEREALES Y TUBÉRCULOS, 🥜 GRASAS Y SEMILLAS, 🧂 DESPENSA Y CONDIMENTOS, 🍵 BEBIDAS.")
        items: List[ShoppingItem] = Field(description="Lista de ingredientes agrupados bajo esta categoría.")

    class ShoppingListResponse(BaseModel):
        categories: List[ShoppingCategoryGroup] = Field(description="Agrupación de categorías principales de compras.")

    todos_ingredientes = menu_data.get("todos_ingredientes", [])
    ingredientes_str = "\n".join(todos_ingredientes)
    
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
    
    client = genai.Client(api_key=gemini_key)
    models_to_try = _resolve_model(client)

    for model in models_to_try:
        try:
            response = client.models.generate_content(
                model=model,
                contents=[{"role": "user", "parts": [{"text": system_prompt + "\n\n" + prompt}]}],
                config=types.GenerateContentConfig(
                    temperature=0.1,
                    response_mime_type="application/json",
                    response_schema=ShoppingListResponse
                ),
            )
            text = response.text.strip()
            data = json.loads(text)
            return data.get("categories", [])
        except Exception as e:
            print(f"[Gemini JSON Shopping List] Error with {model}: {e}")
            
    return [
        {
            "category": "⚠️ ERROR AL GENERAR",
            "items": [{"icon": "❌", "name": "No se pudo conectar con Gemini", "amount": "-", "tip": "Reintente más tarde"}]
        }
    ]