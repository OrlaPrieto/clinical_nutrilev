export interface SmaeFood {
  name: string;
  category: string;
  emoji: string;
  equivalentPortion: string;
  amountValue: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  tip?: string;
}

export const SMAE_DATABASE: SmaeFood[] = [
  // ==================== 🥦 VERDURAS ====================
  { name: 'Calabacita picada', category: 'Verduras', emoji: '🥒', equivalentPortion: '1/2 taza', amountValue: 0.5, unit: 'taza', calories: 25, protein: 2, carbs: 4, fat: 0, tip: 'Ideal al vapor, asada o en caldos.' },
  { name: 'Brócoli cocido', category: 'Verduras', emoji: '🥦', equivalentPortion: '1 taza', amountValue: 1, unit: 'taza', calories: 25, protein: 2, carbs: 4, fat: 0, tip: 'Excelente fuente de fibra y antioxidantes.' },
  { name: 'Zanahoria picada o rallada', category: 'Verduras', emoji: '🥕', equivalentPortion: '1/2 taza', amountValue: 0.5, unit: 'taza', calories: 25, protein: 2, carbs: 4, fat: 0, tip: 'Aporta betacarotenos excelentes para la vista.' },
  { name: 'Espinaca cruda', category: 'Verduras', emoji: '🥬', equivalentPortion: '2 tazas', amountValue: 2, unit: 'tazas', calories: 25, protein: 2, carbs: 4, fat: 0, tip: 'Ideal para ensaladas o licuados verdes.' },
  { name: 'Espinaca cocida', category: 'Verduras', emoji: '🥬', equivalentPortion: '1/2 taza', amountValue: 0.5, unit: 'taza', calories: 25, protein: 2, carbs: 4, fat: 0, tip: 'Se reduce mucho al cocer, aporta hierro no hemo.' },
  { name: 'Jitomate picado o en rodajas', category: 'Verduras', emoji: '🍅', equivalentPortion: '1 pieza mediana', amountValue: 1, unit: 'pieza', calories: 25, protein: 2, carbs: 4, fat: 0, tip: 'Rico en licopeno. Consúmelo crudo o cocido.' },
  { name: 'Pepino rebanado', category: 'Verduras', emoji: '🥒', equivalentPortion: '1 taza', amountValue: 1, unit: 'taza', calories: 25, protein: 2, carbs: 4, fat: 0, tip: 'Muy hidratante y saciante, ideal para colaciones.' },
  { name: 'Nopal cocido', category: 'Verduras', emoji: '🌵', equivalentPortion: '1 taza', amountValue: 1, unit: 'taza', calories: 25, protein: 2, carbs: 4, fat: 0, tip: 'Excelente aporte de fibra soluble que ayuda a controlar la glucosa.' },
  { name: 'Champiñón cocido', category: 'Verduras', emoji: '🍄', equivalentPortion: '1 taza', amountValue: 1, unit: 'taza', calories: 25, protein: 2, carbs: 4, fat: 0, tip: 'Ideal para acompañar quesadillas o guisados.' },
  { name: 'Cebolla picada', category: 'Verduras', emoji: '🧅', equivalentPortion: '1/2 taza', amountValue: 1, unit: 'taza', calories: 25, protein: 2, carbs: 4, fat: 0, tip: 'Añade gran sabor con un aporte mínimo de calorías.' },
  { name: 'Lechuga (todas las variedades)', category: 'Verduras', emoji: '🥬', equivalentPortion: '2 tazas', amountValue: 2, unit: 'tazas', calories: 25, protein: 2, carbs: 4, fat: 0, tip: 'Ideal para dar volumen y saciedad a tus platos.' },
  { name: 'Ejotes cocidos', category: 'Verduras', emoji: '🌱', equivalentPortion: '1 taza', amountValue: 1, unit: 'taza', calories: 25, protein: 2, carbs: 4, fat: 0, tip: 'Combínalos con huevo o pollo.' },
  { name: 'Flor de calabaza', category: 'Verduras', emoji: '🌸', equivalentPortion: '1 taza', amountValue: 1, unit: 'taza', calories: 25, protein: 2, carbs: 4, fat: 0, tip: 'Poco aporte calórico, ideal en quesadillas de panela.' },
  { name: 'Apio crudo picado', category: 'Verduras', emoji: '🌿', equivalentPortion: '1.5 tazas', amountValue: 1.5, unit: 'tazas', calories: 25, protein: 2, carbs: 4, fat: 0, tip: 'Súper crujiente, ideal para calmar la ansiedad.' },

  // ==================== 🍓 FRUTAS ====================
  { name: 'Manzana roja o verde', category: 'Frutas', emoji: '🍎', equivalentPortion: '1 pieza chica', amountValue: 1, unit: 'pieza', calories: 60, protein: 0, carbs: 15, fat: 0, tip: 'Consúmela con cáscara para aprovechar toda la fibra.' },
  { name: 'Plátano', category: 'Frutas', emoji: '🍌', equivalentPortion: '1/2 pieza', amountValue: 0.5, unit: 'pieza', calories: 60, protein: 0, carbs: 15, fat: 0, tip: 'Excelente fuente de potasio y energía pre-entrenamiento.' },
  { name: 'Fresas enteras', category: 'Frutas', emoji: '🍓', equivalentPortion: '1 taza', amountValue: 1, unit: 'taza', calories: 60, protein: 0, carbs: 15, fat: 0, tip: 'Muy pocas calorías por volumen. Desinféctalas bien.' },
  { name: 'Melón picado', category: 'Frutas', emoji: '🍈', equivalentPortion: '1 taza', amountValue: 1, unit: 'taza', calories: 60, protein: 0, carbs: 15, fat: 0, tip: 'Muy rico en agua e ideal para mantenerte hidratado.' },
  { name: 'Papaya picada', category: 'Frutas', emoji: '🥭', equivalentPortion: '3/4 taza', amountValue: 0.75, unit: 'taza', calories: 60, protein: 0, carbs: 15, fat: 0, tip: 'Excelente para la digestión por su enzima papaína.' },
  { name: 'Naranja entera', category: 'Frutas', emoji: '🍊', equivalentPortion: '1 pieza', amountValue: 1, unit: 'pieza', calories: 60, protein: 0, carbs: 15, fat: 0, tip: 'Prefiere comerla entera en lugar de en jugo para no perder la fibra.' },
  { name: 'Mango picado', category: 'Frutas', emoji: '🥭', equivalentPortion: '1/2 taza', amountValue: 0.5, unit: 'taza', calories: 60, protein: 0, carbs: 15, fat: 0, tip: 'Rico en vitaminas A y C.' },
  { name: 'Guayaba', category: 'Frutas', emoji: '🥝', equivalentPortion: '3 piezas medianas', amountValue: 3, unit: 'piezas', calories: 60, protein: 0, carbs: 15, fat: 0, tip: 'Excelente aporte de vitamina C, superior a la naranja.' },
  { name: 'Kiwi', category: 'Frutas', emoji: '🥝', equivalentPortion: '1.5 piezas', amountValue: 1.5, unit: 'piezas', calories: 60, protein: 0, carbs: 15, fat: 0, tip: 'Alto en vitamina C y fibra dietética.' },
  { name: 'Durazno', category: 'Frutas', emoji: '🍑', equivalentPortion: '2 piezas medianas', amountValue: 2, unit: 'piezas', calories: 60, protein: 0, carbs: 15, fat: 0, tip: 'Textura suave y sabor dulce natural.' },
  { name: 'Mandarina', category: 'Frutas', emoji: '🍊', equivalentPortion: '2 piezas chicas', amountValue: 2, unit: 'piezas', calories: 60, protein: 0, carbs: 15, fat: 0, tip: 'Fácil de llevar para colaciones fuera de casa.' },
  { name: 'Piña picada', category: 'Frutas', emoji: '🍍', equivalentPortion: '3/4 taza', amountValue: 0.75, unit: 'taza', calories: 60, protein: 0, carbs: 15, fat: 0, tip: 'Contiene bromelina, que ayuda a la digestión de proteínas.' },
  { name: 'Uvas rojas o verdes', category: 'Frutas', emoji: '🍇', equivalentPortion: '18 piezas medianas', amountValue: 18, unit: 'piezas', calories: 60, protein: 0, carbs: 15, fat: 0, tip: 'Aportan antioxidantes como el resveratrol.' },
  { name: 'Toronja', category: 'Frutas', emoji: '🍊', equivalentPortion: '1 pieza mediana', amountValue: 1, unit: 'pieza', calories: 60, protein: 0, carbs: 15, fat: 0, tip: 'Sabor ligeramente amargo, excelente saciedad.' },

  // ==================== 🌾 CEREALES SIN GRASA ====================
  { name: 'Tortilla de maíz nixtamalizado', category: 'Cereales sin grasa', emoji: '🌮', equivalentPortion: '1 pieza', amountValue: 1, unit: 'pieza', calories: 70, protein: 2, carbs: 15, fat: 0, tip: 'Aporte excelente de calcio debido al proceso de nixtamalización.' },
  { name: 'Pan de caja integral', category: 'Cereales sin grasa', emoji: '🍞', equivalentPortion: '1 rebanada', amountValue: 1, unit: 'rebanada', calories: 70, protein: 2, carbs: 15, fat: 0, tip: 'Busca opciones que declaren harina integral como primer ingrediente.' },
  { name: 'Avena cruda en hojuelas', category: 'Cereales sin grasa', emoji: '🌾', equivalentPortion: '1/4 taza', amountValue: 0.25, unit: 'taza', calories: 70, protein: 2, carbs: 15, fat: 0, tip: 'Rica en betaglucanos que ayudan a reducir el colesterol.' },
  { name: 'Avena cocida en agua', category: 'Cereales sin grasa', emoji: '🥣', equivalentPortion: '1/3 taza', amountValue: 0.33, unit: 'taza', calories: 70, protein: 2, carbs: 15, fat: 0, tip: 'Al cocerse en agua duplica su tamaño y aumenta la saciedad.' },
  { name: 'Arroz blanco o integral cocido', category: 'Cereales sin grasa', emoji: '🍚', equivalentPortion: '1/4 taza', amountValue: 0.25, unit: 'taza', calories: 70, protein: 2, carbs: 15, fat: 0, tip: 'Cocínalo al vapor con sal de mar, cebolla y ajo.' },
  { name: 'Pasta cocida (spaghetti, pluma, etc.)', category: 'Cereales sin grasa', emoji: '🍝', equivalentPortion: '1/3 taza', amountValue: 0.33, unit: 'taza', calories: 70, protein: 2, carbs: 15, fat: 0, tip: 'Cocínala "al dente" para reducir su índice glucémico.' },
  { name: 'Papa cocida o al horno', category: 'Cereales sin grasa', emoji: '🥔', equivalentPortion: '1/2 pieza mediana', amountValue: 0.5, unit: 'pieza', calories: 70, protein: 2, carbs: 15, fat: 0, tip: 'Puedes comerla fría para generar almidón resistente benéfico.' },
  { name: 'Tostada de maíz horneada (Sanissimo o similar)', category: 'Cereales sin grasa', emoji: '🌮', equivalentPortion: '1 piezas', amountValue: 1, unit: 'piezas', calories: 70, protein: 2, carbs: 15, fat: 0, tip: 'Crujientes y bajas en grasa saturada.' },
  { name: 'Galletas de arroz (Rice Cakes)', category: 'Cereales sin grasa', emoji: '🍘', equivalentPortion: '2 piezas', amountValue: 2, unit: 'piezas', calories: 70, protein: 2, carbs: 15, fat: 0, tip: 'Excelente base para untar crema de cacahuate o aguacate.' },
  { name: 'Galletas Habaneras integrales', category: 'Cereales sin grasa', emoji: '🍪', equivalentPortion: '4 piezas', amountValue: 4, unit: 'piezas', calories: 70, protein: 2, carbs: 15, fat: 0, tip: 'Prácticas para acompañar ensaladas de atún.' },
  { name: 'Amaranto natural tostado', category: 'Cereales sin grasa', emoji: '🌾', equivalentPortion: '1/4 taza', amountValue: 0.25, unit: 'taza', calories: 70, protein: 2, carbs: 15, fat: 0, tip: 'Excelente fuente de proteína vegetal de alta calidad.' },
  { name: 'Pan Pita integral mediano', category: 'Cereales sin grasa', emoji: '🫓', equivalentPortion: '1/2 pieza', amountValue: 0.5, unit: 'pieza', calories: 70, protein: 2, carbs: 15, fat: 0, tip: 'Perfecto para rellenar con pollo y verduras.' },
  { name: 'Elote desgranado cocido', category: 'Cereales sin grasa', emoji: '🌽', equivalentPortion: '1/2 taza', amountValue: 0.5, unit: 'taza', calories: 70, protein: 2, carbs: 15, fat: 0, tip: 'Aporte dulce y rico en fibra.' },

  // ==================== 🫘 LEGUMINOSAS ====================
  { name: 'Frijoles cocidos de la olla', category: 'Leguminosas', emoji: '🫘', equivalentPortion: '1/2 taza', amountValue: 0.5, unit: 'taza', calories: 120, protein: 8, carbs: 20, fat: 1, tip: 'Excelente fuente de hierro y fibra. Prefiérelos sin freír.' },
  { name: 'Lentejas cocidas', category: 'Leguminosas', emoji: '🍲', equivalentPortion: '1/2 taza', amountValue: 0.5, unit: 'taza', calories: 120, protein: 8, carbs: 20, fat: 1, tip: 'Gran aporte de folatos, perfectas en sopa con verduras.' },
  { name: 'Garbanzos cocidos', category: 'Leguminosas', emoji: '🧆', equivalentPortion: '1/2 taza', amountValue: 0.5, unit: 'taza', calories: 120, protein: 8, carbs: 20, fat: 1, tip: 'Ideales para ensaladas o triturados como hummus.' },
  { name: 'Habas cocidas', category: 'Leguminosas', emoji: '🍲', equivalentPortion: '1/2 taza', amountValue: 0.5, unit: 'taza', calories: 120, protein: 8, carbs: 20, fat: 1, tip: 'Tradicionales y muy nutritivas.' },

  // ==================== 🍗 ORIGEN ANIMAL (MUY BAJO EN GRASA) ====================
  { name: 'Pechuga de pollo cocida y deshebrada', category: 'AOA muy bajo en grasa', emoji: '🍗', equivalentPortion: '30 gramos', amountValue: 30, unit: 'gramos', calories: 40, protein: 7, carbs: 0, fat: 1, tip: 'Proteína sumamente magra y versátil.' },
  { name: 'Clara de huevo fresca', category: 'AOA muy bajo en grasa', emoji: '🥚', equivalentPortion: '2 piezas', amountValue: 2, unit: 'piezas', calories: 40, protein: 7, carbs: 0, fat: 0, tip: 'La proteína de referencia por su excelente valor biológico.' },
  { name: 'Atún en agua drenado', category: 'AOA muy bajo en grasa', emoji: '🐟', equivalentPortion: '1/3 de lata o 30g', amountValue: 30, unit: 'gramos', calories: 40, protein: 7, carbs: 0, fat: 0, tip: 'Opción rápida y alta en proteína. Cuida el sodio.' },
  { name: 'Camarón gigante cocido', category: 'AOA muy bajo en grasa', emoji: '🍤', equivalentPortion: '5 piezas medianas', amountValue: 5, unit: 'piezas', calories: 40, protein: 7, carbs: 0, fat: 0, tip: 'Bajo en calorías y alto en minerales.' },

  // ==================== 🍗 ORIGEN ANIMAL (BAJO EN GRASA) ====================
  { name: 'Queso Panela pasteurizado', category: 'AOA bajo en grasa', emoji: '🧀', equivalentPortion: '30 gramos', amountValue: 30, unit: 'gramos', calories: 55, protein: 7, carbs: 0, fat: 3, tip: 'El queso clínico por excelencia, bajo en sodio y grasas.' },
  { name: 'Huevo entero fresco', category: 'AOA bajo en grasa', emoji: '🥚', equivalentPortion: '1 pieza', amountValue: 1, unit: 'pieza', calories: 55, protein: 7, carbs: 0, fat: 3, tip: 'Contiene grasas saludables y colina en la yema.' },
  { name: 'Filete de res (cuete, falda o filete)', category: 'AOA bajo en grasa', emoji: '🥩', equivalentPortion: '30 gramos', amountValue: 30, unit: 'gramos', calories: 55, protein: 7, carbs: 0, fat: 3, tip: 'Aporte alto de hierro hemo altamente absorbible.' },
  { name: 'Filete de pescado fresco (Tilapia, Lenguado)', category: 'AOA bajo en grasa', emoji: '🐟', equivalentPortion: '40 gramos', amountValue: 40, unit: 'gramos', calories: 55, protein: 7, carbs: 0, fat: 2, tip: 'Fácil de digerir y bajo en grasa.' },
  { name: 'Jamón de pechuga de pavo de calidad', category: 'AOA bajo en grasa', emoji: '🥓', equivalentPortion: '1 rebanadas gruesas', amountValue: 1, unit: 'rebanadas', calories: 55, protein: 7, carbs: 0, fat: 2, tip: 'Busca marcas que declaren >16% de proteína libre de almidones.' },
  { name: 'Queso Cottage bajo en grasa', category: 'AOA bajo en grasa', emoji: '🥛', equivalentPortion: '1/4 Taza', amountValue: 0.25, unit: 'taza', calories: 55, protein: 7, carbs: 1, fat: 2, tip: 'Excelente opción untable o para ensaladas dulces.' },

  // ==================== 🍗 ORIGEN ANIMAL (MODERADO EN GRASA) ====================
  { name: 'Carne molida de res 90/10', category: 'AOA moderado en grasa', emoji: '🥩', equivalentPortion: '25 gramos', amountValue: 25, unit: 'gramos', calories: 75, protein: 7, carbs: 0, fat: 5, tip: 'Pídela bien limpia de grasa visible antes de moler.' },
  { name: 'Huevo duro cocido', category: 'AOA moderado en grasa', emoji: '🥚', equivalentPortion: '1 pieza', amountValue: 1, unit: 'pieza', calories: 75, protein: 7, carbs: 0, fat: 5, tip: 'Práctico y seguro para transportar como colación.' },
  { name: 'Queso Oaxaca o Hebra', category: 'AOA moderado en grasa', emoji: '🧀', equivalentPortion: '30 gramos', amountValue: 30, unit: 'gramos', calories: 75, protein: 7, carbs: 0, fat: 5, tip: 'Se funde delicioso. Úsalo con moderación.' },
  { name: 'Muslo de pollo sin piel cocido', category: 'AOA moderado en grasa', emoji: '🍗', equivalentPortion: '25 gramos', amountValue: 25, unit: 'gramos', calories: 75, protein: 7, carbs: 0, fat: 5, tip: 'Más jugoso que la pechuga, pero con mayor contenido lipídico.' },

  // ==================== 🍗 ORIGEN ANIMAL (ALTO EN GRASA) ====================
  { name: 'Queso Manchego o Chihuahua', category: 'AOA alto en grasa', emoji: '🧀', equivalentPortion: '25 gramos', amountValue: 25, unit: 'gramos', calories: 100, protein: 7, carbs: 0, fat: 8, tip: 'Muy alto en grasas saturadas. Limitar su consumo en planes de pérdida de peso.' },
  { name: 'Salchicha de pavo comercial', category: 'AOA alto en grasa', emoji: '🌭', equivalentPortion: '1 pieza', amountValue: 1, unit: 'pieza', calories: 100, protein: 7, carbs: 1, fat: 8, tip: 'Embutido procesado con alta concentración de sodio.' },
  { name: 'Chorizo de cerdo', category: 'AOA alto en grasa', emoji: '🥓', equivalentPortion: '15 gramos', amountValue: 15, unit: 'gramos', calories: 100, protein: 7, carbs: 0, fat: 8, tip: 'Usar únicamente en mínimas porciones para sazonar.' },

  // ==================== 🥛 LÁCTEOS ====================
  { name: 'Yogurt griego natural sin azúcar', category: 'Lácteos descremados', emoji: '🥛', equivalentPortion: '125 gramos (1/2 taza)', amountValue: 125, unit: 'gramos', calories: 95, protein: 9, carbs: 12, fat: 2, tip: 'Alto en proteína. Elige marcas sin edulcorantes artificiales.' },
  { name: 'Leche descremada (Light)', category: 'Lácteos descremados', emoji: '🥛', equivalentPortion: '1 taza (240ml)', amountValue: 1, unit: 'taza', calories: 95, protein: 9, carbs: 12, fat: 1, tip: 'Mismos nutrientes que la leche entera sin la grasa saturada.' },
  { name: 'Leche entera clásica', category: 'Lácteos enteros', emoji: '🥛', equivalentPortion: '1 taza (240ml)', amountValue: 1, unit: 'taza', calories: 150, protein: 9, carbs: 12, fat: 8, tip: 'Ideal para niños en crecimiento o pacientes en volumen.' },
  { name: 'Yogurt natural entero sin azúcar', category: 'Lácteos enteros', emoji: '🥛', equivalentPortion: '1/2 taza', amountValue: 0.5, unit: 'taza', calories: 150, protein: 9, carbs: 12, fat: 8, tip: 'Textura cremosa y aporte balanceado.' },

  // ==================== 🥑 GRASAS SIN PROTEÍNA ====================
  { name: 'Aguacate Hass mediano', category: 'Grasas sin proteína', emoji: '🥑', equivalentPortion: '1/4 de pieza', amountValue: 0.25, unit: 'pieza', calories: 45, protein: 0, carbs: 3, fat: 5, tip: 'Excelente fuente de grasas monoinsaturadas y fibra.' },
  { name: 'Aceite de oliva extra virgen', category: 'Grasas sin proteína', emoji: '🫒', equivalentPortion: '1 cucharadita (5ml)', amountValue: 1, unit: 'cucharadita', calories: 45, protein: 0, carbs: 0, fat: 5, tip: 'Utilízalo en crudo para sazonar ensaladas o verduras.' },
  { name: 'Aceite de cocina en aerosol (Pam o similar)', category: 'Grasas sin proteína', emoji: '💨', equivalentPortion: 'Disparo de 2 segundos', amountValue: 1, unit: 'disparo', calories: 15, protein: 0, carbs: 0, fat: 1.5, tip: 'Excelente aliado para no exceder las grasas añadidas.' },
  { name: 'Mayonesa Light comercial', category: 'Grasas sin proteína', emoji: '🍯', equivalentPortion: '1 cucharada sopera', amountValue: 1, unit: 'cucharada', calories: 45, protein: 0, carbs: 3, fat: 4, tip: 'Reduce calorías en sándwiches o aderezos de atún.' },
  { name: 'Mantequilla de vaca sin sal', category: 'Grasas sin proteína', emoji: '🧈', equivalentPortion: '1 cucharadita', amountValue: 1, unit: 'cucharadita', calories: 45, protein: 0, carbs: 0, fat: 5, tip: 'Grasa saturada de origen animal. Úsala con moderación.' },

  // ==================== 🥑 GRASAS CON PROTEÍNA ====================
  { name: 'Almendras naturales sueltas', category: 'Grasas con proteína', emoji: '🥜', equivalentPortion: '10 piezas', amountValue: 10, unit: 'piezas', calories: 70, protein: 3, carbs: 3, fat: 5, tip: 'Excelente colación alta en vitamina E y grasas cardioprotectoras.' },
  { name: 'Nuez entera en mitades', category: 'Grasas con proteína', emoji: '🥜', equivalentPortion: '3 piezas enteras o 6 mitades', amountValue: 3, unit: 'piezas', calories: 70, protein: 3, carbs: 3, fat: 5, tip: 'Aporte extraordinario de ácidos grasos Omega-3 vegetales.' },
  { name: 'Cacahuates naturales pelados', category: 'Grasas con proteína', emoji: '🥜', equivalentPortion: '14 piezas', amountValue: 14, unit: 'piezas', calories: 70, protein: 3, carbs: 3, fat: 5, tip: 'Evita versiones fritas, saladas o con coberturas crujientes.' },
  { name: 'Semillas de chía crudas', category: 'Grasas con proteína', emoji: '🌾', equivalentPortion: '1 cucharada sopera', amountValue: 1, unit: 'cucharada', calories: 70, protein: 3, carbs: 3, fat: 5, tip: 'Déjalas hidratando en agua hasta formar un gel benéfico para la microbiota.' },
  { name: 'Semillas de girasol tostadas', category: 'Grasas con proteína', emoji: '🌻', equivalentPortion: '1 cucharada sopera', amountValue: 1, unit: 'cucharada', calories: 70, protein: 3, carbs: 3, fat: 5, tip: 'Aporte crujiente para ensaladas.' },

  // ==================== ☕ LIBRES DE ENERGÍA ====================
  { name: 'Café negro americano sin azúcar', category: 'Libres de energía', emoji: '☕', equivalentPortion: 'Ilimitado', amountValue: 1, unit: 'taza', calories: 2, protein: 0, carbs: 0, fat: 0, tip: 'No añadas azúcar ni cremas comerciales para mantenerlo libre.' },
  { name: 'Té o infusión herbal sin azúcar', category: 'Libres de energía', emoji: '🍵', equivalentPortion: 'Ilimitado', amountValue: 1, unit: 'taza', calories: 0, protein: 0, carbs: 0, fat: 0, tip: 'Manzanilla, verde, menta, etc. Deliciosos fríos o calientes.' },
  { name: 'Agua mineral gasificada', category: 'Libres de energía', emoji: '🥤', equivalentPortion: 'Ilimitado', amountValue: 1, unit: 'vaso', calories: 0, protein: 0, carbs: 0, fat: 0, tip: 'Excelente opción refrescante sin azúcares.' },
  { name: 'Limón fresco exprimido', category: 'Libres de energía', emoji: '🍋', equivalentPortion: 'Al gusto', amountValue: 1, unit: 'pieza', calories: 0, protein: 0, carbs: 0, fat: 0, tip: 'Ideal para dar sabor al agua o sazonar verduras y ensaladas.' }
];
