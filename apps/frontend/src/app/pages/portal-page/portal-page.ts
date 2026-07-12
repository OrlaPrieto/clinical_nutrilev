import { Component, OnInit, OnDestroy, inject, signal, computed, HostListener, ChangeDetectionStrategy, ViewChild, effect, untracked } from '@angular/core';
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
import { PortalStateService } from '../../services/portal-state.service';

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
  @ViewChild(HabitsTrackerComponent) habitsTracker?: HabitsTrackerComponent;
  
  public state = inject(PortalStateService);
  
  patient = this.state.patient;
  nextAppointment = this.state.nextAppointment;
  progress = this.state.progress;
  loading = this.state.loading;
  showThemeMenu = this.state.showThemeMenu;
  showAccessibilityMenu = this.state.showAccessibilityMenu;
  showCancelConfirmModal = this.state.showCancelConfirmModal;
  showEquivalentsModal = this.state.showEquivalentsModal;
  showCondimentsModal = this.state.showCondimentsModal;
  activeCelebration = this.state.activeCelebration;
  activeTab = this.state.activeTab;
  
  pullDistance = this.state.pullDistance;
  isRefreshing = this.state.isRefreshing;
  loadingAppointmentAction = this.state.loadingAppointmentAction;
  dailyHabits = this.state.dailyHabits;
  habitsPercentage = this.state.habitsPercentage;
  
  shoppingList = this.state.shoppingList;
  loadingShoppingList = this.state.loadingShoppingList;
  showShoppingModal = this.state.showShoppingModal;
  shoppingListProgress = this.state.shoppingListProgress;
  shoppingListLoadingMessage = this.state.shoppingListLoadingMessage;
  hasShoppingError = this.state.hasShoppingError;
  
  getActiveMenu = this.state.getActiveMenu;
  firstName = this.state.firstName;
  greetingPrefix = this.state.greetingPrefix;
  greetingIcon = this.state.greetingIcon;
  welcomeMessage = this.state.welcomeMessage;
  currentGoal = this.state.currentGoal;
  goalPercentage = this.state.goalPercentage;
  milestones = this.state.milestones;

  sidebarCollapsed = signal<boolean>(false);
  private lastFocusTime = Date.now();
  private focusListener?: () => void;
  private visibilityListener?: () => void;
  private authService = inject(AuthService);
  private patientService = inject(PatientService);
  public themeService = inject(ThemeService);
  public accessibilityService = inject(AccessibilityService);
  private storageService = inject(StorageService);
  private pushService = inject(PushNotificationService);
  private titleService = inject(Title);
  private analytics = inject(AnalyticsService);
  private toastService = inject(ToastService);

  private isHistoryPushed = false;

  constructor() {
    effect(() => {
      const open = this.isAnyModalOpen() || this.activeCelebration() !== null;
      untracked(() => {
        if (open) {
          if (!this.isHistoryPushed) {
            window.history.pushState({ modalOpen: 'portal' }, '');
            this.isHistoryPushed = true;
          }
        } else {
          if (this.isHistoryPushed) {
            this.isHistoryPushed = false;
            if (window.history.state && window.history.state.modalOpen === 'portal') {
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
      this.showEquivalentsModal.set(false);
      this.showCondimentsModal.set(false);
      this.showShoppingModal.set(false);
      this.showCancelConfirmModal.set(false);
      this.activeCelebration.set(null);
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

  isAnyModalOpen(): boolean {
    return this.showEquivalentsModal() || 
           this.showCondimentsModal() || 
           this.showShoppingModal() || 
           this.showCancelConfirmModal();
  }

  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent) {
    if (this.isAnyModalOpen()) return;
    this.swipeStartX = event.touches[0].clientX;
    this.swipeStartY = event.touches[0].clientY;

    if (window.scrollY === 0 && !this.isRefreshing()) {
      this.touchStartY = event.touches[0].clientY;
      this.isPulling = true;
    }
  }

  @HostListener('touchmove', ['$event'])
  onTouchMove(event: TouchEvent) {
    if (this.isAnyModalOpen()) return;
    if (!this.isPulling) return;
    const currentY = event.touches[0].clientY;
    const diff = currentY - this.touchStartY;
    if (diff > 0) {
      const distance = Math.min(100, diff * 0.4);
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
    if (this.isAnyModalOpen()) {
      this.isPulling = false;
      this.pullDistance.set(0);
      return;
    }
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

    if (this.isPulling) {
      this.isPulling = false;
      const distance = this.pullDistance();
      if (distance >= 35) {
        this.isRefreshing.set(true);
        this.pullDistance.set(40);
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

  toNumber(val: any): number {
    return Number(val);
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

  weightDiff = computed(() => {
    const history = this.progress();
    if (history.length < 2) return null;
    const current = Number(history[0].weight || 0);
    const prev = Number(history[1].weight || 0);
    if (!current || !prev) return null;
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
    formattedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
    
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

    if (diffDays <= 1) {
      return true;
    }
    
    const todayDay = now.getDay();
    if (todayDay === 6 && diffDays === 2) {
      return true;
    }
    
    return false;
  });

  async ngOnInit() {
    const user = this.authService.user;
    if (user && user.email) {
      const userEmail = user.email.toLowerCase();
      try {
        this.state.loadPortalDataFromCache(userEmail);
        await this.state.loadPortalData(userEmail, true); 
        this.pushService.requestSubscription(userEmail);
        this.handleUrlActions();

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
      if (now - this.lastFocusTime > 15000) {
        this.lastFocusTime = now;
        this.state.loadPortalData(userEmail, true);
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
    if (this.state.shoppingListInterval) {
      clearInterval(this.state.shoppingListInterval);
    }
  }

  async handleUrlActions() {
    try {
      const params = new URLSearchParams(window.location.search);
      const action = params.get('action');
      const id = params.get('id');
      const tab = params.get('tab');

      if (tab && ['dashboard', 'plan', 'analysis', 'history'].includes(tab)) {
        this.setActiveTab(tab as any);
      }

      if (action === 'habits') {
        setTimeout(() => {
          this.habitsTracker?.showHabitsFloatingModal.set(true);
        }, 300);
      }

      if (action && id) {
        const apt = this.nextAppointment();
        if (!apt || apt.eventId !== id) return;

        if (action === 'confirm') {
          await this.confirmAppointment();
        } else if (action === 'cancel') {
          this.cancelAppointment();
        }
      }

      if (action || id || tab) {
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    } catch (err) {
      console.error('Error handling URL notification action:', err);
    }
  }

  openMenu(url?: string) {
    const targetUrl = url || this.getActiveMenu()?.url;
    if (targetUrl) {
      window.open(targetUrl, '_blank', 'noopener');
    }
  }

  openMilestoneModal(ms: any) {
    if (!ms.unlocked) return;
    this.activeCelebration.set(ms);
    this.state.triggerCelebrationConfetti(ms.id);
  }

  async confirmAppointment() {
    await this.state.confirmAppointment();
  }

  cancelAppointment() {
    this.showCancelConfirmModal.set(true);
  }

  async confirmCancelAppointment() {
    await this.state.confirmCancelAppointment();
  }

  logout() {
    this.authService.logout();
  }

  async openShoppingList() {
    this.showShoppingModal.set(true);
    if (this.shoppingList().length === 0 || this.hasShoppingError()) {
      const p = this.patient();
      if (p) this.state.loadShoppingListFromCache(p);
      if (this.shoppingList().length === 0 || this.hasShoppingError()) {
        await this.fetchShoppingList();
      }
    }
  }

  async fetchShoppingList() {
    if (this.loadingShoppingList()) return;
    if (this.state.shoppingListInterval) {
      clearInterval(this.state.shoppingListInterval);
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

    this.state.shoppingListInterval = setInterval(() => {
      if (currentProgress < 95) {
        let increment = 1.8;
        if (currentProgress >= 40 && currentProgress < 75) {
          increment = 0.9;
        } else if (currentProgress >= 75) {
          increment = 0.3;
        }
        currentProgress = Math.min(95, currentProgress + increment);
        const roundedProgress = Math.round(currentProgress);
        this.shoppingListProgress.set(roundedProgress);
        updateProgressMessage(roundedProgress);
      }
    }, 1000);

    try {
      const list = await this.patientService.getShoppingList(menu.url);
      clearInterval(this.state.shoppingListInterval);
      this.shoppingListProgress.set(100);
      this.shoppingListLoadingMessage.set('¡Lista generada con éxito!');

      this.analytics.logEvent('generate_shopping_list', {
        patient_email: p.email,
        patient_name: p.nombre,
        items_count: list.reduce((acc: number, c: any) => acc + (c.items ? c.items.length : 0), 0)
      });
      
      const storageKey = `nutri_shop_${p.email}_${menu.created_at}`;
      const savedChecked = this.storageService.getItem<string[]>(storageKey) || [];
      
      const enrichedList: ShoppingCategory[] = list.map((cat: any) => ({
        ...cat,
        items: cat.items.map((item: any) => ({
          ...item,
          checked: savedChecked.includes(`${cat.category}-${item.name}`)
        }))
      }));
      
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const sorted = this.state.sortShoppingCategoryItems(enrichedList);
      this.shoppingList.set(sorted);
      
      const hasError = enrichedList.some(cat => cat.category.includes('ERROR'));
      if (!hasError) {
        const cacheKey = `nutri_shop_list_${p.email}_${menu.created_at}`;
        this.storageService.setItem(cacheKey, sorted);
      }
    } catch (err) {
      clearInterval(this.state.shoppingListInterval);
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
    
    const storageKey = `nutri_shop_${p.email}_${menu.created_at}`;
    const allChecked = updated.flatMap(cat => 
      cat.items.filter((i: ShoppingItem) => i.checked).map((i: ShoppingItem) => `${cat.category}-${i.name}`)
    );
    this.storageService.setItem(storageKey, allChecked);

    const cacheKey = `nutri_shop_list_${p.email}_${menu.created_at}`;
    this.storageService.setItem(cacheKey, updated);

    setTimeout(() => {
      const latest = this.shoppingList();
      const sorted = this.state.sortShoppingCategoryItems(latest);
      this.shoppingList.set(sorted);
      this.storageService.setItem(cacheKey, sorted);
    }, 350);
  }

  toggleHabit(habitKey: 'water' | 'activity' | 'diet' | 'sleep') {
    const key = this.state.getHabitsStorageKey();
    if (!key) return;
    const current = this.state.dailyHabits();
    const updated = {
      ...current,
      [habitKey]: !current[habitKey]
    };
    this.state.saveDailyHabits(updated);

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

  closeShoppingModal() {
    this.showShoppingModal.set(false);
  }

  generateBadgePng(svgElement: SVGElement, id: string, title: string): Promise<File | null> {
    const svgString = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const URL = window.URL || window.webkitURL || window;
    const blobURL = URL.createObjectURL(svgBlob);

    const logoImg = new Image();
    logoImg.src = 'images/logo.png';

    const svgImg = new Image();
    svgImg.src = blobURL;

    return new Promise((resolve) => {
      let loadedCount = 0;
      const checkLoaded = () => {
        loadedCount++;
        if (loadedCount === 2) {
          const canvas = document.createElement('canvas');
          canvas.width = 480;
          canvas.height = 640;
          const context = canvas.getContext('2d');
          if (!context) {
            resolve(null);
            return;
          }

          context.beginPath();
          const r = 40;
          context.moveTo(r, 0);
          context.lineTo(480 - r, 0);
          context.quadraticCurveTo(480, 0, 480, r);
          context.lineTo(480, 640 - r);
          context.quadraticCurveTo(480, 640, 480 - r, 640);
          context.lineTo(r, 640);
          context.quadraticCurveTo(0, 640, 0, 640 - r);
          context.lineTo(0, r);
          context.quadraticCurveTo(0, 0, r, 0);
          context.closePath();
          
          const gradient = context.createRadialGradient(240, 320, 50, 240, 320, 380);
          if (id === '25-percent') {
            gradient.addColorStop(0, '#f97316');
            gradient.addColorStop(1, '#d97706');
          } else if (id === 'halfway') {
            gradient.addColorStop(0, '#facc15');
            gradient.addColorStop(1, '#f97316');
          } else {
            gradient.addColorStop(0, '#38bdf8');
            gradient.addColorStop(1, '#4f46e5');
          }
          context.fillStyle = gradient;
          context.fill();

          context.fillStyle = 'rgba(255, 255, 255, 0.15)';
          context.strokeStyle = 'rgba(255, 255, 255, 0.15)';
          context.lineWidth = 1;
          context.beginPath();
          context.arc(240, 150, 64, 0, 2 * Math.PI);
          context.fill();
          context.stroke();

          context.drawImage(svgImg, 188, 98, 104, 104);

          context.textAlign = 'center';
          context.font = '900 11px system-ui, -apple-system, sans-serif';
          context.fillStyle = 'rgba(255, 255, 255, 0.75)';
          context.fillText('🏆 LOGRO ALCANZADO', 240, 260);

          context.font = '800 24px system-ui, -apple-system, sans-serif';
          context.fillStyle = '#ffffff';
          context.fillText(title.toUpperCase(), 240, 295);

          context.font = '500 14px system-ui, -apple-system, sans-serif';
          context.fillStyle = 'rgba(255, 255, 255, 0.85)';
          
          const words = '¡He desbloqueado esta medalla en mi plan de nutrición!'.split(' ');
          let line = '';
          let y = 330;
          for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = context.measureText(testLine);
            if (metrics.width > 380 && n > 0) {
              context.fillText(line, 240, y);
              line = words[n] + ' ';
              y += 20;
            } else {
              line = testLine;
            }
          }
          context.fillText(line, 240, y);

          context.fillStyle = 'rgba(255, 255, 255, 0.1)';
          context.fillRect(40, 480, 400, 2);

          context.drawImage(logoImg, 240 - 24, 505, 48, 48);

          context.font = '800 14px system-ui, -apple-system, sans-serif';
          context.fillStyle = '#ffffff';
          context.fillText('CLÍNICA NUTRILEV', 240, 575);

          context.font = '500 10px system-ui, -apple-system, sans-serif';
          context.fillStyle = 'rgba(255, 255, 255, 0.6)';
          context.fillText('Tu salud en equilibrio', 240, 595);

          canvas.toBlob((blob) => {
            if (blob) {
              const file = new File([blob], `logro_${id}.png`, { type: 'image/png' });
              resolve(file);
            } else {
              resolve(null);
            }
          }, 'image/png');
        }
      };
      logoImg.onload = checkLoaded;
      svgImg.onload = checkLoaded;
      logoImg.onerror = () => resolve(null);
      svgImg.onerror = () => resolve(null);
    });
  }

  async shareMilestone() {
    const ms = this.activeCelebration();
    if (!ms) return;

    this.toastService.show('Generando imagen del logro...', undefined, 2000);
    try {
      const svgElement = document.getElementById('celebration-svg') as SVGElement | null;
      if (!svgElement) {
        this.toastService.show('No se encontró el elemento visual del logro.', 'error', 3000);
        return;
      }

      const file = await this.generateBadgePng(svgElement, ms.id, ms.title);
      const trophy = '\u{1F3C6}';
      const apple = '\u{1F34E}';
      const sparkle = '\u{2728}';
      const shareText = `¡He alcanzado un nuevo logro en mi plan de alimentación de Nutrilev! ${trophy}\n\n*${ms.title.toUpperCase()}*\n"${this.getCelebrationMessage(ms.id)}"\n\n${sparkle} Únete a un estilo de vida de élite con Nutrilev ${apple}`;

      if (file && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Logro Nutrilev: ${ms.title}`,
          text: shareText
        });
        this.analytics.logEvent('share_milestone_success', { milestone_id: ms.id });
      } else {
        this.toastService.show('La función de compartir archivos no es soportada en este navegador.', 'error', 4000);
      }
    } catch (err) {
      console.error('Error sharing milestone:', err);
      this.toastService.show('No se pudo compartir la medalla.', 'error', 3000);
    }
  }

  getCelebrationMessage(id: string): string {
    switch (id) {
      case '25-percent':
        return '¡Excelente inicio en este gran camino hacia tu bienestar! Cada pequeño cambio cuenta y tus hábitos ya están dando sus primeros frutos. ¡Sigue adelante con esa misma determinación!';
      case 'halfway':
        return '¡Un avance extraordinario! Estás oficialmente a la mitad del camino para alcanzar tu objetivo. Tu constancia es sumamente admirable y estás demostrando que sí se puede. ¡No te detengas!';
      case 'goal-reached':
        return '¡META CUMPLIDA! Has alcanzado el 100% de tu gran objetivo de salud. Tu disciplina y perseverancia son admirables, has transformado tu estilo de vida por completo. ¡Muchísimas felicidades por este gran triunfo!';
      default:
        return 'Sigue sumando logros en tu plan nutricional para alcanzar tus objetivos.';
    }
  }
}
