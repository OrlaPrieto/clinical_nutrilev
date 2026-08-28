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
    start_idx = (today_idx + 1) % 7
    day_names = [WEEKDAYS_ES[(start_idx + i) % 7] for i in range(7)]
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
    """
    Construye la tabla oficial de Menú de Equivalencias Nutrilev (SMAE):
    - 5 Columnas: Eq | Grupo | MENÚ 1 | MENÚ 2 | MENÚ 3
    - Secciones: DESAYUNO, COMIDA, CENA (filas por grupos: Cereales, POA, Grasas, Frutas, Verduras)
    - Banners horizontales para COLACIÓN MATUTINA y COLACIÓN VESPERTINA
    """
    if not menus:
        return

    # 1. Extraer colaciones globales o de cada menú
    col_mat_desc = ""
    col_vesp_desc = ""
    for m in menus:
        c1 = m.get("colacion_matutina", {})
        c2 = m.get("colacion_vespertina", {})
        if isinstance(c1, dict) and c1.get("descripcion") and not col_mat_desc:
            col_mat_desc = c1.get("descripcion")
        elif isinstance(c1, dict) and c1.get("platillo") and not col_mat_desc:
            col_mat_desc = f"{c1.get('platillo')} ({', '.join([_clean_ingredient(i) for i in c1.get('ingredientes', []) if i])})"

        if isinstance(c2, dict) and c2.get("descripcion") and not col_vesp_desc:
            col_vesp_desc = c2.get("descripcion")
        elif isinstance(c2, dict) and c2.get("platillo") and not col_vesp_desc:
            col_vesp_desc = f"{c2.get('platillo')} ({', '.join([_clean_ingredient(i) for i in c2.get('ingredientes', []) if i])})"

    col_widths = [567, 1200, 4387, 4387, 4389]  # Total = 14930 dxa (~26.34 cm)
    opt_bgs = ["1A7A6E", "E8762B", "7B3DB5"]

    main_meals = [
        ("desayuno", "DESAYUNO", "1A7A6E"),
        ("comida", "COMIDA", "E8762B"),
        ("cena", "CENA", "7B3DB5")
    ]

    # Recopilar filas que construiremos en la tabla unificada
    # Tipos de fila:
    # 'section_header': (label, bg_color)
    # 'col_header': (m1_title, m2_title, m3_title)
    # 'group_row': (eq_val, group_name, m1_desc, m2_desc, m3_desc)
    # 'colacion_banner': (label, desc_text)

    rows_to_render = []

    for m_key, m_label, m_color in main_meals:
        # Verificar si algún menú tiene esta comida
        if not any(m.get(m_key) for m in menus):
            continue

        # 1. Section Header
        rows_to_render.append(("section_header", (m_label, m_color)))

        # 2. Column Titles Row
        t1 = menus[0].get(m_key, {}).get("nombre_platillo") or menus[0].get("title") or "MENÚ 1"
        t2 = menus[1].get(m_key, {}).get("nombre_platillo") or menus[1].get("title") or "MENÚ 2" if len(menus) > 1 else "MENÚ 2"
        t3 = menus[2].get(m_key, {}).get("nombre_platillo") or menus[2].get("title") or "MENÚ 3" if len(menus) > 2 else "MENÚ 3"
        rows_to_render.append(("col_header", (t1, t2, t3)))

        # 3. Group rows
        # Recopilar grupos SMAE
        groups_in_meal = []
        standard_groups = ["Cereales", "POA", "Grasas", "Frutas", "Verduras"]

        for m in menus:
            meal_data = m.get(m_key, {})
            eqs = meal_data.get("equivalencias", [])
            for eq in eqs:
                g = eq.get("grupo")
                if g and g not in groups_in_meal:
                    groups_in_meal.append(g)

        if not groups_in_meal:
            groups_in_meal = standard_groups

        for g_name in groups_in_meal:
            # Obtener porción y descripciones para cada menú
            eq_val = ""
            m_descs = ["—", "—", "—"]

            for idx, m in enumerate(menus[:3]):
                meal_data = m.get(m_key, {})
                eqs = meal_data.get("equivalencias", [])
                
                # Buscar equivalencia de este grupo
                found_eq = next((eq for eq in eqs if eq.get("grupo", "").lower() == g_name.lower()), None)
                if found_eq:
                    if not eq_val and found_eq.get("porciones"):
                        eq_val = str(found_eq.get("porciones"))
                    m_descs[idx] = found_eq.get("descripcion") or "—"
                elif meal_data.get("ingredientes"):
                    # Fallback si el menú viene en formato antiguo de ingredientes en lista
                    ings = meal_data.get("ingredientes", [])
                    clean_ings = [_clean_ingredient(i) for i in ings if i]
                    if idx == 0 and not eq_val:
                        eq_val = "1"
                    if idx < len(clean_ings):
                        m_descs[idx] = clean_ings[idx]
                    elif clean_ings:
                        m_descs[idx] = ", ".join(clean_ings)

            if not eq_val:
                eq_val = "1"

            rows_to_render.append(("group_row", (eq_val, g_name, m_descs[0], m_descs[1], m_descs[2])))

        # 4. Banner de colación después de Desayuno y Comida
        if m_key == "desayuno" and col_mat_desc:
            rows_to_render.append(("colacion_banner", ("🍎 COLACIÓN MATUTINA: ", col_mat_desc)))
        elif m_key == "comida" and col_vesp_desc:
            rows_to_render.append(("colacion_banner", ("🫐 COLACIÓN VESPERTINA: ", col_vesp_desc)))

    # Crear la tabla unificada en Word
    table = doc.add_table(rows=len(rows_to_render), cols=5)
    table.autofit = False
    _set_table_width(table, 14930)
    _apply_col_widths(table, col_widths)

    for r_idx, (r_type, r_data) in enumerate(rows_to_render):
        row = table.rows[r_idx]

        if r_type == "section_header":
            m_label, m_color = r_data
            for c_idx in range(5):
                cell = row.cells[c_idx]
                _set_cell_bg(cell, m_color)
                _set_cell_no_borders(cell)
                _set_cell_margins(cell, top=30, left=60, bottom=30, right=60)
                _set_cell_valign(cell, "center")
                if c_idx == 0:
                    p = cell.paragraphs[0]
                    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                    p.paragraph_format.space_before = Pt(0)
                    p.paragraph_format.space_after = Pt(0)
                    _add_run(p, f"  {m_label}", bold=True, size_pt=8.5, color="FFFFFF")

        elif r_type == "col_header":
            t1, t2, t3 = r_data
            for c_idx in range(5):
                cell = row.cells[c_idx]
                _set_cell_margins(cell, top=30, left=40, bottom=30, right=40)
                _set_cell_valign(cell, "center")
                p = cell.paragraphs[0]
                p.paragraph_format.space_before = Pt(0)
                p.paragraph_format.space_after = Pt(0)

                if c_idx == 0:
                    _set_cell_bg(cell, "1E293B")
                    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                    _add_run(p, "Eq", bold=True, size_pt=7.5, color="FFFFFF")
                elif c_idx == 1:
                    _set_cell_bg(cell, "334155")
                    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                    _add_run(p, "Grupo", bold=True, size_pt=7.5, color="FFFFFF")
                else:
                    opt_idx = c_idx - 2
                    title_text = [t1, t2, t3][opt_idx]
                    _set_cell_bg(cell, opt_bgs[opt_idx % 3])
                    _set_cell_no_borders(cell)
                    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                    _add_run(p, f"MENÚ {opt_idx + 1}: {title_text.upper()}", bold=True, size_pt=7.5, color="FFFFFF")

        elif r_type == "group_row":
            eq_val, g_name, d1, d2, d3 = r_data
            group_colors_map = {
                "Cereales": ("664D00", "FFF3CD"),
                "POA":      ("0C5460", "D1ECF1"),
                "Grasas":   ("7D4E00", "FDEBD0"),
                "Verduras": ("155724", "D4EDDA"),
                "Frutas":   ("7A4000", "FDE8C8"),
            }
            num_color, bg_color = group_colors_map.get(g_name, ("334155", "F8FAFC"))

            for c_idx in range(5):
                cell = row.cells[c_idx]
                _set_cell_borders(cell, "CBD5E1", 2)
                _set_cell_margins(cell, 25, 40, 25, 40)
                _set_cell_valign(cell, "center")
                p = cell.paragraphs[0]
                p.paragraph_format.space_before = Pt(0)
                p.paragraph_format.space_after = Pt(0)
                p.paragraph_format.line_spacing = 1.0

                if c_idx == 0:
                    _set_cell_bg(cell, bg_color)
                    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                    _add_run(p, str(eq_val), bold=True, size_pt=7.5, color=num_color)
                elif c_idx == 1:
                    _set_cell_bg(cell, bg_color)
                    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                    _add_run(p, g_name, bold=True, size_pt=7.2, color=num_color)
                else:
                    opt_idx = c_idx - 2
                    desc_text = [d1, d2, d3][opt_idx]
                    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                    _add_run(p, desc_text, size_pt=7.0, color="0F172A")

        elif r_type == "colacion_banner":
            title_text, desc_text = r_data
            for c_idx in range(5):
                cell = row.cells[c_idx]
                _set_cell_bg(cell, "ECFDF5")
                _set_cell_borders(cell, "10B981", 3)
                _set_cell_margins(cell, top=30, left=80, bottom=30, right=80)
                _set_cell_valign(cell, "center")
                if c_idx == 0:
                    p = cell.paragraphs[0]
                    p.paragraph_format.space_before = Pt(0)
                    p.paragraph_format.space_after = Pt(0)
                    _add_run(p, title_text, bold=True, size_pt=7.5, color="065F46")
                    _add_run(p, desc_text, size_pt=7.2, color="047857")
