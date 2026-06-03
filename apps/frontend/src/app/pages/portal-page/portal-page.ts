import { Component, OnInit, inject, signal, computed, HostListener } from '@angular/core';
import { CommonModule, DatePipe, NgOptimizedImage } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { PatientService } from '../../services/patient';
import { Patient, PatientProgress, ShoppingCategory, ShoppingItem } from '@shared/models/interfaces';
import { ButtonComponent } from '../../shared/components/atoms/button/button';
import { IconComponent } from '../../shared/components/atoms/icon/icon';
import { ThemeService } from '../../shared/services/theme.service';
import { StorageService } from '../../shared/services/storage.service';

import { NutriImagePipe } from '../../shared/pipes/nutri-image.pipe';
import { MilestoneBadgeComponent } from '../../shared/components/molecules/milestone-badge/milestone-badge';
import { environment } from '../../../environments/environment';
import { ProgressAnalyticCardComponent } from '../../shared/components/organisms/progress-analytic-card/progress-analytic-card';
import { ProgressHistoryComponent } from '../../shared/components/organisms/progress-history/progress-history';

@Component({
  selector: 'app-portal-page',
  standalone: true,
  imports: [
    CommonModule, 
    ButtonComponent, 
    IconComponent, 
    NutriImagePipe, 
    MilestoneBadgeComponent, 
    NgOptimizedImage, 
    DatePipe, 
    ProgressAnalyticCardComponent, 
    ProgressHistoryComponent
  ],
  templateUrl: './portal-page.html',
  styleUrl: './portal-page.css'
})
export class PortalPage implements OnInit {
  private authService = inject(AuthService);
  private patientService = inject(PatientService);
  public themeService = inject(ThemeService);
  private storageService = inject(StorageService);

  patient = signal<Patient | null>(null);
  progress = signal<PatientProgress[]>([]);
  loading = signal<boolean>(true);
  hoveredPoint = signal<number | null>(null);
  showThemeMenu = signal<boolean>(false);

  @HostListener('document:click')
  onDocumentClick() {
    this.showThemeMenu.set(false);
  }

  togglePoint(index: number) {
    if (this.hoveredPoint() === index) {
      this.hoveredPoint.set(null);
    } else {
      this.hoveredPoint.set(index);
    }
  }
  
  shoppingList = signal<ShoppingCategory[]>([]);
  loadingShoppingList = signal<boolean>(false);
  showShoppingModal = signal<boolean>(false);

  hasShoppingError = computed(() => {
    return this.shoppingList().some(cat => cat.category.includes('ERROR'));
  });

  firstName = computed(() => {
    const p = this.patient();
    if (!p || !p.nombre) return 'Usuario';
    return p.nombre.split(' ')[0];
  });

  weightChartData = computed(() => {
    const p = this.progress();
    if (p.length === 0) return [];
    return [...p].reverse().map(entry => ({
      value: Number(entry.weight),
      label: entry.date ? new Date(entry.date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }) : ''
    }));
  });

  isMenuValid = computed(() => {
    const p = this.patient();
    if (!p || !p.menu_url || !p.menu_created_at) return false;
    const createdAt = new Date(p.menu_created_at).getTime();
    const now = Date.now();
    const diffDays = (now - createdAt) / (1000 * 60 * 60 * 24);
    return diffDays <= environment.menuDurationDays;
  });

  expirationMessage = computed(() => {
    const p = this.patient();
    if (!p || !p.menu_url || !p.menu_created_at) return '';
    
    const createdAt = new Date(p.menu_created_at).getTime();
    const durationMs = environment.menuDurationDays * 24 * 60 * 60 * 1000;
    const expiresAt = createdAt + durationMs;
    const now = Date.now();
    const remainingMs = expiresAt - now;

    if (remainingMs <= 0) return 'Expirado';

    const remainingDays = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
    const remainingHours = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (remainingDays >= 1) {
      return `Quedan ${remainingDays} día${remainingDays > 1 ? 's' : ''}${remainingHours > 0 ? ' y ' + remainingHours + ' hora' + (remainingHours > 1 ? 's' : '') : ''}`;
    } else {
      const remainingMinutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
      if (remainingHours > 0) {
        return `Quedan ${remainingHours} hora${remainingHours > 1 ? 's' : ''}${remainingMinutes > 0 ? ' y ' + remainingMinutes + ' min' : ''}`;
      }
      return `Quedan ${remainingMinutes} minuto${remainingMinutes > 1 ? 's' : ''}`;
    }
  });

  menuDurationDays = environment.menuDurationDays;

  openMenu(url?: string) {
    const targetUrl = url || this.patient()?.menu_url;
    if (targetUrl) {
      window.open(targetUrl, '_blank', 'noopener');
    }
  }

  bmi = computed(() => {
    const p = this.patient();
    const prog = this.progress();
    if (!p || !p.estatura) return null;
    
    const weight = prog.length > 0 ? Number(prog[0].weight) : Number(p.peso_habitual || 0);
    let height = Number(p.estatura);
    
    // Auto-detect cm or meters (if > 3 assume it's cm)
    if (height > 3) height = height / 100;
    
    if (!weight || !height || height === 0) return null;
    return (weight / (height * height)).toFixed(1);
  });

  latestProgress = computed(() => this.progress().length > 0 ? this.progress()[0] : null);

  currentGoal = computed(() => this.patient()?.meta_objetivo || null);

  goalPercentage = computed(() => {
    const p = this.patient();
    const history = this.progress();
    const goal = this.currentGoal();
    if (!p || !goal || history.length === 0) return 0;

    const currentRecord = history[0];
    
    let start = 0;
    let current = 0;
    let target = 0;

    switch (goal) {
      case 'bajar_peso':
        const firstWeight = [...history].reverse().find(r => r.weight);
        start = Number(p.peso_habitual || (firstWeight ? firstWeight.weight : 0));
        current = Number(currentRecord.weight || 0);
        target = Number(p.peso_meta || 0);
        break;
      case 'bajar_grasa':
        const firstFat = [...history].reverse().find(r => r.body_fat);
        start = firstFat ? Number(firstFat.body_fat) : Number(currentRecord.body_fat || 0);
        current = Number(currentRecord.body_fat || 0);
        target = Number(p.grasa_meta || 0);
        break;
      case 'subir_musculo':
        const firstMuscle = [...history].reverse().find(r => r.muscle_mass);
        start = firstMuscle ? Number(firstMuscle.muscle_mass) : Number(currentRecord.muscle_mass || 0);
        current = Number(currentRecord.muscle_mass || 0);
        target = Number(p.musculo_meta || 0);
        break;
    }

    if (target === 0 || start === target) return 0;
    
    let progress = 0;
    if (goal === 'subir_musculo') {
      const gainNeeded = target - start;
      if (gainNeeded <= 0) return current >= target ? 100 : 0;
      progress = ((current - start) / gainNeeded) * 100;
    } else {
      const lossNeeded = start - target;
      if (lossNeeded <= 0) return current <= target ? 100 : 0;
      progress = ((start - current) / lossNeeded) * 100;
    }

    return Math.max(0, Math.min(100, Math.round(progress)));
  });

  targetGoalValue = computed(() => {
    const p = this.patient();
    const goal = this.currentGoal();
    if (!p || !goal) return 0;
    if (goal === 'bajar_peso') return Number(p.peso_meta || 0);
    if (goal === 'bajar_grasa') return Number(p.grasa_meta || 0);
    if (goal === 'subir_musculo') return Number(p.musculo_meta || 0);
    return 0;
  });

  goalTargetY = computed(() => {
    const prog = [...this.progress()].reverse();
    const goal = this.currentGoal();
    const target = this.targetGoalValue();
    if (prog.length < 1 || !goal || target === 0) return null;
    
    const values = prog.map(p => {
      if (goal === 'bajar_peso') return Number(p.weight || 0);
      if (goal === 'bajar_grasa') return Number(p.body_fat || 0);
      if (goal === 'subir_musculo') return Number(p.muscle_mass || 0);
      return 0;
    });

    const allValues = [...values, target];
    const minValue = Math.min(...allValues) - 1;
    const maxValue = Math.max(...allValues) + 1;
    const range = maxValue - minValue || 1;
    
    const height = 100;
    return height - ((target - minValue) / range * height);
  });

  goalTrendPath = computed(() => {
    const prog = [...this.progress()].reverse();
    const goal = this.currentGoal();
    const target = this.targetGoalValue();
    if (prog.length < 2 || !goal) return '';
    
    const values = prog.map(p => {
      if (goal === 'bajar_peso') return Number(p.weight || 0);
      if (goal === 'bajar_grasa') return Number(p.body_fat || 0);
      if (goal === 'subir_musculo') return Number(p.muscle_mass || 0);
      return 0;
    });

    const allValues = target > 0 ? [...values, target] : values;
    const minValue = Math.min(...allValues) - 1;
    const maxValue = Math.max(...allValues) + 1;
    const range = maxValue - minValue || 1;
    
    const width = 400;
    const height = 100;
    const stepX = width / (prog.length - 1);
    
    return values.map((val, i) => {
      const x = i * stepX;
      const y = height - ((val - minValue) / range * height);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  });

  chartPoints = computed(() => {
    const prog = [...this.progress()].reverse();
    const goal = this.currentGoal();
    const target = this.targetGoalValue();
    if (prog.length < 1 || !goal) return [];
    
    const values = prog.map(p => {
      if (goal === 'bajar_peso') return Number(p.weight || 0);
      if (goal === 'bajar_grasa') return Number(p.body_fat || 0);
      if (goal === 'subir_musculo') return Number(p.muscle_mass || 0);
      return 0;
    });

    const allValues = target > 0 ? [...values, target] : values;
    const minValue = Math.min(...allValues) - 1;
    const maxValue = Math.max(...allValues) + 1;
    const range = maxValue - minValue || 1;
    
    const width = 400;
    const height = 100;
    const stepX = prog.length > 1 ? width / (prog.length - 1) : width / 2;
    
    return values.map((val, i) => {
      const diff = i > 0 ? val - values[i - 1] : 0;
      let isGood = true;
      if (i > 0) {
        if (goal === 'subir_musculo') {
          isGood = diff >= 0;
        } else {
          isGood = diff <= 0;
        }
      }
      
      const diffText = i > 0 
        ? `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}${goal === 'bajar_grasa' ? '%' : 'kg'}`
        : '';
        
      const tooltipShift = i === 0 ? 35 : (i === prog.length - 1 ? -35 : 0);

      return {
        x: i * stepX,
        y: height - ((val - minValue) / range * height),
        value: val,
        date: prog[i].date,
        unit: goal === 'bajar_grasa' ? '%' : 'kg',
        diff: diffText,
        isGood,
        tooltipShift
      };
    });
  });

  milestones = computed(() => {
    const p = this.patient();
    const goalPct = this.goalPercentage();
    if (!p || !this.currentGoal()) return [];

    return [
      {
        id: '25-percent',
        image: 'images/milestones/star_bronze.png',
        title: 'Primer Paso',
        description: 'Logra el 25% de tu objetivo.',
        unlocked: goalPct >= 25
      },
      {
        id: 'halfway',
        image: 'images/milestones/star_gold.png',
        title: 'A Medio Camino',
        description: 'Logra el 50% de tu objetivo.',
        unlocked: goalPct >= 50
      },
      {
        id: 'goal-reached',
        image: 'images/milestones/star_diamond.png',
        title: 'Meta Lograda',
        description: 'Alcanza el 100% de tu objetivo.',
        unlocked: goalPct >= 100
      }
    ];
  });

  async ngOnInit() {
    const user = this.authService.user;
    if (user && user.email) {
      const userEmail = user.email.toLowerCase();
      try {
        // Cargar datos del paciente de forma directa y segura
        const currentPatient = await this.patientService.getPatientByEmail(userEmail);
        if (currentPatient) {
          this.patient.set(currentPatient);
          // Cargar historial
          const history = await this.patientService.getPatientProgress(userEmail);
          this.progress.set(history);

          // Cargar lista de súper desde caché si existe
          this.loadShoppingListFromCache(currentPatient);
        }
      } catch (err) {
        console.error('Error loading portal data', err);
      } finally {
        this.loading.set(false);
      }
    }
  }

  logout() {
    this.authService.logout();
  }

  async openShoppingList() {
    this.showShoppingModal.set(true);
    if (this.shoppingList().length === 0 || this.hasShoppingError()) {
      const p = this.patient();
      if (p) this.loadShoppingListFromCache(p);
      
      // Si después de intentar cargar del caché sigue vacía o tiene error, pedimos a la IA
      if (this.shoppingList().length === 0 || this.hasShoppingError()) {
        await this.fetchShoppingList();
      }
    }
  }

  loadShoppingListFromCache(p: Patient) {
    const cacheKey = `nutri_shop_list_${p.email}_${p.menu_created_at}`;
    const cached = this.storageService.getItem<ShoppingCategory[]>(cacheKey);
    // Solo cargamos la caché si no es una lista que represente un error
    if (cached && !cached.some(cat => cat.category.includes('ERROR'))) {
      this.shoppingList.set(cached);
      console.log('Shopping list loaded from cache');
    }
  }

  async fetchShoppingList() {
    const p = this.patient();
    if (!p || !p.menu_url) return;
    
    this.loadingShoppingList.set(true);
    try {
      const list = await this.patientService.getShoppingList(p.menu_url);
      
      // Persistencia: Guardar marcados vinculados al email y fecha del menú
      const storageKey = `nutri_shop_${p.email}_${p.menu_created_at}`;
      const savedChecked = this.storageService.getItem<string[]>(storageKey) || [];
      
      const enrichedList: ShoppingCategory[] = list.map((cat: any) => ({
        ...cat,
        items: cat.items.map((item: any) => ({
          ...item,
          checked: savedChecked.includes(`${cat.category}-${item.name}`)
        }))
      }));
      
      this.shoppingList.set(enrichedList);
      
      // Guardar lista completa en caché únicamente si no contiene errores
      const hasError = enrichedList.some(cat => cat.category.includes('ERROR'));
      if (!hasError) {
        const cacheKey = `nutri_shop_list_${p.email}_${p.menu_created_at}`;
        this.storageService.setItem(cacheKey, enrichedList);
      }
    } catch (err) {
      console.error('Error fetching shopping list', err);
      this.shoppingList.set([
        {
          category: '⚠️ ERROR AL GENERAR',
          items: [{ icon: '❌', name: 'No se pudo conectar con Gemini', amount: '-', tip: 'El límite de cuotas de la API Key se ha agotado o hay problemas de red. Intenta de nuevo.', brand: '-' }]
        }
      ]);
    } finally {
      this.loadingShoppingList.set(false);
    }
  }

  async retryShoppingList() {
    this.shoppingList.set([]);
    await this.fetchShoppingList();
  }

  toggleShoppingItem(category: string, item: ShoppingItem) {
    const p = this.patient();
    if (!p) return;

    const current = this.shoppingList();
    const updated = current.map(cat => {
      if (cat.category === category) {
        return {
          ...cat,
          items: cat.items.map((i: ShoppingItem) => i === item ? { ...i, checked: !i.checked } : i)
        };
      }
      return cat;
    });
    this.shoppingList.set(updated);
    
    // Save checked state
    const storageKey = `nutri_shop_${p.email}_${p.menu_created_at}`;
    const allChecked = updated.flatMap(cat => 
      cat.items.filter((i: ShoppingItem) => i.checked).map((i: ShoppingItem) => `${cat.category}-${i.name}`)
    );
    this.storageService.setItem(storageKey, allChecked);

    // Update full list cache
    const cacheKey = `nutri_shop_list_${p.email}_${p.menu_created_at}`;
    this.storageService.setItem(cacheKey, updated);
  }

  closeShoppingModal() {
    this.showShoppingModal.set(false);
  }
}
