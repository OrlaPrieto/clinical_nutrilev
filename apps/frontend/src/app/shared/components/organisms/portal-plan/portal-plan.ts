import { Component, input, signal, effect, inject, OnInit, OnDestroy, HostListener, untracked, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PatientService } from '../../../../services/patient';
import { ToastService } from '../../../../shared/services/toast.service';
import { IconComponent } from '../../atoms/icon/icon';
import { ButtonComponent } from '../../atoms/button/button';
import { ThemeService } from '../../../../shared/services/theme.service';
import { Patient } from '@shared/models/interfaces';
import { AnalyticsService } from '../../../../shared/services/analytics.service';
import { SMAE_DATABASE, SmaeFood } from '../../../../shared/data/smae-db';

@Component({
  selector: 'app-o-portal-plan',
  standalone: true,
  imports: [CommonModule, IconComponent, ButtonComponent],
  templateUrl: './portal-plan.html',
  styleUrl: './portal-plan.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PortalPlanOrganism implements OnInit, OnDestroy {
  patient = input.required<Patient | null>();
  
  private progressInterval: any = null;
  
  private patientService = inject(PatientService);
  private toastService = inject(ToastService);
  public themeService = inject(ThemeService);
  private analytics = inject(AnalyticsService);

  parsedMenu = signal<any | null>(null);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  
  activeSectionIdx = signal<number>(0);
  selectedMealForRecipe = signal<any | null>(null);
  selectedIngredientForReplacement = signal<any | null>(null);
  showDayDropdown = signal<boolean>(false);
  menuProgress = signal<number>(0);
  menuLoadingMessage = signal<string>('Iniciando lectura de tu plan...');
  showMealImages = signal<boolean>(false);

  toggleDayDropdown() {
    this.showDayDropdown.update(v => !v);
  }

  selectSection(idx: number) {
    this.activeSectionIdx.set(idx);
    this.showDayDropdown.set(false);
    setTimeout(() => {
      this.scrollToCurrentMeal();
    }, 150);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.day-selector-container') && this.showDayDropdown()) {
      this.showDayDropdown.set(false);
    }
  }

  private touchStartX = 0;
  private touchStartY = 0;

  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent) {
    this.touchStartX = event.touches[0].clientX;
    this.touchStartY = event.touches[0].clientY;
  }

  @HostListener('touchend', ['$event'])
  onTouchEnd(event: TouchEvent) {
    const touchEndX = event.changedTouches[0].clientX;
    const touchEndY = event.changedTouches[0].clientY;
    
    const diffX = touchEndX - this.touchStartX;
    const diffY = touchEndY - this.touchStartY;
    
    // Solo registrar si el deslizamiento es predominantemente horizontal y supera los 60px
    if (Math.abs(diffX) > 60 && Math.abs(diffY) < 40) {
      const menu = this.parsedMenu();
      if (!menu || !menu.secciones) return;
      
      const maxIndex = menu.secciones.length - 1;
      const currentIndex = this.activeSectionIdx();
      
      if (diffX < 0) {
        // Deslizar a la izquierda (Avanzar al siguiente día)
        if (currentIndex < maxIndex) {
          this.selectSection(currentIndex + 1);
          this.triggerHapticFeedback();
        }
      } else {
        // Deslizar a la derecha (Regresar al día anterior)
        if (currentIndex > 0) {
          this.selectSection(currentIndex - 1);
          this.triggerHapticFeedback();
        }
      }
    }
  }

  private triggerHapticFeedback() {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(15);
    }
  }

  ngOnInit() {
    this.loadPlan();
  }

  getHeroGradientClass(): string {
    const activeTheme = this.themeService.theme();
    switch (activeTheme) {
      case 'dark':
        return 'bg-gradient-to-tr from-nutri-rose via-[#b80f4e] to-[#590b32] border border-nutri-rose/15 shadow-lg shadow-pink-950/20';
      case 'purple':
        return 'bg-gradient-to-tr from-blue-700 via-indigo-700 to-sky-600 shadow-lg shadow-blue-900/20 border-0';
      case 'vibrant':
        return 'bg-gradient-to-tr from-emerald-700 via-teal-600 to-emerald-400 shadow-lg shadow-emerald-900/20 border-0';
      case 'light':
      default:
        return 'bg-gradient-to-tr from-nutri-rose via-[#e91e63] to-[#ff7043] shadow-lg shadow-nutri-rose/10 border-0';
    }
  }

  ngOnDestroy() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }
  }

  private isHistoryPushed = false;

  constructor() {
    // Reload menu if patient or menu_url changes
    effect(() => {
      const p = this.patient();
      if (p) {
        untracked(() => {
          this.loadPlan();
        });
      }
    }, { allowSignalWrites: true });

    effect(() => {
      const open = this.selectedMealForRecipe() !== null || this.selectedIngredientForReplacement() !== null;
      untracked(() => {
        if (open) {
          if (!this.isHistoryPushed) {
            window.history.pushState({ modalOpen: 'plan' }, '');
            this.isHistoryPushed = true;
          }
        } else {
          if (this.isHistoryPushed) {
            this.isHistoryPushed = false;
            if (window.history.state && window.history.state.modalOpen === 'plan') {
              window.history.back();
            }
          }
        }
      });
    }, { allowSignalWrites: true });
  }

  @HostListener('window:popstate', ['$event'])
  onPopState(event: PopStateEvent) {
    if (this.isHistoryPushed) {
      this.isHistoryPushed = false;
      this.selectedMealForRecipe.set(null);
      this.selectedIngredientForReplacement.set(null);
    }
  }

  async loadPlan() {
    if (this.loading()) return;

    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }

    const p = this.patient();
    const url = p?.menu_url || (p?.current_menus && p.current_menus.length > 0 ? p.current_menus[0].url : null);
    
    if (!url) {
      this.parsedMenu.set(null);
      return;
    }

    // Intentar cargar del caché local de PWA para respuesta instantánea (offline-first)
    const cacheKey = `parsed_menu_${p?.email}_${url}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        this.parsedMenu.set(parsed);
        this.autoSelectDaySection();
        setTimeout(() => {
          this.scrollToCurrentMeal();
        }, 300);
        // Si ya está en caché, no necesitamos mostrar el spinner lento de carga
        return;
      }
    } catch (e) {
      console.error('Error reading menu cache:', e);
    }

    this.loading.set(true);
    this.error.set(null);
    this.menuProgress.set(0);
    this.menuLoadingMessage.set('Iniciando lectura de tu plan...');

    let currentProgress = 0;
    const updateProgressMessage = (pct: number) => {
      if (pct < 20) {
        this.menuLoadingMessage.set('Descargando archivo del plan alimenticio...');
      } else if (pct < 40) {
        this.menuLoadingMessage.set('Analizando texto y estructura del documento...');
      } else if (pct < 65) {
        this.menuLoadingMessage.set('Clasificando comidas, ingredientes y porciones...');
      } else if (pct < 85) {
        this.menuLoadingMessage.set('Procesando con Inteligencia Artificial...');
      } else {
        this.menuLoadingMessage.set('Estructurando recetas y equivalentes de intercambio...');
      }
    };

    this.progressInterval = setInterval(() => {
      if (currentProgress < 95) {
        let increment = 1.8;
        if (currentProgress >= 40 && currentProgress < 75) {
          increment = 0.9;
        } else if (currentProgress >= 75) {
          increment = 0.3;
        }
        currentProgress = Math.min(95, currentProgress + increment);
        const rounded = Math.round(currentProgress);
        this.menuProgress.set(rounded);
        updateProgressMessage(rounded);
      }
    }, 800);

    try {
      const data = await this.patientService.getParsedMenu(url);
      
      clearInterval(this.progressInterval);
      this.menuProgress.set(100);
      this.menuLoadingMessage.set('¡Menú digitalizado con éxito!');

      // Analytics
      this.analytics.logEvent('generate_ai_menu', {
        patient_email: this.patient()?.email,
        patient_name: this.patient()?.nombre
      });
      
      // Wait briefly for completion transition
      await new Promise(resolve => setTimeout(resolve, 600));

      if (data && !data.error) {
        this.parsedMenu.set(data);
        
        // Guardar en caché local
        try {
          // Limpiar cualquier menú antiguo en caché de este paciente para optimizar almacenamiento
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(`parsed_menu_${p?.email}_`) && key !== cacheKey) {
              localStorage.removeItem(key);
            }
          }
          localStorage.setItem(cacheKey, JSON.stringify(data));
        } catch (cacheErr) {
          console.error('Failed to write menu cache:', cacheErr);
        }

        this.autoSelectDaySection();
        setTimeout(() => {
          this.scrollToCurrentMeal();
        }, 400);
      } else {
        this.error.set('No se pudo extraer la información del menú digital.');
      }
    } catch (err: any) {
      clearInterval(this.progressInterval);
      console.error('Error loading digital plan:', err);
      let msg = 'Error al conectar con el servidor para digitalizar tu menú.';
      if (err && err.error && err.error.message) {
        msg = err.error.message;
      }
      this.error.set(msg);
    } finally {
      this.loading.set(false);
    }
  }

  get activeSection() {
    const menu = this.parsedMenu();
    if (!menu || !menu.secciones) return null;
    const idx = this.activeSectionIdx();
    return menu.secciones[idx] || menu.secciones[0] || null;
  }

  setActiveSection(idx: number) {
    this.activeSectionIdx.set(idx);
  }

  openRecipe(meal: any, event: Event) {
    event.stopPropagation();
    this.selectedMealForRecipe.set(meal);
  }

  closeRecipe() {
    this.selectedMealForRecipe.set(null);
  }

  openReplacements(ingredient: any, event: Event) {
    event.stopPropagation();
    
    // Si ya vienen reemplazos procesados del backend, úsalos pero compleméntalos
    let reps = ingredient.reemplazos || [];
    
    if (reps.length === 0) {
      // Buscar reemplazos en la base de datos SMAE local
      reps = this.generateSmaeReplacements(ingredient);
    }
    
    const enriched = {
      ...ingredient,
      reemplazos: reps
    };
    
    this.selectedIngredientForReplacement.set(enriched);
  }

  canReplace(ing: any): boolean {
    if (ing.reemplazos && ing.reemplazos.length > 0) return true;
    if (ing.grupo) return true;
    
    // Intentar buscar correspondencia por nombre en base de datos SMAE
    const nameLower = (ing.nombre || '').toLowerCase();
    return SMAE_DATABASE.some(f => nameLower.includes(f.name.toLowerCase()) || f.name.toLowerCase().includes(nameLower));
  }

  generateSmaeReplacements(ingredient: any): string[] {
    const groupName = (ingredient.grupo || '').toLowerCase();
    const nameLower = (ingredient.nombre || '').toLowerCase();

    // 1. Encontrar la categoría compatible del SMAE
    let categoryMatch = '';
    
    if (groupName.includes('verdura')) {
      categoryMatch = 'Verduras';
    } else if (groupName.includes('fruta')) {
      categoryMatch = 'Frutas';
    } else if (groupName.includes('cereal') && groupName.includes('sin grasa')) {
      categoryMatch = 'Cereales sin grasa';
    } else if (groupName.includes('cereal') && groupName.includes('con grasa')) {
      categoryMatch = 'Cereales con grasa';
    } else if (groupName.includes('leguminosa')) {
      categoryMatch = 'Leguminosas';
    } else if (groupName.includes('muy bajo') || (groupName.includes('aoa') && groupName.includes('muy bajo'))) {
      categoryMatch = 'AOA muy bajo en grasa';
    } else if (groupName.includes('bajo en grasa') || (groupName.includes('aoa') && groupName.includes('bajo'))) {
      categoryMatch = 'AOA bajo en grasa';
    } else if (groupName.includes('moderado') || (groupName.includes('aoa') && groupName.includes('moderado'))) {
      categoryMatch = 'AOA moderado en grasa';
    } else if (groupName.includes('alto en grasa') || (groupName.includes('aoa') && groupName.includes('alto'))) {
      categoryMatch = 'AOA alto en grasa';
    } else if (groupName.includes('lácteo') || groupName.includes('lacteo') || groupName.includes('leche')) {
      categoryMatch = 'Lácteos';
    } else if (groupName.includes('grasa') && groupName.includes('sin prote')) {
      categoryMatch = 'Grasas sin proteína';
    } else if (groupName.includes('grasa') && groupName.includes('con prote')) {
      categoryMatch = 'Grasas con proteína';
    } else if (groupName.includes('libre')) {
      categoryMatch = 'Libres de energía';
    } else {
      // Si no hay grupo claro, buscar por nombre del ingrediente en SMAE_DATABASE
      const match = SMAE_DATABASE.find(f => nameLower.includes(f.name.toLowerCase()) || f.name.toLowerCase().includes(nameLower));
      if (match) {
        categoryMatch = match.category;
      }
    }

    if (!categoryMatch) return [];

    // 2. Intentar buscar el ingrediente en la base de datos para saber cuántos equivalentes representa su porción
    let matchedFood = SMAE_DATABASE.find(f => nameLower.includes(f.name.toLowerCase()) || f.name.toLowerCase().includes(nameLower));
    
    // Si no se encuentra una porción exacta en SMAE, asumimos que representa 1 equivalente
    let equivalents = 1;
    
    if (matchedFood) {
      // Intentar extraer el número de la cantidad del ingrediente (ej: "1 pieza", "1/2 taza", "90g", "30 gramos")
      const qtyStr = (ingredient.cantidad || '').toLowerCase();
      let numericalQty = parseFloat(qtyStr);
      
      // Manejo de fracciones comunes (1/2, 1/3, 1/4, 3/4)
      if (qtyStr.includes('1/2') || qtyStr.includes('0.5') || qtyStr.includes('medio')) {
        numericalQty = 0.5;
      } else if (qtyStr.includes('1/3') || qtyStr.includes('0.33')) {
        numericalQty = 0.33;
      } else if (qtyStr.includes('1/4') || qtyStr.includes('0.25') || qtyStr.includes('cuarto')) {
        numericalQty = 0.25;
      } else if (qtyStr.includes('3/4') || qtyStr.includes('0.75')) {
        numericalQty = 0.75;
      } else if (qtyStr.includes('1.5') || qtyStr.includes('1 1/2')) {
        numericalQty = 1.5;
      } else {
        // Buscar el primer número del string
        const numMatch = qtyStr.match(/[\d.]+/);
        if (numMatch) {
          numericalQty = parseFloat(numMatch[0]);
        }
      }

      if (!isNaN(numericalQty) && numericalQty > 0) {
        // Si la unidad es gramos, y la base de datos tiene gramosEquivalent
        if ((qtyStr.includes('g') || qtyStr.includes('gramos')) && matchedFood.gramsEquivalent) {
          equivalents = numericalQty / matchedFood.gramsEquivalent;
        } else {
          equivalents = numericalQty / matchedFood.amountValue;
        }
      }
    }

    if (equivalents <= 0 || isNaN(equivalents)) equivalents = 1;

    // 3. Buscar candidatos compatibles de la categoría
    const isCategoryCompatible = (cat1: string, cat2: string) => {
      if (cat1 === cat2) return true;
      if (cat1.startsWith('Lácteos') && cat2.startsWith('Lácteos')) return true;
      if (cat1.startsWith('AOA') && cat2.startsWith('AOA')) return true;
      if (cat1.startsWith('Cereales') && cat2.startsWith('Cereales')) return true;
      return false;
    };

    const candidates = SMAE_DATABASE.filter(food => 
      isCategoryCompatible(food.category, categoryMatch) && 
      !nameLower.includes(food.name.toLowerCase())
    );

    // Mezclar candidatos usando Fisher-Yates
    const shuffled = [...candidates];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Retornar las primeras 5 sugerencias formateadas
    return shuffled.slice(0, 5).map(food => {
      const scaledAmount = equivalents * food.amountValue;
      const formattedAmount = Math.round(scaledAmount * 10) / 10;
      
      let portionText = '';
      const isCupUnit = food.unit.toLowerCase().includes('taza') || food.unit.toLowerCase() === 'tza' || food.unit.toLowerCase() === 'tzas';
      
      if (isCupUnit) {
        const displayUnit = formattedAmount > 1 ? 'tzas' : 'tza';
        if (food.gramsEquivalent) {
          const scaledGrams = Math.round(equivalents * food.gramsEquivalent);
          portionText = `${formattedAmount} ${displayUnit} (${scaledGrams}g)`;
        } else {
          portionText = `${formattedAmount} ${displayUnit}`;
        }
      } else {
        const suffix = (formattedAmount > 1 && food.unit.endsWith('a')) ? 's' : '';
        portionText = `${formattedAmount} ${food.unit}${suffix}`;
      }

      return `${food.emoji} ${food.name}: ${portionText}`;
    });
  }

  closeReplacements() {
    this.selectedIngredientForReplacement.set(null);
  }

  getMacroPercentage(grams: number, type: 'prot' | 'carb' | 'fat'): number {
    // Estimate percentages based on typical calorie count: Prot: 4kcal/g, Carb: 4kcal/g, Fat: 9kcal/g
    const calories = this.parsedMenu()?.calorias_totales || 2000;
    if (type === 'prot') return Math.round(((grams * 4) / calories) * 100);
    if (type === 'carb') return Math.round(((grams * 4) / calories) * 100);
    if (type === 'fat') return Math.round(((grams * 9) / calories) * 100);
    return 0;
  }

  getMealTimeColorClasses(tiempo: string = ''): {
    badgeClass: string;
    timelineDotClass: string;
    recipeBtnClass: string;
    topLineClass: string;
  } {
    const cleanTiempo = tiempo.toLowerCase();
    
    // Mañana / Desayuno (Yellow/Amber)
    if (
      cleanTiempo.includes('desayuno') || 
      cleanTiempo.includes('licuado') || 
      cleanTiempo.includes('colación 1') || 
      cleanTiempo.includes('matutina') || 
      cleanTiempo.includes('mañana')
    ) {
      return {
        badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 px-2 py-0.5 rounded-lg',
        timelineDotClass: 'border-amber-400 bg-amber-400',
        recipeBtnClass: 'text-amber-500 bg-amber-500/5 border-amber-500/10 hover:bg-amber-500 hover:text-white hover:border-amber-500 hover:shadow-amber-500/20',
        topLineClass: 'bg-gradient-to-r from-yellow-400 to-amber-300'
      };
    }
    
    // Tarde / Comida (Orange)
    if (
      cleanTiempo.includes('comida') || 
      cleanTiempo.includes('colación 2') || 
      cleanTiempo.includes('vespertina') || 
      cleanTiempo.includes('tarde')
    ) {
      return {
        badgeClass: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/25 px-2 py-0.5 rounded-lg',
        timelineDotClass: 'border-orange-500 bg-orange-500',
        recipeBtnClass: 'text-orange-500 bg-orange-500/5 border-orange-500/10 hover:bg-orange-500 hover:text-white hover:border-orange-500 hover:shadow-orange-500/20',
        topLineClass: 'bg-gradient-to-r from-orange-500 to-amber-400'
      };
    }
    
    // Noche / Cena (Indigo/Violet)
    return {
      badgeClass: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/25 px-2 py-0.5 rounded-lg',
      timelineDotClass: 'border-indigo-500 bg-indigo-500',
      recipeBtnClass: 'text-indigo-500 bg-indigo-500/5 border-indigo-500/10 hover:bg-indigo-500 hover:text-white hover:border-indigo-500 hover:shadow-indigo-500/20',
      topLineClass: 'bg-gradient-to-r from-indigo-500 to-violet-300'
    };
  }

  getIngredientIcon(grupo?: string, nombre: string = ''): { name: string; colorClass: string; bgClass: string; borderClass: string } {
    const cleanGroup = (grupo || '').toLowerCase();
    const cleanNombre = nombre.toLowerCase();

    // Helper function to check if string contains any keyword from list
    const containsAny = (str: string, keywords: string[]) => 
      keywords.some(keyword => str.includes(keyword));

    // 1. Bebidas / Líquidos (local_drink - Sky Blue)
    const drinkKeywords = [
      'bebida', 'líquido', 'liquido', 'agua', 'té', 'te ', 'infus', 'licuado', 'café', 'cafe', 
      'jugo', 'refresco', 'soda', 'clight', 'zuko', 'suero', 'gatorade', 'powerade', 'jamaica', 
      'horchata', 'tamarindo'
    ];
    if (cleanGroup.includes('bebida') || cleanGroup.includes('líquido') || cleanGroup.includes('liquido') || (containsAny(cleanNombre, drinkKeywords) && !cleanNombre.includes('aguacate'))) {
      return { 
        name: 'local_drink', 
        colorClass: 'text-sky-500 dark:text-sky-400', 
        bgClass: 'bg-sky-500/10 dark:bg-sky-500/20',
        borderClass: 'border-l-sky-500 dark:border-l-sky-400'
      };
    }

    // 2. Verduras y Frutas (spa / nutrition - Emerald Green)
    const fruitKeywords = [
      'fruta', 'piña', 'fresa', 'papaya', 'manzana', 'plátano', 'platano', 'banan', 'pera', 
      'durazno', 'melón', 'melon', 'sandía', 'sandia', 'mango', 'uva', 'kiwi', 'naranja', 
      'toronja', 'mandarina', 'guayaba', 'higo', 'tuna', 'ciruela', 'frambuesa', 'zarzamora', 
      'arándano', 'arandano', 'moras', 'berries', 'chabacano', 'mamey', 'guanábana', 'guanabana', 
      'tejocote'
    ];
    const vegKeywords = [
      'verdura', 'espinac', 'lechuga', 'apio', 'pepino', 'jitomate', 'tomate', 'cebolla', 
      'germinado', 'alfalfa', 'champig', 'seta', 'hongo', 'calabac', 'zanahori', 'chile', 
      'ajo', 'pimiento', 'nopal', 'ejote', 'coliflor', 'brócoli', 'brocoli', 'esparrago', 
      'betabel', 'acelga', 'coyote', 'chayote', 'jícama', 'jicama', 'cilantro', 'perejil', 
      'epazote', 'huauzontle', 'verdolaga', 'portobello', 'puerro', 'cebollín', 'cebollin', 
      'rábano', 'rabano', 'chícharo', 'chicharo', 'bambú', 'bambu', 'col de bruselas', 'repollo',
      'cebolla morada'
    ];

    const hasFruitWord = cleanGroup.includes('fruta') || containsAny(cleanNombre, fruitKeywords);
    const hasVegWord = cleanGroup.includes('verdura') || containsAny(cleanNombre, vegKeywords);

    if (hasFruitWord || hasVegWord) {
      return { 
        name: hasFruitWord ? 'nutrition' : 'spa', 
        colorClass: 'text-emerald-500 dark:text-emerald-400', 
        bgClass: 'bg-emerald-500/10 dark:bg-emerald-500/20',
        borderClass: 'border-l-emerald-500 dark:border-l-emerald-400'
      };
    }

    // 3. Cereales y Tubérculos (bakery_dining - Orange)
    const cerealKeywords = [
      'cereal', 'tubérculo', 'tuberculo', 'pan', 'tortilla', 'avena', 'tostada', 'pasta', 
      'arroz', 'elote', 'papa', 'camote', 'quinoa', 'salvado', 'linaza', 'galleta', 
      'crutón', 'cruton', 'harina', 'maicena', 'muesli', 'granola', 'barrita', 'tarta', 
      'crepa', 'bagel', 'croissant', 'bolillo', 'telera', 'salmas', 'susanitas', 'sanissimo', 
      'totopos', 'tostado', 'trigo', 'centeno', 'cebada', 'milo'
    ];
    if (cleanGroup.includes('cereal') || cleanGroup.includes('tubérculo') || cleanGroup.includes('tuberculo') || containsAny(cleanNombre, cerealKeywords)) {
      return { 
        name: 'bakery_dining', 
        colorClass: 'text-orange-500 dark:text-orange-400', 
        bgClass: 'bg-orange-500/10 dark:bg-orange-500/20',
        borderClass: 'border-l-orange-500 dark:border-l-orange-400'
      };
    }

    // 4. Carne, Proteínas y Leguminosas (restaurant - Rose/Red)
    const proteinKeywords = [
      'animal', 'proteína', 'proteina', 'pollo', 'carne', 'res', 'pescado', 'atún', 'atun', 
      'cerdo', 'huevo', 'queso', 'panela', 'requesón', 'requeson', 'salmón', 'salmon', 'pavo', 
      'jamón', 'jamon', 'pechuga', 'ternera', 'bistec', 'filete', 'milanesa', 'camarón', 
      'camaron', 'marisco', 'pulpo', 'claras', 'yema', 'frijol', 'lenteja', 'garbanzo', 
      'haba', 'soya', 'tofu', 'tempeh', 'leguminosa', 'atun', 'embutido', 'salchicha', 'tocino'
    ];
    if (cleanGroup.includes('animal') || cleanGroup.includes('proteína') || cleanGroup.includes('leguminosa') || containsAny(cleanNombre, proteinKeywords)) {
      return { 
        name: 'restaurant', 
        colorClass: 'text-rose-500 dark:text-rose-400', 
        bgClass: 'bg-rose-500/10 dark:bg-rose-500/20',
        borderClass: 'border-l-rose-500 dark:border-l-rose-400'
      };
    }

    // 5. Lácteos (opacity - Cyan/Blue)
    const dairyKeywords = [
      'lácteo', 'lacteo', 'yogurt', 'yogur', 'leche', 'yakult', 'kefir', 'jocoque'
    ];
    if (cleanGroup.includes('lácteo') || cleanGroup.includes('lacteo') || containsAny(cleanNombre, dairyKeywords)) {
      return { 
        name: 'opacity', 
        colorClass: 'text-cyan-500 dark:text-cyan-400', 
        bgClass: 'bg-cyan-500/10 dark:bg-cyan-500/20',
        borderClass: 'border-l-cyan-500 dark:border-l-cyan-400'
      };
    }

    // 6. Grasas y Aceites (water_drop - Yellow)
    const fatKeywords = [
      'grasa', 'aguacate', 'aceite', 'almendra', 'nuez', 'nueces', 'chía', 'chia', 'semilla', 
      'mantequilla', 'margarina', 'mayonesa', 'crema', 'cacahuate', 'pistache', 'girasol', 
      'ajonjolí', 'ajonjoli', 'tahini', 'coco', 'aderezo', 'pepita'
    ];
    if (cleanGroup.includes('grasa') || containsAny(cleanNombre, fatKeywords)) {
      return { 
        name: 'water_drop', 
        colorClass: 'text-yellow-600 dark:text-yellow-500', 
        bgClass: 'bg-yellow-500/10 dark:bg-yellow-500/20',
        borderClass: 'border-l-yellow-500 dark:border-l-yellow-400'
      };
    }

    // Default (Cubiertos cruzados - Gris)
    return { 
      name: 'restaurant_menu', 
      colorClass: 'text-slate-400 dark:text-slate-500', 
      bgClass: 'bg-slate-400/10 dark:bg-slate-400/20',
      borderClass: 'border-l-slate-300 dark:border-l-slate-600'
    };
  }

  getCurrentMealTiempo(): string {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 9) {
      return 'desayuno';
    } else if (hour >= 9 && hour < 12) {
      return 'colación 1';
    } else if (hour >= 12 && hour < 15) {
      return 'comida';
    } else if (hour >= 15 && hour < 19) {
      return 'colación 2';
    } else {
      return 'cena';
    }
  }

  isCurrentMeal(tiempo: string): boolean {
    const currentTiempo = this.getCurrentMealTiempo();
    const t = tiempo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const cleanCurrent = currentTiempo.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return t.includes(cleanCurrent) || cleanCurrent.includes(t);
  }

  scrollToCurrentMeal() {
    const currentTiempo = this.getCurrentMealTiempo();
    const meals = this.activeSection?.tiempos_comida;
    if (!meals) return;

    const matchIdx = meals.findIndex((m: any) => {
      const t = m.tiempo.toLowerCase();
      const cleanT = t.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const cleanCurrent = currentTiempo.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return cleanT.includes(cleanCurrent) || cleanCurrent.includes(cleanT);
    });

    if (matchIdx !== -1) {
      const element = document.getElementById('meal-card-' + matchIdx);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }

  autoSelectDaySection() {
    const menu = this.parsedMenu();
    if (!menu || !menu.secciones || menu.secciones.length === 0) return;

    const weekdayIndex = new Date().getDay();
    const daysMap = [
      'domingo',
      'lunes',
      'martes',
      'miercoles',
      'jueves',
      'viernes',
      'sabado'
    ];
    const currentDayClean = daysMap[weekdayIndex];

    const cleanString = (str: string) => 
      str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // 1. Check if the menu is day-based or option-based
    const isDayBased = menu.secciones.some((sec: any) => {
      const secNameClean = cleanString(sec.nombre);
      return daysMap.some(day => secNameClean.includes(day));
    });

    if (!isDayBased) {
      console.log('PortalPlan: Menu is option-based, skipping auto day selection.');
      return;
    }

    // 2. Find the section that matches today's day of week
    const matchIdx = menu.secciones.findIndex((sec: any) => {
      const secNameClean = cleanString(sec.nombre);
      return secNameClean.includes(currentDayClean);
    });

    if (matchIdx !== -1) {
      console.log(`PortalPlan: Auto selected day section index ${matchIdx} for today (${currentDayClean})`);
      this.activeSectionIdx.set(matchIdx);
    } else {
      console.log(`PortalPlan: Today is ${currentDayClean} but no matching section was found.`);
    }
  }
}
