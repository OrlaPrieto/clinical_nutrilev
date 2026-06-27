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
}
