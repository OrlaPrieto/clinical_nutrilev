import { Component, input, signal, computed, effect, inject, OnInit, OnDestroy, HostListener, untracked, ChangeDetectionStrategy } from '@angular/core';
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

  nutritionTips: string[] = [
    '🥑 Tip Nutrilev: Las grasas saludables del aguacate ayudan a absorber mejor las vitaminas A, D, E y K.',
    '🤖 NutriIA: Clasificando alimentos y calculando equivalencias del SMAE...',
    '🥗 Tip Nutrilev: Mantenerte hidratado favorece el metabolismo y mejora la digestión.',
    '✨ NutriIA: Estructurando tus tiempos de comida y porciones recomendadas...',
    '🍳 Tip Nutrilev: Consumir suficiente proteína en el desayuno previene antojos vespertinos.',
    '🍏 Tip Nutrilev: Combinar frutas con frutos secos o yogur ayuda a mantener la glucosa estable.',
    '🚀 NutriIA: Finalizando detalles de tu menú digital personalizado...'
  ];

  currentTipIndex = signal<number>(0);
  currentNutritionTip = computed(() => this.nutritionTips[this.currentTipIndex()]);

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
        return 'bg-gradient-to-tr from-nutri-rose via-[#e91e63] to-[#ff7043] shadow-lg shadow-nutri-rose/20 border-0';
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

  async loadPlan(forceRefresh: boolean = false) {
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

    const cacheKey = `parsed_menu_${p?.email}_${url}`;
    
    if (forceRefresh) {
      try {
        localStorage.removeItem(cacheKey);
      } catch (e) {
        console.error('Error clearing menu cache:', e);
      }
    } else {
      // Intentar cargar del caché local de PWA para respuesta instantánea (offline-first)
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          this.parsedMenu.set(parsed);
          this.autoSelectDaySection();
          setTimeout(() => {
            this.scrollToCurrentMeal();
          }, 300);
          return;
        }
      } catch (e) {
        console.error('Error reading menu cache:', e);
      }
    }

    this.loading.set(true);
    this.error.set(null);
    this.menuProgress.set(0);
    this.menuLoadingMessage.set('Iniciando lectura de tu plan...');

    let currentProgress = 0;
    let tipTimerCounter = 0;
    this.currentTipIndex.set(0);

    const updateProgressMessage = (pct: number) => {
      if (pct < 25) {
        this.menuLoadingMessage.set('Descargando plan clínico del nutriólogo...');
      } else if (pct < 50) {
        this.menuLoadingMessage.set('Segmentando días y opciones de menú con IA...');
      } else if (pct < 75) {
        this.menuLoadingMessage.set('Digitalizando comidas, colaciones y bebidas en paralelo...');
      } else if (pct < 90) {
        this.menuLoadingMessage.set('Calculando equivalencias SMAE e ingredientes...');
      } else {
        this.menuLoadingMessage.set('Asignando fotografías culinarias y recomendaciones...');
      }
    };

    this.progressInterval = setInterval(() => {
      if (currentProgress < 75) {
        currentProgress += 6.5;
      } else if (currentProgress < 92) {
        currentProgress += 3.2;
      } else if (currentProgress < 99) {
        currentProgress += (99.2 - currentProgress) * 0.15;
      }

      const rounded = Math.min(99, Math.floor(currentProgress));
      this.menuProgress.set(rounded);
      updateProgressMessage(rounded);

      tipTimerCounter++;
      if (tipTimerCounter % 8 === 0) {
        this.currentTipIndex.update(idx => (idx + 1) % this.nutritionTips.length);
      }
    }, 250);

    try {
      const data = await this.patientService.getParsedMenu(url, forceRefresh);
      
      clearInterval(this.progressInterval);
      this.menuProgress.set(100);
      this.menuLoadingMessage.set('¡Menú digitalizado con éxito!');

      // Analytics
      this.analytics.logEvent('generate_ai_menu', {
        patient_email: this.patient()?.email,
        patient_name: this.patient()?.nombre
      });
      
      // Wait briefly for completion transition
      await new Promise(resolve => setTimeout(resolve, 400));

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
    
    // Generar sustitutos racionales, contextuales y equilibrados usando SMAE
    const reps = this.generateSmaeReplacements(ingredient);
    
    const enriched = {
      ...ingredient,
      reemplazos: reps
    };
    
    this.selectedIngredientForReplacement.set(enriched);
  }

  canReplace(ing: any): boolean {
    if (ing.reemplazos && ing.reemplazos.length > 0) return true;
    if (ing.grupo) return true;
    return !!this.findMatchingFood(ing.nombre || '');
  }

  private readonly STOPWORDS = new Set([
    'de', 'la', 'el', 'los', 'las', 'en', 'un', 'una', 'con', 'sin', 'al', 'del',
    'para', 'por', 'sobre', 'bajo', 'baja', 'bajos', 'bajas', 'grasa', 'grasas',
    'cocido', 'cocida', 'cocidos', 'cocidas', 'crudo', 'cruda', 'crudos', 'crudas',
    'fresco', 'fresca', 'frescos', 'frescas', 'natural', 'naturales', 'picado',
    'picada', 'picados', 'picadas', 'rebanado', 'rebanada', 'rebanados', 'rebanadas',
    'deshebrado', 'deshebrada', 'asado', 'asada', 'asados', 'asadas', 'al vapor',
    'comercial', 'pasteurizado', 'pasteurizada', 'ligero', 'ligera', 'light',
    'entero', 'entera', 'descremado', 'descremada', 'magro', 'magra', 'chico',
    'chica', 'chicos', 'chicas', 'mediano', 'mediana', 'medianos', 'medianas',
    'grande', 'grandes', 'calidad', 'pieza', 'piezas', 'pza', 'pzas', 'taza',
    'tazas', 'cda', 'cdas', 'cucharada', 'cucharadas', 'cdita', 'cditas', '00'
  ]);

  private findMatchingFood(name: string): SmaeFood | null {
    if (!name) return null;
    const clean = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const stem = (w: string) => {
      let s = clean(w);
      if (s.endsWith('ces')) s = s.slice(0, -3) + 'z';
      else if (s.endsWith('es')) s = s.slice(0, -2);
      else if (s.endsWith('s') && !s.endsWith('is')) s = s.slice(0, -1);
      return s;
    };

    const target = clean(name);
    const rawWords = target.split(/\s+/).map(stem).filter(w => w.length >= 3);
    const meaningfulWords = rawWords.filter(w => !this.STOPWORDS.has(w));
    const targetWords = meaningfulWords.length > 0 ? meaningfulWords : rawWords;

    // 1. Direct contains check
    const directMatches = SMAE_DATABASE.filter(f => {
      const fName = clean(f.name);
      return target.includes(fName) || fName.includes(target);
    });
    if (directMatches.length > 0) {
      return directMatches.sort((a, b) => {
        const diffA = Math.abs(clean(a.name).length - target.length);
        const diffB = Math.abs(clean(b.name).length - target.length);
        return diffA - diffB;
      })[0];
    }

    // 2. Score by meaningful words and tags
    const scored = SMAE_DATABASE.map(f => {
      const fWords = clean(f.name).split(/\s+/).map(stem).filter(w => w.length >= 3 && !this.STOPWORDS.has(w));
      let score = 0;
      for (const tw of targetWords) {
        if (fWords.some(fw => fw === tw || fw.startsWith(tw) || tw.startsWith(fw))) {
          score += tw.length * 2;
        }
        if (f.tags && f.tags.some(t => clean(t).includes(tw) || tw.includes(clean(t)))) {
          score += tw.length;
        }
      }
      return { food: f, score };
    }).filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score);

    return scored.length > 0 ? scored[0].food : null;
  }

  private inferCategoryAndSubcategory(ingredient: any): { category: string; subCategory: string; matchedFood: SmaeFood | null } {
    const rawName = (ingredient.nombre || '').toLowerCase();
    const rawGroup = (ingredient.grupo || '').toLowerCase();
    const matchedFood = this.findMatchingFood(rawName);

    const clean = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const text = clean(`${rawName} ${rawGroup}`);

    // 1. DRESSINGS, DIPS & SPREADS (Aderezos, ranch, mayonesa, vinagreta, guacamole, crema, queso crema, pesto)
    // CRITICAL: Even if labeled "bajo en grasa", an aderezo is ALWAYS Grasas sin proteína!
    if (
      text.includes('aderezo') || text.includes('ranch') || text.includes('cesar') || text.includes('césar') ||
      text.includes('vinagreta') || text.includes('mayonesa') || text.includes('guacamole') ||
      text.includes('queso crema') || text.includes('philadelphia') || text.includes('pesto') ||
      (text.includes('crema') && !text.includes('cereal') && !text.includes('cacahuate') && !text.includes('almendra'))
    ) {
      return {
        category: 'Grasas sin proteína',
        subCategory: 'aderezos_untables',
        matchedFood: matchedFood || SMAE_DATABASE.find(f => f.name.includes('Aderezo')) || null
      };
    }

    // 2. COOKING OILS & BUTTER
    if (text.includes('aceite') || text.includes('mantequilla') || text.includes('ghee') || text.includes('pam') || text.includes('aerosol')) {
      return {
        category: 'Grasas sin proteína',
        subCategory: 'aceites_cocina',
        matchedFood: matchedFood || SMAE_DATABASE.find(f => f.name.includes('Aceite')) || null
      };
    }

    // 3. NUTS & SEEDS (Frutos secos)
    if (
      text.includes('almendra') || text.includes('nuez') || text.includes('nueces') ||
      text.includes('cacahuate') || text.includes('mani') || text.includes('maní') || text.includes('pistache') ||
      text.includes('chia') || text.includes('chía') || text.includes('linaza') || text.includes('girasol') ||
      text.includes('pepita') || text.includes('crema de cacahuate') || text.includes('mantequilla de mani')
    ) {
      return {
        category: 'Grasas con proteína',
        subCategory: 'frutos_secos_semillas',
        matchedFood: matchedFood || SMAE_DATABASE.find(f => f.name.includes('Almendras')) || null
      };
    }

    // 4. BREADS, TORTILLAS, CRACKERS, TOASTS (Pan de sandwich, tostadas, tortillas, galletas saladas)
    if (
      text.includes('pan') || text.includes('bimbo') || text.includes('tortilla') ||
      text.includes('tostada') || text.includes('salmas') || text.includes('sanissimo') ||
      text.includes('habanera') || text.includes('pita') || text.includes('bolillo') ||
      text.includes('telera') || text.includes('bagel') || text.includes('wrap') ||
      text.includes('rice cake') || text.includes('galleta de arroz') || text.includes('craker') ||
      text.includes('galleta salada')
    ) {
      return {
        category: 'Cereales sin grasa',
        subCategory: 'pan_tortilla',
        matchedFood: matchedFood || SMAE_DATABASE.find(f => f.name.includes('Pan de caja integral')) || null
      };
    }

    // 5. BREAKFAST CEREALS (Avena, amaranto, cereal de caja)
    if (text.includes('avena') || text.includes('amaranto') || text.includes('corn flakes') || text.includes('cheerios') || text.includes('granola') || text.includes('salvado')) {
      return {
        category: 'Cereales sin grasa',
        subCategory: 'cereal_desayuno',
        matchedFood: matchedFood || SMAE_DATABASE.find(f => f.name.includes('Avena')) || null
      };
    }

    // 6. STARCHY SIDES (Arroz, pastas, papa, camote, elote, quinoa)
    if (text.includes('arroz') || text.includes('pasta') || text.includes('spaghetti') || text.includes('fideo') || text.includes('codito') || text.includes('papa') || text.includes('camote') || text.includes('elote') || text.includes('quinoa')) {
      return {
        category: 'Cereales sin grasa',
        subCategory: 'guarnicion_almidon',
        matchedFood: matchedFood || SMAE_DATABASE.find(f => f.name.includes('Arroz')) || null
      };
    }

    // 7. LEGUMES
    if (text.includes('frijol') || text.includes('lenteja') || text.includes('garbanzo') || text.includes('haba') || text.includes('leguminosa')) {
      return {
        category: 'Leguminosas',
        subCategory: 'leguminosas',
        matchedFood: matchedFood || SMAE_DATABASE.find(f => f.category === 'Leguminosas') || null
      };
    }

    // 8. BREAKFAST & SANDWICH PROTEINS (Jamón, huevo, claras, quesos frescos)
    if (
      text.includes('jamon') || text.includes('jamón') || text.includes('pavo') || text.includes('huevo') ||
      text.includes('clara') || text.includes('panela') || text.includes('oaxaca') ||
      text.includes('cottage') || text.includes('requeson') || text.includes('requesón')
    ) {
      return {
        category: 'AOA bajo en grasa',
        subCategory: 'desayuno_embutidos',
        matchedFood: matchedFood || SMAE_DATABASE.find(f => f.name.includes('Jamón')) || null
      };
    }

    // 9. MAIN DISH MEATS & SEAFOOD (Pollo, res, carne, pescado, mariscos)
    if (
      text.includes('pollo') || text.includes('pechuga') || text.includes('pescado') ||
      text.includes('filete') || text.includes('res') || text.includes('carne') ||
      text.includes('atun') || text.includes('atún') || text.includes('camaron') || text.includes('camarón') ||
      text.includes('salmon') || text.includes('salmón') || text.includes('tilapia') ||
      text.includes('molida') || text.includes('cerdo') || text.includes('lomo') || text.includes('bistec')
    ) {
      return {
        category: 'AOA muy bajo en grasa',
        subCategory: 'plato_fuerte',
        matchedFood: matchedFood || SMAE_DATABASE.find(f => f.name.includes('Pechuga de pollo')) || null
      };
    }

    // 10. DAIRY
    if (text.includes('yogurt') || text.includes('yogur') || text.includes('yoghurt') || text.includes('kefir') || text.includes('kéfir')) {
      return {
        category: 'Lácteos descremados',
        subCategory: 'lacteos_solidos',
        matchedFood: matchedFood || SMAE_DATABASE.find(f => f.name.includes('Yogurt')) || null
      };
    }
    if (text.includes('leche')) {
      return {
        category: 'Lácteos descremados',
        subCategory: 'lacteos_liquidos',
        matchedFood: matchedFood || SMAE_DATABASE.find(f => f.name.includes('Leche')) || null
      };
    }

    // 11. VEGETABLES
    if (text.includes('verdura') || matchedFood?.category === 'Verduras') {
      const isCooked = text.includes('cocid') || text.includes('asado') || text.includes('vapor') || text.includes('caldo') || text.includes('sopa');
      const sub = isCooked || (matchedFood?.subCategory === 'cocidas_guisados') ? 'cocidas_guisados' : 'ensalada_fresca';
      return {
        category: 'Verduras',
        subCategory: sub,
        matchedFood: matchedFood || SMAE_DATABASE.find(f => f.subCategory === sub) || null
      };
    }

    // 12. FRUITS
    if (text.includes('fruta') || matchedFood?.category === 'Frutas') {
      return {
        category: 'Frutas',
        subCategory: 'frutas',
        matchedFood: matchedFood || SMAE_DATABASE.find(f => f.category === 'Frutas') || null
      };
    }

    // Fallback: If matchedFood exists, use its category and subCategory
    if (matchedFood) {
      return {
        category: matchedFood.category,
        subCategory: matchedFood.subCategory || '',
        matchedFood
      };
    }

    // Ultimate fallback based on group string
    let fallbackCategory = 'Verduras';
    let fallbackSub = 'ensalada_fresca';
    if (rawGroup.includes('fruta')) { fallbackCategory = 'Frutas'; fallbackSub = 'frutas'; }
    else if (rawGroup.includes('cereal')) { fallbackCategory = 'Cereales sin grasa'; fallbackSub = 'pan_tortilla'; }
    else if (rawGroup.includes('leguminosa')) { fallbackCategory = 'Leguminosas'; fallbackSub = 'leguminosas'; }
    else if (rawGroup.includes('aoa') || rawGroup.includes('animal')) { fallbackCategory = 'AOA bajo en grasa'; fallbackSub = 'plato_fuerte'; }
    else if (rawGroup.includes('lacteo') || rawGroup.includes('leche')) { fallbackCategory = 'Lácteos descremados'; fallbackSub = 'lacteos_liquidos'; }
    else if (rawGroup.includes('grasa')) { fallbackCategory = 'Grasas sin proteína'; fallbackSub = 'aderezos_untables'; }

    return {
      category: fallbackCategory,
      subCategory: fallbackSub,
      matchedFood: null
    };
  }

  private parsePortion(qtyStr: string): { value: number; unit: 'ml' | 'grams' | 'cups' | 'tbsp' | 'tsp' | 'pieces' | 'unknown' } {
    const raw = (qtyStr || '').toLowerCase().trim();
    if (!raw) return { value: 1, unit: 'unknown' };

    // Separate main portion (outside parentheses) from secondary parenthetical portion (e.g. "(120 g)")
    // Example: "1 taza (120 g)" -> main: "1 taza", paren: "120 g"
    const parenMatch = raw.match(/\(([^)]+)\)/);
    const parenPart = parenMatch ? parenMatch[1].trim() : '';
    const outsidePart = raw.replace(/\([^)]*\)/g, ' ').trim();

    const parseSegment = (text: string) => {
      if (!text) return null;
      const normalized = text
        .replace(/(\d+)([a-zA-Z]+)/g, '$1 $2')
        .replace(/([a-zA-Z]+)(\d+)/g, '$1 $2')
        .trim();

      let value = 0;
      let hasNumber = false;

      // Mixed fraction: "1 1/2", "2 1/4"
      const mixedMatch = normalized.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)/);
      if (mixedMatch) {
        value = parseInt(mixedMatch[1], 10) + (parseInt(mixedMatch[2], 10) / parseInt(mixedMatch[3], 10));
        hasNumber = true;
      } else {
        // Simple fraction: "1/2", "3/4"
        const fracMatch = normalized.match(/(\d+)\s*\/\s*(\d+)/);
        if (fracMatch) {
          value = parseInt(fracMatch[1], 10) / parseInt(fracMatch[2], 10);
          hasNumber = true;
        } else if (/\b(medio|media)\b/i.test(normalized)) {
          value = 0.5;
          hasNumber = true;
        } else if (/\b(cuarto|un cuarto)\b/i.test(normalized)) {
          value = 0.25;
          hasNumber = true;
        } else {
          const numMatch = normalized.match(/\d+([.,]\d+)?/);
          if (numMatch) {
            value = parseFloat(numMatch[0].replace(',', '.'));
            hasNumber = true;
          }
        }
      }

      if (!hasNumber || isNaN(value) || value <= 0) {
        value = 0;
      }

      let unit: 'ml' | 'grams' | 'cups' | 'tbsp' | 'tsp' | 'pieces' | 'unknown' = 'unknown';

      // Check specific volumetric and count units first before short unit strings
      if (/\b(tazas?|tzas?|tza|tz|cups?)\b/i.test(normalized)) {
        unit = 'cups';
      } else if (/\b(cdas?|cda|cucharadas?|tbsp)\b/i.test(normalized)) {
        unit = 'tbsp';
      } else if (/\b(cditas?|cdita|cctas?|cucharaditas?|tsp)\b/i.test(normalized)) {
        unit = 'tsp';
      } else if (/\b(piezas?|pzas?|pza|pz|pzs|rebanadas?|rebanada|latas?|lata|disparos?|disparo|filetes?|sobres?)\b/i.test(normalized)) {
        unit = 'pieces';
      } else if (/\b(vasos?)\b/i.test(normalized)) {
        unit = 'ml';
        value = value > 0 ? value * 240 : 240;
      } else if (/\b(ml|mls|mililitros?|cc|cm3)\b/i.test(normalized)) {
        unit = 'ml';
      } else if (/\b(l|lt|lts|litros?)\b/i.test(normalized)) {
        unit = 'ml';
        value = value * 1000;
      } else if (/\b(kg|kgs|kilos?|kilogramos?)\b/i.test(normalized)) {
        unit = 'grams';
        value = value * 1000;
      } else if (/\b(g|gr|grs|gramos?)\b/i.test(normalized)) {
        unit = 'grams';
      }

      return { value, unit, hasNumber };
    };

    // 1. Try outside parentheses first (the primary stated measure)
    const primary = parseSegment(outsidePart);
    if (primary && primary.hasNumber && primary.unit !== 'unknown') {
      return { value: primary.value, unit: primary.unit };
    }

    // 2. If primary had a number but unknown unit, check if parentheses specifies the unit or grams
    if (primary && primary.hasNumber && parenPart) {
      const secondary = parseSegment(parenPart);
      if (secondary && secondary.unit !== 'unknown') {
        if (secondary.hasNumber && secondary.value > 0) {
          return { value: secondary.value, unit: secondary.unit };
        }
        return { value: primary.value, unit: secondary.unit };
      }
      return { value: primary.value, unit: 'unknown' };
    }

    // 3. Try parsing parenPart if outsidePart had no number
    if (parenPart) {
      const secondary = parseSegment(parenPart);
      if (secondary && secondary.hasNumber) {
        return { value: secondary.value, unit: secondary.unit };
      }
    }

    // 4. Fallback to parsing the entire raw string
    const fallback = parseSegment(raw);
    if (fallback && fallback.hasNumber) {
      return { value: fallback.value, unit: fallback.unit };
    }

    return { value: 1, unit: 'unknown' };
  }

  private calculateEquivalents(parsed: { value: number; unit: string }, matchedFood: SmaeFood | null): number {
    const { value, unit } = parsed;

    if (!matchedFood) {
      if (unit === 'ml') return Math.max(0.5, value / 240);
      if (unit === 'cups' || unit === 'pieces' || unit === 'tbsp' || unit === 'tsp') return Math.max(0.5, value);
      if (unit === 'grams') return Math.max(0.5, value / 100);
      return 1;
    }

    const foodUnit = (matchedFood.unit || '').toLowerCase().trim();
    const isCupInDb = foodUnit.includes('taza') || foodUnit.includes('tza');
    const isTbspInDb = foodUnit.includes('cucharada');
    const isTspInDb = foodUnit.includes('cucharadita');
    const isPieceInDb = foodUnit.includes('pieza') || foodUnit.includes('rebanada');
    const isGramsInDb = foodUnit === 'gramos' || foodUnit === 'g';

    // Unit: Milliliters (Volume)
    if (unit === 'ml') {
      if (matchedFood.gramsEquivalent) {
        return value / matchedFood.gramsEquivalent;
      }
      if (isCupInDb) {
        return value / (matchedFood.amountValue * 240);
      }
      if (isTspInDb) {
        return value / (matchedFood.amountValue * 5);
      }
      if (isTbspInDb) {
        return value / (matchedFood.amountValue * 15);
      }
      if (isGramsInDb) {
        return value / matchedFood.amountValue;
      }
      return value / 240;
    }

    // Unit: Grams (Weight)
    if (unit === 'grams') {
      // Guardrail: If value is tiny (<= 5), it represents portions/pieces, not 1 gram
      if (value <= 5) {
        return value;
      }
      if (matchedFood.gramsEquivalent) {
        return value / matchedFood.gramsEquivalent;
      }
      if (isGramsInDb) {
        return value / matchedFood.amountValue;
      }
      if (isCupInDb) {
        return value / (matchedFood.amountValue * 240);
      }
      return value / matchedFood.amountValue;
    }

    // Unit: Cups
    if (unit === 'cups') {
      if (isCupInDb) {
        return value / matchedFood.amountValue;
      }
      if (matchedFood.gramsEquivalent) {
        return (value * 240) / matchedFood.gramsEquivalent;
      }
      if (isGramsInDb) {
        return (value * 240) / matchedFood.amountValue;
      }
      return value / matchedFood.amountValue;
    }

    // Unit: Tablespoon (cda ≈ 15g / 15ml)
    if (unit === 'tbsp') {
      if (isTbspInDb) return value / matchedFood.amountValue;
      if (isTspInDb) return (value * 3) / matchedFood.amountValue;
      if (matchedFood.gramsEquivalent) return (value * 15) / matchedFood.gramsEquivalent;
      if (isGramsInDb) return (value * 15) / matchedFood.amountValue;
      return value / matchedFood.amountValue;
    }

    // Unit: Teaspoon (cdita ≈ 5g / 5ml)
    if (unit === 'tsp') {
      if (isTspInDb) return value / matchedFood.amountValue;
      if (isTbspInDb) return (value / 3) / matchedFood.amountValue;
      if (matchedFood.gramsEquivalent) return (value * 5) / matchedFood.gramsEquivalent;
      if (isGramsInDb) return (value * 5) / matchedFood.amountValue;
      return value / matchedFood.amountValue;
    }

    // Unit: Pieces / slices
    if (unit === 'pieces') {
      if (isPieceInDb) {
        return value / matchedFood.amountValue;
      }
      // If food in DB is in grams (e.g. 30g meat), 1 piece is 1 equivalent
      if (isGramsInDb && matchedFood.amountValue >= 15) {
        return value;
      }
      return value / (matchedFood.amountValue || 1);
    }

    // Fallback: No unit detected or unknown
    if (isGramsInDb && value >= 20) {
      return value / matchedFood.amountValue;
    }
    if (matchedFood.gramsEquivalent && value >= 50) {
      return value / matchedFood.gramsEquivalent;
    }
    if (value <= 5) {
      return value / (matchedFood.amountValue || 1);
    }
    return value / (matchedFood.amountValue || 1);
  }

  private formatCandidatePortion(food: SmaeFood, equivalents: number): string {
    const scaledAmount = equivalents * food.amountValue;
    const foodUnit = (food.unit || '').toLowerCase().trim();
    const isGrams = foodUnit === 'gramos' || foodUnit === 'g';
    const isCupUnit = foodUnit.includes('taza') || foodUnit.includes('tza');

    if (isCupUnit) {
      const formattedAmountStr = this.formatFractionOrDecimal(scaledAmount);
      const displayUnit = scaledAmount > 1.05 ? 'tzas' : 'tza';
      if (food.gramsEquivalent) {
        const scaledGrams = Math.max(10, Math.round(equivalents * food.gramsEquivalent));
        return `${formattedAmountStr} ${displayUnit} (${scaledGrams}g)`;
      }
      return `${formattedAmountStr} ${displayUnit}`;
    }

    if (isGrams) {
      const formattedAmount = Math.max(10, Math.round(scaledAmount));
      return `${formattedAmount} gramos`;
    }

    const formattedAmountStr = this.formatFractionOrDecimal(scaledAmount);
    let displayUnit = food.unit;
    if (scaledAmount > 1.05) {
      if (foodUnit.startsWith('pieza')) displayUnit = 'piezas';
      else if (foodUnit.startsWith('rebanada')) displayUnit = 'rebanadas';
      else if (foodUnit.startsWith('cucharadita')) displayUnit = 'cucharaditas';
      else if (foodUnit.startsWith('cucharada')) displayUnit = 'cucharadas';
      else if (foodUnit.startsWith('disparo')) displayUnit = 'disparos';
      else if (foodUnit.startsWith('vaso')) displayUnit = 'vasos';
      else if (food.unit.endsWith('a') || food.unit.endsWith('o')) displayUnit = `${food.unit}s`;
    } else {
      if (foodUnit.startsWith('piezas')) displayUnit = 'pieza';
      else if (foodUnit.startsWith('rebanadas')) displayUnit = 'rebanada';
      else if (foodUnit.startsWith('cucharaditas')) displayUnit = 'cucharadita';
      else if (foodUnit.startsWith('cucharadas')) displayUnit = 'cucharada';
      else if (foodUnit.startsWith('disparos')) displayUnit = 'disparo';
      else if (foodUnit.startsWith('vasos')) displayUnit = 'vaso';
    }

    return `${formattedAmountStr} ${displayUnit}`;
  }

  private formatFractionOrDecimal(val: number): string {
    if (val <= 0 || isNaN(val)) return '1';

    const whole = Math.floor(val);
    const frac = Math.round((val - whole) * 100) / 100;

    let fracStr = '';
    if (Math.abs(frac - 0.25) < 0.05) fracStr = '1/4';
    else if (Math.abs(frac - 0.33) < 0.06 || Math.abs(frac - 0.34) < 0.06) fracStr = '1/3';
    else if (Math.abs(frac - 0.5) < 0.06) fracStr = '1/2';
    else if (Math.abs(frac - 0.66) < 0.06 || Math.abs(frac - 0.67) < 0.06) fracStr = '2/3';
    else if (Math.abs(frac - 0.75) < 0.06) fracStr = '3/4';

    if (fracStr) {
      return whole > 0 ? `${whole} ${fracStr}` : fracStr;
    }

    const rounded = Math.round(val * 10) / 10;
    return rounded > 0 ? `${rounded}` : '1/2';
  }

  generateSmaeReplacements(ingredient: any): string[] {
    const nameLower = (ingredient.nombre || '').toLowerCase();
    const { category, subCategory, matchedFood } = this.inferCategoryAndSubcategory(ingredient);

    const parsedPortion = this.parsePortion(ingredient.cantidad);
    let equivalents = this.calculateEquivalents(parsedPortion, matchedFood);

    // Guardrails against zero, NaN or abnormal equivalents
    if (isNaN(equivalents) || equivalents < 0.25) {
      equivalents = 1;
    } else if (equivalents > 10) {
      equivalents = 1;
    }

    // Compatible category matcher
    const isCategoryCompatible = (cat1: string, cat2: string) => {
      if (cat1 === cat2) return true;
      if (cat1.startsWith('Lácteos') && cat2.startsWith('Lácteos')) return true;
      if (cat1.startsWith('AOA') && cat2.startsWith('AOA')) return true;
      if (cat1.startsWith('Cereales') && cat2.startsWith('Cereales')) return true;
      if (cat1.startsWith('Grasas') && cat2.startsWith('Grasas')) return true;
      return false;
    };

    const clean = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const stem = (w: string) => {
      let s = clean(w);
      if (s.endsWith('ces')) s = s.slice(0, -3) + 'z';
      else if (s.endsWith('es')) s = s.slice(0, -2);
      else if (s.endsWith('s') && !s.endsWith('is')) s = s.slice(0, -1);
      return s;
    };
    const targetClean = clean(nameLower);

    // Exclude the food being substituted
    const isSameFood = (food: SmaeFood) => {
      const fNameClean = clean(food.name);
      if (matchedFood && food.name === matchedFood.name) return true;
      if (targetClean.includes(fNameClean) || fNameClean.includes(targetClean)) return true;
      const fWords = fNameClean.split(/\s+/).map(stem).filter(w => w.length >= 3 && !this.STOPWORDS.has(w));
      const tWords = targetClean.split(/\s+/).map(stem).filter(w => w.length >= 3 && !this.STOPWORDS.has(w));
      const overlap = fWords.filter(w => tWords.includes(w));
      return overlap.length >= 2 || (overlap.length === 1 && fWords.length <= 2 && tWords.length <= 2);
    };

    const eligibleCandidates = SMAE_DATABASE.filter(food =>
      isCategoryCompatible(food.category, category) && !isSameFood(food)
    );

    // Contextual & Culinary Affinity:
    // Tier 1: Exactly matching culinary subcategory (e.g. bread with bread/tortilla, dressing with dressing/spread)
    const tier1 = subCategory ? eligibleCandidates.filter(f => f.subCategory === subCategory) : [];

    // Shuffle helper (Fisher-Yates)
    const shuffle = (list: SmaeFood[]) => {
      const arr = [...list];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    };

    let selectedCandidates: SmaeFood[] = [];
    if (tier1.length >= 3) {
      selectedCandidates = shuffle(tier1).slice(0, 5);
    } else {
      const rest = eligibleCandidates.filter(f => !tier1.includes(f));
      selectedCandidates = [...shuffle(tier1), ...shuffle(rest)].slice(0, 5);
    }

    // Format final 5 portion suggestions
    return selectedCandidates.map(food => {
      const portionText = this.formatCandidatePortion(food, equivalents);
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
