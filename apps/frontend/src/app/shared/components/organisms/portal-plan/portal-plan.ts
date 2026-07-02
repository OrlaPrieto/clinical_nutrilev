import { Component, input, signal, effect, inject, OnInit, OnDestroy, HostListener, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PatientService } from '../../../../services/patient';
import { ToastService } from '../../../../shared/services/toast.service';
import { IconComponent } from '../../atoms/icon/icon';
import { ButtonComponent } from '../../atoms/button/button';
import { ThemeService } from '../../../../shared/services/theme.service';
import { Patient } from '@shared/models/interfaces';

@Component({
  selector: 'app-o-portal-plan',
  standalone: true,
  imports: [CommonModule, IconComponent, ButtonComponent],
  templateUrl: './portal-plan.html',
  styleUrl: './portal-plan.css'
})
export class PortalPlanOrganism implements OnInit, OnDestroy {
  patient = input.required<Patient | null>();
  
  private progressInterval: any = null;
  
  private patientService = inject(PatientService);
  private toastService = inject(ToastService);
  public themeService = inject(ThemeService);

  parsedMenu = signal<any | null>(null);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  
  activeSectionIdx = signal<number>(0);
  selectedMealForRecipe = signal<any | null>(null);
  selectedIngredientForReplacement = signal<any | null>(null);
  showDayDropdown = signal<boolean>(false);
  menuProgress = signal<number>(0);
  menuLoadingMessage = signal<string>('Iniciando lectura de tu plan...');

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

  ngOnInit() {
    this.loadPlan();
  }

  getHeroGradientClass(): string {
    const activeTheme = this.themeService.theme();
    switch (activeTheme) {
      case 'dark':
        return 'bg-gradient-to-tr from-nutri-rose via-[#ad1457] to-[#240011] border border-nutri-rose/15 shadow-lg shadow-pink-950/20';
      case 'purple':
        return 'bg-gradient-to-tr from-blue-700 via-indigo-700 to-sky-600 shadow-lg shadow-blue-900/20 border-0';
      case 'vibrant':
        return 'bg-gradient-to-tr from-nutri-rose via-[#5a806f] to-[#8cbda8] shadow-lg shadow-[#4a6b5d]/10 border-0';
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
      
      // Wait briefly for completion transition
      await new Promise(resolve => setTimeout(resolve, 600));

      if (data && !data.error) {
        this.parsedMenu.set(data);
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
    if (ingredient.reemplazos && ingredient.reemplazos.length > 0) {
      this.selectedIngredientForReplacement.set(ingredient);
    }
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
