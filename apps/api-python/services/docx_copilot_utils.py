from datetime import datetime
from io import BytesIO
from docx import Document
from docx.shared import Pt, RGBColor, Cm
from docx.enum.section import WD_ORIENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

# ─────────────────────────────────────────────────────────────────────────────
# COLORES DEL TEMA NUTRILEV
# ─────────────────────────────────────────────────────────────────────────────
COLORS = {
    "primary_purple": "976CA0",
    "primary_teal":   "1A7A6E",
    "primary_rose":   "E8762B",
    "header_dark":     "1E293B",
    "header_light":    "F8FAFC",

    # Colores por tiempo de comida
    "desayuno_bg":     "FFFBEB", "desayuno_border": "F59E0B", "desayuno_text": "92400E",
    "col1_bg":         "ECFDF5", "col1_border":     "10B981", "col1_text": "065F46",
    "comida_bg":       "FFF1F2", "comida_border":   "F43F5E", "comida_text": "9F1239",
    "col2_bg":         "F5F3FF", "col2_border":     "8B5CF6", "col2_text": "5B21B6",
    "cena_bg":         "EEF2FF", "cena_border":     "6366F1", "cena_text": "3730A3",

    # Macros
    "protein_bg":      "EEF2FF", "protein_text":   "4338CA",
    "carbs_bg":        "FEF3C7", "carbs_text":     "B45309",
    "fat_bg":          "FFE4E6", "fat_text":       "BE123C",

    # Bordes y neutros
    "border_light":    "CBD5E1",
    "border_dark":     "94A3B8",
    "text_dark":       "0F172A",
    "text_mid":        "334155",
    "text_muted":      "64748B",
    "white":           "FFFFFF",
}

# ─────────────────────────────────────────────────────────────────────────────
# HELPERS DE FORMATO Y OXML
# ─────────────────────────────────────────────────────────────────────────────

def _rgb(hex_str: str) -> RGBColor:
    h = hex_str.lstrip("#")
    return RGBColor(int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))

def _set_cell_bg(cell, hex_color: str):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hex_color.upper().lstrip("#"))
    tcPr.append(shd)

def _set_cell_borders(cell, color: str = "CBD5E1", size: int = 4):
    tcPr = cell._tc.get_or_add_tcPr()
    tcBorders = OxmlElement("w:tcBorders")
    for side in ("top", "left", "bottom", "right"):
        el = OxmlElement(f"w:{side}")
        el.set(qn("w:val"), "single")
        el.set(qn("w:sz"), str(size))
        el.set(qn("w:space"), "0")
        el.set(qn("w:color"), color.upper().lstrip("#"))
        tcBorders.append(el)
    tcPr.append(tcBorders)

def _set_cell_margins(cell, top=40, left=60, bottom=40, right=60):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement("w:tcMar")
    for side, val in (("top", top), ("left", left), ("bottom", bottom), ("right", right)):
        el = OxmlElement(f"w:{side}")
        el.set(qn("w:w"), str(val))
        el.set(qn("w:type"), "dxa")
        tcMar.append(el)
    tcPr.append(tcMar)

def _set_cell_valign(cell, align: str = "center"):
    tcPr = cell._tc.get_or_add_tcPr()
    vAlign = OxmlElement("w:vAlign")
    vAlign.set(qn("w:val"), align)
    tcPr.append(vAlign)

def _set_table_width(table, width_dxa: int = 14930):
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

def _add_run(para, text: str, bold=False, size_pt=8.0, color="0F172A", font="Arial", italic=False):
    run = para.add_run(text)
    run.bold = bold
    run.italic = italic
    run.font.name = font
    run.font.size = Pt(size_pt)
    run.font.color.rgb = _rgb(color)
    return run

def _format_date(date_val) -> str:
    if not date_val:
        return datetime.now().strftime("%d/%m/%Y")
    s = str(date_val)[:10]
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(s, fmt).strftime("%d/%m/%Y")
        except ValueError:
            continue
    return s

def _clean_ingredient(ing: str) -> str:
    if not ing:
        return ""
    import re
    return re.sub(r'^[•\-\*\s]+', '', str(ing)).strip()

def _set_cell_no_borders(cell):
    tcPr = cell._tc.get_or_add_tcPr()
    tcBorders = OxmlElement("w:tcBorders")
    for side in ("top", "left", "bottom", "right"):
        el = OxmlElement(f"w:{side}")
        el.set(qn("w:val"), "none")
        el.set(qn("w:sz"), "0")
        el.set(qn("w:space"), "0")
        el.set(qn("w:color"), "FFFFFF")
        tcBorders.append(el)
    tcPr.append(tcBorders)

def _add_paragraph_spacing(doc, before_pt=1, after_pt=1):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(before_pt)
    p.paragraph_format.space_after = Pt(after_pt)

# ─────────────────────────────────────────────────────────────────────────────
# GENERADOR PRINCIPAL DOCX (LANDSCAPE 1 PÁGINA)
# ─────────────────────────────────────────────────────────────────────────────

def build_copilot_single_page_docx(copilot_data: dict, patient_context: dict, target_calories: int = 1800) -> bytes:
    doc = Document()

    # 1. Configurar Orientación LANDSCAPE y Márgenes Estrechos (0.8 cm)
    section = doc.sections[0]
    section.orientation = WD_ORIENT.LANDSCAPE
    section.page_width = Cm(27.94)
    section.page_height = Cm(21.59)
    section.left_margin = Cm(0.8)
    section.right_margin = Cm(0.8)
    section.top_margin = Cm(0.8)
    section.bottom_margin = Cm(0.8)

    patient_name = patient_context.get("nombre") or patient_context.get("name") or "Paciente"
    fecha_hoy = _format_date(patient_context.get("fecha_hoy") or datetime.now())
    is_weekly = copilot_data.get("format_type") == "semanal" or bool(copilot_data.get("days"))

    # Extraer macros si existen
    clinical_analysis = copilot_data.get("clinical_analysis", {})
    macros = clinical_analysis.get("macro_distribution", {})
    cal_target = macros.get("calories", target_calories)
    prot_g = macros.get("protein_g", "—")
    prot_pct = macros.get("protein_pct", "")
    carb_g = macros.get("carbs_g", "—")
    carb_pct = macros.get("carbs_pct", "")
    fat_g = macros.get("fat_g", "—")
    fat_pct = macros.get("fat_pct", "")

    # 2. ENCABEZADO COMPACTO (Tabla de 1 fila, 2 columnas: Datos Paciente + Macros)
    head_tbl = doc.add_table(rows=1, cols=2)
    head_tbl.autofit = False
    _set_table_width(head_tbl, 14930)
    _apply_col_widths(head_tbl, [8930, 6000])

    left_cell = head_tbl.cell(0, 0)
    right_cell = head_tbl.cell(0, 1)

    _set_cell_bg(left_cell, "1E293B")
    _set_cell_bg(right_cell, "0F172A")
    _set_cell_margins(left_cell, top=60, left=120, bottom=60, right=120)
    _set_cell_margins(right_cell, top=60, left=120, bottom=60, right=120)
    _set_cell_no_borders(left_cell)
    _set_cell_no_borders(right_cell)

    # Info Paciente (Izquierda)
    p_left = left_cell.paragraphs[0]
    p_left.paragraph_format.space_before = Pt(0)
    p_left.paragraph_format.space_after = Pt(2)
    _add_run(p_left, "CLINICAL NUTRILIEV  ·  PLAN DE MENÚ COPILOTO\n", bold=True, size_pt=10.0, color="F8FAFC")
    _add_run(p_left, f"PACIENTE: {patient_name.upper()}   |   FECHA: {fecha_hoy}   |   OBJETIVO: {cal_target} kcal", bold=True, size_pt=8.0, color="CBD5E1")
    _add_run(p_left, f"   |   FORMATO: {'SEMANAL (7 DÍAS)' if is_weekly else 'EQUIVALENCIAS (3 OPCIONES)'}", italic=True, size_pt=7.5, color="94A3B8")

    # Macros Badges (Derecha)
    p_right = right_cell.paragraphs[0]
    p_right.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p_right.paragraph_format.space_before = Pt(0)
    p_right.paragraph_format.space_after = Pt(0)
    _add_run(p_right, f"Proteína: {prot_g}g ({prot_pct}%)   ", bold=True, size_pt=8.0, color="A5B4FC")
    _add_run(p_right, f"Carbohidratos: {carb_g}g ({carb_pct}%)   ", bold=True, size_pt=8.0, color="FDE68A")
    _add_run(p_right, f"Grasas: {fat_g}g ({fat_pct}%)", bold=True, size_pt=8.0, color="FECDD3")

    _add_paragraph_spacing(doc, 2, 2)

    # 3. CONSTRUCCIÓN DE LA TABLA PRINCIPAL DE MENÚS
    if is_weekly:
        _build_weekly_table(doc, copilot_data.get("days", []))
    else:
        _build_equivalencias_table(doc, copilot_data.get("menus", []))

    # 4. PIE DE PÁGINA CLÍNICO COMPACTO
    _add_paragraph_spacing(doc, 2, 2)
    footer_tbl = doc.add_table(rows=1, cols=1)
    footer_tbl.autofit = False
    _set_table_width(footer_tbl, 14930)
    f_cell = footer_tbl.cell(0, 0)
    _set_cell_bg(f_cell, "F8FAFC")
    _set_cell_borders(f_cell, "CBD5E1", 3)
    _set_cell_margins(f_cell, top=40, left=100, bottom=40, right=100)

    p_f = f_cell.paragraphs[0]
    p_f.paragraph_format.space_before = Pt(0)
    p_f.paragraph_format.space_after = Pt(0)
    
    rationale = clinical_analysis.get("clinical_rationale", "")
    if rationale:
        _add_run(p_f, "💡 ESTRATEGIA CLÍNICA: ", bold=True, size_pt=7.5, color="1A7A6E")
        _add_run(p_f, f"{rationale[:220]}... ", size_pt=7.0, color="334155")
        
    _add_run(p_f, "⚠️ Cualquier duda o incomodidad con los platillos, notifique a su nutrióloga. Clinical Nutrilev.", italic=True, size_pt=7.0, color="64748B")

    # Guardar a buffer binario
    buf = BytesIO()
    doc.save(buf)
    return buf.getvalue()


def _build_weekly_table(doc, days: list):
    """Construye tabla para 7 Días (Semanal) en 8 columnas (Tiempo + Lunes..Domingo)"""
    if not days:
        return

    col_widths = [2330] + [1800] * 7  # Total = 14930 dxa (~26.34 cm)
    meals_config = [
        ("desayuno", "🍳 DESAYUNO", COLORS["desayuno_bg"], COLORS["desayuno_border"], COLORS["desayuno_text"]),
        ("colacion_matutina", "🍏 COLACIÓN 1", COLORS["col1_bg"], COLORS["col1_border"], COLORS["col1_text"]),
        ("comida", "🍲 COMIDA", COLORS["comida_bg"], COLORS["comida_border"], COLORS["comida_text"]),
        ("colacion_vespertina", "🫐 COLACIÓN 2", COLORS["col2_bg"], COLORS["col2_border"], COLORS["col2_text"]),
        ("cena", "🌙 CENA", COLORS["cena_bg"], COLORS["cena_border"], COLORS["cena_text"]),
    ]

    # Filtrar solo tiempos que tengan al menos 1 platillo
    active_meals = []
    for key, label, bg, border, text_col in meals_config:
        if any(d.get(key) for d in days):
            active_meals.append((key, label, bg, border, text_col))

    table = doc.add_table(rows=1 + len(active_meals), cols=8)
    table.autofit = False
    _set_table_width(table, 14930)
    _apply_col_widths(table, col_widths)

    # 1. Row Header
    header_row = table.rows[0]
    cell_0 = header_row.cells[0]
    _set_cell_bg(cell_0, "1E293B")
    _set_cell_margins(cell_0, 40, 60, 40, 60)
    _set_cell_valign(cell_0, "center")
    p0 = cell_0.paragraphs[0]
    p0.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p0.paragraph_format.space_before = Pt(0)
    p0.paragraph_format.space_after = Pt(0)
    _add_run(p0, "TIEMPO", bold=True, size_pt=8.0, color="FFFFFF")

    WEEKDAYS_ES = ["LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES", "SÁBADO", "DOMINGO"]
    today_idx = datetime.now().weekday()
    day_names = [WEEKDAYS_ES[(today_idx + i) % 7] for i in range(7)]
    for i in range(7):
        cell = header_row.cells[i + 1]
        d_name = days[i].get("day_name", day_names[i]).upper() if (i < len(days) and days[i].get("day_name")) else day_names[i]
        _set_cell_bg(cell, "0F172A")
        _set_cell_margins(cell, 40, 40, 40, 40)
        _set_cell_valign(cell, "center")
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(0)
        _add_run(p, d_name, bold=True, size_pt=7.5, color="FFFFFF")

    # 2. Meal Rows
    for r_idx, (key, label, bg, border, text_col) in enumerate(active_meals):
        row = table.rows[r_idx + 1]
        
        # Col 0: Tiempo de comida
        t_cell = row.cells[0]
        _set_cell_bg(t_cell, bg)
        _set_cell_borders(t_cell, border, 4)
        _set_cell_margins(t_cell, 40, 60, 40, 60)
        _set_cell_valign(t_cell, "center")
        p_t = t_cell.paragraphs[0]
        p_t.paragraph_format.space_before = Pt(0)
        p_t.paragraph_format.space_after = Pt(0)
        _add_run(p_t, label, bold=True, size_pt=7.5, color=text_col)

        # Cols 1..7: Días
        for d_idx in range(7):
            cell = row.cells[d_idx + 1]
            _set_cell_borders(cell, "CBD5E1", 2)
            _set_cell_margins(cell, 30, 40, 30, 40)
            _set_cell_valign(cell, "top")
            
            day_data = days[d_idx] if d_idx < len(days) else {}
            dish = day_data.get(key)
            
            p_cell = cell.paragraphs[0]
            p_cell.paragraph_format.space_before = Pt(0)
            p_cell.paragraph_format.space_after = Pt(0)
            p_cell.paragraph_format.line_spacing = 1.0

            if dish and dish.get("platillo"):
                _add_run(p_cell, dish.get("platillo"), bold=True, size_pt=7.0, color="0F172A")
                ings = dish.get("ingredientes", [])
                if ings:
                    clean_ings = [_clean_ingredient(ing) for ing in ings if ing]
                    _add_run(p_cell, "\n" + ", ".join(clean_ings), size_pt=6.2, color="475569")
                if dish.get("preparacion_rapida"):
                    _add_run(p_cell, f"\n💡 {dish.get('preparacion_rapida')}", italic=True, size_pt=6.0, color="64748B")
            else:
                _add_run(p_cell, "—", italic=True, size_pt=6.5, color="94A3B8")


def _build_equivalencias_table(doc, menus: list):
    """Construye tabla para Equivalencias (3 Opciones) en 4 columnas (Tiempo + Opción 1, 2, 3)"""
    if not menus:
        return

    col_widths = [2930, 4000, 4000, 4000]  # Total = 14930 dxa (~26.34 cm)
    meals_config = [
        ("desayuno", "🍳 DESAYUNO", COLORS["desayuno_bg"], COLORS["desayuno_border"], COLORS["desayuno_text"]),
        ("colacion_matutina", "🍏 COLACIÓN MATUTINA", COLORS["col1_bg"], COLORS["col1_border"], COLORS["col1_text"]),
        ("comida", "🍲 COMIDA", COLORS["comida_bg"], COLORS["comida_border"], COLORS["comida_text"]),
        ("colacion_vespertina", "🫐 COLACIÓN VESPERTINA", COLORS["col2_bg"], COLORS["col2_border"], COLORS["col2_text"]),
        ("cena", "🌙 CENA", COLORS["cena_bg"], COLORS["cena_border"], COLORS["cena_text"]),
    ]

    active_meals = []
    for key, label, bg, border, text_col in meals_config:
        if any(m.get(key) for m in menus):
            active_meals.append((key, label, bg, border, text_col))

    table = doc.add_table(rows=1 + len(active_meals), cols=4)
    table.autofit = False
    _set_table_width(table, 14930)
    _apply_col_widths(table, col_widths)

    # 1. Row Header
    header_row = table.rows[0]
    cell_0 = header_row.cells[0]
    _set_cell_bg(cell_0, "1E293B")
    _set_cell_margins(cell_0, 50, 80, 50, 80)
    _set_cell_valign(cell_0, "center")
    p0 = cell_0.paragraphs[0]
    p0.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p0.paragraph_format.space_before = Pt(0)
    p0.paragraph_format.space_after = Pt(0)
    _add_run(p0, "TIEMPO DE COMIDA", bold=True, size_pt=8.5, color="FFFFFF")

    opt_bgs = ["1A7A6E", "E8762B", "7B3DB5"]
    for i in range(3):
        cell = header_row.cells[i + 1]
        m_title = menus[i].get("title", f"OPCIÓN {i + 1}").upper() if i < len(menus) else f"OPCIÓN {i + 1}"
        _set_cell_bg(cell, opt_bgs[i % 3])
        _set_cell_margins(cell, 50, 80, 50, 80)
        _set_cell_valign(cell, "center")
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(0)
        _add_run(p, m_title, bold=True, size_pt=8.5, color="FFFFFF")

    # 2. Meal Rows
    for r_idx, (key, label, bg, border, text_col) in enumerate(active_meals):
        row = table.rows[r_idx + 1]
        
        # Col 0: Tiempo
        t_cell = row.cells[0]
        _set_cell_bg(t_cell, bg)
        _set_cell_borders(t_cell, border, 4)
        _set_cell_margins(t_cell, 40, 80, 40, 80)
        _set_cell_valign(t_cell, "center")
        p_t = t_cell.paragraphs[0]
        p_t.paragraph_format.space_before = Pt(0)
        p_t.paragraph_format.space_after = Pt(0)
        _add_run(p_t, label, bold=True, size_pt=8.0, color=text_col)

        # Cols 1..3: Opciones
        for m_idx in range(3):
            cell = row.cells[m_idx + 1]
            _set_cell_borders(cell, "CBD5E1", 2)
            _set_cell_margins(cell, 40, 60, 40, 60)
            _set_cell_valign(cell, "top")
            
            menu_data = menus[m_idx] if m_idx < len(menus) else {}
            dish = menu_data.get(key)
            
            p_cell = cell.paragraphs[0]
            p_cell.paragraph_format.space_before = Pt(0)
            p_cell.paragraph_format.space_after = Pt(0)
            p_cell.paragraph_format.line_spacing = 1.0

            if dish and dish.get("platillo"):
                _add_run(p_cell, dish.get("platillo"), bold=True, size_pt=8.0, color="0F172A")
                ings = dish.get("ingredientes", [])
                if ings:
                    clean_ings = [_clean_ingredient(ing) for ing in ings if ing]
                    p_ing = cell.add_paragraph()
                    p_ing.paragraph_format.space_before = Pt(1)
                    p_ing.paragraph_format.space_after = Pt(0)
                    p_ing.paragraph_format.line_spacing = 1.0
                    for clean_i in clean_ings:
                        _add_run(p_ing, f"• {clean_i}\n", size_pt=7.2, color="334155")
                if dish.get("preparacion_rapida"):
                    p_tip = cell.add_paragraph()
                    p_tip.paragraph_format.space_before = Pt(1)
                    p_tip.paragraph_format.space_after = Pt(0)
                    _add_run(p_tip, f"💡 Tip: {dish.get('preparacion_rapida')}", italic=True, size_pt=6.8, color="64748B")
            else:
                _add_run(p_cell, "—", italic=True, size_pt=7.5, color="94A3B8")
