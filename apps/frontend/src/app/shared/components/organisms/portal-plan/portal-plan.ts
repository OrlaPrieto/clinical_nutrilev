import { Component, input, signal, effect, inject, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PatientService } from '../../../../services/patient';
import { ToastService } from '../../../../shared/services/toast.service';
import { IconComponent } from '../../atoms/icon/icon';
import { ButtonComponent } from '../../atoms/button/button';
import { Patient } from '@shared/models/interfaces';

@Component({
  selector: 'app-o-portal-plan',
  standalone: true,
  imports: [CommonModule, IconComponent, ButtonComponent],
  templateUrl: './portal-plan.html',
  styleUrl: './portal-plan.css'
})
export class PortalPlanOrganism implements OnInit {
  patient = input.required<Patient | null>();
  
  private patientService = inject(PatientService);
  private toastService = inject(ToastService);

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

  constructor() {
    // Reload menu if patient or menu_url changes
    effect(() => {
      const p = this.patient();
      if (p) {
        this.loadPlan();
      }
    }, { allowSignalWrites: true });
  }

  async loadPlan() {
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

    const progressInterval = setInterval(() => {
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
      
      clearInterval(progressInterval);
      this.menuProgress.set(100);
      this.menuLoadingMessage.set('¡Menú digitalizado con éxito!');
      
      // Wait briefly for completion transition
      await new Promise(resolve => setTimeout(resolve, 600));

      if (data && !data.error) {
        this.parsedMenu.set(data);
        setTimeout(() => {
          this.scrollToCurrentMeal();
        }, 400);
      } else {
        this.error.set('No se pudo extraer la información del menú digital.');
      }
    } catch (err: any) {
      clearInterval(progressInterval);
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

    // 1. Bebidas / Líquidos (Bebida, agua, té, cafe, infusion, licuado)
    if (cleanGroup.includes('bebida') || cleanGroup.includes('líquido') || cleanGroup.includes('liquido') || cleanNombre.includes('agua') || cleanNombre.includes('té') || cleanNombre.includes('te ') || cleanNombre.includes('infusión') || cleanNombre.includes('infusion') || cleanNombre.includes('licuado') || cleanNombre.includes('café') || cleanNombre.includes('cafe')) {
      return { 
        name: 'local_drink', 
        colorClass: 'text-sky-500 dark:text-sky-400', 
        bgClass: 'bg-sky-500/10 dark:bg-sky-500/20',
        borderClass: 'border-l-sky-500 dark:border-l-sky-400'
      };
    }

    // 2. Verduras y Frutas (Fruta, verdura, espinaca, lechuga, etc)
    if (cleanGroup.includes('verdura') || cleanGroup.includes('fruta') || cleanNombre.includes('espinac') || cleanNombre.includes('lechuga') || cleanNombre.includes('apio') || cleanNombre.includes('pepino') || cleanNombre.includes('jitomate') || cleanNombre.includes('tomate') || cleanNombre.includes('piña') || cleanNombre.includes('fresa') || cleanNombre.includes('papaya') || cleanNombre.includes('manzana') || cleanNombre.includes('plátano') || cleanNombre.includes('platano')) {
      const isFruit = cleanGroup.includes('fruta') || cleanNombre.includes('piña') || cleanNombre.includes('fresa') || cleanNombre.includes('papaya') || cleanNombre.includes('manzana') || cleanNombre.includes('plátano') || cleanNombre.includes('platano');
      return { 
        name: isFruit ? 'nutrition' : 'spa', 
        colorClass: 'text-emerald-500 dark:text-emerald-400', 
        bgClass: 'bg-emerald-500/10 dark:bg-emerald-500/20',
        borderClass: 'border-l-emerald-500 dark:border-l-emerald-400'
      };
    }

    // 3. Cereales y Tubérculos (Cereal, pan, tortilla, avena, pasta, arroz, elote, papa)
    if (cleanGroup.includes('cereal') || cleanGroup.includes('tubérculo') || cleanGroup.includes('tuberculo') || cleanNombre.includes('pan') || cleanNombre.includes('tortilla') || cleanNombre.includes('avena') || cleanNombre.includes('tostada') || cleanNombre.includes('pasta') || cleanNombre.includes('arroz') || cleanNombre.includes('elote') || cleanNombre.includes('papa')) {
      return { 
        name: 'bakery_dining', 
        colorClass: 'text-orange-500 dark:text-orange-400', 
        bgClass: 'bg-orange-500/10 dark:bg-orange-500/20',
        borderClass: 'border-l-orange-500 dark:border-l-orange-400'
      };
    }

    // 4. Carne y Proteínas de origen animal (Carne, pollo, res, pescado, atún, cerdo, huevo, queso)
    if (cleanGroup.includes('animal') || cleanGroup.includes('proteína') || cleanNombre.includes('pollo') || cleanNombre.includes('carne') || cleanNombre.includes('res') || cleanNombre.includes('pescado') || cleanNombre.includes('atún') || cleanNombre.includes('atun') || cleanNombre.includes('cerdo') || cleanNombre.includes('huevo') || cleanNombre.includes('queso') || cleanNombre.includes('panela')) {
      return { 
        name: 'restaurant', 
        colorClass: 'text-rose-500 dark:text-rose-400', 
        bgClass: 'bg-rose-500/10 dark:bg-rose-500/20',
        borderClass: 'border-l-rose-500 dark:border-l-rose-400'
      };
    }

    // 5. Lácteos (Leche, yogurt)
    if (cleanGroup.includes('lácteo') || cleanGroup.includes('lacteo') || cleanNombre.includes('yogurt') || cleanNombre.includes('leche')) {
      return { 
        name: 'opacity', 
        colorClass: 'text-cyan-500 dark:text-cyan-400', 
        bgClass: 'bg-cyan-500/10 dark:bg-cyan-500/20',
        borderClass: 'border-l-cyan-500 dark:border-l-cyan-400'
      };
    }

    // 6. Grasas (Aguacate, aceites, frutos secos, chía)
    if (cleanGroup.includes('grasa') || cleanNombre.includes('aguacate') || cleanNombre.includes('aceite') || cleanNombre.includes('almendra') || cleanNombre.includes('nuez') || cleanNombre.includes('nueces') || cleanNombre.includes('chía') || cleanNombre.includes('chia') || cleanNombre.includes('semilla')) {
      return { 
        name: 'water_drop', 
        colorClass: 'text-yellow-600 dark:text-yellow-500', 
        bgClass: 'bg-yellow-500/10 dark:bg-yellow-500/20',
        borderClass: 'border-l-yellow-500 dark:border-l-yellow-400'
      };
    }

    // Default icon
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
}
