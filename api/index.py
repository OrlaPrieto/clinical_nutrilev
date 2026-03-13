from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
import os
import io
import re
from typing import Optional
from docx import Document
from docx.shared import Inches, Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH
from google import genai
from google.genai import types as genai_types
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

NS_A = "http://schemas.openxmlformats.org/drawingml/2006/main"
NS_W  = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
DEFAULT_IMAGE_SIZE = 1.0

# =============================================================================
# DETECCION DE FORMATO
#
# Formato A — "MENU 1/2/3" (ej. Rocio Jimenez)
#   Tabla principal: filas = secciones (DESAYUNO→COLACION→COMIDA→COLACION→CENA)
#   Cols 2/3/4 = Menu 1, Menu 2, Menu 3
#   La lista de compras ya viene en tablas separadas (3-8) con columnas:
#   Icono | Alimento | Cantidad | Marca | Tip
#
# Formato B — "Semanal por dias" (ej. Melany Garcia)
#   Fila 0 = header con dias de semana
#   Col 0 = tiempo de comida
#   Cols 1-N = contenido de cada dia
# =============================================================================

def detect_format(doc: Document) -> str:
    for table in doc.tables:
        if len(table.rows) < 2 or len(table.columns) < 4:
            continue
        for row in table.rows[:5]:
            for ci in range(2, min(6, len(row.cells))):
                txt = row.cells[ci].text
                if re.search(r'MEN[^A-Z\s]*\s*[123]', txt, re.IGNORECASE):
                    return "menu123"
                if re.search(r'\bDIA\s*[123]\b', txt, re.IGNORECASE):
                    return "menu123"
        header_row = table.rows[0]
        dias = ["lunes","martes","miercoles","miércoles","jueves",
                "viernes","sabado","sábado","domingo"]
        header_text = " ".join(c.text.lower() for c in header_row.cells)
        if sum(1 for d in dias if d in header_text) >= 2:
            return "semanal"
    return "menu123"

def find_menu_table(doc: Document):
    fmt = detect_format(doc)
    for table in doc.tables:
        if fmt == "semanal":
            if len(table.rows) >= 3 and len(table.columns) >= 3:
                col0_texts = [table.rows[i].cells[0].text.lower() for i in range(1, len(table.rows))]
                if any(t in " ".join(col0_texts) for t in ["desayuno", "comida", "cena"]):
                    return table, fmt
        else:
            if len(table.columns) >= 5:
                for row in table.rows[:3]:
                    for ci in [2, 3, 4]:
                        if ci < len(row.cells):
                            if re.search(r'(MEN[^A-Z\s]*\s*[123]|DIA\s*[123])', row.cells[ci].text, re.IGNORECASE):
                                return table, fmt
    return None, fmt

# =============================================================================
# SLOTS DE IMAGEN — FORMATO MENU123
#
# Regla del usuario: SOLO Desayuno y Comida reciben imagen. Cena NO.
#
# Lógica de sección (igual que extract_menu123):
#   - Empieza en DESAYUNO
#   - Primer COLACIÓN → pasa a COMIDA
#   - Segundo COLACIÓN → pasa a CENA
#
# La "imagen row" de cada sección es la ÚLTIMA fila con contenido
# antes de que empiece la siguiente sección o COLACIÓN.
# El algoritmo existente ya la encuentra correctamente —
# solo necesitamos filtrar por sección al agregar al resultado.
# =============================================================================

SECCIONES_CON_IMAGEN = {"DESAYUNO", "COMIDA"}   # CENA excluida por instruccion del usuario

def is_menu_table_fmt123(table) -> bool:
    if len(table.columns) < 5:
        return False
    for row in table.rows[:3]:
        if any(x in row.cells[0].text.upper() for x in ["DESAYUNO", "COMIDA", "CENA"]):
            return True
        for ci in [2, 3, 4]:
            if ci < len(row.cells):
                if re.search(r'(MEN[^A-Z\s]*\s*[123]|\bDIA\s*[123]\b)', row.cells[ci].text, re.IGNORECASE):
                    return True
    return False

def find_image_slots_menu123(doc: Document) -> list:
    """
    Encuentra los slots de imagen para formato menu123.
    Solo incluye slots de DESAYUNO y COMIDA (no CENA).
    """
    slots = []

    for ti, table in enumerate(doc.tables):
        if not is_menu_table_fmt123(table):
            continue

        fmt_sub = "menu13"
        for row in table.rows[:5]:
            for ci in range(2, min(6, len(row.cells))):
                if re.search(r'\bDIA\s*[123]\b', row.cells[ci].text, re.IGNORECASE):
                    fmt_sub = "dia123"

        # Recolectar filas con nombres de platillo y su sección
        # Sección se determina igual que en extract_menu123:
        # colaciones como separadores
        meal_rows = []          # (row_idx, names_dict, seccion)
        seccion_actual = "DESAYUNO"
        colaciones_vistas = 0
        prev_was_colacion = False

        for ri, row in enumerate(table.rows):
            if len(row.cells) < 5:
                continue
            col0 = row.cells[0].text.strip()

            if fmt_sub == "dia123":
                col0_up = col0.upper()
                if "DESAYUNO" in col0_up: seccion_actual = "DESAYUNO"
                elif "COMIDA" in col0_up and len(col0_up) < 20: seccion_actual = "COMIDA"
                elif "CENA" in col0_up and len(col0_up) < 20: seccion_actual = "CENA"
            else:
                if "COLACI" in col0.upper():
                    colaciones_vistas += 1
                    prev_was_colacion = True
                    continue
                if prev_was_colacion:
                    prev_was_colacion = False
                    if colaciones_vistas == 1: seccion_actual = "COMIDA"
                    elif colaciones_vistas >= 2: seccion_actual = "CENA"

            meal_names_in_row = {}
            for ci in [2, 3, 4]:
                txt = row.cells[ci].text.strip()
                if re.search(r'MEN[^A-Z\s]*\s*[123]', txt, re.IGNORECASE) or \
                   (fmt_sub == "dia123" and re.search(r'\bDIA\s*[123]\b', txt, re.IGNORECASE)):
                    name = re.sub(r'^(MEN[^A-Z\s]*\s*[123]|\bDIA\s*[123]\b)\s*', '', txt, flags=re.IGNORECASE).strip()
                    meal_names_in_row[ci] = name

            if meal_names_in_row:
                meal_rows.append((ri, meal_names_in_row, seccion_actual))

        # Para cada grupo de meal_rows por sección, encontrar la image_row
        # Solo procesamos DESAYUNO y COMIDA
        for idx, (meal_ri, names, seccion) in enumerate(meal_rows):
            # Buscar siguiente meal_row o fin de tabla
            next_ri = meal_rows[idx + 1][0] if idx + 1 < len(meal_rows) else len(table.rows)

            # Buscar última fila con contenido entre meal_ri y next_ri
            image_row = None
            for search_ri in range(next_ri - 1, meal_ri, -1):
                if search_ri >= len(table.rows):
                    continue
                row = table.rows[search_ri]
                has_content = any(
                    row.cells[ci].text.strip() and
                    "COLACI" not in row.cells[ci].text.upper() and
                    len(row.cells[ci].text.strip()) > 3
                    for ci in [2, 3, 4] if ci < len(row.cells)
                )
                if has_content:
                    is_name_row = any(
                        re.search(r'(MEN[^A-Z\s]*\s*[123]|\bDIA\s*[123]\b)', row.cells[ci].text, re.IGNORECASE)
                        for ci in [2, 3, 4] if ci < len(row.cells)
                    )
                    if not is_name_row:
                        image_row = search_ri
                        break

            if image_row is not None and seccion in SECCIONES_CON_IMAGEN:
                for ci in [2, 3, 4]:
                    if ci >= len(table.rows[image_row].cells):
                        continue
                    cell = table.rows[image_row].cells[ci]
                    has_image = bool(cell._tc.findall('.//{%s}blip' % NS_A))
                    meal_name = names.get(ci, f"platillo col{ci}")
                    slots.append((ti, image_row, ci, meal_name, has_image, seccion))

    return slots

# =============================================================================
# SLOTS DE IMAGEN — FORMATO SEMANAL
# Solo Desayuno y Comida (no Cena)
# =============================================================================

TIEMPOS_CON_IMAGEN_SEMANAL = {"desayuno", "comida"}   # excluye cena y colacion

def find_image_slots_semanal(doc: Document) -> list:
    slots = []
    table, fmt = find_menu_table(doc)
    if not table or fmt != "semanal":
        return slots

    ti = next((i for i, t in enumerate(doc.tables) if t is table), 0)
    n_cols = len(table.rows[0].cells)

    for ri, row in enumerate(table.rows[1:], start=1):
        tiempo = row.cells[0].text.strip().lower()
        if not any(t in tiempo for t in TIEMPOS_CON_IMAGEN_SEMANAL):
            continue

        for ci in range(1, n_cols):
            if ci >= len(row.cells):
                continue
            cell = row.cells[ci]
            txt = cell.text.strip()
            if not txt:
                continue
            meal_name = txt.split(":")[0].strip() if ":" in txt else " ".join(txt.split()[:4]).strip()
            has_image = bool(cell._tc.findall('.//{%s}blip' % NS_A))
            slots.append((ti, ri, ci, meal_name, has_image, tiempo.upper()))

    return slots

def find_image_slots(doc: Document) -> list:
    fmt = detect_format(doc)
    if fmt == "semanal":
        return find_image_slots_semanal(doc)
    else:
        return find_image_slots_menu123(doc)

# =============================================================================
# INSERCION DE IMAGEN EN CELDA
# =============================================================================

def insert_image_in_cell(doc: Document, ti: int, ri: int, ci: int,
                          image_bytes: bytes, fmt: str = "menu123"):
    table = doc.tables[ti]
    cell = table.rows[ri].cells[ci]
    existing_text = cell.text.strip()

    for drw in cell._tc.findall('.//{%s}drawing' % NS_W):
        drw.getparent().remove(drw)

    if fmt == "semanal":
        for p in list(cell.paragraphs):
            for r in list(p.runs):
                r._r.getparent().remove(r._r)
        img_para = cell.paragraphs[0]
        img_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
        img_run = img_para.add_run()
        img_run.add_picture(io.BytesIO(image_bytes), width=Inches(0.85))
        if existing_text:
            txt_para = cell.add_paragraph()
            txt_para.add_run(existing_text)
    else:
        para = cell.paragraphs[0]
        for r in list(para.runs):
            r._r.getparent().remove(r._r)
        run = para.add_run()
        run.add_picture(io.BytesIO(image_bytes), width=Inches(DEFAULT_IMAGE_SIZE))
        if existing_text:
            para.add_run("\n" + existing_text)
        para.alignment = WD_ALIGN_PARAGRAPH.CENTER

# =============================================================================
# GENERACION DE IMAGENES (Imagen 4 → Imagen 3 fallback)
# =============================================================================

def generate_image_gemini(meal_name: str, gemini_key: str) -> Optional[bytes]:
    prompt = (
        f"Professional food photography of '{meal_name}', healthy Mexican cuisine, "
        "served on a white plate, overhead or 45-degree angle, natural lighting, "
        "clean background, appetizing, no text, no watermarks"
    )
    client = genai.Client(api_key=gemini_key)
    for model_name in ["imagen-4.0-generate-001", "imagen-4.0-fast-generate-001", "imagen-3.0-generate-002"]:
        try:
            response = client.models.generate_images(
                model=model_name,
                prompt=prompt,
                config=genai_types.GenerateImagesConfig(
                    number_of_images=1,
                    aspect_ratio="1:1",
                    safety_filter_level="block_low_and_above",
                ),
            )
            return response.generated_images[0].image.image_bytes
        except Exception as e:
            if any(x in str(e).upper() for x in ["PAID", "BILLING", "QUOTA"]):
                print(f"[Imagen] Sin acceso para {model_name}, probando siguiente...")
            else:
                print(f"[Imagen] Error con {model_name}: {e}")
            continue
    return None

# =============================================================================
# EXTRACCION DE DATOS DEL MENU (para el prompt de lista de compras)
# =============================================================================

def extract_semanal(doc: Document) -> dict:
    table, _ = find_menu_table(doc)
    if not table:
        return {"menus": {}, "todos_ingredientes": []}

    header_row = table.rows[0]
    n_cols = len(header_row.cells)
    col_multiplicadores = {}
    menu_counter = 1
    menus = {}
    menu_3_cols = []
    assigned_menu = {}

    for ci in range(1, n_cols):
        header = header_row.cells[ci].text.strip()
        mult = len([x for x in header.split("/") if x.strip()]) if "/" in header else 1
        col_multiplicadores[ci] = mult

    for ci in range(1, n_cols):
        if col_multiplicadores[ci] >= 2:
            label = f"Menu {menu_counter}"
            menus[label] = {"dias": col_multiplicadores[ci], "comidas": {}, "cols": [ci]}
            assigned_menu[ci] = label
            menu_counter += 1
        else:
            menu_3_cols.append(ci)

    for i, ci in enumerate(menu_3_cols):
        label = f"Menu 3{'abc'[i] if i < 3 else str(i)}"
        menus[label] = {"dias": 1, "comidas": {}, "cols": [ci]}
        assigned_menu[ci] = label

    for ri in range(1, len(table.rows)):
        row = table.rows[ri]
        tiempo = row.cells[0].text.strip()
        if not tiempo:
            continue
        for ci in range(1, n_cols):
            if ci >= len(row.cells):
                continue
            menu_label = assigned_menu.get(ci)
            if menu_label and menu_label in menus:
                contenido = row.cells[ci].text.strip()
                if contenido:
                    menus[menu_label]["comidas"][tiempo] = contenido

    todos = [txt for m in menus.values() for txt in m["comidas"].values()]
    return {"menus": menus, "todos_ingredientes": todos}

def extract_menu123(doc: Document) -> dict:
    table, _ = find_menu_table(doc)
    if not table:
        return {"menus": {}, "todos_ingredientes": []}

    fmt_sub = "menu13"
    for row in table.rows[:5]:
        for ci in range(2, min(6, len(row.cells))):
            if re.search(r'\bDIA\s*[123]\b', row.cells[ci].text, re.IGNORECASE):
                fmt_sub = "dia123"
                break

    menus = {
        "Menu 1": {"dias": 2, "comidas": {}, "cols": [2]},
        "Menu 2": {"dias": 2, "comidas": {}, "cols": [3]},
        "Menu 3": {"dias": 3, "comidas": {}, "cols": [4]},
    }
    seccion_actual = "DESAYUNO"
    colaciones_vistas = 0
    prev_was_colacion = False

    for row in table.rows:
        if len(row.cells) < 5:
            continue
        col0 = row.cells[0].text.strip()

        if fmt_sub == "dia123":
            col0_up = col0.upper()
            if "DESAYUNO" in col0_up: seccion_actual = "DESAYUNO"
            elif "COMIDA" in col0_up and len(col0_up) < 20: seccion_actual = "COMIDA"
            elif "CENA" in col0_up and len(col0_up) < 20: seccion_actual = "CENA"
        else:
            if "COLACI" in col0.upper():
                colaciones_vistas += 1
                prev_was_colacion = True
                continue
            if prev_was_colacion:
                prev_was_colacion = False
                if colaciones_vistas == 1: seccion_actual = "COMIDA"
                elif colaciones_vistas >= 2: seccion_actual = "CENA"

        for ci, menu_label in [(2, "Menu 1"), (3, "Menu 2"), (4, "Menu 3")]:
            if ci >= len(row.cells): continue
            cell_text = row.cells[ci].text.strip()
            if not cell_text: continue
            is_meal_name = bool(re.search(r'(MEN[^A-Z\s]*\s*[123]|\bDIA\s*[123]\b)', cell_text, re.IGNORECASE))
            if is_meal_name:
                nombre = re.sub(r'^(MEN[^A-Z\s]*\s*[123]|\bDIA\s*[123]\b)\s*', '', cell_text, flags=re.IGNORECASE).strip()
                menus[menu_label]["comidas"][seccion_actual] = menus[menu_label]["comidas"].get(seccion_actual, "") + "\n" + nombre
            else:
                menus[menu_label]["comidas"][seccion_actual] = menus[menu_label]["comidas"].get(seccion_actual, "") + "\n" + cell_text

    todos = [txt for m in menus.values() for txt in m["comidas"].values()]
    return {"menus": menus, "todos_ingredientes": todos}

def extract_menu_data(doc: Document) -> dict:
    fmt = detect_format(doc)
    return extract_semanal(doc) if fmt == "semanal" else extract_menu123(doc)

# =============================================================================
# PROMPT DE LISTA DE COMPRAS
# Especificacion del usuario:
#   - Porciones en cantidad total para 7 dias (M1x2, M2x2, M3x3)
#   - Por grupo de alimentos con icono tipo WhatsApp
#   - Tabla: Icono | Alimento | Cantidad | Tip de compra | Marca recomendada
#   - Sin omitir ningun alimento
# =============================================================================

def build_shopping_prompt(menu_data: dict) -> str:
    menus = menu_data["menus"]
    bloques = []
    for label, info in menus.items():
        dias = info["dias"]
        bloques.append(f"\n{'='*40}")
        bloques.append(f"{label.upper()} — se repite {dias} {'día' if dias==1 else 'días'} a la semana")
        bloques.append(f"{'='*40}")
        for tiempo, contenido in info["comidas"].items():
            bloques.append(f"\n{tiempo}:\n{contenido.strip()}")

    menu_txt = "\n".join(bloques)
    menu_1_dias = next((v["dias"] for k, v in menus.items() if "1" in k), 2)
    menu_2_dias = next((v["dias"] for k, v in menus.items() if "2" in k), 2)

    return f"""Eres una nutrióloga mexicana experta en planificación alimentaria semanal.
Analiza el siguiente plan de menú de 7 días y genera una lista de compras COMPLETA.

{menu_txt}

REGLAS DE CANTIDAD:
- Menú 1 se consume {menu_1_dias} días → multiplica TODAS sus porciones x{menu_1_dias}
- Menú 2 se consume {menu_2_dias} días → multiplica TODAS sus porciones x{menu_2_dias}
- Menú 3 (puede ser 3a+3b+3c o un solo menú) se consume 3 días → suma ingredientes de esos 3 días
- Si un ingrediente aparece en VARIOS menús, SUMA todas las cantidades de los 7 días
- Convierte a unidades de compra prácticas: piezas, gramos, litros, paquetes, bolsas

FORMATO DE SALIDA — tabla Markdown por grupo de alimentos:

## [EMOJI_GRUPO] NOMBRE DEL GRUPO
| Icono | Alimento | Cantidad total 7 días | 💡 Tip de compra | ⭐ Marca recomendada |
|-------|----------|----------------------|------------------|---------------------|
| 🥚 | Huevo entero | 8 piezas | Revisar que no tengan grietas | Bachoco / San Juan |

GRUPOS REQUERIDOS (en este orden, incluye el emoji en el encabezado ## ):
## 🥩 PROTEÍNAS (carnes, pollo, pescado, atún, sardina, huevo, quesos proteicos)
## 🧀 LÁCTEOS (leche, yogurt, quesos frescos)
## 🌾 CEREALES Y CARBOHIDRATOS (pan, tortillas, arroz, avena, cereal, papa, tostadas, galletas)
## 🫘 LEGUMINOSAS (frijoles, garbanzo, lentejas, hummus)
## 🥑 GRASAS SALUDABLES (aguacate, nuez, almendra, semillas, aceite, crema de cacahuate, mantequilla)
## 🥦 VERDURAS Y HORTALIZAS (todas las verduras, hongos, nopales, germinados)
## 🍓 FRUTAS (todas las frutas frescas y secas)
## 🧴 CONDIMENTOS Y OTROS (especias, endulzantes, bebidas, suplementos, aderezos)

REGLAS IMPORTANTES:
1. NO omitas ningún alimento aunque aparezca una sola vez en el menú
2. Consolida el mismo alimento de diferentes tiempos de comida sumando cantidades
3. Usa emojis de WhatsApp representativos para cada alimento en la columna Icono
4. El Tip debe ser práctico y específico para supermercados en México
5. La Marca debe ser una marca real disponible en México (Walmart, Soriana, Chedraui)
6. Responde ÚNICAMENTE con las tablas, sin texto antes ni después
"""

def generate_shopping_list(menu_data: dict, gemini_key: str) -> str:
    try:
        client = genai.Client(api_key=gemini_key)
        response = client.models.generate_content(
            model="gemini-flash-latest",
            contents=build_shopping_prompt(menu_data),
        )
        return response.text.strip()
    except Exception as e:
        print(f"[Gemini] Error lista de compras: {e}")
        items = "\n".join(f"- {i[:80]}" for i in menu_data["todos_ingredientes"][:50])
        return f"LISTA DE COMPRAS\n\n{items}"

# =============================================================================
# ESCRITURA DE LISTA EN EL DOCUMENTO
# Escribe la lista como tablas Word reales (igual que el documento de referencia)
# =============================================================================

def append_shopping_list(doc: Document, markdown_text: str):
    """
    Convierte el markdown de Gemini a tablas Word reales.
    Estructura del documento de referencia:
      - Pagina nueva
      - Titulo
      - Para cada grupo: encabezado + tabla 5 columnas
        (Icono | Alimento | Cantidad | Marca | Tip)
    """
    # Eliminar lista anterior si existe
    for i, p in enumerate(doc.paragraphs):
        if "LISTA DE COMPRAS" in p.text.upper():
            for rem in doc.paragraphs[i:]:
                try:
                    rem._element.getparent().remove(rem._element)
                except Exception:
                    pass
            break

    doc.add_page_break()

    # Titulo principal
    titulo = doc.add_paragraph()
    run = titulo.add_run("🛒  LISTA DE COMPRAS — 7 DÍAS")
    run.bold = True
    run.font.size = Pt(16)

    subtitulo = doc.add_paragraph()
    sub = subtitulo.add_run("Menú 1 (×2 días)  +  Menú 2 (×2 días)  +  Menú 3 (×3 días)")
    sub.italic = True
    sub.font.size = Pt(10)

    # Parsear el markdown en grupos
    groups = _parse_shopping_markdown(markdown_text)

    for group_title, rows in groups:
        # Encabezado de grupo
        doc.add_paragraph()
        grp_p = doc.add_paragraph()
        grp_run = grp_p.add_run(group_title)
        grp_run.bold = True
        grp_run.font.size = Pt(12)

        if not rows:
            continue

        # Crear tabla Word: 5 columnas
        # Icono | Alimento | Cantidad 7 días | Tip de compra | Marca recomendada
        tbl = doc.add_table(rows=1 + len(rows), cols=5)
        tbl.style = 'Table Grid'

        # Header
        headers = ["", "Alimento", "Cantidad 7 días", "💡 Tip de compra", "⭐ Marca recomendada"]
        for ci, hdr in enumerate(headers):
            cell = tbl.rows[0].cells[ci]
            p = cell.paragraphs[0]
            run = p.add_run(hdr)
            run.bold = True
            run.font.size = Pt(9)

        # Filas de datos
        for ri, row_data in enumerate(rows, start=1):
            # row_data = [icono, alimento, cantidad, tip, marca]
            for ci, val in enumerate(row_data[:5]):
                cell = tbl.rows[ri].cells[ci]
                p = cell.paragraphs[0]
                r = p.add_run(val)
                r.font.size = Pt(9)
                if ci == 1:  # Alimento en negrita
                    r.bold = True

def _parse_shopping_markdown(text: str) -> list:
    """
    Parsea el markdown de Gemini en lista de (titulo_grupo, [[icono, alimento, cant, tip, marca], ...])
    """
    groups = []
    current_title = None
    current_rows = []

    for line in text.split("\n"):
        line = line.strip()
        if not line:
            continue

        # Encabezado de grupo: ## 🥩 PROTEÍNAS...
        if line.startswith("## "):
            if current_title is not None:
                groups.append((current_title, current_rows))
            current_title = line[3:].strip()
            current_rows = []
            continue

        # Separador de tabla (|---|---|)
        if re.match(r'^\|[\s\-\|:]+\|$', line):
            continue

        # Header de tabla (Icono | Alimento | ...)
        if line.startswith("|"):
            parts = [c.strip() for c in line.split("|") if c.strip()]
            if not parts:
                continue
            # Detectar si es header (primera columna = "Icono" o "icono")
            if parts[0].lower() in ("icono", "icon", "emoji"):
                continue
            # Fila de datos: [icono, alimento, cantidad, tip, marca]
            # Normalizar a siempre 5 elementos
            while len(parts) < 5:
                parts.append("")
            current_rows.append(parts[:5])

    if current_title is not None:
        groups.append((current_title, current_rows))

    return groups

# =============================================================================
# RUTAS API
# =============================================================================

@app.route('/api/process-menu', methods=['POST'])
@app.route('/process-menu', methods=['POST'])
def process_menu():
    if 'file' not in request.files:
        return jsonify({"error": "No se recibió ningún archivo"}), 400

    file = request.files['file']
    gemini_key = request.form.get('api_key') or os.getenv('GEMINI_API_KEY')

    if not gemini_key:
        return jsonify({"error": "Falta la API key de Gemini"}), 400

    try:
        doc = Document(io.BytesIO(file.read()))
        fmt = detect_format(doc)
        print(f"[Formato] {fmt}")

        # 1. Imágenes — solo Desayuno y Comida
        try:
            slots = find_image_slots(doc)
            empty = [(ti, ri, ci, name, sec) for ti, ri, ci, name, has, sec in slots if not has]
            print(f"[Imágenes] {len(slots)} slots totales, {len(empty)} sin imagen")
            for ti, ri, ci, meal_name, sec in empty:
                print(f"  [{sec}] Generando: {meal_name}")
                img_bytes = generate_image_gemini(meal_name, gemini_key)
                if img_bytes:
                    insert_image_in_cell(doc, ti, ri, ci, img_bytes, fmt)
                    print(f"  ✓ {meal_name}")
                else:
                    print(f"  ✗ {meal_name} — sin imagen")
        except Exception as e:
            import traceback
            print(f"[Imágenes] Error omitido: {e}")
            print(traceback.format_exc())

        # 2. Lista de compras
        menu_data = extract_menu_data(doc)
        shopping_text = generate_shopping_list(menu_data, gemini_key)
        append_shopping_list(doc, shopping_text)

        # 3. Guardar y devolver
        out = io.BytesIO()
        doc.save(out)
        out.seek(0)

        return send_file(
            out,
            as_attachment=True,
            download_name=f"menu_procesado_{file.filename}",
            mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )

    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500


@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy"}), 200

@app.route('/api', methods=['GET'])
@app.route('/', methods=['GET'])
def root():
    return jsonify({"message": "Nutrilev API is running"}), 200

if __name__ == '__main__':
    app.run(debug=True)