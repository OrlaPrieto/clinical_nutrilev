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
    patient_email: 'ana@ejemplo.com',
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
    patient_email: 'ana@ejemplo.com',
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
