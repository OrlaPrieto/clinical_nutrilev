export interface ClinicDish {
  platillo: string;
  categoria: string;
  descripcion_ingredientes: string;
  ingredientes_detalle: string;
  preparacion: string;
  termino_busqueda_sugerido: string;
}

export const CLINIC_DISHES_CATALOG: ClinicDish[] = [
  {
    "platillo": "Licuado verde",
    "categoria": "General",
    "descripcion_ingredientes": "Ingredientes: 1 taza  Pepino, 1 rama  Apio, ¼ taza  Piña, al gusto  Agua, al gusto  Stevia. Preparación: agua y stevia.",
    "ingredientes_detalle": "1 taza  Pepino, 1 rama  Apio, ¼ taza  Piña, al gusto  Agua, al gusto  Stevia",
    "preparacion": "agua y stevia.",
    "termino_busqueda_sugerido": "green smoothie"
  },
  {
    "platillo": "Chilaquiles rojos",
    "categoria": "General",
    "descripcion_ingredientes": "Ingredientes: 4 piezas  Tostadas de maíz, al gusto  Aceite en aerosol, al gusto  Cebolla picada, 1 taza  Salsa de chile colorado casera, al gusto  Cilantro, 100 g  Pechuga de pollo, 1 tza  Pepino, al gusto  Agua natural. Preparación: cocinar con aceite en aerosol (presionar por 2 segundos), cebolla picada y cilantro al gusto. Beber agua natural.",
    "ingredientes_detalle": "4 piezas  Tostadas de maíz, al gusto  Aceite en aerosol, al gusto  Cebolla picada, 1 taza  Salsa de chile colorado casera, al gusto  Cilantro, 100 g  Pechuga de pollo, 1 tza  Pepino, al gusto  Agua natural",
    "preparacion": "cocinar con aceite en aerosol (presionar por 2 segundos), cebolla picada y cilantro al gusto. Beber agua natural.",
    "termino_busqueda_sugerido": "red chilaquiles"
  },
  {
    "platillo": "Papaya y Nuez",
    "categoria": "General",
    "descripcion_ingredientes": "Ingredientes: 1 taza (140 g)  Papaya, 10 mitades (15 g)  Nuez.",
    "ingredientes_detalle": "1 taza (140 g)  Papaya, 10 mitades (15 g)  Nuez",
    "preparacion": "",
    "termino_busqueda_sugerido": "papaya nuts snack"
  },
  {
    "platillo": "Molida de res",
    "categoria": "General",
    "descripcion_ingredientes": "Ingredientes: 100 g  Carne molida de res 95/5, 1/2 pza (60 g)  Aguacate, 1 taza (150 g)  Papa o camote cocido, 2 tazas (120 g)  Ensalada mixta, al gusto  Agua natural. Preparación: Beber agua natural.",
    "ingredientes_detalle": "100 g  Carne molida de res 95/5, 1/2 pza (60 g)  Aguacate, 1 taza (150 g)  Papa o camote cocido, 2 tazas (120 g)  Ensalada mixta, al gusto  Agua natural",
    "preparacion": "Beber agua natural.",
    "termino_busqueda_sugerido": "ground beef with avocado"
  },
  {
    "platillo": "Pepino y Nuez",
    "categoria": "General",
    "descripcion_ingredientes": "Ingredientes: 1 taza  Pepino, 10 mitades (15 g)  Nuez.",
    "ingredientes_detalle": "1 taza  Pepino, 10 mitades (15 g)  Nuez",
    "preparacion": "",
    "termino_busqueda_sugerido": "cucumber nuts snack"
  },
  {
    "platillo": "Tostadas con aguacate",
    "categoria": "General",
    "descripcion_ingredientes": "Ingredientes: 2 pzas  Tostadas de maíz horneadas sannisimo, 1/2 pza (60 g)  Aguacate, al gusto  Tomate, 100 g  Pechuga de pollo, 2 tazas  Lechuga romana, 1 tza  Papaya picada, al gusto  Licuado. Preparación: mezclar con tomate, acompañar con 2 tazas de lechuga romana + 1 tza de papaya picada, beber licuado.",
    "ingredientes_detalle": "2 pzas  Tostadas de maíz horneadas sannisimo, 1/2 pza (60 g)  Aguacate, al gusto  Tomate, 100 g  Pechuga de pollo, 2 tazas  Lechuga romana, 1 tza  Papaya picada, al gusto  Licuado",
    "preparacion": "mezclar con tomate, acompañar con 2 tazas de lechuga romana + 1 tza de papaya picada, beber licuado.",
    "termino_busqueda_sugerido": "avocado chicken tostadas"
  },
  {
    "platillo": "Avena overnight",
    "categoria": "General",
    "descripcion_ingredientes": "Ingredientes: 1/2 taza  Avena cruda en hojuelas, al gusto  Esencia de vainilla, 1 tza  Fresas en cuadritos, 250 ml  Yogurt griego s/a, 1 cucharada de 10 g  Linaza. Preparación: cocer 1/2 taza avena cruda en hojuelas añadir esencia de vainilla al gusto, mezclar.",
    "ingredientes_detalle": "1/2 taza  Avena cruda en hojuelas, al gusto  Esencia de vainilla, 1 tza  Fresas en cuadritos, 250 ml  Yogurt griego s/a, 1 cucharada de 10 g  Linaza",
    "preparacion": "cocer 1/2 taza avena cruda en hojuelas añadir esencia de vainilla al gusto, mezclar.",
    "termino_busqueda_sugerido": "overnight oats"
  },
  {
    "platillo": "Manzana y Almendras",
    "categoria": "General",
    "descripcion_ingredientes": "Ingredientes: 1 pza (140 g)  Manzana, 10 (12 g)  Almendras.",
    "ingredientes_detalle": "1 pza (140 g)  Manzana, 10 (12 g)  Almendras",
    "preparacion": "",
    "termino_busqueda_sugerido": "apple almonds snack"
  },
  {
    "platillo": "Pollo",
    "categoria": "General",
    "descripcion_ingredientes": "Ingredientes: 100 g  Pechuga de pollo, 1.5 tazas (135 g)  Ejotes con brócoli al vapor, 1 taza (120 g)  Ejotes, 1/2 taza (85 g)  Arroz cocido, 1/4 pza (30 g)  Aguacate, al gusto  Limonada s/a. Preparación: Limonada s/a.",
    "ingredientes_detalle": "100 g  Pechuga de pollo, 1.5 tazas (135 g)  Ejotes con brócoli al vapor, 1 taza (120 g)  Ejotes, 1/2 taza (85 g)  Arroz cocido, 1/4 pza (30 g)  Aguacate, al gusto  Limonada s/a",
    "preparacion": "Limonada s/a.",
    "termino_busqueda_sugerido": "chicken with green beans broccoli"
  },
  {
    "platillo": "Apio con Tajín y Nuez",
    "categoria": "General",
    "descripcion_ingredientes": "Ingredientes: 1 taza  Apio con tajin bajo en sodio, 10 mitades (15 g)  Nuez.",
    "ingredientes_detalle": "1 taza  Apio con tajin bajo en sodio, 10 mitades (15 g)  Nuez",
    "preparacion": "",
    "termino_busqueda_sugerido": "celery tajin nuts snack"
  },
  {
    "platillo": "Ensalada de pollo",
    "categoria": "General",
    "descripcion_ingredientes": "Ingredientes: 100 g  Pechuga de pollo, un poco  Sal, 1/2 taza  Lechuga, 1/2 taza  Brócoli cocido (en trozo), 1/4 taza  Calabacita rallada, al gusto  Cilantro, al gusto  Condimentos, al gusto  Mostaza, 2 cdas  Mayonesa light, al gusto  Agua natural. Preparación: Cocer 100 g de pechuga de pollo con un poco de sal, al estar lista desmenuzarla, agregar cilantro y condimentos al gusto + mostaza al gusto + 2 cdas de mayonesa light. Acompañar con agua natural.",
    "ingredientes_detalle": "100 g  Pechuga de pollo, un poco  Sal, 1/2 taza  Lechuga, 1/2 taza  Brócoli cocido (en trozo), 1/4 taza  Calabacita rallada, al gusto  Cilantro, al gusto  Condimentos, al gusto  Mostaza, 2 cdas  Mayonesa light, al gusto  Agua natural",
    "preparacion": "Cocer 100 g de pechuga de pollo con un poco de sal, al estar lista desmenuzarla, agregar cilantro y condimentos al gusto + mostaza al gusto + 2 cdas de mayonesa light. Acompañar con agua natural.",
    "termino_busqueda_sugerido": "chicken salad"
  },
  {
    "platillo": "Sándwich",
    "categoria": "General",
    "descripcion_ingredientes": "Ingredientes: 2 piezas  Pan de caja (Bimbo Cero Cero), 1/2 pza  Aguacate, 100 g  Pechuga de pollo a la plancha, al gusto  Cebolla, al gusto  Germinado de alfalfa, al gusto  Lechuga, 1 taza  Fruta (no mango, no uva, no plátano), al gusto  Agua natural. Preparación: añadir cebolla, germinado de alfalfa, lechuga. Beber agua natural.",
    "ingredientes_detalle": "2 piezas  Pan de caja (Bimbo Cero Cero), 1/2 pza  Aguacate, 100 g  Pechuga de pollo a la plancha, al gusto  Cebolla, al gusto  Germinado de alfalfa, al gusto  Lechuga, 1 taza  Fruta (no mango, no uva, no plátano), al gusto  Agua natural",
    "preparacion": "añadir cebolla, germinado de alfalfa, lechuga. Beber agua natural.",
    "termino_busqueda_sugerido": "chicken avocado sandwich"
  },
  {
    "platillo": "Fruta libre y Nuez",
    "categoria": "General",
    "descripcion_ingredientes": "Ingredientes: 1 taza (140 g)  Fruta libre, 10 mitades (15 g)  Nuez.",
    "ingredientes_detalle": "1 taza (140 g)  Fruta libre, 10 mitades (15 g)  Nuez",
    "preparacion": "",
    "termino_busqueda_sugerido": "fruit nuts snack"
  },
  {
    "platillo": "Chuleta de cerdo",
    "categoria": "General",
    "descripcion_ingredientes": "Ingredientes: 150 g  Chuleta natural de cerdo, 2 tazas  Brócoli al vapor, 1/2 (60 g)  Aguacate, al gusto  Agua natural. Preparación: sin empanizar. Cocinar a la plancha sin grasas, dorada en su misma grasa. Agua natural.",
    "ingredientes_detalle": "150 g  Chuleta natural de cerdo, 2 tazas  Brócoli al vapor, 1/2 (60 g)  Aguacate, al gusto  Agua natural",
    "preparacion": "sin empanizar. Cocinar a la plancha sin grasas, dorada en su misma grasa. Agua natural.",
    "termino_busqueda_sugerido": "pork chop broccoli avocado"
  },
  {
    "platillo": "Chilaquiles",
    "categoria": "General",
    "descripcion_ingredientes": "Ingredientes: 3 piezas  Tostadas de maíz sannisimo, 1 taza  Champiñones naturales, al gusto  Tomate picada, al gusto  Cebolla picada, al gusto  Aceite en aerosol, 100 g  Pechuga de pollo, 1 taza  Salsa de tomate, 1 tza  Espinaca, al gusto  Agua natural. Preparación: no freír. Cocinar con aceite en aerosol (presionar durante 2 segundos). Acompañado de 1 tza de espinaca y beber agua natural.",
    "ingredientes_detalle": "3 piezas  Tostadas de maíz sannisimo, 1 taza  Champiñones naturales, al gusto  Tomate picada, al gusto  Cebolla picada, al gusto  Aceite en aerosol, 100 g  Pechuga de pollo, 1 taza  Salsa de tomate, 1 tza  Espinaca, al gusto  Agua natural",
    "preparacion": "no freír. Cocinar con aceite en aerosol (presionar durante 2 segundos). Acompañado de 1 tza de espinaca y beber agua natural.",
    "termino_busqueda_sugerido": "chilaquiles with mushrooms"
  },
  {
    "platillo": "Burrito de Pollo",
    "categoria": "General",
    "descripcion_ingredientes": "Ingredientes: 1 pan  Pan pita integral delgado, 100 g  Pollo, 1 pieza  Zanahoria, al gusto  Pepino rallado, al gusto  Té sin azúcar o café sin azúcar con hielo. Preparación: deshebrado cocida en agua. Ralla 1 pieza de zanahoria y añade pepino rallado o jícama rallada al gusto. Cortar en Espiral (Zoodles). Beber Licuar el té sin azúcar o el café sin azúcar con hielo (tipo frappé).",
    "ingredientes_detalle": "1 pan  Pan pita integral delgado, 100 g  Pollo, 1 pieza  Zanahoria, al gusto  Pepino rallado, al gusto  Té sin azúcar o café sin azúcar con hielo",
    "preparacion": "deshebrado cocida en agua. Ralla 1 pieza de zanahoria y añade pepino rallado o jícama rallada al gusto. Cortar en Espiral (Zoodles). Beber Licuar el té sin azúcar o el café sin azúcar con hielo (tipo frappé).",
    "termino_busqueda_sugerido": "chicken burrito"
  },
  {
    "platillo": "Melón y Almendras",
    "categoria": "General",
    "descripcion_ingredientes": "Ingredientes: 1 taza (160 g)  Melón, 10 (12 g)  Almendras.",
    "ingredientes_detalle": "1 taza (160 g)  Melón, 10 (12 g)  Almendras",
    "preparacion": "",
    "termino_busqueda_sugerido": "melon almonds snack"
  },
  {
    "platillo": "Filete de res",
    "categoria": "General",
    "descripcion_ingredientes": "Ingredientes: 100 g  Filete de res magro en tiras, al gusto  Ajo en polvo, al gusto  Comino, 1/2  Jugo de limón, 1 tazas  Morrón (rojo, amarillo y verde), 1  Cebolla morada, al gusto  Aceite en spray, al gusto  Sal, al gusto  Pimienta negra, al gusto  Agua natural. Preparación: ajo en polvo, comino y el jugo de 1/2 limón. Cocinar con aceite en spray, sal y pimienta negra. Beber agua natural.",
    "ingredientes_detalle": "100 g  Filete de res magro en tiras, al gusto  Ajo en polvo, al gusto  Comino, 1/2  Jugo de limón, 1 tazas  Morrón (rojo, amarillo y verde), 1  Cebolla morada, al gusto  Aceite en spray, al gusto  Sal, al gusto  Pimienta negra, al gusto  Agua natural",
    "preparacion": "ajo en polvo, comino y el jugo de 1/2 limón. Cocinar con aceite en spray, sal y pimienta negra. Beber agua natural.",
    "termino_busqueda_sugerido": "beef strips bell peppers"
  },
  {
    "platillo": "Betabel rallado y Nuez",
    "categoria": "General",
    "descripcion_ingredientes": "Ingredientes: 1 taza  Betabel rallado, 10 mitades (15 g)  Nuez.",
    "ingredientes_detalle": "1 taza  Betabel rallado, 10 mitades (15 g)  Nuez",
    "preparacion": "",
    "termino_busqueda_sugerido": "beetroot nuts snack"
  },
  {
    "platillo": "Ensalada de atún",
    "categoria": "General",
    "descripcion_ingredientes": "Ingredientes: 100 g  Medallón de atún, 1 cda  Mayonesa light, 1/2 taza  Lechuga, 1/2 taza  Brócoli cocido (en trozo), 1/4 taza  Calabacita rallada, 1/2 pza  Aguacate mediano, al gusto  Cilantro, al gusto  Condimentos, al gusto  Mostaza, al gusto  Agua natural. Preparación: agregar 1 cda de mayonesa light, cilantro y condimentos al gusto + mostaza al gusto. Acompañar con agua natural.",
    "ingredientes_detalle": "100 g  Medallón de atún, 1 cda  Mayonesa light, 1/2 taza  Lechuga, 1/2 taza  Brócoli cocido (en trozo), 1/4 taza  Calabacita rallada, 1/2 pza  Aguacate mediano, al gusto  Cilantro, al gusto  Condimentos, al gusto  Mostaza, al gusto  Agua natural",
    "preparacion": "agregar 1 cda de mayonesa light, cilantro y condimentos al gusto + mostaza al gusto. Acompañar con agua natural.",
    "termino_busqueda_sugerido": "tuna salad"
  }
];
