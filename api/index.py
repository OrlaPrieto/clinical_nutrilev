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
# Formato A — "MENU 1/2/3" (CARLOS_RIVAS style)
#   - Cols 2/3/4 = Menu 1, Menu 2, Menu 3
#   - Patron MENU\s*[123] o DIA\s*[123] en celdas internas
#
# Formato B — "Semanal por dias" (MELANY_GARCIA style)
#   - Fila 0 = header con dias de semana
#   - Col 0 = tiempo de comida (Desayuno, Colacion, Comida, Cena)
#   - Cols 1-N = contenido de cada dia
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
# SLOTS DE IMAGEN — FORMATO SEMANAL
#
# Estructura:
#   Row 0:  header (dias)
#   Row 1:  Desayuno  -> imagen en cols 1-N
#   Row 2:  Colacion  -> sin imagen
#   Row 3:  Comida    -> imagen en cols 1-N
#   Row 4:  Colacion  -> sin imagen
#   Row 5:  Cena      -> imagen en cols 1-N
#
# Nombre del platillo = texto antes del primer ':'
# La imagen se inserta al inicio de la celda, sobre el texto existente
# =============================================================================

TIEMPOS_CON_IMAGEN = {"desayuno", "comida", "cena"}

def find_image_slots_semanal(doc: Document) -> list:
    """
    Retorna lista de (table_idx, row_idx, col_idx, meal_name, has_image)
    para todas las celdas de Desayuno/Comida/Cena en el formato semanal.
    """
    slots = []
    table, fmt = find_menu_table(doc)
    if not table or fmt != "semanal":
        return slots

    # Buscar tabla en doc.tables para obtener su indice
    ti = next((i for i, t in enumerate(doc.tables) if t is table), 0)
    n_cols = len(table.rows[0].cells)

    for ri, row in enumerate(table.rows[1:], start=1):  # skip header row
        tiempo = row.cells[0].text.strip().lower()
        # Solo Desayuno, Comida, Cena — no Colacion
        if not any(t in tiempo for t in TIEMPOS_CON_IMAGEN):
            continue

        for ci in range(1, n_cols):
            if ci >= len(row.cells):
                continue
            cell = row.cells[ci]
            txt = cell.text.strip()
            if not txt:
                continue

            # Nombre del platillo = todo antes del primer ':'
            # Si no hay ':', usar las primeras palabras (max 4)
            if ":" in txt:
                meal_name = txt.split(":")[0].strip()
            else:
                meal_name = " ".join(txt.split()[:4]).strip()

            has_image = bool(cell._tc.findall('.//{%s}blip' % NS_A))
            slots.append((ti, ri, ci, meal_name, has_image))

    return slots

# =============================================================================
# SLOTS DE IMAGEN — FORMATO MENU123
# =============================================================================

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
    slots = []
    for ti, table in enumerate(doc.tables):
        if not is_menu_table_fmt123(table):
            continue

        fmt_sub = "menu13"
        for row in table.rows[:5]:
            for ci in range(2, min(6, len(row.cells))):
                if re.search(r'\bDIA\s*[123]\b', row.cells[ci].text, re.IGNORECASE):
                    fmt_sub = "dia123"

        meal_rows = []
        for ri, row in enumerate(table.rows):
            if len(row.cells) < 5:
                continue
            meal_names_in_row = {}
            for ci in [2, 3, 4]:
                txt = row.cells[ci].text.strip()
                if re.search(r'MEN[^A-Z\s]*\s*[123]', txt, re.IGNORECASE) or \
                   (fmt_sub == "dia123" and re.search(r'\bDIA\s*[123]\b', txt, re.IGNORECASE)):
                    name = re.sub(r'^(MEN[^A-Z\s]*\s*[123]|\bDIA\s*[123]\b)\s*', '', txt, flags=re.IGNORECASE).strip()
                    meal_names_in_row[ci] = name
            if meal_names_in_row:
                meal_rows.append((ri, meal_names_in_row))

        for idx, (meal_ri, names) in enumerate(meal_rows):
            next_ri = meal_rows[idx + 1][0] if idx + 1 < len(meal_rows) else len(table.rows)
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
            if image_row is not None:
                for ci in [2, 3, 4]:
                    if ci >= len(table.rows[image_row].cells):
                        continue
                    cell = table.rows[image_row].cells[ci]
                    has_image = bool(cell._tc.findall('.//{%s}blip' % NS_A))
                    slots.append((ti, image_row, ci, names.get(ci, f"platillo col{ci}"), has_image))
    return slots

def find_image_slots(doc: Document) -> list:
    """Entry point unificado — detecta formato y delega."""
    fmt = detect_format(doc)
    if fmt == "semanal":
        return find_image_slots_semanal(doc)
    else:
        return find_image_slots_menu123(doc)

# =============================================================================
# INSERCION DE IMAGEN EN CELDA
#
# Para formato semanal: la imagen va AL INICIO de la celda,
# seguida del texto original. El tamaño se ajusta para no
# reventar la celda (0.8in en lugar de 1.0in).
# =============================================================================

def insert_image_in_cell(doc: Document, ti: int, ri: int, ci: int,
                          image_bytes: bytes, fmt: str = "menu123"):
    table = doc.tables[ti]
    cell = table.rows[ri].cells[ci]

    # Guardar texto existente antes de limpiar
    existing_text = cell.text.strip()

    # Eliminar imagenes previas en la celda
    for drw in cell._tc.findall('.//{%s}drawing' % NS_W):
        drw.getparent().remove(drw)

    if fmt == "semanal":
        # Insertar imagen en un nuevo parrafo al inicio,
        # luego agregar parrafo con el texto original
        # Limpiar todos los parrafos existentes
        for p in list(cell.paragraphs):
            for r in list(p.runs):
                r._r.getparent().remove(r._r)

        # Parrafo 1: imagen centrada
        img_para = cell.paragraphs[0]
        img_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
        img_run = img_para.add_run()
        # Tamaño ligeramente menor para no reventar celdas en formato semanal
        img_run.add_picture(io.BytesIO(image_bytes), width=Inches(0.85))

        # Parrafo 2: texto original restaurado
        if existing_text:
            txt_para = cell.add_paragraph()
            txt_para.add_run(existing_text)
    else:
        # Formato menu123: comportamiento original
        para = cell.paragraphs[0]
        for r in list(para.runs):
            r._r.getparent().remove(r._r)
        run = para.add_run()
        run.add_picture(io.BytesIO(image_bytes), width=Inches(DEFAULT_IMAGE_SIZE))
        if existing_text:
            para.add_run("\n" + existing_text)
        para.alignment = WD_ALIGN_PARAGRAPH.CENTER

# =============================================================================
# GENERACION DE IMAGENES (Imagen 4 con fallbacks a Imagen 3)
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
# EXTRACCION DE DATOS DEL MENU
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

    return f"""Eres una nutriologa mexicana experta en planificacion alimentaria semanal.
Analiza el siguiente plan de menu de 7 dias y genera una lista de compras COMPLETA.

{menu_txt}

REGLAS DE CANTIDAD:
- Menu 1 se consume {menu_1_dias} dias -> multiplica TODAS sus porciones x{menu_1_dias}
- Menu 2 se consume {menu_2_dias} dias -> multiplica TODAS sus porciones x{menu_2_dias}
- Menu 3 (puede ser 3a+3b+3c o un solo menu) se consume 3 dias en total -> suma ingredientes de esos 3 dias
- Si un ingrediente aparece en VARIOS menus, SUMA todas las cantidades de los 7 dias
- Convierte a unidades de compra practicas: piezas, gramos, litros, paquetes, bolsas

FORMATO DE SALIDA REQUERIDO:
Genera una lista de compras organizada por grupo de alimentos.
Para cada grupo usa este formato exacto:

[EMOJI] NOMBRE DEL GRUPO
| Alimento | Cantidad total 7 dias | 💡 Tip de compra | ⭐ Marca recomendada |
|----------|----------------------|------------------|---------------------|
| 🥚 Huevo entero | 9 piezas | Comprar la semana, guardar en refrigerador | San Juan o BACHOCO |

GRUPOS REQUERIDOS (usa estos emojis exactos para el titulo):
🥩 PROTEÍNAS ANIMALES (carnes, pollo, pescado, atun, sardinas, jamon, huevo)
🧀 LÁCTEOS (leche, yogurt, queso, cottage)
🌾 CEREALES Y CARBOHIDRATOS (pan, tortillas, arroz, avena, cereal, papa, galletas)
🫘 LEGUMINOSAS (frijoles, garbanzo, hummus)
🥑 GRASAS SALUDABLES (aguacate, nuez, almendra, crema de cacahuate, mantequilla)
🥦 VERDURAS Y HORTALIZAS (todas las verduras, ensaladas)
🍓 FRUTAS (todas las frutas)
🧴 SUPLEMENTOS Y OTROS (proteina en polvo, aceites, condimentos)

REGLAS IMPORTANTES:
1. NO omitas ningun alimento, aunque aparezca una sola vez en el menu
2. Consolida el mismo alimento aunque aparezca en diferentes tiempos de comida
3. Usa emojis de whatsapp para cada alimento en la columna "Alimento"
4. La cantidad debe ser la suma REAL de los 7 dias con las multiplicaciones correctas
5. El tip de compra debe ser practico y especifico para Mexico
6. Marca recomendada debe ser una marca real disponible en supermercados mexicanos
7. Responde UNICAMENTE con la lista, sin texto antes ni despues
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
# =============================================================================

def append_shopping_list(doc: Document, markdown_text: str):
    for i, p in enumerate(doc.paragraphs):
        if "LISTA DE COMPRAS" in p.text.upper():
            for rem in doc.paragraphs[i:]:
                try:
                    rem._element.getparent().remove(rem._element)
                except Exception:
                    pass
            break

    doc.add_page_break()

    titulo = doc.add_paragraph()
    run = titulo.add_run("🛒 LISTA DE COMPRAS — 7 DÍAS")
    run.bold = True
    run.font.size = Pt(16)

    subtitle = doc.add_paragraph()
    subtitle.add_run("Menú 1 (×2 días) + Menú 2 (×2 días) + Menú 3 (×3 días)").italic = True
    doc.add_paragraph()

    for line in markdown_text.split("\n"):
        line = line.strip()
        if not line:
            continue
        if re.match(r'^[\U0001F300-\U0001FFFF\U00002600-\U000027FF]\s+[A-ZÁÉÍÓÚÑ]', line) and not line.startswith("|"):
            p = doc.add_paragraph()
            run = p.add_run(line)
            run.bold = True
            run.font.size = Pt(12)
            continue
        if re.match(r'^\|[\s\-\|:]+\|$', line):
            continue
        if line.startswith("|"):
            parts = [c.strip() for c in line.split("|") if c.strip()]
            if not parts:
                continue
            is_header = any(x in parts[0].lower() for x in ["alimento", "producto"])
            p = doc.add_paragraph()
            if is_header:
                for part in parts:
                    r = p.add_run(part + "  ")
                    r.bold = True
                    r.font.size = Pt(9)
            else:
                p.add_run(parts[0]).bold = True
                if len(parts) > 1:
                    p.add_run("  —  " + "  |  ".join(parts[1:]))
            continue
        doc.add_paragraph(line)

# =============================================================================
# RUTAS API
# =============================================================================

@app.route('/api/process-menu', methods=['POST'])
@app.route('/process-menu', methods=['POST'])
def process_menu():
    if 'file' not in request.files:
        return jsonify({"error": "No se recibio ningun archivo"}), 400

    file = request.files['file']
    gemini_key = request.form.get('api_key') or os.getenv('GEMINI_API_KEY')

    if not gemini_key:
        return jsonify({"error": "Falta la API key de Gemini"}), 400

    try:
        doc = Document(io.BytesIO(file.read()))
        fmt = detect_format(doc)
        print(f"[Formato detectado] {fmt}")

        # Insertar imagenes (ambos formatos)
        try:
            slots = find_image_slots(doc)
            empty_slots = [(ti, ri, ci, name) for ti, ri, ci, name, has in slots if not has]
            print(f"[Imagenes] {len(slots)} slots totales, {len(empty_slots)} sin imagen")
            for ti, ri, ci, meal_name in empty_slots:
                print(f"  Generando: {meal_name}")
                img_bytes = generate_image_gemini(meal_name, gemini_key)
                if img_bytes:
                    insert_image_in_cell(doc, ti, ri, ci, img_bytes, fmt)
                    print(f"  ✓ {meal_name}")
                else:
                    print(f"  ✗ {meal_name} (sin imagen)")
        except Exception as e:
            import traceback
            print(f"[Imagenes] Error omitido: {e}")
            print(traceback.format_exc())

        # Lista de compras
        menu_data = extract_menu_data(doc)
        shopping_text = generate_shopping_list(menu_data, gemini_key)
        append_shopping_list(doc, shopping_text)

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