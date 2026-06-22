import { Component, OnInit, OnDestroy, inject, signal, computed, HostListener, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DatePipe, NgOptimizedImage } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';
import { AuthService } from '../../services/auth.service';
import { PatientService } from '../../services/patient';
import { Title } from '@angular/platform-browser';
import { Patient, PatientProgress, ShoppingCategory, ShoppingItem } from '@shared/models/interfaces';
import { ButtonComponent } from '../../shared/components/atoms/button/button';
import { IconComponent } from '../../shared/components/atoms/icon/icon';
import { ThemeService } from '../../shared/services/theme.service';
import { StorageService } from '../../shared/services/storage.service';
import { PushNotificationService } from '../../shared/services/push-notification.service';
import { AppointmentService, Appointment } from '../../services/appointment.service';
import { AnalyticsService } from '../../shared/services/analytics.service';
import { ToastService } from '../../shared/services/toast.service';

import { NutriImagePipe } from '../../shared/pipes/nutri-image.pipe';
import { MilestoneBadgeComponent } from '../../shared/components/molecules/milestone-badge/milestone-badge';
import { environment } from '../../../environments/environment';
import { ProgressAnalyticCardComponent } from '../../shared/components/organisms/progress-analytic-card/progress-analytic-card';
import { ProgressHistoryComponent } from '../../shared/components/organisms/progress-history/progress-history';
import confetti from 'canvas-confetti';

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
  styleUrl: './portal-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('tabAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(6px)' }),
        animate('220ms cubic-bezier(0.2, 0.8, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class PortalPage implements OnInit, OnDestroy {
  sidebarCollapsed = signal<boolean>(false);
  private lastFocusTime = Date.now();
  private focusListener?: () => void;
  private visibilityListener?: () => void;
  private authService = inject(AuthService);
  private patientService = inject(PatientService);
  public themeService = inject(ThemeService);
  private storageService = inject(StorageService);
  private pushService = inject(PushNotificationService);
  private appointmentService = inject(AppointmentService);
  private titleService = inject(Title);
  private analytics = inject(AnalyticsService);
  private toastService = inject(ToastService);

  patient = signal<Patient | null>(null);
  nextAppointment = signal<Appointment | null>(null);
  loadingAppointmentAction = signal<boolean>(false);
  progress = signal<PatientProgress[]>([]);
  loading = signal<boolean>(true);
  hoveredPoint = signal<{ index: number; key: 'weight' | 'fat' | 'muscle' } | null>(null);
  showThemeMenu = signal<boolean>(false);
  showHabitsFloatingModal = signal<boolean>(false);
  showCancelConfirmModal = signal<boolean>(false);
  activeCelebration = signal<any | null>(null);
  activeMetrics = signal<{ weight: boolean; fat: boolean; muscle: boolean }>({
    weight: false,
    fat: false,
    muscle: false
  });
  activeTab = signal<'dashboard' | 'plan' | 'analysis' | 'history' | 'resources'>('plan');

  limitRecords = signal<number>(5);
  filterMonth = signal<string>('all');


  dailyHabits = signal<{ water: boolean; activity: boolean; diet: boolean; sleep: boolean }>({
    water: false,
    activity: false,
    diet: false,
    sleep: false
  });

  habitsPercentage = computed(() => {
    const habits = this.dailyHabits();
    let count = 0;
    if (habits.water) count++;
    if (habits.activity) count++;
    if (habits.diet) count++;
    if (habits.sleep) count++;
    return Math.round((count / 4) * 100);
  });

  @HostListener('document:click')
  onDocumentClick() {
    this.showThemeMenu.set(false);
    this.showHabitsFloatingModal.set(false);
  }

  private swipeStartX = 0;
  private swipeStartY = 0;
  private touchStartY = 0;
  private isPulling = false;
  public pullDistance = signal<number>(0);
  public isRefreshing = signal<boolean>(false);

  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent) {
    this.swipeStartX = event.touches[0].clientX;
    this.swipeStartY = event.touches[0].clientY;

    if (window.scrollY === 0 && !this.isRefreshing()) {
      this.touchStartY = event.touches[0].clientY;
      this.isPulling = true;
    }
  }

  @HostListener('touchmove', ['$event'])
  onTouchMove(event: TouchEvent) {
    if (!this.isPulling) return;
    const currentY = event.touches[0].clientY;
    const diff = currentY - this.touchStartY;
    if (diff > 0) {
      // Pulling down
      const distance = Math.min(100, diff * 0.4); // Dampen distance
      this.pullDistance.set(distance);
      if (distance > 15) {
        if (event.cancelable) {
          event.preventDefault();
        }
      }
    }
  }

  @HostListener('touchend', ['$event'])
  async onTouchEnd(event: TouchEvent) {
    // 1. Handle Swipe navigation
    const diffX = event.changedTouches[0].clientX - this.swipeStartX;
    const diffY = event.changedTouches[0].clientY - this.swipeStartY;

    if (Math.abs(diffX) > 100 && Math.abs(diffY) < 60) {
      const tabs: ('dashboard' | 'plan' | 'analysis' | 'history' | 'resources')[] = ['plan', 'dashboard', 'resources', 'analysis', 'history'];
      const currentIdx = tabs.indexOf(this.activeTab());
      
      if (diffX > 0 && currentIdx > 0) {
        this.setActiveTab(tabs[currentIdx - 1]);
        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate(15);
        }
      } else if (diffX < 0 && currentIdx < tabs.length - 1) {
        this.setActiveTab(tabs[currentIdx + 1]);
        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate(15);
        }
      }
    }

    // 2. Handle Pull to Refresh
    if (this.isPulling) {
      this.isPulling = false;
      const distance = this.pullDistance();
      if (distance >= 35) {
        this.isRefreshing.set(true);
        this.pullDistance.set(40); // hold spinner
        try {
          await this.ngOnInit();
          if (typeof window !== 'undefined' && 'vibrate' in navigator) {
            navigator.vibrate(30);
          }
        } catch (err) {
          console.error('Pull to refresh failed:', err);
        } finally {
          this.isRefreshing.set(false);
          this.pullDistance.set(0);
        }
      } else {
        this.pullDistance.set(0);
      }
    }
  }

  setActiveTab(tab: 'dashboard' | 'plan' | 'analysis' | 'history' | 'resources') {
    this.activeTab.set(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  togglePoint(index: number, key: 'weight' | 'fat' | 'muscle') {
    const cur = this.hoveredPoint();
    if (cur && cur.index === index && cur.key === key) {
      this.hoveredPoint.set(null);
    } else {
      this.hoveredPoint.set({ index, key });
    }
  }

  toggleMetric(key: 'weight' | 'fat' | 'muscle') {
    const current = this.activeMetrics();
    const activeCount = (current.weight ? 1 : 0) + (current.fat ? 1 : 0) + (current.muscle ? 1 : 0);
    if (current[key] && activeCount === 1) {
      return;
    }
    this.activeMetrics.set({
      ...current,
      [key]: !current[key]
    });
  }

  onMonthChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.filterMonth.set(target.value);
  }

  
  shoppingList = signal<ShoppingCategory[]>([]);
  loadingShoppingList = signal<boolean>(false);
  showShoppingModal = signal<boolean>(false);
  shoppingListProgress = signal<number>(0);
  shoppingListLoadingMessage = signal<string>('Detectando ingredientes...');

  hasShoppingError = computed(() => {
    return this.shoppingList().some(cat => cat.category.includes('ERROR'));
  });

  getActiveMenu = computed(() => {
    const p = this.patient();
    if (!p) return null;
    const currentMenu = p.current_menus && p.current_menus.length > 0 ? p.current_menus[0] : null;
    return {
      url: currentMenu ? currentMenu.url : p.menu_url,
      created_at: currentMenu ? currentMenu.uploaded_at : p.menu_created_at
    };
  });

  firstName = computed(() => {
    const p = this.patient();
    if (!p || !p.nombre) return 'Usuario';
    return p.nombre.split(' ')[0];
  });

  toNumber(val: any): number {
    return Number(val);
  }

  welcomeMessage = computed(() => {
    const hours = new Date().getHours();
    const name = this.firstName();
    let greeting = 'Hola';
    
    if (hours < 12) {
      greeting = 'Buenos días';
    } else if (hours < 19) {
      greeting = 'Buenas tardes';
    } else {
      greeting = 'Buenas noches';
    }
    
    return `¡${greeting}, ${name}!`;
  });

  goalSubtitle = computed(() => {
    const goal = this.currentGoal();
    switch (goal) {
      case 'bajar_peso':
        return 'Paso a paso hacia una versión más ligera, ágil y saludable.';
      case 'bajar_grasa':
        return 'Enfoque en tu composición corporal, definición y bienestar.';
      case 'subir_musculo':
        return 'Construyendo fuerza, masa muscular y vitalidad hoy.';
      default:
        return 'En camino hacia tu mejor versión y bienestar integral.';
    }
  });

  preferredFoods = computed(() => {
    const foods = this.patient()?.alimentos_preferidos;
    if (!foods) return [];
    return foods.split(',').map(f => f.trim()).filter(Boolean);
  });

  dislikedFoods = computed(() => {
    const foods = this.patient()?.alimentos_no_agradan;
    if (!foods) return [];
    return foods.split(',').map(f => f.trim()).filter(Boolean);
  });

  allergies = computed(() => {
    const algs = this.patient()?.alergias_alimentarias;
    if (!algs) return [];
    return algs.split(',').map(a => a.trim()).filter(Boolean);
  });

  supplements = computed(() => {
    const hasSuplements = this.patient()?.suplementos_si_no === 'si';
    const sups = this.patient()?.suplementos_cuales;
    if (!hasSuplements || !sups) return [];
    return sups.split(',').map(s => s.trim()).filter(Boolean);
  });

  weightChartData = computed(() => {
    const p = this.progress();
    if (p.length === 0) return [];
    return [...p].reverse().map(entry => ({
      value: Number(entry.weight),
      label: entry.date ? new Date(entry.date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }) : ''
    }));
  });

  availableMonths = computed(() => {
    const list = this.progress();
    const months = new Set<string>();
    list.forEach(entry => {
      if (entry.date) {
        const yyyymm = entry.date.substring(0, 7);
        months.add(yyyymm);
      }
    });
    return Array.from(months).sort().reverse().map(yyyymm => {
      const [year, month] = yyyymm.split('-');
      const date = new Date(Number(year), Number(month) - 1, 1);
      const name = date.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
      const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
      return {
        value: yyyymm,
        label: capitalized
      };
    });
  });

  filteredProgress = computed(() => {
    let list = this.progress();
    const selectedMonth = this.filterMonth();
    if (selectedMonth !== 'all') {
      list = list.filter(entry => entry.date && entry.date.startsWith(selectedMonth));
    }
    const limit = this.limitRecords();
    list = list.slice(0, limit);
    return [...list].reverse();
  });


  isMenuValid = computed(() => {
    const menu = this.getActiveMenu();
    if (!menu || !menu.url || !menu.created_at) return false;
    const createdAt = new Date(menu.created_at).getTime();
    const now = Date.now();
    const diffDays = (now - createdAt) / (1000 * 60 * 60 * 24);
    return diffDays <= environment.menuDurationDays;
  });

  expirationMessage = computed(() => {
    const menu = this.getActiveMenu();
    if (!menu || !menu.url || !menu.created_at) return '';
    
    const createdAt = new Date(menu.created_at).getTime();
    const durationMs = environment.menuDurationDays * 24 * 60 * 60 * 1000;
    const expiresAt = createdAt + durationMs;
    const now = Date.now();
    const remainingMs = expiresAt - now;

    if (remainingMs <= 0) return 'Expirado';

    const remainingDays = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
    const remainingHours = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (remainingDays >= 1) {
      return `Tiempo para ver tu menú: ${remainingDays} día${remainingDays > 1 ? 's' : ''}${remainingHours > 0 ? ' y ' + remainingHours + ' hora' + (remainingHours > 1 ? 's' : '') : ''}`;
    } else {
      const remainingMinutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
      if (remainingHours > 0) {
        return `Tiempo para ver tu menú: ${remainingHours} hora${remainingHours > 1 ? 's' : ''}${remainingMinutes > 0 ? ' y ' + remainingMinutes + ' min' : ''}`;
      }
      return `Tiempo para ver tu menú: ${remainingMinutes} minuto${remainingMinutes > 1 ? 's' : ''}`;
    }
  });

  menuDurationDays = environment.menuDurationDays;

  openMenu(url?: string) {
    const targetUrl = url || this.getActiveMenu()?.url;
    if (targetUrl) {
      window.open(targetUrl, '_blank', 'noopener');
    }
  }

  getHabitsStorageKey(): string {
    const user = this.authService.user;
    if (!user || !user.email) return '';
    const email = user.email.toLowerCase();
    const todayStr = new Date().toLocaleDateString('sv'); // YYYY-MM-DD in local time
    return `nutri_habits_${email}_${todayStr}`;
  }

  loadDailyHabits() {
    const key = this.getHabitsStorageKey();
    if (!key) return;
    const saved = this.storageService.getItem<{ water: boolean; activity: boolean; diet: boolean; sleep: boolean }>(key);
    if (saved) {
      this.dailyHabits.set(saved);
    } else {
      this.dailyHabits.set({ water: false, activity: false, diet: false, sleep: false });
    }
  }

  toggleHabit(habitKey: 'water' | 'activity' | 'diet' | 'sleep') {
    const key = this.getHabitsStorageKey();
    if (!key) return;
    const current = this.dailyHabits();
    const updated = {
      ...current,
      [habitKey]: !current[habitKey]
    };
    this.dailyHabits.set(updated);
    this.storageService.setItem(key, updated);

    const user = this.authService.user;
    this.analytics.logEvent('toggle_habit', {
      patient_email: user?.email,
      habit_key: habitKey,
      completed: updated[habitKey]
    });

    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(30);
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

  bmiPosition = computed(() => {
    const val = Number(this.bmi());
    if (!val) return 0;
    const min = 15;
    const max = 35;
    const pct = ((val - min) / (max - min)) * 100;
    return Math.max(0, Math.min(100, Math.round(pct)));
  });

  bmiCategory = computed(() => {
    const val = Number(this.bmi());
    if (!val) return '';
    if (val < 18.5) return 'Bajo peso';
    if (val < 25.0) return 'Normal';
    if (val < 30.0) return 'Sobrepeso';
    return 'Obesidad';
  });

  bmiColorClass = computed(() => {
    const val = Number(this.bmi());
    if (!val) return 'text-slate-400';
    if (val < 18.5) return 'text-sky-500 dark:text-sky-400'; // Bajo Peso
    if (val < 25.0) return 'text-emerald-500 dark:text-emerald-400'; // Normal
    if (val < 30.0) return 'text-amber-500 dark:text-amber-400'; // Sobrepeso
    return 'text-rose-500 dark:text-rose-400'; // Obesidad
  });

  weightDiff = computed(() => {
    const history = this.progress();
    if (history.length < 2) return null;
    const current = Number(history[0].weight || 0);
    const prev = Number(history[1].weight || 0);
    const diff = current - prev;
    return {
      value: Math.abs(diff).toFixed(1),
      isIncrease: diff > 0,
      text: diff > 0 ? `+${diff.toFixed(1)} kg` : `${diff.toFixed(1)} kg`
    };
  });

  fatDiff = computed(() => {
    const history = this.progress();
    if (history.length < 2) return null;
    const current = Number(history[0].body_fat || 0);
    const prev = Number(history[1].body_fat || 0);
    if (!current || !prev) return null;
    const diff = current - prev;
    return {
      value: Math.abs(diff).toFixed(1),
      isIncrease: diff > 0,
      text: diff > 0 ? `+${diff.toFixed(1)}%` : `${diff.toFixed(1)}%`
    };
  });

  muscleDiff = computed(() => {
    const history = this.progress();
    if (history.length < 2) return null;
    const current = Number(history[0].muscle_mass || 0);
    const prev = Number(history[1].muscle_mass || 0);
    if (!current || !prev) return null;
    const diff = current - prev;
    return {
      value: Math.abs(diff).toFixed(1),
      isIncrease: diff > 0,
      text: diff > 0 ? `+${diff.toFixed(1)} kg` : `${diff.toFixed(1)} kg`
    };
  });

  latestProgress = computed(() => this.progress().length > 0 ? this.progress()[0] : null);

  rescheduleWhatsappUrl = computed(() => {
    const apt = this.nextAppointment();
    const dateStr = apt?.start 
      ? new Date(apt.start).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' }) 
      : '';
    const message = encodeURIComponent(`Hola, tengo un contratiempo y me gustaría reagendar mi cita del ${dateStr}.`);
    return `https://wa.me/526143958598?text=${message}`;
  });

  appointmentDateStr = computed(() => {
    const apt = this.nextAppointment();
    if (!apt || !apt.start) return '';
    const date = new Date(apt.start);
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    };
    let formattedDate = date.toLocaleDateString('es-MX', options);
    // Capitalize first letter
    formattedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
    
    // Get time: e.g. "4:30 PM"
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    const timeStr = `${hours}:${minutesStr} ${ampm}`;

    return `${formattedDate} a las ${timeStr}`;
  });

  showConfirmButtons = computed(() => {
    const apt = this.nextAppointment();
    if (!apt || !apt.start || apt.status !== 'pending') return false;
    
    const start = new Date(apt.start);
    const now = new Date();
    
    const startZero = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const nowZero = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffDays = (startZero.getTime() - nowZero.getTime()) / (24 * 60 * 60 * 1000);

    // Standard: today or tomorrow
    if (diffDays <= 1) {
      return true;
    }
    
    // Weekend exception: If today is Saturday (6) and appointment is Monday (diffDays === 2)
    const todayDay = now.getDay();
    if (todayDay === 6 && diffDays === 2) {
      return true;
    }
    
    return false;
  });

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

  activeLines = computed(() => {
    const prog = this.filteredProgress();
    const patient = this.patient();
    const active = this.activeMetrics();
    if (prog.length < 1 || !patient) return [];

    const lines: any[] = [];

    // Helper to scale values relative to min/max of the specific metric
    const getScale = (values: number[], target: number | null) => {
      const allValues = target !== null && target > 0 ? [...values, target] : values;
      const minValue = Math.min(...allValues) - 1;
      const maxValue = Math.max(...allValues) + 1;
      const range = maxValue - minValue || 1;
      return { minValue, maxValue, range };
    };

    const width = 400;
    const height = 100;
    const stepX = prog.length > 1 ? width / (prog.length - 1) : width / 2;

    const createLineData = (
      key: 'weight' | 'fat' | 'muscle',
      label: string,
      unit: string,
      color: string,
      targetColor: string,
      values: number[],
      target: number | null,
      isGoodFn: (diff: number) => boolean
    ) => {
      const { minValue, range } = getScale(values, target);
      
      const points = values.map((val, i) => {
        const diff = i > 0 ? val - values[i - 1] : 0;
        const isGood = i > 0 ? isGoodFn(diff) : true;
        const diffText = i > 0 
          ? `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}${unit}`
          : '';
        const tooltipShift = i === 0 ? 35 : (i === prog.length - 1 ? -35 : 0);
        const y = height - ((val - minValue) / range * height);
        return {
          x: i * stepX,
          y,
          value: val,
          date: prog[i].date,
          unit,
          diff: diffText,
          isGood,
          tooltipShift
        };
      });

      const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
      const targetY = target !== null && target > 0 ? height - ((target - minValue) / range * height) : null;

      return {
        key,
        label,
        unit,
        color,
        targetColor,
        points,
        path,
        targetY,
        targetValue: target
      };
    };

    // 1. Weight Line
    if (active.weight) {
      const values = prog.map(p => Number(p.weight || 0));
      const target = this.currentGoal() === 'bajar_peso' ? Number(patient.peso_meta || 0) : null;
      lines.push(
        createLineData(
          'weight',
          'Peso',
          'kg',
          '#6366F1', // Indigo
          '#818CF8', // Indigo light
          values,
          target,
          (diff) => diff <= 0 // Bajar peso is good
        )
      );
    }

    // 2. Fat Line
    if (active.fat) {
      const values = prog.map(p => Number(p.body_fat || 0));
      const target = this.currentGoal() === 'bajar_grasa' ? Number(patient.grasa_meta || 0) : null;
      lines.push(
        createLineData(
          'fat',
          'Grasa',
          '%',
          '#F59E0B', // Amber
          '#FBBF24', // Amber light
          values,
          target,
          (diff) => diff <= 0 // Bajar grasa is good
        )
      );
    }

    // 3. Muscle Line
    if (active.muscle) {
      const values = prog.map(p => Number(p.muscle_mass || 0));
      const target = this.currentGoal() === 'subir_musculo' ? Number(patient.musculo_meta || 0) : null;
      lines.push(
        createLineData(
          'muscle',
          'M. Esquelético',
          'kg',
          '#D81B60', // Rose
          '#E91E63', // Rose light
          values,
          target,
          (diff) => diff >= 0 // Subir musculo is good
        )
      );
    }

    return lines;
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

  async loadPortalData(userEmail: string, forceRefresh = false) {
    try {
      // Cargar datos en paralelo para evitar waterfall
      const [currentPatient, history, apt] = await Promise.all([
        this.patientService.getPatientByEmail(userEmail, forceRefresh),
        this.patientService.getPatientProgress(userEmail, forceRefresh),
        this.appointmentService.getNextAppointment(userEmail).catch(err => {
          console.error('Error loading next appointment:', err);
          return null;
        })
      ]);

      if (currentPatient) {
        const oldPatient = this.patient();
        const menuChanged = oldPatient && (
          oldPatient.menu_url !== currentPatient.menu_url || 
          oldPatient.menu_created_at !== currentPatient.menu_created_at
        );

        this.patient.set(currentPatient);
        this.titleService.setTitle(`Portal de ${currentPatient.nombre} - Nutrilev`);
        this.progress.set(history || []);

        if (apt && apt.hasAppointment) {
          this.nextAppointment.set(apt);
        } else {
          this.nextAppointment.set(null);
        }

        // Inicializar métricas activas según el objetivo principal
        const goal = currentPatient.meta_objetivo;
        this.activeMetrics.set({
          weight: goal === 'bajar_peso' || !goal,
          fat: goal === 'bajar_grasa',
          muscle: goal === 'subir_musculo'
        });

        // Cargar o reiniciar la lista de súper según corresponda
        if (menuChanged) {
          console.log('PWA: Menu changed! Resetting shopping list signal...');
          this.shoppingList.set([]);
          this.loadShoppingListFromCache(currentPatient);
        } else if (!oldPatient) {
          // Carga inicial
          this.loadShoppingListFromCache(currentPatient);
        }

        // Cargar hábitos diarios
        this.loadDailyHabits();

        // Verificar si hay nuevos logros para celebrar
        setTimeout(() => {
          this.checkNewMilestones();
        }, 1000);
      }
    } catch (err) {
      console.error('Error loading portal data', err);
    }
  }

  checkNewMilestones() {
    const list = this.milestones();
    if (list.length === 0) return;

    // Cargar logros ya celebrados de localStorage
    let celebrated: string[] = [];
    try {
      const stored = localStorage.getItem('celebrated_milestones');
      if (stored) {
        celebrated = JSON.parse(stored);
      }
    } catch (e) {
      console.error('Error parsing celebrated_milestones', e);
    }

    // Buscar el primer logro desbloqueado que no haya sido celebrado
    const toCelebrate = list.find(ms => ms.unlocked && !celebrated.includes(ms.id));
    if (toCelebrate) {
      // Lanzar celebración modal
      this.activeCelebration.set(toCelebrate);
      
      // Guardar inmediatamente en celebrados para no volver a repetirse
      celebrated.push(toCelebrate.id);
      localStorage.setItem('celebrated_milestones', JSON.stringify(celebrated));
      
      // Detonar confeti premium
      this.triggerCelebrationConfetti(toCelebrate.id);
    }
  }

  triggerCelebrationConfetti(id: string) {
    let colors = ['#D81B60', '#F5B041', '#4FACFE'];
    if (id === '25-percent') colors = ['#CD7F32', '#E5A97C', '#9C5D30'];
    else if (id === 'halfway') colors = ['#F5B041', '#FCE068', '#C0392B'];
    else if (id === 'goal-reached') colors = ['#00F2FE', '#4FACFE', '#E0C3FC'];

    const duration = 2.5 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 6,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.8 },
        colors: colors,
        zIndex: 9999
      });
      confetti({
        particleCount: 6,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.8 },
        colors: colors,
        zIndex: 9999
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }

  openMilestoneModal(ms: any) {
    if (!ms.unlocked) return;
    this.activeCelebration.set(ms);
    this.triggerCelebrationConfetti(ms.id);
  }

  getCelebrationMessage(id: string): string {
    switch (id) {
      case '25-percent':
        return '¡Excelente inicio! Has alcanzado el primer cuarto de tu camino. Tus hábitos están cambiando positivamente y vas con paso firme hacia tu meta de bienestar.';
      case 'halfway':
        return '¡Hito increíble! Estás a la mitad del camino de tu meta. Tu perseverancia y constancia están dando frutos extraordinarios. ¡Sigue así!';
      case 'goal-reached':
        return '¡META CUMPLIDA! Has alcanzado el 100% de tu objetivo. Tu disciplina es admirable y has transformado tu calidad de vida. ¡Muchísimas felicidades!';
      default:
        return 'Sigue sumando logros en tu plan nutricional para alcanzar tus objetivos.';
    }
  }

  async ngOnInit() {
    const user = this.authService.user;
    if (user && user.email) {
      const userEmail = user.email.toLowerCase();
      try {
        await this.loadPortalData(userEmail, true); // Force fresh load on initialization

        // Solicitar suscripción de notificaciones push
        this.pushService.requestSubscription(userEmail);

        // Verificar si hay alguna acción desde notificaciones en la URL
        this.handleUrlActions();

        // Listen for visibility and focus events to refresh data if user resumes PWA
        if (typeof window !== 'undefined') {
          this.focusListener = () => this.refreshDataIfVisible(userEmail);
          this.visibilityListener = () => this.refreshDataIfVisible(userEmail);

          window.addEventListener('focus', this.focusListener);
          document.addEventListener('visibilitychange', this.visibilityListener);
        }
      } catch (err) {
        console.error('Error in ngOnInit:', err);
      } finally {
        this.loading.set(false);
      }
    }
  }

  refreshDataIfVisible(userEmail: string) {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      const now = Date.now();
      // Refrescar al menos cada 15 segundos si se enfoca el PWA
      if (now - this.lastFocusTime > 15000) {
        this.lastFocusTime = now;
        console.log('PWA focused/visible: Refreshing portal data from backend...');
        this.loadPortalData(userEmail, true);
      }
    }
  }

  ngOnDestroy() {
    if (typeof window !== 'undefined') {
      if (this.focusListener) {
        window.removeEventListener('focus', this.focusListener);
      }
      if (this.visibilityListener) {
        document.removeEventListener('visibilitychange', this.visibilityListener);
      }
    }
  }

  async handleUrlActions() {
    try {
      const params = new URLSearchParams(window.location.search);
      const action = params.get('action');
      const id = params.get('id');
      const tab = params.get('tab');

      if (tab && ['dashboard', 'plan', 'analysis', 'history'].includes(tab)) {
        console.log(`PWA: Navigating to tab ${tab} via shortcut/URL param...`);
        this.setActiveTab(tab as any);
      }

      if (action && id) {
        const apt = this.nextAppointment();
        if (!apt || apt.eventId !== id) {
          console.warn('Notification action eventId mismatch or no appointment found.', { action, id, aptId: apt?.eventId });
          return;
        }

        if (action === 'confirm') {
          console.log('Automatically confirming appointment via notification action...');
          await this.confirmAppointment();
        } else if (action === 'cancel') {
          console.log('Automatically opening cancel confirmation modal via notification action...');
          this.cancelAppointment();
        }
      }

      // Clean query parameters from URL so refreshes don't re-trigger the action
      if (action || id || tab) {
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    } catch (err) {
      console.error('Error handling URL notification action:', err);
    }
  }

  async loadNextAppointment(email: string) {
    try {
      const apt = await this.appointmentService.getNextAppointment(email);
      if (apt && apt.hasAppointment) {
        this.nextAppointment.set(apt);
      } else {
        this.nextAppointment.set(null);
      }
    } catch (err) {
      console.error('Error loading next appointment:', err);
    }
  }

  async confirmAppointment() {
    const apt = this.nextAppointment();
    const p = this.patient();
    if (!apt || !apt.eventId || !p || !p.email) return;

    this.loadingAppointmentAction.set(true);
    try {
      const res = await this.appointmentService.confirmAppointment(p.email, apt.eventId);
      if (res && res.success) {
        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate([40, 45, 40]); // Double micro-vibration
        }
        this.nextAppointment.set({
          ...apt,
          status: 'confirmed',
          colorId: res.colorId || '10'
        });
      }
    } catch (err) {
      console.error('Error confirming appointment:', err);
    } finally {
      this.loadingAppointmentAction.set(false);
    }
  }

  cancelAppointment() {
    this.showCancelConfirmModal.set(true);
  }

  async confirmCancelAppointment() {
    const apt = this.nextAppointment();
    const p = this.patient();
    if (!apt || !apt.eventId || !p || !p.email) return;

    this.showCancelConfirmModal.set(false);
    this.loadingAppointmentAction.set(true);
    try {
      const res = await this.appointmentService.cancelAppointment(p.email, apt.eventId);
      if (res && res.success) {
        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate(60); // Single longer alert-like vibration
        }
        this.nextAppointment.set({
          ...apt,
          status: 'cancelled',
          colorId: '11'
        });
      }
    } catch (err) {
      console.error('Error cancelling appointment:', err);
    } finally {
      this.loadingAppointmentAction.set(false);
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
    const menu = this.getActiveMenu();
    if (!menu || !menu.created_at) return;
    const cacheKey = `nutri_shop_list_${p.email}_${menu.created_at}`;
    const cached = this.storageService.getItem<ShoppingCategory[]>(cacheKey);
    // Solo cargamos la caché si no es una lista que represente un error
    if (cached && !cached.some(cat => cat.category.includes('ERROR'))) {
      this.shoppingList.set(cached);
      console.log('Shopping list loaded from cache');
    }
  }

  async fetchShoppingList() {
    const p = this.patient();
    const menu = this.getActiveMenu();
    if (!p || !menu || !menu.url) return;
    
    this.loadingShoppingList.set(true);
    this.shoppingListProgress.set(0);
    this.shoppingListLoadingMessage.set('Iniciando lectura de tu plan...');
    
    let currentProgress = 0;
    const updateProgressMessage = (pct: number) => {
      if (pct < 15) {
        this.shoppingListLoadingMessage.set('Leyendo archivo PDF del plan alimenticio...');
      } else if (pct < 35) {
        this.shoppingListLoadingMessage.set('Detectando comidas e ingredientes...');
      } else if (pct < 55) {
        this.shoppingListLoadingMessage.set('Clasificando ingredientes en categorías...');
      } else if (pct < 75) {
        this.shoppingListLoadingMessage.set('Procesando con Inteligencia Artificial...');
      } else if (pct < 90) {
        this.shoppingListLoadingMessage.set('Generando tips de marcas y cantidades...');
      } else {
        this.shoppingListLoadingMessage.set('Casi listo, ordenando tu lista final...');
      }
    };

    // Simulate smooth progress over time, decelerating as it approaches 95%
    const progressInterval = setInterval(() => {
      if (currentProgress < 95) {
        let increment = 1.8; // Starts relatively fast
        if (currentProgress >= 40 && currentProgress < 75) {
          increment = 0.9;   // Slows down in the middle
        } else if (currentProgress >= 75) {
          increment = 0.3;   // Very slow near the end
        }
        
        currentProgress = Math.min(95, currentProgress + increment);
        const roundedProgress = Math.round(currentProgress);
        this.shoppingListProgress.set(roundedProgress);
        updateProgressMessage(roundedProgress);
      }
    }, 1000);

    try {
      const list = await this.patientService.getShoppingList(menu.url);
      
      // Stop simulator, set immediately to 100%
      clearInterval(progressInterval);
      this.shoppingListProgress.set(100);
      this.shoppingListLoadingMessage.set('¡Lista generada con éxito!');

      // Analytics
      this.analytics.logEvent('generate_shopping_list', {
        patient_email: p.email,
        patient_name: p.nombre,
        items_count: list.reduce((acc: number, c: any) => acc + (c.items ? c.items.length : 0), 0)
      });
      
      // Persistencia: Guardar marcados vinculados al email y fecha del menú
      const storageKey = `nutri_shop_${p.email}_${menu.created_at}`;
      const savedChecked = this.storageService.getItem<string[]>(storageKey) || [];
      
      const enrichedList: ShoppingCategory[] = list.map((cat: any) => ({
        ...cat,
        items: cat.items.map((item: any) => ({
          ...item,
          checked: savedChecked.includes(`${cat.category}-${item.name}`)
        }))
      }));
      
      // Wait briefly (600ms) for the user to see the 100% completion before rendering
      await new Promise(resolve => setTimeout(resolve, 600));
      
      this.shoppingList.set(enrichedList);
      
      // Guardar lista completa en caché únicamente si no contiene errores
      const hasError = enrichedList.some(cat => cat.category.includes('ERROR'));
      if (!hasError) {
        const cacheKey = `nutri_shop_list_${p.email}_${menu.created_at}`;
        this.storageService.setItem(cacheKey, enrichedList);
      }
    } catch (err) {
      clearInterval(progressInterval);
      console.error('Error fetching shopping list', err);
      this.shoppingListProgress.set(0);
      this.shoppingList.set([
        {
          category: '⚠️ ERROR AL PROCESAR',
          items: [
            {
              icon: '❌',
              name: 'El servicio de IA de Nutrilev no responde',
              amount: '-',
              tip: 'Por favor, intenta de nuevo en unos momentos.',
              brand: '-',
              checked: false
            }
          ]
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
    const menu = this.getActiveMenu();
    if (!p || !menu || !menu.created_at) return;

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
    const storageKey = `nutri_shop_${p.email}_${menu.created_at}`;
    const allChecked = updated.flatMap(cat => 
      cat.items.filter((i: ShoppingItem) => i.checked).map((i: ShoppingItem) => `${cat.category}-${i.name}`)
    );
    this.storageService.setItem(storageKey, allChecked);

    // Update full list cache
    const cacheKey = `nutri_shop_list_${p.email}_${menu.created_at}`;
    this.storageService.setItem(cacheKey, updated);
  }

  printShoppingList() {
    const list = this.shoppingList();
    const p = this.patient();
    if (!list || list.length === 0 || !p) return;

    // Generate categories HTML
    const categoriesHTML = list.map(cat => {
      const itemsHTML = cat.items.map((item: any) => `
        <div class="item-card">
          <div class="checkbox"></div>
          <div class="item-content">
            <div class="item-header">
              <span class="item-name">${item.icon} ${item.name}</span>
              ${item.amount ? `<span class="item-amount">${item.amount}</span>` : ''}
            </div>
            ${item.tip ? `<div class="item-tip">${item.tip}</div>` : ''}
          </div>
        </div>
      `).join('');

      return `
        <div class="category-group">
          <div class="category-title">${cat.category}</div>
          <div class="items-list">
            ${itemsHTML}
          </div>
        </div>
      `;
    }).join('');

    const formattedDate = new Date().toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      this.toastService.show('Por favor, permite las ventanas emergentes (popups) para imprimir.', 'error');
      return;
    }

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Lista de Súper - Nutrilev</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
    body {
      font-family: 'Inter', sans-serif;
      color: #334155;
      padding: 40px;
      background-color: #ffffff;
      font-size: 11px;
      line-height: 1.5;
    }
    .header {
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 15px;
      margin-bottom: 25px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .title {
      font-size: 22px;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: -0.025em;
    }
    .subtitle {
      font-size: 9px;
      text-transform: uppercase;
      font-weight: 700;
      color: #d11b60; /* nutri-rose */
      margin-top: 4px;
      letter-spacing: 0.1em;
    }
    .meta-info {
      text-align: right;
      font-size: 10px;
      color: #64748b;
    }
    .meta-info strong {
      color: #0f172a;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 25px 35px;
    }
    .category-group {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .category-title {
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
      color: #0f172a;
      border-bottom: 1.5px solid #cbd5e1;
      padding-bottom: 5px;
      margin-bottom: 10px;
      letter-spacing: 0.05em;
    }
    .items-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .item-card {
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }
    .checkbox {
      width: 12px;
      height: 12px;
      border: 1.5px solid #94a3b8;
      border-radius: 3px;
      margin-top: 2px;
      flex-shrink: 0;
    }
    .item-content {
      flex: 1;
    }
    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 10px;
    }
    .item-name {
      font-weight: 700;
      color: #1e293b;
    }
    .item-amount {
      font-size: 8px;
      font-weight: 900;
      background-color: #f1f5f9;
      color: #475569;
      padding: 1px 5px;
      border-radius: 4px;
      text-transform: uppercase;
      white-space: nowrap;
    }
    .item-tip {
      font-size: 9.5px;
      color: #64748b;
      font-style: italic;
      margin-top: 1px;
    }
    .footer {
      position: fixed;
      bottom: 20px;
      left: 40px;
      right: 40px;
      border-top: 1px solid #e2e8f0;
      padding-top: 10px;
      text-align: center;
      font-size: 8.5px;
      color: #94a3b8;
    }
    @media print {
      body {
        padding: 0;
      }
      .footer {
        position: running(footer);
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">Lista de Súper</div>
      <div class="subtitle">Nutrilev · Nutrición Especializada</div>
    </div>
    <div class="meta-info">
      <div>Paciente: <strong>${p.nombre}</strong></div>
      <div>Fecha: <strong>${formattedDate}</strong></div>
    </div>
  </div>

  <div class="grid">
    ${categoriesHTML}
  </div>

  <div class="footer">
    Plan de Alimentación de Élite · Generado de forma personalizada por IA
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
        window.close();
      }, 300);
    };
  </script>
</body>
</html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }

  closeShoppingModal() {
    this.showShoppingModal.set(false);
  }
}
