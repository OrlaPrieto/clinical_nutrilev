export interface FreeCondiment {
  name: string;
  category: string;
  emoji: string;
  description: string;
  tip?: string;
}

export const FREE_CONDIMENTS_DATABASE: FreeCondiment[] = [
  // ==================== 🌿 HIERBAS DE OLOR ====================
  { 
    name: 'Albahaca', 
    category: 'Hierbas de Olor', 
    emoji: '🌿', 
    description: 'Aporta un sabor fresco, ligeramente dulce y aromático.', 
    tip: 'Perfecta para aderezar ensaladas con jitomate o salsas de tomate caseras sin grasa.' 
  },
  { 
    name: 'Cilantro', 
    category: 'Hierbas de Olor', 
    emoji: '🌿', 
    description: 'Elemento clásico, fresco y cítrico en la cocina mexicana.', 
    tip: 'Agrégalo crudo al final para conservar su sabor y sus antioxidantes intactos.' 
  },
  { 
    name: 'Orégano', 
    category: 'Hierbas de Olor', 
    emoji: '🌿', 
    description: 'Sabor robusto e intenso, excelente en seco.', 
    tip: 'Posee compuestos antimicrobianos naturales. Combina ideal con jitomate y caldos.' 
  },
  { 
    name: 'Perejil', 
    category: 'Hierbas de Olor', 
    emoji: '🌿', 
    description: 'Suave, fresco y ligeramente amargo, muy versátil.', 
    tip: 'Excelente fuente de vitamina C y antioxidantes cuando se consume fresco.' 
  },
  { 
    name: 'Romero', 
    category: 'Hierbas de Olor', 
    emoji: '🌿', 
    description: 'Pino y limón con notas maderosas, muy aromático.', 
    tip: 'Ideal para marinar pechuga de pollo o vegetales asados al horno.' 
  },
  { 
    name: 'Tomillo', 
    category: 'Hierbas de Olor', 
    emoji: '🌿', 
    description: 'Sabor sutil y terroso con notas de menta.', 
    tip: 'Combina excelente para realzar sopas de verduras o guisados de pollo.' 
  },
  { 
    name: 'Laurel', 
    category: 'Hierbas de Olor', 
    emoji: '🍃', 
    description: 'Aroma profundo e infundido, ideal para cocciones lentas.', 
    tip: 'Retira las hojas antes de servir. Añade gran sabor a frijoles de la olla y caldos.' 
  },
  { 
    name: 'Menta', 
    category: 'Hierbas de Olor', 
    emoji: '🌱', 
    description: 'Fresco, dulce y refrescante.', 
    tip: 'Úsala en infusiones de agua fría con limón o para dar un toque fresco a ensaladas de frutas.' 
  },

  // ==================== 🌶️ ESPECIAS ====================
  { 
    name: 'Pimienta negra o blanca', 
    category: 'Especias', 
    emoji: '🌶️', 
    description: 'Sabor picante sutil que realza cualquier platillo.', 
    tip: 'La pimienta negra ayuda a aumentar la absorción de nutrientes y compuestos como la curcumina.' 
  },
  { 
    name: 'Ajo en polvo', 
    category: 'Especias', 
    emoji: '🧄', 
    description: 'Sabor concentrado de ajo, sin calorías y fácil de usar.', 
    tip: 'Ideal para sazonar carnes magras o verduras antes de cocinarlas a la plancha.' 
  },
  { 
    name: 'Cebolla en polvo', 
    category: 'Especias', 
    emoji: '🧅', 
    description: 'Sabor dulce y umami de la cebolla deshidratada.', 
    tip: 'Combínalo con ajo en polvo para un sazonador universal libre de sodio y grasas.' 
  },
  { 
    name: 'Paprika o Pimentón', 
    category: 'Especias', 
    emoji: '🌶️', 
    description: 'Sabor ahumado y ligeramente dulce con un vibrante color rojo.', 
    tip: 'Aporta antioxidantes y da un toque delicioso a la pechuga de pollo y papas horneadas.' 
  },
  { 
    name: 'Comino', 
    category: 'Especias', 
    emoji: '🤎', 
    description: 'Sabor terroso, cálido y aromático muy característico.', 
    tip: 'Úsalo con moderación para sazonar leguminosas como frijoles o lentejas.' 
  },
  { 
    name: 'Jengibre', 
    category: 'Especias', 
    emoji: '🫚', 
    description: 'Picante y cítrico, con potentes propiedades antiinflamatorias.', 
    tip: 'Excelente rallado fresco en ensaladas, salteados de verduras o en infusiones calientes.' 
  },
  { 
    name: 'Canela', 
    category: 'Especias', 
    emoji: '🤎', 
    description: 'Dulce, amaderada y reconfortante.', 
    tip: 'Ayuda a regular los niveles de azúcar en sangre. Ideal para el café o avena sin endulzantes.' 
  },
  { 
    name: 'Cúrcuma', 
    category: 'Especias', 
    emoji: '🟡', 
    description: 'Sabor terroso y color amarillo brillante, potente antiinflamatorio.', 
    tip: 'Combínala siempre con una pizca de pimienta negra para multiplicar su absorción.' 
  },
  { 
    name: 'Clavo de olor', 
    category: 'Especias', 
    emoji: '🤎', 
    description: 'Sabor sumamente intenso, picante y dulce.', 
    tip: 'Utiliza una mínima cantidad para dar complejidad aromática a caldos o infusiones.' 
  },

  // ==================== 🍋 LÍQUIDOS Y ADEREZOS ====================
  { 
    name: 'Limón fresco', 
    category: 'Líquidos y Aderezos', 
    emoji: '🍋', 
    description: 'Ácido y cítrico, excelente sustituto de la sal.', 
    tip: 'Su vitamina C ayuda a fijar el hierro de origen vegetal presente en espinacas, lentejas y frijoles.' 
  },
  { 
    name: 'Vinagre de manzana', 
    category: 'Líquidos y Aderezos', 
    emoji: '🍎', 
    description: 'Ácido suave con notas de manzana, mejora la digestión.', 
    tip: 'Consumirlo antes de comidas altas en carbohidratos puede ayudar a atenuar el pico de glucosa.' 
  },
  { 
    name: 'Vinagre balsámico', 
    category: 'Líquidos y Aderezos', 
    emoji: '🍷', 
    description: 'Ácido y robusto, con un toque dulce natural de uva.', 
    tip: 'Excelente para marinar vegetales. Úsalo con moderación (máx. 1-2 cucharadas por su azúcar residual).' 
  },
  { 
    name: 'Salsa de soya baja en sodio', 
    category: 'Líquidos y Aderezos', 
    emoji: '🍶', 
    description: 'Aporte salado y umami concentrado.', 
    tip: 'Elige siempre la versión de tapa verde (baja en sodio) y consúmela con moderación.' 
  },
  { 
    name: 'Mostaza clásica', 
    category: 'Líquidos y Aderezos', 
    emoji: '🍯', 
    description: 'Sabor fuerte y ácido, prácticamente libre de calorías.', 
    tip: 'Revisa la etiqueta para asegurar que no contenga azúcar añadida ni miel. Ideal para sándwiches.' 
  },
  { 
    name: 'Salsa picante libre', 
    category: 'Líquidos y Aderezos', 
    emoji: '🌶️', 
    description: 'Salsa Valentina, Cholula o Tabasco. Aportan picante y acidez.', 
    tip: 'Asegúrate de que sean libres de grasa y azúcar. Contienen sodio, consúmelas con moderación.' 
  },
  { 
    name: 'Tajín bajo en sodio', 
    category: 'Líquidos y Aderezos', 
    emoji: '🌶️', 
    description: 'Chili powder con limón deshidratado.', 
    tip: 'Excelente opción para dar sabor a verduras crudas (pepino, jícama) reduciendo el sodio comercial.' 
  },

  // ==================== ☕ ENDULZANTES Y BEBIDAS ====================
  { 
    name: 'Stevia natural', 
    category: 'Endulzantes y Bebidas', 
    emoji: '🍃', 
    description: 'Endulzante natural sin calorías derivado de la planta Stevia.', 
    tip: 'Prefiere versiones líquidas o de hojas puras para evitar la mezcla con dextrosa o azúcar común.' 
  },
  { 
    name: 'Fruta del monje (Monk Fruit)', 
    category: 'Endulzantes y Bebidas', 
    emoji: '🟢', 
    description: 'Endulzante natural concentrado, excelente sabor sin calorías.', 
    tip: 'Ideal para repostería saludable o endulzar bebidas calientes sin alterar la insulina.' 
  },
  { 
    name: 'Eritritol', 
    category: 'Endulzantes y Bebidas', 
    emoji: '🍬', 
    description: 'Polialcohol natural con 70% del dulzor del azúcar.', 
    tip: 'No eleva la glucosa en sangre y es amable con la dentadura. Consumir con moderación.' 
  },
  { 
    name: 'Agua mineral', 
    category: 'Endulzantes y Bebidas', 
    emoji: '🥤', 
    description: 'Bebida carbonatada refrescante y libre de energía.', 
    tip: 'Puedes añadirle rodajas de limón y hojas de menta para crear un refresco saludable casero.' 
  },
  { 
    name: 'Té o infusión herbal sin azúcar', 
    category: 'Endulzantes y Bebidas', 
    emoji: '🍵', 
    description: 'Manzanilla, té verde, menta, jamaica o limón.', 
    tip: 'Excelentes antioxidantes e hidratantes tanto calientes como helados.' 
  },
  { 
    name: 'Café negro americano', 
    category: 'Endulzantes y Bebidas', 
    emoji: '☕', 
    description: 'Café filtrado puro sin leches ni azúcares añadidos.', 
    tip: 'Contiene cafeína y antioxidantes. Limita a 2-3 tazas al día y prefiere tomarlo antes de las 4 PM.' 
  }
];
