"""
menu_generator.py — Nutrilev AI Menu Generator v3.2
====================================================
Cambios v3.2:
  - Equivalencias FIJAS por tiempo de comida: los 3 menús comparten
    EXACTAMENTE los mismos grupos y porciones. Solo cambia el platillo.
  - Grupo FRUTAS agregado (FRU) con su color propio.
  - Descripciones siempre completas (ej: "210 g pechuga de pollo a la plancha").
  - Schema-first: Gemini recibe el esquema de equivalencias del día primero
    y luego crea platillos que lo cumplan.
  - Consolidación de grupos duplicados mejorada.
"""

import json
import re
from datetime import datetime
from io import BytesIO

from docx import Document
from docx.shared import Pt, RGBColor, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
from google import genai
from google.genai import types


# ─────────────────────────────────────────────────────────────────────────────
# CONSTANTES FIJAS
# ─────────────────────────────────────────────────────────────────────────────

NUTRIOLOGA = "Velvet Anakaren De la Cruz Villegas"

# Grupos permitidos — ahora incluye FRU
GRUPOS_PERMITIDOS = ["CER-SF", "CER-CF", "POA-M", "POA-Me", "POA-A", "GRA", "VER", "FRU"]

def _norm_g(g: str) -> str:
    """Mapeo flexible de nombres largos a cortos para coincidir con GRUPOS_PERMITIDOS"""
    if not g: return ""
    gn = g.upper().replace(" ", "")
    if "FRUT" in gn: return "FRU"
    if "VERD" in gn: return "VER"
    if "CEREAL" in gn: return "CER-SF"
    if "GRASA" in gn: return "GRA"
    if "POA" in gn: return "POA-M"
    return g

# Alimentos fijos — exactos del base
ALIMENTOS_BENEFICIAN = [
    "🐟 Omega-3: salmón, sardina, chía, linaza molida.",
    "🌿 Antiinflamatorios: cúrcuma, jengibre, canela, té verde.",
    "🥦 Verduras crucíferas cocidas: brócoli, col, coliflor.",
    "🍓 Frutas: fresa, papaya, piña, plátano.",
    "🥬 Verduras cocidas: calabacita, zanahoria, espinaca.",
]

ALIMENTOS_EVITAR = [
    "❌ Embutidos, carnes procesadas y frituras.",
    "❌ Azúcar refinada, postres y bebidas endulzadas.",
    "❌ Lácteos enteros (preferir deslactosados).",
    "❌ Cafeína y bebidas energéticas.",
    "❌ Alimentos ultraprocesados con aditivos.",
    "❌ Alcohol (especialmente vino y cerveza).",
    "❌ Edulcorantes: sorbitol, manitol, xilitol.",
]


# ─────────────────────────────────────────────────────────────────────────────
# COLORES DEL TEMA
# ─────────────────────────────────────────────────────────────────────────────
COLORS = {
    "header_purple":     "976CA0",
    "header_red":        "EE0000",
    "header_dark_green": "1B6B3A",
    "header_teal":       "1A7A6E",
    "header_desayuno":   "155724",
    "header_moon":       "7D4E00",

    # Grupos de equivalencias
    "grupo_cereal_num":  "664D00",  "grupo_cereal_bg":  "FFF3CD",
    "grupo_poa_num":     "0C5460",  "grupo_poa_bg":     "D1ECF1",
    "grupo_grasa_num":   "7D4E00",  "grupo_grasa_bg":   "FDEBD0",
    "grupo_verdura_num": "155724",  "grupo_verdura_bg": "D4EDDA",
    "grupo_fruta_num":   "7A4000",  "grupo_fruta_bg":   "FDE8C8",   # nuevo

    # Columnas de menú
    "menu1_bg":   "E8F5F3",  "menu1_text": "1A7A6E",
    "menu2_bg":   "FFF3E8",  "menu2_text": "E8762B",
    "menu3_bg":   "F3EEF9",  "menu3_text": "7B3DB5",

    # Colaciones
    "colacion_bg":     "94E4EF",
    "colacion_border": "1A7A6E",
    "colacion_text":   "555555",

    # Composición corporal
    "comp_verde_bg": "F0FAF4",
    "comp_rojo_bg":  "FDE8E2",
    "comp_azul_bg":  "EBF4FA",
    "comp_gris_bg":  "F7F7F7",

    # Info / objetivos / aviso
    "info_bg":     "F0FAF4",
    "info_border": "52B788",
    "info_text":   "1B6B3A",
    "obj_border":  "52B788",
    "warn_bg":     "FFF9E6",
    "warn_border": "F0AD4E",
    "warn_text":   "0C5460",
    "avoid_bg":    "FFF0F0",
    "avoid_border":"E76F51",
    "neutral_bg":  "F7F7F7",

    # Texto
    "text_dark":   "1A1A1A",
    "text_mid":    "444444",
    "text_light":  "777777",
    "text_muted":  "555555",
    "orange_label":"E8762B",
    "teal_label":  "1A7A6E",
    "white":       "FFFFFF",
}

# Mapeo grupo → (fondo número, fondo label, etiqueta visible)
GROUP_COLORS = {
    "CER-SF": (COLORS["grupo_cereal_num"],  COLORS["grupo_cereal_bg"],  "CEREALES"),
    "CER-CF": (COLORS["grupo_cereal_num"],  COLORS["grupo_cereal_bg"],  "CEREALES"),
    "POA-M":  (COLORS["grupo_poa_num"],     COLORS["grupo_poa_bg"],     "POA"),
    "POA-Me": (COLORS["grupo_poa_num"],     COLORS["grupo_poa_bg"],     "POA"),
    "POA-A":  (COLORS["grupo_poa_num"],     COLORS["grupo_poa_bg"],     "POA"),
    "GRA":    (COLORS["grupo_grasa_num"],   COLORS["grupo_grasa_bg"],   "GRASAS"),
    "VER":    (COLORS["grupo_verdura_num"], COLORS["grupo_verdura_bg"], "VERDURAS"),
    "FRU":    (COLORS["grupo_fruta_num"],   COLORS["grupo_fruta_bg"],   "FRUTAS"),
}


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS DE FECHA
# ─────────────────────────────────────────────────────────────────────────────

def _format_date(date_val) -> str:
    if not date_val:
        return ""
    s = str(date_val)[:10]
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(s, fmt).strftime("%d-%m-%Y")
        except ValueError:
            continue
    return s


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS DE FORMATO DOCX
# ─────────────────────────────────────────────────────────────────────────────

def _rgb(hex_str: str) -> RGBColor:
    h = hex_str.lstrip("#")
    return RGBColor(int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


def _set_cell_bg(cell, hex_color: str):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hex_color.upper())
    tcPr.append(shd)


def _set_cell_borders(cell, color: str = "CCCCCC", size: int = 3):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    tcBorders = OxmlElement("w:tcBorders")
    for side in ("top", "left", "bottom", "right"):
        el = OxmlElement(f"w:{side}")
        el.set(qn("w:val"), "single")
        el.set(qn("w:sz"), str(size))
        el.set(qn("w:space"), "0")
        el.set(qn("w:color"), color.upper())
        tcBorders.append(el)
    tcPr.append(tcBorders)


def _set_cell_no_borders(cell):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    tcBorders = OxmlElement("w:tcBorders")
    for side in ("top", "left", "bottom", "right"):
        el = OxmlElement(f"w:{side}")
        el.set(qn("w:val"), "none")
        el.set(qn("w:sz"), "0")
        el.set(qn("w:space"), "0")
        el.set(qn("w:color"), "FFFFFF")
        tcBorders.append(el)
    tcPr.append(tcBorders)


def _set_cell_margins(cell, top=80, left=120, bottom=80, right=120):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    tcMar = OxmlElement("w:tcMar")
    for side, val in (("top", top), ("left", left), ("bottom", bottom), ("right", right)):
        el = OxmlElement(f"w:{side}")
        el.set(qn("w:w"), str(val))
        el.set(qn("w:type"), "dxa")
        tcMar.append(el)
    tcPr.append(tcMar)


def _set_cell_valign(cell, align: str = "center"):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    vAlign = OxmlElement("w:vAlign")
    vAlign.set(qn("w:val"), align)
    tcPr.append(vAlign)


def _set_table_width(table, width_dxa: int = 10800):
    tblPr = table._tbl.find(qn("w:tblPr"))
    if tblPr is None:
        tblPr = OxmlElement("w:tblPr")
        table._tbl.insert(0, tblPr)
    tblW = OxmlElement("w:tblW")
    tblW.set(qn("w:w"), str(width_dxa))
    tblW.set(qn("w:type"), "dxa")
    tblPr.append(tblW)


def _apply_col_widths(table, widths: list):
    tbl = table._tbl
    tblGrid = OxmlElement("w:tblGrid")
    for w in widths:
        gridCol = OxmlElement("w:gridCol")
        gridCol.set(qn("w:w"), str(w))
        tblGrid.append(gridCol)
    tblPr = tbl.find(qn("w:tblPr"))
    if tblPr is not None:
        tblPr.addnext(tblGrid)
    else:
        tbl.insert(0, tblGrid)


def _add_run(para, text: str, bold=False, size_pt=8.5,
             color="1A1A1A", font="Arial", italic=False):
    run = para.add_run(text)
    run.bold = bold
    run.italic = italic
    run.font.name = font
    run.font.size = Pt(size_pt)
    run.font.color.rgb = _rgb(color)
    return run


def _add_spacing(doc, before_pt=1.5, after_pt=1.5):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(before_pt)
    p.paragraph_format.space_after = Pt(after_pt)


def _fmt_val(record: dict, keys: list, unit: str = "") -> str:
    for k in keys:
        v = record.get(k)
        if v is not None and v != "" and v != 0:
            return f"{v} {unit}".strip() if unit else str(v)
    return "—"


# ─────────────────────────────────────────────────────────────────────────────
# BLOQUES ESTRUCTURALES
# ─────────────────────────────────────────────────────────────────────────────

def _add_section_header(doc, text: str, bg_color: str,
                         text_color: str = "FFFFFF", font_size_pt: float = 12.0,
                         bold: bool = True):
    table = doc.add_table(rows=1, cols=1)
    table.style = "Table Grid"
    _set_table_width(table, 10800)
    cell = table.cell(0, 0)
    _set_cell_no_borders(cell)
    _set_cell_bg(cell, bg_color)
    _set_cell_margins(cell, top=120, left=220, bottom=120, right=220)
    p = cell.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run(text)
    run.bold = bold
    run.font.name = "Arial"
    run.font.size = Pt(font_size_pt)
    run.font.color.rgb = _rgb(text_color)
    _add_spacing(doc)


def _add_label_paragraph(doc, emoji_text: str, label: str,
                          color: str = "E8762B", size_pt: float = 9.0):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(3)
    p.paragraph_format.space_after = Pt(2)
    _add_run(p, emoji_text + label, bold=True, size_pt=size_pt, color=color)


# ─────────────────────────────────────────────────────────────────────────────
# GEMINI — SISTEMA PROMPT v3.2
# Enfoque: Schema-first. Gemini define las equivalencias del día UNA VEZ,
# luego genera 3 platillos distintos que cumplan ese mismo esquema.
# ─────────────────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """Eres NutriArchitect, sistema experto en nutrición clínica. Generas planes de alimentación en JSON estricto. NUNCA produces texto fuera del JSON.

═══════════════════════════════════════
REGLA FUNDAMENTAL DE EQUIVALENCIAS
═══════════════════════════════════════
Para cada tiempo de comida (desayuno_platillo, desayuno_licuado, comida, cena),
las equivalencias son FIJAS para los 3 menús.
Esto significa: menu_1, menu_2 y menu_3 tienen EXACTAMENTE los mismos grupos
y las mismas porciones. Solo cambia EL PLATILLO (nombre, descripción e ingredientes).

Ejemplo correcto ✅:
  comida.equivalencias_fijas = [POA-M×7, CER-SF×2, VER×2, GRA×2]
  menu_1: Tostadas de Pollo   → POA-M "210g pechuga de pollo a la plancha"
  menu_2: Bowl de Atún        → POA-M "210g atún en agua escurrido"
  menu_3: Molida de Res       → POA-M "210g pulpa molida de res"

Ejemplo incorrecto ❌:
  menu_1: POA×3, VER×2
  menu_2: POA×5, CER×1
  menu_3: POA×2, GRA×1

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

La "descripcion" del platillo también debe ser rica:
"210 g pechuga de pollo marinada • 2 tortillas de maíz • 1 tz brócoli al vapor • ½ aguacate"

═══════════════════════════════════════
OTRAS REGLAS:
═══════════════════════════════════════
1. DESAYUNO: 2 bloques independientes por menú.
   - platillo_solido: huevo, avena, etc.
   - licuado: ingredientes DISTINTOS al platillo sólido del mismo día.
   - Ambos bloques comparten equivalencias_fijas entre menús.

2. CUADRATURA: suma kcal diaria = calorias_objetivo ±50 kcal.

3. PROHIBICIONES: ningún alimento de alergias/no_agradan.

4. RESTRICCIONES POR PATOLOGÍA:
   Gastritis→sin picante/cítricos/café | Colitis→sin flatulentos
   Vesícula→sin grasas saturadas/frituras | SOP→bajo IG
   Hígado graso→sin alcohol/grasas saturadas
   Endometriosis→antiinflamatorio/omega-3 | Estreñimiento→fibra/hidratación

5. PROGRESO: Prioriza el registro MÁS RECIENTE. Ajusta macros si hay estancamiento.

6. TRES MENÚS semanales. Platillos DISTINTOS entre menús, pero mismas equivalencias.
   Menú 1: lunes-martes | Menú 2: miércoles-jueves | Menú 3: vie-sab-dom

7. COLACIONES: incluir si comidas_dia >= 4. Las colaciones también tienen
   equivalencias_fijas iguales para los 3 menús (o usar colacion_global).

8. Responde SOLO con el JSON. Sin markdown. Sin texto extra.

═══════════════════════════════════════
ESTRUCTURA JSON — OBLIGATORIA:
═══════════════════════════════════════
{
  "metadata": {
    "paciente_nombre": "string",
    "objetivo_clinico": "string",
    "calorias_objetivo": 1600,
    "advertencias_clinicas": ["string"]
  },
  "esquema_dia": {
    "desayuno_platillo": {
      "equivalencias_fijas": [
        {"grupo": "POA-M",  "porciones": 2, "kcal_grupo": 110},
        {"grupo": "CER-SF", "porciones": 2, "kcal_grupo": 140},
        {"grupo": "VER",    "porciones": 1, "kcal_grupo":  25},
        {"grupo": "GRA",    "porciones": 1, "kcal_grupo":  45}
      ],
      "kcal_total": 320
    },
    "desayuno_licuado": {
      "equivalencias_fijas": [
        {"grupo": "FRU", "porciones": 1, "kcal_grupo": 60},
        {"grupo": "VER", "porciones": 1, "kcal_grupo": 25}
      ],
      "kcal_total": 85
    },
    "colacion_matutina": {
      "equivalencias_fijas": [
        {"grupo": "GRA", "porciones": 1, "kcal_grupo": 45},
        {"grupo": "FRU", "porciones": 0.5, "kcal_grupo": 30}
      ],
      "kcal_total": 75
    },
    "comida": {
      "equivalencias_fijas": [
        {"grupo": "POA-M",  "porciones": 7, "kcal_grupo": 385},
        {"grupo": "CER-SF", "porciones": 2, "kcal_grupo": 140},
        {"grupo": "VER",    "porciones": 2, "kcal_grupo":  50},
        {"grupo": "GRA",    "porciones": 2, "kcal_grupo":  90}
      ],
      "kcal_total": 665
    },
    "colacion_vespertina": {
      "equivalencias_fijas": [
        {"grupo": "VER", "porciones": 1, "kcal_grupo": 25},
        {"grupo": "GRA", "porciones": 1, "kcal_grupo": 45}
      ],
      "kcal_total": 70
    },
    "cena": {
      "equivalencias_fijas": [
        {"grupo": "POA-M",  "porciones": 4, "kcal_grupo": 220},
        {"grupo": "CER-SF", "porciones": 2, "kcal_grupo": 140},
        {"grupo": "VER",    "porciones": 1, "kcal_grupo":  25},
        {"grupo": "GRA",    "porciones": 1, "kcal_grupo":  45}
      ],
      "kcal_total": 430
    },
    "kcal_dia_total": 1645
  },
  "menus": {
    "menu_1": {
      "desayuno": {
        "platillo_solido": {
          "nombre": "Omelette de Champiñones con Tortillas",
          "descripcion": "1 huevo + 2 claras • 1 tz champiñones salteados • 2 tortillas de maíz • aceite aerosol",
          "equivalencias": [
            {"grupo": "POA-M",  "porciones": 2, "descripcion": "1 huevo entero + 2 claras de huevo"},
            {"grupo": "CER-SF", "porciones": 2, "descripcion": "2 tortillas de maíz (30 g c/u)"},
            {"grupo": "VER",    "porciones": 1, "descripcion": "1 tz de champiñones + espinaca salteada"},
            {"grupo": "GRA",    "porciones": 1, "descripcion": "aceite aerosol (2 segundos)"}
          ],
          "kcal_total": 320
        },
        "licuado": {
          "nombre": "Licuado Verde Manzana",
          "descripcion": "espinacas + manzana verde + pepino + agua natural",
          "equivalencias": [
            {"grupo": "FRU", "porciones": 1, "descripcion": "1 manzana verde mediana (150 g)"},
            {"grupo": "VER", "porciones": 1, "descripcion": "1 tz espinacas crudas + ½ tz pepino"}
          ],
          "kcal_total": 85
        },
        "kcal_total": 405
      },
      "colacion_matutina": {
        "descripcion": "10 almendras naturales + ½ taza de fresas",
        "equivalencias": [
          {"grupo": "GRA", "porciones": 1, "descripcion": "10 almendras naturales sin sal"},
          {"grupo": "FRU", "porciones": 0.5, "descripcion": "½ tz de fresas frescas"}
        ],
        "kcal_total": 75
      },
      "comida": {
        "nombre": "Tostadas de Pollo al Pastor",
        "descripcion": "210 g pechuga de pollo con adobo natural • 2 tostadas Saníssimo • 1 tz lechuga + jitomate • ½ aguacate",
        "equivalencias": [
          {"grupo": "POA-M",  "porciones": 7, "descripcion": "210 g pechuga de pollo picada con adobo natural (chile guajillo, vinagre)"},
          {"grupo": "CER-SF", "porciones": 2, "descripcion": "2 tostadas Saníssimo horneadas"},
          {"grupo": "VER",    "porciones": 2, "descripcion": "1 tz lechuga romana + 1 jitomate mediano + zanahoria rallada"},
          {"grupo": "GRA",    "porciones": 2, "descripcion": "½ aguacate mediano (60 g)"}
        ],
        "kcal_total": 665
      },
      "colacion_vespertina": {
        "descripcion": "½ taza yogurt natural sin azúcar + 6 mitades de nuez",
        "equivalencias": [
          {"grupo": "VER", "porciones": 1, "descripcion": "½ tz yogurt natural sin azúcar (130 g)"},
          {"grupo": "GRA", "porciones": 1, "descripcion": "6 mitades de nuez de castilla"}
        ],
        "kcal_total": 70
      },
      "cena": {
        "nombre": "Tostadas de Cottage con Aguacate",
        "descripcion": "1 tz queso cottage • 2 tostadas Saníssimo • 1 tz lechuga + jitomate • ¼ aguacate",
        "equivalencias": [
          {"grupo": "POA-M",  "porciones": 4, "descripcion": "1 tz queso cottage o requesón (230 g)"},
          {"grupo": "CER-SF", "porciones": 2, "descripcion": "2 tostadas Saníssimo horneadas"},
          {"grupo": "VER",    "porciones": 1, "descripcion": "1 tz lechuga + jitomate cherry"},
          {"grupo": "GRA",    "porciones": 1, "descripcion": "¼ aguacate mediano (30 g)"}
        ],
        "kcal_total": 430
      },
      "kcal_dia_total": 1645
    },
    "menu_2": {
      "/* Mismas equivalencias_fijas del esquema, platillos distintos */": "",
      "desayuno": {
        "platillo_solido": {
          "nombre": "Nopal con Queso Panela",
          "descripcion": "60 g queso panela • 2 pencas de nopal asadas • 2 tortillas de maíz • ½ aguacate",
          "equivalencias": [
            {"grupo": "POA-M",  "porciones": 2, "descripcion": "60 g queso panela bajo en sodio (Nochebuena/Zwan)"},
            {"grupo": "CER-SF", "porciones": 2, "descripcion": "2 tortillas de maíz (30 g c/u)"},
            {"grupo": "VER",    "porciones": 1, "descripcion": "2 pencas de nopal asadas + cebolla"},
            {"grupo": "GRA",    "porciones": 1, "descripcion": "aceite aerosol (2 segundos)"}
          ],
          "kcal_total": 320
        },
        "licuado": {
          "nombre": "Licuado de Papaya con Chía",
          "descripcion": "papaya + espinacas + chía + agua natural",
          "equivalencias": [
            {"grupo": "FRU", "porciones": 1, "descripcion": "1 tz papaya picada (150 g)"},
            {"grupo": "VER", "porciones": 1, "descripcion": "1 tz espinacas crudas + ½ tz apio"}
          ],
          "kcal_total": 85
        },
        "kcal_total": 405
      },
      "colacion_matutina": {
        "descripcion": "10 almendras naturales + ½ taza de papaya",
        "equivalencias": [
          {"grupo": "GRA", "porciones": 1, "descripcion": "10 almendras naturales sin sal"},
          {"grupo": "FRU", "porciones": 0.5, "descripcion": "½ tz de papaya en cubos"}
        ],
        "kcal_total": 75
      },
      "comida": {
        "nombre": "Bowl de Pollo con Arroz",
        "descripcion": "210 g pechuga de pollo a la plancha • ½ tz arroz integral cocido • ½ tz tomate + espinacas • ½ aguacate",
        "equivalencias": [
          {"grupo": "POA-M",  "porciones": 7, "descripcion": "210 g pechuga de pollo a la plancha (pesar en crudo)"},
          {"grupo": "CER-SF", "porciones": 2, "descripcion": "½ tz arroz integral cocido con ajo y cúrcuma"},
          {"grupo": "VER",    "porciones": 2, "descripcion": "½ tz tomate cherry + 1 tz espinacas frescas"},
          {"grupo": "GRA",    "porciones": 2, "descripcion": "½ aguacate mediano (60 g)"}
        ],
        "kcal_total": 665
      },
      "colacion_vespertina": {
        "descripcion": "½ taza yogurt natural sin azúcar + 6 mitades de nuez",
        "equivalencias": [
          {"grupo": "VER", "porciones": 1, "descripcion": "½ tz yogurt natural sin azúcar (130 g)"},
          {"grupo": "GRA", "porciones": 1, "descripcion": "6 mitades de nuez de castilla"}
        ],
        "kcal_total": 70
      },
      "cena": {
        "nombre": "Sándwich de Atún en Pan Integral",
        "descripcion": "140 g atún en agua enjuagado • 2 rebanadas pan Bimbo Cero Cero • lechuga + tomate • ¼ aguacate",
        "equivalencias": [
          {"grupo": "POA-M",  "porciones": 4, "descripcion": "140 g atún en agua (enjuagar en colador, reduce sodio 40%)"},
          {"grupo": "CER-SF", "porciones": 2, "descripcion": "2 rebanadas pan Bimbo Cero Cero (75 g)"},
          {"grupo": "VER",    "porciones": 1, "descripcion": "1 tz lechuga + jitomate rebanado"},
          {"grupo": "GRA",    "porciones": 1, "descripcion": "¼ aguacate mediano (30 g)"}
        ],
        "kcal_total": 430
      },
      "kcal_dia_total": 1645
    },
    "menu_3": {
      "/* Mismas equivalencias_fijas del esquema, platillos distintos */": "",
      "desayuno": {
        "platillo_solido": {
          "nombre": "Chilaquiles Fit en Salsa Verde",
          "descripcion": "60 g pechuga desmenuzada • 2 tostadas troceadas • salsa verde natural • 1 tz espinacas • aceite aerosol",
          "equivalencias": [
            {"grupo": "POA-M",  "porciones": 2, "descripcion": "60 g pechuga de pollo cocida y desmenuzada"},
            {"grupo": "CER-SF", "porciones": 2, "descripcion": "2 tostadas Saníssimo horneadas troceadas"},
            {"grupo": "VER",    "porciones": 1, "descripcion": "1 tz espinacas + jitomate + chile serrano (poca cantidad)"},
            {"grupo": "GRA",    "porciones": 1, "descripcion": "aceite aerosol (2 segundos)"}
          ],
          "kcal_total": 320
        },
        "licuado": {
          "nombre": "Licuado de Plátano con Betabel",
          "descripcion": "½ plátano + betabel + apio + agua natural",
          "equivalencias": [
            {"grupo": "FRU", "porciones": 1, "descripcion": "½ plátano tabasco mediano (60 g)"},
            {"grupo": "VER", "porciones": 1, "descripcion": "½ tz betabel crudo rallado + 1 tz apio"}
          ],
          "kcal_total": 85
        },
        "kcal_total": 405
      },
      "colacion_matutina": {
        "descripcion": "10 almendras naturales + ½ taza de melón",
        "equivalencias": [
          {"grupo": "GRA", "porciones": 1, "descripcion": "10 almendras naturales sin sal"},
          {"grupo": "FRU", "porciones": 0.5, "descripcion": "½ tz de melón en cubos"}
        ],
        "kcal_total": 75
      },
      "comida": {
        "nombre": "Tostadas de Molida de Res",
        "descripcion": "175 g pulpa molida de res • 2 tostadas horneadas • 1 tz morrón + brócoli • ½ aguacate",
        "equivalencias": [
          {"grupo": "POA-M",  "porciones": 7, "descripcion": "175 g pulpa molida de res (pesar en crudo, sin grasa)"},
          {"grupo": "CER-SF", "porciones": 2, "descripcion": "2 tostadas de maíz horneadas"},
          {"grupo": "VER",    "porciones": 2, "descripcion": "1 tz morrón rojo + 1 tz brócoli al vapor"},
          {"grupo": "GRA",    "porciones": 2, "descripcion": "½ aguacate mediano (60 g)"}
        ],
        "kcal_total": 665
      },
      "colacion_vespertina": {
        "descripcion": "½ taza yogurt natural sin azúcar + 6 mitades de nuez",
        "equivalencias": [
          {"grupo": "VER", "porciones": 1, "descripcion": "½ tz yogurt natural sin azúcar (130 g)"},
          {"grupo": "GRA", "porciones": 1, "descripcion": "6 mitades de nuez de castilla"}
        ],
        "kcal_total": 70
      },
      "cena": {
        "nombre": "Sándwich de Jamón y Queso Panela",
        "descripcion": "60 g queso panela + 2 reb jamón pechuga pavo • 2 rebanadas pan integral • lechuga • ¼ aguacate",
        "equivalencias": [
          {"grupo": "POA-M",  "porciones": 4, "descripcion": "60 g queso panela Nochebuena + 2 reb jamón de pechuga de pavo Zwan"},
          {"grupo": "CER-SF", "porciones": 2, "descripcion": "2 piezas pan Bimbo Cero Cero"},
          {"grupo": "VER",    "porciones": 1, "descripcion": "1 tz lechuga + jitomate + mostaza"},
          {"grupo": "GRA",    "porciones": 1, "descripcion": "¼ aguacate mediano (30 g)"}
        ],
        "kcal_total": 430
      },
      "kcal_dia_total": 1645
    }
  },
  "colacion_matutina_global": null,
  "colacion_vespertina_global": null
}
"""


def _build_user_prompt(historial: dict, calorias: int,
                       notas: str, menu_base_texto: str) -> str:
    progreso_str = "No hay registros previos de progreso."
    if historial.get("progreso_historial"):
        skip = {"id", "patient_email", "date", "created_at",
                "updated_at", "ultima_actualizacion"}
        lines = []
        for i, r in enumerate(historial["progreso_historial"]):
            label    = "MÁS RECIENTE" if i == 0 else f"Registro previo {i}"
            date_val = r.get("date") or r.get("created_at") or "N/A"
            ind      = [f"{k.replace('_',' ').title()}: {v}"
                        for k, v in r.items()
                        if k not in skip and v not in (None, "", 0)]
            lines.append(f"- {label} ({_format_date(date_val)}): "
                         f"{', '.join(ind) if ind else 'Sin datos.'}")
        progreso_str = "\n".join(lines)

    return f"""Genera el menú clínico COMPLETO para este paciente.

DATOS DEL PACIENTE:
- Nombre: {historial.get('nombre', 'N/A')}
- Edad: {historial.get('edad', 'N/A')} | Género: {historial.get('genero', 'N/A')} | Estatura: {historial.get('estatura', 'N/A')}
- Motivo de consulta: {historial.get('motivos_consulta', 'N/A')}
- Patologías: {historial.get('enfermedades', 'N/A')}
- Alergias: {historial.get('alergias_alimentarias', 'N/A')}
- No agradan: {historial.get('alimentos_no_agradan', 'N/A')}
- Comidas al día: {historial.get('comidas_dia', '3')}

HISTORIAL DE PROGRESO (últimos 3 registros, más reciente primero):
{progreso_str}

OBJETIVO CALÓRICO: {calorias} kcal/día
NOTAS CLÍNICAS: {notas if notas and notas.strip() else "Sin notas adicionales."}

INSTRUCCIONES CRÍTICAS:
1. Responde ÚNICAMENTE con el JSON. Sin texto antes ni después. Sin markdown ```json.
2. El campo "esquema_dia" define las equivalencias UNA SOLA VEZ para todo el día.
3. Cada menú (menu_1, menu_2, menu_3) debe tener EXACTAMENTE las mismas porciones
   por grupo que el esquema_dia. Solo cambia el platillo, nombre y descripcion.
4. Las descripciones en "equivalencias" deben ser COMPLETAMENTE descriptivas:
   - ✅ "210 g pechuga de pollo a la plancha"
   - ✅ "2 tortillas de maíz (30 g c/u)"
   - ✅ "1 tz espinacas crudas + jitomate cherry"
   - ❌ "2 piezas"  ❌ "1 taza"  ❌ "3 pzas"
5. Usa FRU para frutas (manzana, papaya, plátano, fresa, melón, etc.) en licuados y colaciones.
6. Ajusta el esquema_dia basándote en el progreso MÁS RECIENTE del paciente.
7. Los platillos deben ser REALES, completos y apetecibles (no genéricos).
"""


def _call_gemini(historial: dict, calorias: int, notas: str,
                 menu_base_texto: str, gemini_key: str) -> dict:
    client = genai.Client(api_key=gemini_key)
    selected_model = "gemini-1.5-flash"

    try:
        visible = [m.name for m in client.models.list()]
        
        # PRIORIDAD v3.2: 2.5 Flash ya está disponible en este entorno y es el más estable
        priority = ["models/gemini-2.5-flash", "models/gemini-1.5-flash", 
                    "models/gemini-2.0-flash-001", "models/gemini-2.0-flash-exp"]
        
        # Filtro estricto para excluir modelos restringidos/especializados
        exclude_suffixes = ["tts", "image", "audio", "live", "lite"]
        
        # Filtrar modelos disponibles que NO estén en la lista negra
        cands_pool = [m for m in visible if not any(s in m.lower() for s in exclude_suffixes)]
        
        # Intentar obtener los modelos en orden de prioridad
        models_to_try = []
        for pref in priority:
            for m in cands_pool:
                if pref == m: # Coincidencia exacta primero
                    models_to_try.append(m)
                    break
        
        # Agregar el resto de 'flash' que no estén en la lista negra
        for m in cands_pool:
            if "flash" in m.lower() and m not in models_to_try:
                models_to_try.append(m)

        if not models_to_try:
            models_to_try = ["models/gemini-2.5-flash"] # Fallback final
            
    except Exception as e:
        print(f"[v3.2] Model list error: {e}")
        models_to_try = ["models/gemini-2.5-flash"]

    prompt = _build_user_prompt(historial, calorias, notas, menu_base_texto)

    for selected_model in models_to_try:
        print(f"[v3.2] Attempting with model: {selected_model}")
        for attempt in range(2):
            try:
                response = client.models.generate_content(
                    model=selected_model,
                    contents=[{"role": "user",
                               "parts": [{"text": SYSTEM_PROMPT + "\n\n" + prompt}]}],
                    config=types.GenerateContentConfig(
                        temperature=0.2 if attempt == 0 else 0.0,
                        max_output_tokens=8192,
                        response_mime_type="application/json"),
                )
                full_text = ""
                if hasattr(response, "candidates") and response.candidates:
                    for part in response.candidates[0].content.parts:
                        if hasattr(part, "text") and part.text:
                            full_text += part.text
                else:
                    full_text = response.text

                full_text = full_text.strip()
                text = re.sub(r"^```json\s*", "", full_text)
                text = re.sub(r"\s*```$", "", text)

                try:
                    result = json.loads(text)
                    if isinstance(result, str):
                        result = json.loads(result)
                    return result if isinstance(result, dict) else {}
                except json.JSONDecodeError:
                    start = text.find('{')
                    end   = text.rfind('}')
                    if start != -1 and end != -1:
                        result = json.loads(text[start:end + 1])
                        return result if isinstance(result, dict) else {}
                    raise
            except Exception as e:
                err_str = str(e).lower()
                if "404" in err_str or "not found" in err_str or "no longer available" in err_str:
                    print(f"[v3.2] Model {selected_model} is restricted (404). Trying next in list...")
                    break # Salir del bucle de intentos de este modelo, pasar al siguiente modelo
                
                print(f"[NutriArchitect] Error model {selected_model} attempt {attempt + 1}: {e}")
                if attempt == 1:
                    # Si falló 2 veces y no es 404, intentar con el siguiente modelo de todas formas
                    break
    
    return {}


# ─────────────────────────────────────────────────────────────────────────────
# POST-PROCESADO: normalizar equivalencias usando el esquema_dia
# ─────────────────────────────────────────────────────────────────────────────

def _normalizar_menu(menu_json: dict) -> dict:
    """
    Garantiza que los 3 menús tengan las mismas equivalencias que el esquema_dia.
    Si la IA generó porciones distintas entre menús, las corrige usando el esquema.
    También filtra grupos no permitidos.
    """
    esquema = menu_json.get("esquema_dia", {})
    # Soporte para menús en nivel raíz o dentro de llave 'menus'
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
            if not eq_fijas:
                continue

            # Obtener el bloque a normalizar
            if tiempo_key == "desayuno" and sub_key:
                bloque = menu.get("desayuno", {}).get("platillo_solido", {})
            elif tiempo_key == "desayuno_licuado":
                bloque = menu.get("desayuno", {}).get("licuado", {})
            else:
                bloque = menu.get(tiempo_key, {})

            if not bloque:
                continue

            # Construir mapa de descripciones usando mapeo flexible
            desc_map = {}
            for eq in bloque.get("equivalencias", []):
                g_orig = eq.get("grupo", "")
                g_flex = _norm_g(g_orig)
                if g_flex in GRUPOS_PERMITIDOS:
                    desc_map[g_flex] = eq.get("descripcion", "")

            # Reconstruir equivalencias con porciones del esquema
            nuevas_eq = []
            for eq_f in eq_fijas:
                g = eq_f.get("grupo", "")
                g_flex = _norm_g(g)
                if g_flex not in GRUPOS_PERMITIDOS:
                    continue
                
                desc = desc_map.get(g_flex) or desc_map.get(g)
                if not desc:
                    desc = bloque.get("descripcion", g) if not bloque.get("equivalencias") else g

                nuevas_eq.append({
                    "grupo":      g,
                    "porciones":  eq_f.get("porciones", 0),
                    "descripcion": desc,
                })
            
            if nuevas_eq:
                bloque["equivalencias"] = nuevas_eq

    return menu_json


# ─────────────────────────────────────────────────────────────────────────────
# SECCIÓN: INFO PACIENTE
# ─────────────────────────────────────────────────────────────────────────────

def _build_info_table(doc, paciente: dict):
    table = doc.add_table(rows=1, cols=2)
    table.autofit = False
    table.style   = "Table Grid"
    _set_table_width(table, 10800)
    _apply_col_widths(table, [5300, 5500])

    left  = table.cell(0, 0)
    right = table.cell(0, 1)

    for cell in (left, right):
        _set_cell_bg(cell, COLORS["info_bg"])
        _set_cell_borders(cell, COLORS["info_border"], 3)
        _set_cell_margins(cell, 80, 160, 80, 160)

    fecha_fmt = _format_date(paciente.get("fecha_hoy", "")) or "[Fecha de consulta]"

    def _kv(cell, key, val, first=False):
        p = cell.paragraphs[0] if (first and not cell.paragraphs[0].text) \
            else cell.add_paragraph()
        _add_run(p, key, bold=True,  size_pt=8.5, color=COLORS["info_text"])
        _add_run(p, val, bold=False, size_pt=8.5, color=COLORS["text_mid"])
        p.paragraph_format.space_after = Pt(1.5)

    _kv(left,  "👤  Paciente: ",     paciente.get("nombre", "[Nombre completo]"), first=True)
    _kv(left,  "📅  Fecha: ",        fecha_fmt)
    _kv(right, "🗓️  Próxima cita: ", paciente.get("proxima_cita", "[Día, fecha y hora]"), first=True)
    _kv(right, "👩‍⚕️  Nutrióloga: ",   NUTRIOLOGA)

    _add_spacing(doc)


# ─────────────────────────────────────────────────────────────────────────────
# SECCIÓN: COMPOSICIÓN CORPORAL
# ─────────────────────────────────────────────────────────────────────────────

def _build_composicion_section(doc, paciente: dict):
    historial = paciente.get("progreso_historial", [])
    ultimo    = historial[0] if historial else {}

    _add_section_header(doc, "📊  COMPOSICIÓN CORPORAL",
                        bg_color=COLORS["header_dark_green"], font_size_pt=9.8)

    fecha_reg = ultimo.get("date") or ultimo.get("created_at") or ""
    if fecha_reg:
        p_f = doc.add_paragraph()
        p_f.paragraph_format.space_before = Pt(0)
        p_f.paragraph_format.space_after  = Pt(3)
        _add_run(p_f, f"  📅 Último registro: {_format_date(fecha_reg)}",
                 italic=True, size_pt=7.5, color=COLORS["text_light"])

    # Tabla 2×4 métricas
    metrics = [
        [
            (COLORS["comp_verde_bg"], "Peso",               _fmt_val(ultimo, ["peso","weight"], "kg")),
            (COLORS["comp_rojo_bg"],  "Masa Grasa",         _fmt_val(ultimo, ["masa_grasa","fat_mass","body_fat_kg"], "kg")),
            (COLORS["comp_verde_bg"], "Masa Magra",         _fmt_val(ultimo, ["masa_magra","lean_mass"], "kg")),
            (COLORS["comp_azul_bg"],  "Músculo Esquelético",_fmt_val(ultimo, ["musculo","muscle","skeletal_muscle"], "kg")),
        ],
        [
            (COLORS["comp_azul_bg"],  "Agua Corporal",    _fmt_val(ultimo, ["agua","water","body_water"], "L")),
            (COLORS["comp_verde_bg"], "Proteínas",        _fmt_val(ultimo, ["proteinas","protein"], "kg")),
            (COLORS["comp_gris_bg"],  "Minerales",        _fmt_val(ultimo, ["minerales","minerals"], "kg")),
            (COLORS["comp_rojo_bg"],  "% Grasa Corporal", _fmt_val(ultimo, ["pct_grasa","body_fat","body_fat_pct"], "%")),
        ],
    ]

    tbl = doc.add_table(rows=2, cols=4)
    tbl.autofit = False
    _set_table_width(tbl, 10800)
    _apply_col_widths(tbl, [2700, 2700, 2700, 2700])

    for ri, row_data in enumerate(metrics):
        for ci, (bg, label, value) in enumerate(row_data):
            cell = tbl.cell(ri, ci)
            _set_cell_bg(cell, bg)
            _set_cell_borders(cell, "CCCCCC", 2)
            _set_cell_margins(cell, 90, 140, 90, 140)
            p_lbl = cell.paragraphs[0]
            p_lbl.paragraph_format.space_after = Pt(1)
            _add_run(p_lbl, label, size_pt=7.5, color=COLORS["text_light"])
            p_val = cell.add_paragraph()
            p_val.paragraph_format.space_before = Pt(0)
            p_val.paragraph_format.space_after  = Pt(0)
            val_color = COLORS["header_dark_green"] if value != "—" else COLORS["text_light"]
            _add_run(p_val, value, bold=True, size_pt=11.0, color=val_color)

    _add_spacing(doc)

    p_sub = doc.add_paragraph()
    p_sub.paragraph_format.space_before = Pt(2)
    p_sub.paragraph_format.space_after  = Pt(2)
    _add_run(p_sub, "Composición por segmento corporal",
             bold=True, size_pt=7.5, color=COLORS["header_dark_green"])

    seg_rows = [
        ("Brazo Der.",  _fmt_val(ultimo, ["brazo_der_grasa"],   "kg"),
                        _fmt_val(ultimo, ["brazo_der_musculo"], "kg"),
                        f"Abdomen: {_fmt_val(ultimo, ['abdomen'], 'cm')}"),
        ("Brazo Izq.",  _fmt_val(ultimo, ["brazo_izq_grasa"],   "kg"),
                        _fmt_val(ultimo, ["brazo_izq_musculo"], "kg"),
                        f"Cintura: {_fmt_val(ultimo, ['cintura'], 'cm')}"),
        ("Tronco",      _fmt_val(ultimo, ["tronco_grasa"],   "kg"),
                        _fmt_val(ultimo, ["tronco_musculo"], "kg"),
                        f"Cadera: {_fmt_val(ultimo, ['cadera'], 'cm')}"),
        ("Pierna Der.", _fmt_val(ultimo, ["pierna_der_grasa"],   "kg"),
                        _fmt_val(ultimo, ["pierna_der_musculo"], "kg"),
                        f"Pecho: {_fmt_val(ultimo, ['pecho','chest'], 'cm')}"),
        ("Pierna Izq.", _fmt_val(ultimo, ["pierna_izq_grasa"],   "kg"),
                        _fmt_val(ultimo, ["pierna_izq_musculo"], "kg"),
                        f"ICC: {_fmt_val(ultimo, ['icc'], '')}   GV: {_fmt_val(ultimo, ['gv'], '')}"),
    ]

    tbl_seg = doc.add_table(rows=1 + len(seg_rows), cols=4)
    tbl_seg.autofit = False
    _set_table_width(tbl_seg, 10800)
    _apply_col_widths(tbl_seg, [2000, 2000, 2200, 4600])

    for ci, h in enumerate(["Segmento", "Grasa (kg)", "Músculo (kg)", "Medidas"]):
        cell = tbl_seg.cell(0, ci)
        _set_cell_bg(cell, COLORS["header_dark_green"])
        _set_cell_borders(cell, COLORS["header_dark_green"], 2)
        _set_cell_margins(cell, 70, 100, 70, 100)
        _set_cell_valign(cell, "center")
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        _add_run(p, h, bold=True, size_pt=7.5, color=COLORS["white"])

    for ri, (seg, grasa, musculo, medida) in enumerate(seg_rows):
        bg_row = COLORS["comp_verde_bg"] if ri % 2 == 0 else COLORS["comp_gris_bg"]
        for ci, (val, align, cell_bg) in enumerate([
            (seg,     WD_ALIGN_PARAGRAPH.LEFT,   bg_row),
            (grasa,   WD_ALIGN_PARAGRAPH.CENTER, bg_row),
            (musculo, WD_ALIGN_PARAGRAPH.CENTER, bg_row),
            (medida,  WD_ALIGN_PARAGRAPH.LEFT,   COLORS["comp_azul_bg"]),
        ]):
            cell = tbl_seg.cell(ri + 1, ci)
            _set_cell_bg(cell, cell_bg)
            _set_cell_borders(cell, "CCCCCC", 2)
            _set_cell_margins(cell, 60, 100, 60, 100)
            _set_cell_valign(cell, "center")
            p = cell.paragraphs[0]
            p.alignment = align
            _add_run(p, val, bold=(ci == 0), size_pt=7.5,
                     color=COLORS["header_dark_green"] if ci == 0 else COLORS["text_mid"])

    indicadores = []
    for lbl, keys, unit in [
        ("P.A.",            ["presion_arterial","blood_pressure"], "mmHg"),
        ("Pulso",           ["pulso","pulse"],                     "lpm"),
        ("Edad metabólica", ["edad_metabolica","metabolic_age"],   "años"),
        ("IMC",             ["imc","bmi"],                         ""),
        ("PGC",             ["pct_grasa","body_fat","body_fat_pct"],"%"),
    ]:
        v = _fmt_val(ultimo, keys, unit)
        if v != "—":
            indicadores.append(f"{lbl}: {v}")

    if indicadores:
        p_ind = doc.add_paragraph()
        p_ind.paragraph_format.space_before = Pt(2)
        p_ind.paragraph_format.space_after  = Pt(2)
        _add_run(p_ind, "  " + "  •  ".join(indicadores),
                 italic=True, size_pt=7.0, color=COLORS["text_light"])

    _add_spacing(doc)


# ─────────────────────────────────────────────────────────────────────────────
# SECCIÓN: AVISO
# ─────────────────────────────────────────────────────────────────────────────

def _build_aviso(doc):
    table = doc.add_table(rows=1, cols=1)
    table.style = "Table Grid"
    _set_table_width(table, 10800)
    cell = table.cell(0, 0)
    _set_cell_bg(cell, COLORS["warn_bg"])
    _set_cell_borders(cell, COLORS["warn_border"], 3)
    _set_cell_margins(cell, 100, 200, 100, 200)
    p = cell.paragraphs[0]
    _add_run(p,
             "⚠️ Cualquier aumento de alimentos u omisión produce un desequilibrio en el "
             "requerimiento actual. En caso de duda o incomodidad con algún platillo o alimento, "
             "favor de notificar a su nutrióloga para evaluar el cambio.",
             size_pt=8.0, color=COLORS["warn_text"])
    _add_spacing(doc)


# ─────────────────────────────────────────────────────────────────────────────
# SECCIÓN: OBJETIVOS + HÁBITOS
# ─────────────────────────────────────────────────────────────────────────────

def _build_objetivos_table(doc, menu_json: dict, paciente: dict):
    objetivo     = menu_json.get("metadata", {}).get(
                       "objetivo_clinico", "Mejorar hábitos y composición corporal.")
    advertencias = menu_json.get("metadata", {}).get("advertencias_clinicas", [])
    comidas_dia  = paciente.get("comidas_dia", "5–6 veces al día")

    table = doc.add_table(rows=1, cols=2)
    table.autofit = False
    table.style   = "Table Grid"
    _set_table_width(table, 10800)
    _apply_col_widths(table, [5300, 5500])

    left, right = table.cell(0, 0), table.cell(0, 1)
    for cell in (left, right):
        _set_cell_bg(cell, COLORS["info_bg"])
        _set_cell_borders(cell, COLORS["obj_border"], 3)
        _set_cell_margins(cell, 100, 160, 100, 160)

    p_l = left.paragraphs[0]
    p_l.paragraph_format.space_after = Pt(4)
    _add_run(p_l, "🎯  OBJETIVOS DEL PLAN",
             bold=True, size_pt=9.0, color=COLORS["info_text"])

    for obj in ([objetivo] + [a[:90] for a in advertencias[:2]]):
        p2 = left.add_paragraph()
        p2.paragraph_format.space_after = Pt(1.5)
        _add_run(p2, obj, size_pt=8.0, color=COLORS["text_mid"])

    p_r = right.paragraphs[0]
    p_r.paragraph_format.space_after = Pt(4)
    _add_run(p_r, "🍽️  HÁBITOS DE ALIMENTACIÓN",
             bold=True, size_pt=9.0, color=COLORS["info_text"])

    for h in [
        "Dormir 7–8 horas diarias (regula hormonas y apetito).",
        "Ejercicio moderado 3–4 veces/semana.",
        "Evitar el ayuno prolongado — aumenta inflamación.",
        "Comer despacio y masticar bien.",
        "Controlar el estrés — agrava síntomas digestivos.",
        "Tomar 1.5–2 litros de agua al día.",
        f"Comer {comidas_dia} cada 3–4 horas.",
    ]:
        p2 = right.add_paragraph()
        p2.paragraph_format.space_after = Pt(1.5)
        _add_run(p2, h, size_pt=8.0, color=COLORS["text_mid"])

    _add_spacing(doc)


# ─────────────────────────────────────────────────────────────────────────────
# SECCIÓN: ALIMENTOS FIJOS
# ─────────────────────────────────────────────────────────────────────────────

def _build_alimentos_table(doc):
    table = doc.add_table(rows=1, cols=2)
    table.autofit = False
    table.style   = "Table Grid"
    _set_table_width(table, 10800)
    _apply_col_widths(table, [5300, 5500])

    left  = table.cell(0, 0)
    right = table.cell(0, 1)

    _set_cell_bg(left, COLORS["info_bg"])
    _set_cell_borders(left, COLORS["info_border"], 3)
    _set_cell_margins(left, 100, 160, 100, 160)

    p_l = left.paragraphs[0]
    p_l.paragraph_format.space_after = Pt(4)
    _add_run(p_l, "🌸  ALIMENTOS QUE BENEFICIAN",
             bold=True, size_pt=8.5, color=COLORS["info_text"])
    for item in ALIMENTOS_BENEFICIAN:
        p2 = left.add_paragraph()
        p2.paragraph_format.space_after = Pt(1.5)
        _add_run(p2, item, size_pt=8.0, color=COLORS["text_mid"])

    _set_cell_bg(right, COLORS["avoid_bg"])
    _set_cell_borders(right, COLORS["avoid_border"], 3)
    _set_cell_margins(right, 100, 160, 100, 160)

    p_r = right.paragraphs[0]
    p_r.paragraph_format.space_after = Pt(4)
    _add_run(p_r, "🚫  ALIMENTOS A EVITAR",
             bold=True, size_pt=8.5, color=COLORS["avoid_border"])
    for item in ALIMENTOS_EVITAR:
        p2 = right.add_paragraph()
        p2.paragraph_format.space_after = Pt(1.5)
        _add_run(p2, item, size_pt=8.0, color=COLORS["avoid_border"])

    _add_spacing(doc)


# ─────────────────────────────────────────────────────────────────────────────
# PLAN DE MENÚ — helpers
# ─────────────────────────────────────────────────────────────────────────────

def _get_grupos_ordered(platillos: list) -> list[str]:
    """Retorna grupos únicos respetando el orden de aparición, solo permitidos."""
    grupos: list[str] = []
    for pl in platillos:
        for eq in pl.get("equivalencias", []):
            g = eq.get("grupo", "")
            if g in GRUPOS_PERMITIDOS and g not in grupos:
                grupos.append(g)
    return grupos


def _get_desc(platillo: dict, grupo: str) -> str:
    """Obtiene la descripción de un grupo en el platillo (búsqueda robusta)."""
    target_norm = _norm_g(grupo)
    for eq in platillo.get("equivalencias", []):
        if _norm_g(eq.get("grupo", "")) == target_norm:
            d = eq.get("descripcion", "—")
            return d if d else "—"
    return "—"


def _get_porciones(platillo: dict, grupo: str):
    target_norm = _norm_g(grupo)
    for eq in platillo.get("equivalencias", []):
        if _norm_g(eq.get("grupo", "")) == target_norm:
            return eq.get("porciones", "")
    return ""


# ─────────────────────────────────────────────────────────────────────────────
# PLAN DE MENÚ — LICUADO
# ─────────────────────────────────────────────────────────────────────────────

def _build_licuado_table(doc, menus_data: dict):
    _add_label_paragraph(doc, "🥤  ", "LICUADO (para todos los menús)",
                         color=COLORS["orange_label"], size_pt=9.0)

    MK = ["menu_1", "menu_2", "menu_3"]
    MB = [COLORS["menu1_bg"],   COLORS["menu2_bg"],   COLORS["menu3_bg"]]
    MT = [COLORS["menu1_text"], COLORS["menu2_text"], COLORS["menu3_text"]]

    licuados = [menus_data.get(mk, {}).get("desayuno", {}).get("licuado", {})
                for mk in MK]

    grupos = _get_grupos_ordered(licuados)
    if not grupos:
        grupos = ["FRU", "VER"]

    n = 1 + len(grupos) + 1
    table = doc.add_table(rows=n, cols=5)
    table.autofit = False
    _set_table_width(table, 10800)
    _apply_col_widths(table, [600, 1600, 2867, 2867, 2867])

    # Header
    for ci in range(5):
        cell = table.rows[0].cells[ci]
        if ci < 2:
            _set_cell_bg(cell, COLORS["neutral_bg"])
            _set_cell_no_borders(cell)
        else:
            idx = ci - 2
            _set_cell_bg(cell, MB[idx]); _set_cell_no_borders(cell)
            _set_cell_margins(cell, 60, 100, 60, 100)
            p = cell.paragraphs[0]; p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            _add_run(p, f"MENÚ {idx+1}", bold=True, size_pt=8.0, color=MT[idx])

    # Filas de grupos
    for row_i, grupo in enumerate(grupos):
        row = table.rows[row_i + 1]
        gc  = GROUP_COLORS.get(grupo, ("444444", "F0F0F0", grupo))
        num_bg, lbl_bg, lbl_text = gc

        # Porciones del menú 1 (deben ser iguales en todos)
        por = _get_porciones(licuados[0], grupo)

        c0 = row.cells[0]
        _set_cell_bg(c0, num_bg); _set_cell_borders(c0, num_bg, 3)
        _set_cell_margins(c0, 60, 50, 60, 50); _set_cell_valign(c0, "center")
        p = c0.paragraphs[0]; p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        _add_run(p, str(por) if por != "" else "",
                 bold=True, size_pt=8.0, color=COLORS["white"])

        c1 = row.cells[1]
        _set_cell_bg(c1, lbl_bg); _set_cell_borders(c1, num_bg, 3)
        _set_cell_margins(c1, 60, 100, 60, 80); _set_cell_valign(c1, "center")
        p = c1.paragraphs[0]
        _add_run(p, lbl_text, bold=True, size_pt=7.5, color=num_bg)

        for mi, lic in enumerate(licuados):
            ci   = mi + 2
            cell = row.cells[ci]
            content = _get_desc(lic, grupo)
            _set_cell_bg(cell, MB[mi]); _set_cell_borders(cell, MT[mi], 2)
            _set_cell_margins(cell, 60, 100, 60, 100); _set_cell_valign(cell, "center")
            p = cell.paragraphs[0]
            _add_run(p, content, size_pt=7.5, color=COLORS["text_dark"])

    # Nota
    kcal_lic = licuados[0].get("kcal_total", "") if licuados else ""
    row_nota = table.rows[-1]
    for ci in range(5):
        cell = row_nota.cells[ci]
        _set_cell_bg(cell, COLORS["neutral_bg"]); _set_cell_no_borders(cell)
        _set_cell_margins(cell, 50, 100, 50, 100)
    p = row_nota.cells[2].paragraphs[0]
    _add_run(p, f"📝 Licuar todo con agua natural.  Aprox: {kcal_lic} kcal",
             italic=True, size_pt=7.0, color=COLORS["text_light"])

    _add_spacing(doc)


# ─────────────────────────────────────────────────────────────────────────────
# PLAN DE MENÚ — PLATILLOS + EQUIVALENCIAS
# ─────────────────────────────────────────────────────────────────────────────

def _build_platillo_block(doc, menus_data: dict, tiempo: str,
                          equiv_label: str, emoji: str):
    MK = ["menu_1", "menu_2", "menu_3"]
    MB = [COLORS["menu1_bg"],   COLORS["menu2_bg"],   COLORS["menu3_bg"]]
    MT = [COLORS["menu1_text"], COLORS["menu2_text"], COLORS["menu3_text"]]

    platillos = []
    for mk in MK:
        t = menus_data.get(mk, {}).get(tiempo, {})
        platillos.append(t.get("platillo_solido", {}) if tiempo == "desayuno" else t)

    if tiempo == "desayuno":
        _add_label_paragraph(doc, f"{emoji}  ", "PLATILLO PRINCIPAL",
                             color=COLORS["orange_label"], size_pt=9.0)

    # Cards de platillo
    for mi, platillo in enumerate(platillos):
        if not platillo:
            continue
        nombre = platillo.get("nombre", f"Platillo Menú {mi+1}")
        desc   = platillo.get("descripcion", "")
        kcal   = platillo.get("kcal_total", 0)

        table = doc.add_table(rows=1, cols=2)
        table.autofit = False
        _set_table_width(table, 10800)
        _apply_col_widths(table, [1500, 9300])

        badge = table.cell(0, 0)
        _set_cell_bg(badge, MB[mi]); _set_cell_no_borders(badge)
        _set_cell_margins(badge, 80, 100, 80, 80); _set_cell_valign(badge, "center")
        p_b = badge.paragraphs[0]; p_b.alignment = WD_ALIGN_PARAGRAPH.CENTER
        _add_run(p_b, f"MENÚ {mi+1}", bold=True, size_pt=8.0, color=MT[mi])

        content = table.cell(0, 1)
        _set_cell_bg(content, MB[mi]); _set_cell_no_borders(content)
        _set_cell_margins(content, 80, 140, 80, 100)

        p_n = content.paragraphs[0]
        p_n.paragraph_format.space_after = Pt(2)
        _add_run(p_n, nombre, bold=True, size_pt=9.0, color=MT[mi])

        p_d = content.add_paragraph()
        p_d.paragraph_format.space_before = Pt(0)
        p_d.paragraph_format.space_after  = Pt(0)
        _add_run(p_d, f"{desc}  •  {kcal} kcal", size_pt=7.5, color=COLORS["text_dark"])

        _add_spacing(doc, before_pt=2, after_pt=2)

    # Tabla de equivalencias
    _add_label_paragraph(doc, "📋  ", f"EQUIVALENTES DE {equiv_label.upper()}",
                         color=COLORS["teal_label"], size_pt=9.0)
    _build_equivalencias_table(doc, platillos)


def _build_equivalencias_table(doc, platillos: list):
    """
    Tabla 5 cols. Los grupos se extraen del platillo[0] (menú 1),
    que debe ser el de referencia (mismas porciones en los 3 menús).
    """
    MB = [COLORS["menu1_bg"],   COLORS["menu2_bg"],   COLORS["menu3_bg"]]
    MT = [COLORS["menu1_text"], COLORS["menu2_text"], COLORS["menu3_text"]]

    # Grupos ordenados del menú 1 (referencia)
    grupos = _get_grupos_ordered(platillos[:1])
    # Si menu1 vacío, intentar con todos
    if not grupos:
        grupos = _get_grupos_ordered(platillos)
    if not grupos:
        return

    n = 1 + len(grupos) + 1
    table = doc.add_table(rows=n, cols=5)
    table.autofit = False
    _set_table_width(table, 10800)
    _apply_col_widths(table, [600, 1600, 2867, 2867, 2867])

    # Header
    for ci in range(5):
        cell = table.rows[0].cells[ci]
        if ci < 2:
            _set_cell_bg(cell, COLORS["neutral_bg"]); _set_cell_no_borders(cell)
        else:
            idx = ci - 2
            _set_cell_bg(cell, MB[idx]); _set_cell_no_borders(cell)
            _set_cell_margins(cell, 60, 100, 60, 100)
            p = cell.paragraphs[0]; p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            _add_run(p, f"MENÚ {idx+1}", bold=True, size_pt=8.0, color=MT[idx])

    # Filas de grupos
    for row_i, grupo in enumerate(grupos):
        row = table.rows[row_i + 1]
        gc  = GROUP_COLORS.get(grupo, ("444444", "F0F0F0", grupo))
        num_bg, lbl_bg, lbl_text = gc

        # Porciones del menú 1 (referencia)
        por = _get_porciones(platillos[0] if platillos else {}, grupo)

        c0 = row.cells[0]
        _set_cell_bg(c0, num_bg); _set_cell_borders(c0, num_bg, 3)
        _set_cell_margins(c0, 60, 50, 60, 50); _set_cell_valign(c0, "center")
        p = c0.paragraphs[0]; p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        _add_run(p, str(por) if por != "" else "",
                 bold=True, size_pt=8.0, color=COLORS["white"])

        c1 = row.cells[1]
        _set_cell_bg(c1, lbl_bg); _set_cell_borders(c1, num_bg, 3)
        _set_cell_margins(c1, 60, 100, 60, 80); _set_cell_valign(c1, "center")
        p = c1.paragraphs[0]
        _add_run(p, lbl_text, bold=True, size_pt=7.5, color=num_bg)

        # Descripción de cada menú para este grupo
        for mi, platillo in enumerate(platillos):
            ci   = mi + 2
            cell = row.cells[ci]
            content = _get_desc(platillo, grupo)
            _set_cell_bg(cell, MB[mi]); _set_cell_borders(cell, MT[mi], 2)
            _set_cell_margins(cell, 60, 100, 60, 100); _set_cell_valign(cell, "center")
            p = cell.paragraphs[0]
            _add_run(p, content, size_pt=7.5, color=COLORS["text_dark"])

    # Nota kcal
    row_nota = table.rows[-1]
    for ci in range(5):
        cell = row_nota.cells[ci]
        _set_cell_bg(cell, COLORS["neutral_bg"]); _set_cell_no_borders(cell)
        _set_cell_margins(cell, 40, 100, 40, 100)
    kcal_t = platillos[0].get("kcal_total", "") if platillos else ""
    p = row_nota.cells[2].paragraphs[0]
    _add_run(p, f"📝 Total aprox: {kcal_t} kcal",
             italic=True, size_pt=7.0, color=COLORS["text_light"])

    _add_spacing(doc)


# ─────────────────────────────────────────────────────────────────────────────
# COLACIÓN BANNER
# ─────────────────────────────────────────────────────────────────────────────

def _build_colacion_banner(doc, titulo: str, descripcion: str):
    table = doc.add_table(rows=1, cols=1)
    table.style = "Table Grid"
    _set_table_width(table, 10800)
    cell = table.cell(0, 0)
    _set_cell_bg(cell, COLORS["colacion_bg"])
    _set_cell_borders(cell, COLORS["colacion_border"], 4)
    _set_cell_margins(cell, 100, 200, 100, 200)
    p = cell.paragraphs[0]
    _add_run(p, titulo,      bold=True,  size_pt=9.0, color=COLORS["colacion_border"])
    _add_run(p, descripcion, bold=False, size_pt=9.0, color=COLORS["colacion_text"])
    _add_spacing(doc)


# ─────────────────────────────────────────────────────────────────────────────
# CONSTRUCCIÓN DEL DOCX
# ─────────────────────────────────────────────────────────────────────────────

def _build_docx(menu_json: dict, paciente: dict, calorias: int) -> bytes:
    doc = Document()

    section = doc.sections[0]
    section.page_width   = Cm(21.59)
    section.page_height  = Cm(27.94)
    section.left_margin  = section.right_margin  = Cm(1.5)
    section.top_margin   = section.bottom_margin = Cm(1.5)

    # 1. Título
    _add_section_header(doc,
        "\t🌿  PLAN DE NUTRICIÓN PERSONALIZADO  🌿\t",
        bg_color=COLORS["header_purple"], font_size_pt=12.5)

    # 2. Info paciente
    _build_info_table(doc, paciente)

    # 3. Próxima cita
    prox = paciente.get("proxima_cita", "[DÍA]  •  [FECHA]  •  [HORA]")
    _add_section_header(doc, f"📅  PRÓXIMA CITA: {prox}",
                        bg_color=COLORS["header_red"], font_size_pt=9.0)

    # 4. Composición corporal
    _build_composicion_section(doc, paciente)

    # 5. Aviso
    _build_aviso(doc)

    # 6. Objetivos + hábitos
    _build_objetivos_table(doc, menu_json, paciente)

    # 7. Alimentos fijos
    _build_alimentos_table(doc)

    # 8. Plan menú
    _add_section_header(doc, "🗓️  PLAN DE MENÚ — EQUIVALENCIAS",
                        bg_color=COLORS["header_teal"], font_size_pt=12.5)

    menus_data = menu_json.get("menus", menu_json)

    # 9. DESAYUNO
    _add_section_header(doc, "🌅  DESAYUNO",
                        bg_color=COLORS["header_desayuno"], font_size_pt=9.8)
    _build_licuado_table(doc, menus_data)
    _build_platillo_block(doc, menus_data, "desayuno", "EL PLATILLO PRINCIPAL", "🍳")

    # 10. Colación matutina
    col_mat = menu_json.get("colacion_matutina_global")
    col_mat_desc = (col_mat.get("descripcion", "") if col_mat
                    else menus_data.get("menu_1", {})
                                   .get("colacion_matutina", {})
                                   .get("descripcion", ""))
    if col_mat_desc:
        _build_colacion_banner(doc, "🍎  COLACIÓN MATUTINA: ", col_mat_desc)

    # 11. COMIDA
    _add_section_header(doc, "☀️  COMIDA",
                        bg_color=COLORS["header_teal"], font_size_pt=9.8)
    _build_platillo_block(doc, menus_data, "comida", "LA COMIDA", "☀️")

    # 12. Colación vespertina
    col_vesp = menu_json.get("colacion_vespertina_global")
    col_vesp_desc = (col_vesp.get("descripcion", "") if col_vesp
                     else menus_data.get("menu_1", {})
                                    .get("colacion_vespertina", {})
                                    .get("descripcion", ""))
    if col_vesp_desc:
        _build_colacion_banner(doc, "🥛  COLACIÓN VESPERTINA: ", col_vesp_desc)

    # 13. CENA
    _add_section_header(doc, "🌙  CENA",
                        bg_color=COLORS["header_moon"], font_size_pt=9.8)
    _build_platillo_block(doc, menus_data, "cena", "LA CENA", "🌙")

    # 14. Footer kcal
    _add_spacing(doc)
    MK = ["menu_1", "menu_2", "menu_3"]
    MB = [COLORS["menu1_bg"],   COLORS["menu2_bg"],   COLORS["menu3_bg"]]
    MT = [COLORS["menu1_text"], COLORS["menu2_text"], COLORS["menu3_text"]]

    footer = doc.add_table(rows=1, cols=3)
    footer.autofit = False
    _set_table_width(footer, 10800)
    _apply_col_widths(footer, [3600, 3600, 3600])

    for ci in range(3):
        cell = footer.cell(0, ci)
        _set_cell_bg(cell, MB[ci]); _set_cell_borders(cell, MT[ci], 3)
        _set_cell_margins(cell, 100, 150, 100, 150)
        kcal_dia = menus_data.get(MK[ci], {}).get("kcal_dia_total", calorias)
        p = cell.paragraphs[0]; p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        _add_run(p, f"MENÚ {ci+1}  •  {kcal_dia} kcal/día",
                 bold=True, size_pt=9.0, color=MT[ci])

    buf = BytesIO()
    doc.save(buf)
    return buf.getvalue()


# ─────────────────────────────────────────────────────────────────────────────
# PUNTO DE ENTRADA PÚBLICO
# ─────────────────────────────────────────────────────────────────────────────

def get_base_menu_text() -> str:
    try:
        import os
        base_path = ("/Users/orla09i/Desktop/Projects/clinical_nutrilev"
                     "/apps/api-python/utils/menu_examples/menu edited.docx")
        if not os.path.exists(base_path):
            return "No base text available."
        doc = Document(base_path)
        full_text = (
            [p.text for p in doc.paragraphs] +
            [cell.text for t in doc.tables
             for row in t.rows for cell in row.cells]
        )
        return "\n".join(full_text)[:3000]
    except Exception as e:
        print(f"[v3.2] Base text extraction failed: {e}")
        return "Standard Nutrilev Structure"


def generate_full_menu_docx(
    historial_paciente: dict,
    calorias_objetivo: int,
    notas_personalizadas: str,
    menu_base_texto: str,
    gemini_key: str,
) -> bytes:
    """
    Genera el menú clínico completo y retorna bytes del .docx.

    Args:
        historial_paciente:   Dict con el expediente del paciente.
                              'progreso_historial': lista de dicts, más reciente primero.
        calorias_objetivo:    kcal/día prescritas.
        notas_personalizadas: Instrucciones clínicas del nutriólogo.
        menu_base_texto:      Texto del menú base (referencia estructural).
        gemini_key:           API key de Google Gemini.

    Returns:
        bytes: Contenido binario del .docx generado.
    """
    print(f"[NutriArchitect v3.2] Paciente : {historial_paciente.get('nombre', '?')}")
    print(f"[NutriArchitect v3.2] Calorías : {calorias_objetivo} kcal")

    # 1. Llamar a Gemini
    menu_json = _call_gemini(
        historial_paciente, calorias_objetivo,
        notas_personalizadas, menu_base_texto, gemini_key
    )

    # 2. Normalizar: garantizar equivalencias consistentes entre los 3 menús
    menu_json = _normalizar_menu(menu_json)

    print(f"[NutriArchitect v3.2] Objetivo : "
          f"{menu_json.get('metadata', {}).get('objetivo_clinico', '?')}")

    # 3. Construir .docx
    docx_bytes = _build_docx(menu_json, historial_paciente, calorias_objetivo)
    print(f"[NutriArchitect v3.2] Documento: {len(docx_bytes):,} bytes")

    return docx_bytes