import re
from typing import Optional
from google import genai
from google.genai import types as genai_types

# =============================================================================
# GENERACIÓN DE IMÁGENES
# =============================================================================

def generate_image_gemini(meal_name: str, gemini_key: str) -> Optional[bytes]:
    prompt = (
        f"Professional food photography of '{meal_name}', healthy Mexican cuisine, "
        "served on a white plate, overhead or 45-degree angle, natural lighting, "
        "clean background, appetizing, no text, no watermarks"
    )
    client = genai.Client(api_key=gemini_key)
    for model_name in ["imagen-4.0-generate-001", "imagen-4.0-fast-generate-001",
                        "imagen-3.0-generate-002"]:
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
# PROMPT DE LISTA DE COMPRAS
# =============================================================================

def build_shopping_prompt(menu_data: dict) -> str:
    menus = menu_data["menus"]
    bloques = []
    for label, info in menus.items():
        dias = info["dias"]
        bloques.append(f"\n{'='*40}")
        bloques.append(
            f"{label.upper()} — se repite {dias} "
            f"{'día' if dias == 1 else 'días'} a la semana")
        bloques.append(f"{'='*40}")
        for tiempo, contenido in info["comidas"].items():
            bloques.append(f"\n{tiempo}:\n{contenido.strip()}")

    menu_txt = "\n".join(bloques)
    menu_1_dias = next(
        (v["dias"] for k, v in menus.items() if "1" in k), 2)
    menu_2_dias = next(
        (v["dias"] for k, v in menus.items() if "2" in k), 2)

    return f"""Eres una nutrióloga mexicana experta en planificación alimentaria semanal.
Analiza el siguiente plan de menú de 7 días y genera una lista de compras COMPLETA.

{menu_txt}

REGLAS DE CANTIDAD:
- Menú 1 se consume {menu_1_dias} días → multiplica TODAS sus porciones x{menu_1_dias}
- Menú 2 se consume {menu_2_dias} días → multiplica TODAS sus porciones x{menu_2_dias}
- Menú 3 se consume 3 días → suma ingredientes de esos 3 días
- Si un ingrediente aparece en VARIOS menús, SUMA todas las cantidades de los 7 días
- Convierte a unidades de compra prácticas: piezas, gramos, litros, paquetes, bolsas

FORMATO DE SALIDA — tabla Markdown por grupo de alimentos:

## [EMOJI_GRUPO] NOMBRE DEL GRUPO
| Icono | Alimento | Cantidad total 7 días | 💡 Tip de compra | ⭐ Marca recomendada |
|-------|----------|----------------------|------------------|---------------------|
| 🥚 | Huevo entero | 8 piezas | Revisar que no tengan grietas | Bachoco / San Juan |

GRUPOS REQUERIDOS (en este orden):
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
2. Consolida el mismo alimento de diferentes tiempos sumando cantidades
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
        items = "\n".join(
            f"- {i[:80]}" for i in menu_data["todos_ingredientes"][:50])
        return f"LISTA DE COMPRAS\n\n{items}"
