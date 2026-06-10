import json
import re
from google import genai
from google.genai import types

# ─────────────────────────────────────────────────────────────────────────────
# PROMPTS Y CONFIGURACIÓN GEMINI
# ─────────────────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """Eres NutriArchitect, sistema experto en nutrición clínica. Generas planes de alimentación en JSON estricto. NUNCA produces texto fuera del JSON.

═══════════════════════════════════════
REGLA FUNDAMENTAL DE EQUIVALENCIAS
═══════════════════════════════════════
Para cada tiempo de comida (desayuno_platillo, desayuno_licuado, comida, cena),
las equivalencias son FIJAS para los 3 menús.
Esto significa: menu_1, menu_2 y menu_3 tienen EXACTAMENTE los mismos grupos
y las mismas porciones. Solo cambia EL PLATILLO (nombre, descripción e ingredientes).

═══════════════════════════════════════
GRUPOS PERMITIDOS (usa solo estos 8):
═══════════════════════════════════════
CER-SF  Cereal sin grasa     70 kcal  | 2g prot | 0g gra | 15g HCO
CER-CF  Cereal con grasa    115 kcal  | 2g prot | 5g gra | 15g HCO
POA-M   Proteína magra       55 kcal  | 7g prot | 3g gra |  0g HCO
POA-Me  Proteína media gra   75 kcal  | 7g prot | 5g gra |  0g HCO
POA-A   Proteína alta gra   100 kcal  | 7g prot | 8g gra |  0g HCO
GRA     Grasas               45 kcal  | 0g prot | 5g gra |  0g HCO
VER     Verduras              25 kcal  | 2g prot | 0g gra |  4g HCO
FRU     Frutas                60 kcal  | 0g prot | 0g gra | 15g HCO

═══════════════════════════════════════
REGLAS DE DESCRIPCIÓN — MUY IMPORTANTE
═══════════════════════════════════════
Cada "descripcion" dentro de una equivalencia DEBE ser completa y específica.
NUNCA escribas solo "2 piezas", "1 taza", "3 pzas".
SIEMPRE especifica QUÉ ES: "210 g pechuga de pollo a la plancha",
"2 tortillas de maíz (30 g c/u)", "1 tz espinaca + jitomate cherry".

Estructura JSON requerida:
{
  "metadata": { "paciente_nombre": "", "objetivo_clinico": "", "calorias_objetivo": 1600, "advertencias_clinicas": [] },
  "esquema_dia": { "desayuno_platillo": { "equivalencias_fijas": [], "kcal_total": 0 }, ... },
  "menus": { "menu_1": { ... }, "menu_2": { ... }, "menu_3": { ... } }
}
"""

def _build_user_prompt(historial: dict, calorias: int, notas: str) -> str:
    from services.docx_utils import _format_date
    progreso_str = "No hay registros previos."
    if historial.get("progreso_historial"):
        lines = []
        for i, r in enumerate(historial["progreso_historial"][:3]):
            date_val = r.get("date") or r.get("created_at") or "N/A"
            lines.append(f"- Registro {i} ({_format_date(date_val)}): Peso {r.get('peso')}kg, %Grasa {r.get('pct_grasa')}%")
        progreso_str = "\n".join(lines)

    return f"""Genera el menú clínico COMPLETO para este paciente.
DATOS: {historial.get('nombre')} | Objetivo: {calorias} kcal.
PATOLOGÍAS: {historial.get('enfermedades')} | ALERGIAS: {historial.get('alergias_alimentarias')}
HISTORIAL: {progreso_str}
NOTAS: {notas}
"""

_RESOLVED_MODEL_CACHE = None

def _resolve_model(client) -> list:
    global _RESOLVED_MODEL_CACHE
    if _RESOLVED_MODEL_CACHE is not None:
        return _RESOLVED_MODEL_CACHE
        
    try:
        visible = [m.name for m in client.models.list()]
        priority = ["models/gemini-2.5-flash", "models/gemini-2.0-flash", "models/gemini-1.5-flash"]
        # Filtrar modelos obsoletos/deprecados como lite o 001 para evitar errores 404
        models_to_try = [
            m for p in priority for m in visible 
            if p in m and "lite" not in m and "001" not in m
        ]
        if models_to_try:
            _RESOLVED_MODEL_CACHE = models_to_try
            return _RESOLVED_MODEL_CACHE
    except Exception as e:
        print(f"[Gemini Cache] Error listing models: {e}")
        
    # Default fallback list (don't cache fallback to allow retrying listing next time)
    return ["models/gemini-2.5-flash"]

def _call_gemini(historial: dict, calorias: int, notas: str, menu_base_texto: str, gemini_key: str) -> dict:
    client = genai.Client(api_key=gemini_key)
    models_to_try = _resolve_model(client)

    prompt = _build_user_prompt(historial, calorias, notas)
    for model in models_to_try:
        try:
            response = client.models.generate_content(
                model=model,
                contents=[{"role": "user", "parts": [{"text": SYSTEM_PROMPT + "\n\n" + prompt}]}],
                config=types.GenerateContentConfig(temperature=0.1, response_mime_type="application/json"),
            )
            text = response.text.strip()
            text = re.sub(r"^```json\s*", "", text); text = re.sub(r"\s*```$", "", text)
            return json.loads(text)
        except Exception as e:
            print(f"[Gemini] Error with {model}: {e}")
    return {}
