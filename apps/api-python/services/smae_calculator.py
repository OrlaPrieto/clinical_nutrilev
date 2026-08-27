"""
smae_calculator.py
Motor Matemático Determinista de Cuadro Dietosintético y Equivalencias SMAE
NutriArchitect Copilot · Clinical Nutrilev
"""

# Constantes Nutrimetales por Porción Estándar SMAE
SMAE_GROUPS_INFO = {
    "Verduras": {"kcal": 25, "prot_g": 2.0, "carb_g": 4.0, "fat_g": 0.0},
    "Frutas":   {"kcal": 60, "prot_g": 0.0, "carb_g": 15.0, "fat_g": 0.0},
    "Cereales": {"kcal": 70, "prot_g": 2.0, "carb_g": 15.0, "fat_g": 0.0},
    "POA":      {"kcal": 75, "prot_g": 7.0, "carb_g": 0.0,  "fat_g": 5.0},
    "Grasas":   {"kcal": 45, "prot_g": 0.0, "carb_g": 0.0,  "fat_g": 5.0},
}


def calculate_smae_dietosintetico(target_calories: int, protein_pct: float = 25.0, carbs_pct: float = 45.0, fat_pct: float = 30.0) -> dict:
    """
    Calcula determinísticamente la distribución exacta de equivalencias diarias SMAE
    a partir de las calorías objetivo del paciente y la distribución de macronutrientes.
    """
    if not target_calories or target_calories < 800:
        target_calories = 1600

    # 1. Target en gramos
    target_prot_g = round((target_calories * (protein_pct / 100.0)) / 4.0)
    target_carb_g = round((target_calories * (carbs_pct / 100.0)) / 4.0)
    target_fat_g  = round((target_calories * (fat_pct / 100.0)) / 9.0)

    # 2. Base Verduras y Frutas según rango calórico
    if target_calories < 1400:
        eq_verduras = 3
        eq_frutas = 2
    elif target_calories < 1800:
        eq_verduras = 4
        eq_frutas = 3
    elif target_calories < 2200:
        eq_verduras = 4
        eq_frutas = 4
    else:
        eq_verduras = 5
        eq_frutas = 5

    carb_from_base = (eq_verduras * 4.0) + (eq_frutas * 15.0)
    prot_from_base = (eq_verduras * 2.0)

    # 3. Cereales (Cubre resto de Carbohidratos)
    remaining_carb = max(0, target_carb_g - carb_from_base)
    eq_cereales = max(3, round(remaining_carb / 15.0))
    
    prot_from_cereales = eq_cereales * 2.0

    # 4. POA (Proteína de Origen Animal - Cubre resto de Proteína)
    remaining_prot = max(0, target_prot_g - (prot_from_base + prot_from_cereales))
    eq_poa = max(3, round(remaining_prot / 7.0))
    
    fat_from_poa = eq_poa * 5.0

    # 5. Grasas (Cubre resto de Grasas)
    remaining_fat = max(0, target_fat_g - fat_from_poa)
    eq_grasas = max(2, round(remaining_fat / 5.0))

    # 6. Totales calculados exactos
    calc_prot_g = round((eq_verduras * 2.0) + (eq_cereales * 2.0) + (eq_poa * 7.0))
    calc_carb_g = round((eq_verduras * 4.0) + (eq_frutas * 15.0) + (eq_cereales * 15.0))
    calc_fat_g  = round((eq_poa * 5.0) + (eq_grasas * 5.0))
    calc_kcals  = round((eq_verduras * 25) + (eq_frutas * 60) + (eq_cereales * 70) + (eq_poa * 75) + (eq_grasas * 45))

    # Distribución sugerida por tiempos de comida
    meal_distribution = {
        "desayuno": {
            "Cereales": str(max(1, round(eq_cereales * 0.3))),
            "POA":      str(max(1, round(eq_poa * 0.25))),
            "Grasas":   str(max(1, round(eq_grasas * 0.25))),
            "Frutas":   str(max(1, round(eq_frutas * 0.4))),
            "Verduras": str(max(1, round(eq_verduras * 0.25)))
        },
        "comida": {
            "Cereales": str(max(1, round(eq_cereales * 0.4))),
            "POA":      str(max(1, round(eq_poa * 0.45))),
            "Grasas":   str(max(1, round(eq_grasas * 0.45))),
            "Frutas":   "0",
            "Verduras": str(max(1, round(eq_verduras * 0.5)))
        },
        "cena": {
            "Cereales": str(max(1, round(eq_cereales * 0.3))),
            "POA":      str(max(1, round(eq_poa * 0.3))),
            "Grasas":   str(max(1, round(eq_grasas * 0.3))),
            "Frutas":   "0",
            "Verduras": str(max(1, round(eq_verduras * 0.25)))
        }
    }

    return {
        "target_calories": target_calories,
        "calculated_calories": calc_kcals,
        "macros": {
            "protein_g": calc_prot_g, "protein_pct": round((calc_prot_g * 4 / calc_kcals) * 100),
            "carbs_g": calc_carb_g,   "carbs_pct": round((calc_carb_g * 4 / calc_kcals) * 100),
            "fat_g": calc_fat_g,     "fat_pct": round((calc_fat_g * 9 / calc_kcals) * 100)
        },
        "daily_portions": {
            "Cereales": eq_cereales,
            "POA": eq_poa,
            "Grasas": eq_grasas,
            "Frutas": eq_frutas,
            "Verduras": eq_verduras
        },
        "meal_distribution": meal_distribution
    }


def build_smae_instruction_prompt(diet_data: dict) -> str:
    """
    Genera el bloque de instrucciones rígidas deterministas para inyectar en el prompt de Gemini.
    """
    dp = diet_data.get("daily_portions", {})
    md = diet_data.get("meal_distribution", {})

    instruction = (
        f"PLANTILLA MATEMÁTICA OBLIGATORIA DE EQUIVALENCIAS SMAE (CÁLCULO EXACTO DE {diet_data.get('target_calories')} kcal):\n"
        f"Debes respetar la plantilla determinista de porciones diarias por grupo de alimento:\n"
        f"• Cereales: {dp.get('Cereales', 6)} equivalentes diarios en total.\n"
        f"• POA (Proteínas): {dp.get('POA', 5)} equivalentes diarios en total.\n"
        f"• Grasas: {dp.get('Grasas', 4)} equivalentes diarios en total.\n"
        f"• Frutas: {dp.get('Frutas', 3)} equivalentes diarios en total.\n"
        f"• Verduras: {dp.get('Verduras', 4)} equivalentes diarios en total.\n\n"
        f"DISTRIBUCIÓN OBLIGATORIA POR TIEMPO DE COMIDA EN CADA MENÚ (Opción 1, Opción 2, Opción 3):\n"
        f"- DESAYUNO: Cereales ({md['desayuno']['Cereales']} Eq), POA ({md['desayuno']['POA']} Eq), Grasas ({md['desayuno']['Grasas']} Eq), Frutas ({md['desayuno']['Frutas']} Eq), Verduras ({md['desayuno']['Verduras']} Eq).\n"
        f"- COMIDA: Cereales ({md['comida']['Cereales']} Eq), POA ({md['comida']['POA']} Eq), Grasas ({md['comida']['Grasas']} Eq), Verduras ({md['comida']['Verduras']} Eq).\n"
        f"- CENA: Cereales ({md['cena']['Cereales']} Eq), POA ({md['cena']['POA']} Eq), Grasas ({md['cena']['Grasas']} Eq), Verduras ({md['cena']['Verduras']} Eq).\n"
        f"Tus descripciones de platillos e ingredientes DEBEN reflejar estas porciones 'porciones' y grupos 'grupo' de forma limpia y exacta."
    )
    return instruction
