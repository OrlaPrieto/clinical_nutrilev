import { Patient, PatientProgress, ShoppingCategory } from '@shared/models/interfaces';

export const MOCK_PATIENTS: Patient[] = [
  {
    id: '1',
    nombre: 'Ana García',
    email: 'ana@ejemplo.com',
    telefono: '555-0101',
    edad: 28,
    genero: 'Femenino',
    estatura: '1.65',
    peso_habitual: 70,
    peso_meta: 62,
    meta_objetivo: 'bajar_peso',
    motivos_consulta: 'Bajar de peso y mejorar hábitos alimenticios.',
    acceso_portal: true,
    dado_de_baja: false,
    created_at: new Date().toISOString(),
    ultima_actualizacion: new Date().toISOString(),
    current_menus: [
      { name: 'Menú Etapa 1', url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', uploaded_at: new Date().toISOString() }
    ],
    plan_citas: 3,
    plan_citas_completadas: 1
  },
  {
    id: '2',
    nombre: 'Carlos Ruiz',
    email: 'carlos@ejemplo.com',
    telefono: '555-0202',
    edad: 35,
    genero: 'Masculino',
    estatura: '1.80',
    peso_habitual: 85,
    musculo_meta: 42,
    meta_objetivo: 'subir_musculo',
    motivos_consulta: 'Aumento de masa muscular y rendimiento deportivo.',
    acceso_portal: true,
    dado_de_baja: false,
    created_at: new Date().toISOString(),
    ultima_actualizacion: new Date().toISOString(),
    plan_citas: null,
    plan_citas_completadas: 0
  },
  {
    id: '3',
    nombre: 'Elena Martínez',
    email: 'elena@ejemplo.com',
    telefono: '555-0303',
    edad: 42,
    genero: 'Femenino',
    estatura: '1.60',
    peso_habitual: 68,
    grasa_meta: 22,
    meta_objetivo: 'bajar_grasa',
    motivos_consulta: 'Controlar niveles de glucosa y reducir grasa corporal.',
    acceso_portal: false,
    dado_de_baja: false,
    created_at: new Date().toISOString(),
    ultima_actualizacion: new Date().toISOString(),
    plan_citas: 2,
    plan_citas_completadas: 0
  }
];

export const MOCK_PROGRESS: PatientProgress[] = [
  {
    id: 'p1',
    patient_id: '1',
    weight: 68.5,
    body_fat: 28,
    muscle_mass: 45,
    imc: 25.2,
    date: new Date().toISOString(),
    notes: 'Ha seguido la dieta al 90%. Se siente con más energía.',
    numero_cita: 1
  },
  {
    id: 'p2',
    patient_id: '1',
    weight: 70.2,
    body_fat: 30,
    muscle_mass: 44,
    imc: 25.8,
    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    notes: 'Inicio del tratamiento.',
    numero_cita: null
  }
];

export const MOCK_SHOPPING_LIST: ShoppingCategory[] = [
  {
    category: '🥦 Verduras y Hortalizas',
    items: [
      { icon: '🥬', name: 'Espinacas frescas', amount: '2 tazas', tip: 'Preferiblemente orgánicas', brand: 'Cualquiera', checked: false },
      { icon: '🍅', name: 'Tomates cherry', amount: '1 taza', tip: 'Bien maduros para ensalada', brand: 'Cualquiera', checked: false },
      { icon: '🥦', name: 'Brócoli', amount: '1 cabeza', tip: 'Cortar en floretes antes de lavar', brand: 'Cualquiera', checked: false }
    ]
  },
  {
    category: '🍗 Proteínas',
    items: [
      { icon: '🍗', name: 'Pechuga de pollo', amount: '500g', tip: 'Sin piel ni hueso', brand: 'Bachoco o similar', checked: false },
      { icon: '🐟', name: 'Filete de salmón', amount: '300g', tip: 'Fresco o congelado', brand: 'Cualquiera', checked: false }
    ]
  },
  {
    category: '🥑 Grasas Saludables',
    items: [
      { icon: '🥑', name: 'Aguacate', amount: '2 piezas', tip: 'En su punto de madurez', brand: 'Hass', checked: false },
      { icon: '🫒', name: 'Aceite de oliva extra virgen', amount: '1 botella', tip: 'Prensado en frío', brand: 'Cualquiera', checked: false }
    ]
  }
];

export const MOCK_PARSED_MENU = {
  paciente_nombre: "Ana García",
  fecha_elaboracion: "26 de junio del 2026",
  calorias_totales: 1800,
  macronutrientes: {
    proteinas_g: 130,
    carbohidratos_g: 180,
    grasas_g: 60
  },
  tipo_plan: "semanal",
  secciones: [
    {
      nombre: "Lunes / Sábado",
      tiempos_comida: [
        {
          tiempo: "Licuado",
          hora_sugerida: "07:30 AM",
          emoji: "🥤",
          platillo: "Licuado Verde Detox",
          preparacion: "Licuar todos los ingredientes juntos con abundante agua y hielo al gusto. Endulzar con stevia si es necesario.",
          termino_busqueda_imagen: "green smoothie",
          platillo_imagen_url: "https://images.unsplash.com/photo-1553530666-ba11a7da3888?q=80&w=600&auto=format&fit=crop",
          ingredientes: [
            { nombre: "Espinacas frescas", cantidad: "1 taza (30 g)", grupo: "Verduras", reemplazos: ["Acelgas (1 taza)"] },
            { nombre: "Apio", cantidad: "1 rama (40 g)", grupo: "Verduras", reemplazos: ["Pepino picado (1 taza)"] },
            { nombre: "Piña picada", cantidad: "1/2 taza (80 g)", grupo: "Frutas", reemplazos: ["Fresa picada (1 taza)", "Manzana verde (1/2 pieza)"] }
          ]
        },
        {
          tiempo: "Desayuno",
          hora_sugerida: "08:30 AM",
          emoji: "🍳",
          platillo: "Toast de Pollo y Aguacate",
          preparacion: "Tostar el pan integral. Machacar el aguacate y untarlo en las rebanadas. Colocar encima la pechuga de pollo deshebrada previamente cocida y sazonada. Decorar con hojas de espinaca fresca.",
          termino_busqueda_imagen: "avocado toast",
          platillo_imagen_url: "https://images.unsplash.com/photo-1541532713592-79a0317b6b77?q=80&w=600&auto=format&fit=crop",
          ingredientes: [
            { nombre: "Pan integral de caja", cantidad: "2 rebanadas", grupo: "Cereales sin grasa", reemplazos: ["Tortilla de maíz (2 piezas)", "Tostadas horneadas Sanissimo (2 piezas)"] },
            { nombre: "Aguacate", cantidad: "1/4 pieza (30 g)", grupo: "Grasas con proteína", reemplazos: ["Aceite de oliva (1 cdita)", "Almendras (10 piezas)"] },
            { nombre: "Pechuga de pollo deshebrada", cantidad: "100 g (en crudo)", grupo: "Origen animal (bajo en grasa)", reemplazos: ["Queso panela (80g)", "Lomo de cerdo magro (100g)"], peso_cocido_crudo: "100g crudo ≈ 75g cocido" }
          ],
          suplementos: ["Omega 3 (1 cápsula)", "Multivitamínico (1 tableta)"]
        },
        {
          tiempo: "Colación 1",
          hora_sugerida: "11:30 AM",
          emoji: "🍏",
          platillo: "Yogurt con Frutos Rojos",
          preparacion: "Servir el yogurt griego en un tazón, añadir las fresas picadas encima y decorar con las almendras enteras.",
          termino_busqueda_imagen: "yogurt berries",
          platillo_imagen_url: "https://images.unsplash.com/photo-1488477181946-6428a0291777?q=80&w=600&auto=format&fit=crop",
          ingredientes: [
            { nombre: "Yogurt griego natural s/a", cantidad: "1 taza (200g)", grupo: "Lácteos / Proteínas", reemplazos: ["Requesón (1/2 taza)"] },
            { nombre: "Fresas picadas", cantidad: "1/2 taza (75g)", grupo: "Frutas", reemplazos: ["Melón picado (1 taza)", "Manzana chica (1 pieza)"] },
            { nombre: "Almendras enteras", cantidad: "10 piezas", grupo: "Grasas sin proteína", reemplazos: ["Nueces (5 mitades)", "Semillas de girasol (2 cdas)"] }
          ]
        },
        {
          tiempo: "Comida",
          hora_sugerida: "02:30 PM",
          emoji: "🥗",
          platillo: "Bowl de Res Mediterráneo",
          preparacion: "Cocinar la carne molida en un sartén con ajo y cebolla. En un tazón grande, colocar la lechuga, pepino, tomate picado y pasta integral cocida. Añadir la carne encima, picar el aguacate y aderezar con limón y sal.",
          termino_busqueda_imagen: "beef bowl salad",
          platillo_imagen_url: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=600&auto=format&fit=crop",
          ingredientes: [
            { nombre: "Carne molida de res magra", cantidad: "120 g (en crudo)", grupo: "Origen animal (moderado en grasa)", reemplazos: ["Pechuga de pollo (120g)", "Filete de pescado (140g)"], peso_cocido_crudo: "120g crudo ≈ 90g cocido" },
            { nombre: "Pasta integral cocida", cantidad: "1/2 taza (70 g)", grupo: "Cereales sin grasa", reemplazos: ["Arroz integral cocido (1/2 taza)", "Quinoa cocida (1/2 taza)"], peso_cocido_crudo: "1/2 taza cocida ≈ 40g cruda" },
            { nombre: "Lechuga y pepino", cantidad: "2 tazas", grupo: "Verduras", reemplazos: ["Brócoli y calabacitas (1 taza)"] },
            { nombre: "Aguacate", cantidad: "1/3 pieza (30 g)", grupo: "Grasas con proteína", reemplazos: ["Aceitunas negras (6 piezas)"] }
          ]
        },
        {
          tiempo: "Cena",
          hora_sugerida: "08:30 PM",
          emoji: "🌙",
          platillo: "Tostadas de Pollo Ligeras",
          preparacion: "Colocar la lechuga picada sobre las tostadas horneadas. Añadir el pollo deshebrado frío y decorar con pico de gallo y salsa casera al gusto.",
          termino_busqueda_imagen: "tostadas chicken",
          platillo_imagen_url: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?q=80&w=600&auto=format&fit=crop",
          ingredientes: [
            { nombre: "Tostadas de maíz horneadas", cantidad: "2 piezas", grupo: "Cereales sin grasa", reemplazos: ["Pan pita integral (1 pieza)", "Tortilla de maíz (2 piezas)"] },
            { nombre: "Pollo deshebrado", cantidad: "100 g (en crudo)", grupo: "Origen animal (bajo en grasa)", reemplazos: ["Queso panela asado (70g)", "Atún en agua (1 lata)"], peso_cocido_crudo: "100g crudo ≈ 75g cocido" },
            { nombre: "Lechuga y pico de gallo", cantidad: "1 taza", grupo: "Verduras", reemplazos: ["Nopales asados (1 taza)"] }
          ]
        }
      ]
    },
    {
      nombre: "Martes / Domingo",
      tiempos_comida: [
        {
          tiempo: "Licuado",
          hora_sugerida: "07:30 AM",
          emoji: "🥤",
          platillo: "Licuado Verde Detox",
          preparacion: "Licuar todos los ingredientes juntos con abundante agua y hielo al gusto.",
          termino_busqueda_imagen: "green smoothie",
          platillo_imagen_url: "https://images.unsplash.com/photo-1553530666-ba11a7da3888?q=80&w=600&auto=format&fit=crop",
          ingredientes: [
            { nombre: "Espinacas frescas", cantidad: "1 taza (30 g)", grupo: "Verduras" },
            { nombre: "Apio", cantidad: "1 rama (40 g)", grupo: "Verduras" },
            { nombre: "Piña picada", cantidad: "1/2 taza (80 g)", grupo: "Frutas" }
          ]
        },
        {
          tiempo: "Desayuno",
          hora_sugerida: "08:30 AM",
          emoji: "🥣",
          platillo: "Avena Overnight de Fresa y Coco",
          preparacion: "En un frasco mezclar la avena con la leche de coco vegetal, vainilla y stevia. Dejar reposar toda la noche en el refrigerador. En la mañana, añadir las fresas picadas y las nueces como topping.",
          termino_busqueda_imagen: "oatmeal strawberries",
          platillo_imagen_url: "https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?q=80&w=600&auto=format&fit=crop",
          ingredientes: [
            { nombre: "Avena entera cruda", cantidad: "1/3 taza (30 g)", grupo: "Cereales sin grasa", reemplazos: ["Amaranto inflado (1 taza)"], peso_cocido_crudo: "1/3 taza cruda ≈ 1 taza cocida" },
            { nombre: "Leche vegetal de coco s/a", cantidad: "1 taza (250 ml)", grupo: "Lácteos / Grasas", reemplazos: ["Leche de almendras s/a (1 taza)"] },
            { nombre: "Fresas rebanadas", cantidad: "1 taza", grupo: "Frutas", reemplazos: ["Plátano (1/2 pieza)"] },
            { nombre: "Nueces (mitades)", cantidad: "10 piezas", grupo: "Grasas sin proteína", reemplazos: ["Semillas de chía (1 cda)"] }
          ]
        },
        {
          tiempo: "Comida",
          hora_sugerida: "02:30 PM",
          emoji: "🥗",
          platillo: "Ensalada de Pollo y Espinacas con Elote",
          preparacion: "Cocinar el pollo a la plancha. En una ensaladera colocar espinacas, zanahoria rallada, granos de elote y aguacate. Añadir el pollo en tiras y bañar con vinagreta balsámica.",
          termino_busqueda_imagen: "chicken salad",
          platillo_imagen_url: "https://images.unsplash.com/photo-1540420773420-3366772f4999?q=80&w=600&auto=format&fit=crop",
          ingredientes: [
            { nombre: "Pechuga de pollo en tiras", cantidad: "120 g (en crudo)", grupo: "Origen animal (bajo en grasa)", peso_cocido_crudo: "120g crudo ≈ 90g cocido" },
            { nombre: "Granos de elote", cantidad: "1/2 taza", grupo: "Cereales sin grasa", reemplazos: ["Tostada horneada (1 pieza)"] },
            { nombre: "Espinacas y zanahoria", cantidad: "2 tazas", grupo: "Verduras" },
            { nombre: "Aguacate", cantidad: "1/3 pieza (30 g)", grupo: "Grasas con proteína" }
          ]
        }
      ]
    }
  ],
  recomendaciones_generales: [
    "Evitar comer en exceso por las noches.",
    "Beber abundante agua natural (mínimo 2 litros diarios divididos en varias tomas).",
    "Cocinar al horno, plancha o vapor. Evitar empanizados o fritos.",
    "Utilizar aceite en spray con moderación."
  ]
};

