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
import { AccessibilityService } from '../../services/accessibility.service';

import { NutriImagePipe } from '../../shared/pipes/nutri-image.pipe';
import { MilestoneBadgeComponent } from '../../shared/components/molecules/milestone-badge/milestone-badge';
import { environment } from '../../../environments/environment';
import { ProgressAnalyticCardComponent } from '../../shared/components/organisms/progress-analytic-card/progress-analytic-card';
import { ProgressHistoryComponent } from '../../shared/components/organisms/progress-history/progress-history';
import confetti from 'canvas-confetti';

import { AppointmentCardComponent } from './components/appointment-card/appointment-card';
import { ProgressChartSvgComponent } from './components/progress-chart-svg/progress-chart-svg';
import { HabitsTrackerComponent } from './components/habits-tracker/habits-tracker';
import { ShoppingListModalComponent } from './components/shopping-list-modal/shopping-list-modal';
import { PortalPlanOrganism } from '../../shared/components/organisms/portal-plan/portal-plan';
import { EquivalentsModalComponent } from './components/equivalents-modal/equivalents-modal';
import { FreeCondimentsModalComponent } from './components/free-condiments-modal/free-condiments-modal';

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
    ProgressHistoryComponent,
    AppointmentCardComponent,
    ProgressChartSvgComponent,
    HabitsTrackerComponent,
    ShoppingListModalComponent,
    PortalPlanOrganism,
    EquivalentsModalComponent,
    FreeCondimentsModalComponent
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
  private shoppingListInterval: any = null;
  private authService = inject(AuthService);
  private patientService = inject(PatientService);
  public themeService = inject(ThemeService);
  public accessibilityService = inject(AccessibilityService);
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
  showThemeMenu = signal<boolean>(false);
  showAccessibilityMenu = signal<boolean>(false);
  showCancelConfirmModal = signal<boolean>(false);
  showEquivalentsModal = signal<boolean>(false);
  showCondimentsModal = signal<boolean>(false);
  activeCelebration = signal<any | null>(null);
  activeTab = signal<'dashboard' | 'plan' | 'menu-ia' | 'analysis' | 'history' | 'resources'>('plan');


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

  getHeroTextGradientClass(): string {
    const activeTheme = this.themeService.theme();
    switch (activeTheme) {
      case 'dark':
        return 'from-nutri-rose to-[#ff8a65]';
      case 'purple':
        return 'from-blue-400 to-sky-400';
      case 'vibrant':
        return 'from-emerald-500 to-teal-400';
      case 'light':
      default:
        return 'from-nutri-rose to-[#ff7043]';
    }
  }



  @HostListener('document:click')
  onDocumentClick() {
    this.showThemeMenu.set(false);
    this.showAccessibilityMenu.set(false);
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
      const tabs: ('dashboard' | 'plan' | 'menu-ia' | 'analysis' | 'history' | 'resources')[] = ['plan', 'menu-ia', 'dashboard', 'resources', 'analysis', 'history'];
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

  setActiveTab(tab: 'dashboard' | 'plan' | 'menu-ia' | 'analysis' | 'history' | 'resources') {
    this.activeTab.set(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }



  
  shoppingList = signal<ShoppingCategory[]>([]);
  loadingShoppingList = signal<boolean>(false);
  showShoppingModal = signal<boolean>(false);
  shoppingListProgress = signal<number>(0);
  shoppingListLoadingMessage = signal<string>('Detectando ingredientes...');
  hasShoppingError = computed(() => this.shoppingList().some(cat => cat.category.includes('ERROR')));


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

  greetingPrefix = computed(() => {
    const hours = new Date().getHours();
    if (hours < 12) return 'Buenos días';
    if (hours < 19) return 'Buenas tardes';
    return 'Buenas noches';
  });

  greetingIcon = computed(() => {
    const hours = new Date().getHours();
    if (hours < 12) return 'wb_sunny';
    if (hours < 19) return 'light_mode';
    return 'nights_stay';
  });

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




  isMenuValid = computed(() => {
    const menu = this.getActiveMenu();
    if (!menu || !menu.url || !menu.created_at) return false;
    const createdAt = new Date(menu.created_at).getTime();
    const now = Date.now();
    const diffDays = (now - createdAt) / (1000 * 60 * 60 * 24);
    const limit = this.patient()?.plan_duration_days != null ? Number(this.patient()!.plan_duration_days) : environment.menuDurationDays;
    return diffDays <= limit;
  });

  expirationMessage = computed(() => {
    const menu = this.getActiveMenu();
    if (!menu || !menu.url || !menu.created_at) return '';
    
    const limit = this.patient()?.plan_duration_days != null ? Number(this.patient()!.plan_duration_days) : environment.menuDurationDays;
    
    if (limit >= 9999) {
      return 'Acceso permanente habilitado';
    }

    const createdAt = new Date(menu.created_at).getTime();
    const durationMs = limit * 24 * 60 * 60 * 1000;
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

  menuDurationDays = computed(() => {
    const limit = this.patient()?.plan_duration_days;
    return limit != null ? Number(limit) : environment.menuDurationDays;
  });

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
    if (this.shoppingListInterval) {
      clearInterval(this.shoppingListInterval);
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
      const sorted = this.sortShoppingCategoryItems(cached);
      this.shoppingList.set(sorted);
      console.log('Shopping list loaded from cache');
    }
  }

  async fetchShoppingList() {
    if (this.loadingShoppingList()) return;

    if (this.shoppingListInterval) {
      clearInterval(this.shoppingListInterval);
    }

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
    this.shoppingListInterval = setInterval(() => {
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
      clearInterval(this.shoppingListInterval);
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
      
      const sorted = this.sortShoppingCategoryItems(enrichedList);
      this.shoppingList.set(sorted);
      
      // Guardar lista completa en caché únicamente si no contiene errores
      const hasError = enrichedList.some(cat => cat.category.includes('ERROR'));
      if (!hasError) {
        const cacheKey = `nutri_shop_list_${p.email}_${menu.created_at}`;
        this.storageService.setItem(cacheKey, sorted);
      }
    } catch (err) {
      clearInterval(this.shoppingListInterval);
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
          items: cat.items.map((i: ShoppingItem) => i.name === item.name ? { ...i, checked: !i.checked } : i)
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

    // Wait 350ms for premium transition visualization before sorting
    setTimeout(() => {
      const latest = this.shoppingList();
      const sorted = this.sortShoppingCategoryItems(latest);
      this.shoppingList.set(sorted);
      this.storageService.setItem(cacheKey, sorted);
    }, 350);
  }

  sortShoppingCategoryItems(list: ShoppingCategory[]): ShoppingCategory[] {
    return list.map(cat => ({
      ...cat,
      items: [
        ...cat.items.filter(i => !i.checked),
        ...cat.items.filter(i => i.checked)
      ]
    }));
  }

  closeShoppingModal() {
    this.showShoppingModal.set(false);
  }
}
