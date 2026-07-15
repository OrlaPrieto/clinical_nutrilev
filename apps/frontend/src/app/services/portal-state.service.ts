import { Injectable, inject, signal, computed } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { AuthService } from './auth.service';
import { PatientService } from './patient';
import { AppointmentService, Appointment } from './appointment.service';
import { ToastService } from '../shared/services/toast.service';
import { AnalyticsService } from '../shared/services/analytics.service';
import { StorageService } from '../shared/services/storage.service';
import { PushNotificationService } from '../shared/services/push-notification.service';
import { Patient, PatientProgress, ShoppingCategory, ShoppingItem } from '@shared/models/interfaces';
import { environment } from '../../environments/environment';
import confetti from 'canvas-confetti';

@Injectable({
  providedIn: 'root',
})
export class PortalStateService {
  private authService = inject(AuthService);
  private patientService = inject(PatientService);
  private appointmentService = inject(AppointmentService);
  private titleService = inject(Title);
  private toastService = inject(ToastService);
  private analytics = inject(AnalyticsService);
  private storageService = inject(StorageService);
  private pushService = inject(PushNotificationService);

  patient = signal<Patient | null>(null);
  nextAppointment = signal<Appointment | null>(null);
  progress = signal<PatientProgress[]>([]);
  loading = signal<boolean>(true);
  showThemeMenu = signal<boolean>(false);
  showAccessibilityMenu = signal<boolean>(false);
  showCancelConfirmModal = signal<boolean>(false);
  showEquivalentsModal = signal<boolean>(false);
  showCondimentsModal = signal<boolean>(false);
  activeCelebration = signal<any | null>(null);
  activeTab = signal<'dashboard' | 'plan' | 'menu-ia' | 'analysis' | 'history' | 'resources'>('plan');
  
  pullDistance = signal<number>(0);
  isRefreshing = signal<boolean>(false);
  loadingAppointmentAction = signal<boolean>(false);

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

  shoppingList = signal<ShoppingCategory[]>([]);
  loadingShoppingList = signal<boolean>(false);
  showShoppingModal = signal<boolean>(false);
  shoppingListProgress = signal<number>(0);
  shoppingListLoadingMessage = signal<string>('Detectando ingredientes...');
  shoppingListInterval: any = null;

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
    
    let progressPct = 0;
    if (goal === 'subir_musculo') {
      const gainNeeded = target - start;
      if (gainNeeded <= 0) return current >= target ? 100 : 0;
      progressPct = ((current - start) / gainNeeded) * 100;
    } else {
      const lossNeeded = start - target;
      if (lossNeeded <= 0) return current <= target ? 100 : 0;
      progressPct = ((start - current) / lossNeeded) * 100;
    }

    return Math.max(0, Math.min(100, Math.round(progressPct)));
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
        description: 'Iniciando con éxito tu camino hacia una vida saludable.',
        unlocked: goalPct >= 25
      },
      {
        id: 'halfway',
        image: 'images/milestones/star_gold.png',
        title: 'A Medio Camino',
        description: 'Cruzando con constancia la mitad de tu objetivo nutricional.',
        unlocked: goalPct >= 50
      },
      {
        id: 'goal-reached',
        image: 'images/milestones/star_diamond.png',
        title: 'Meta Lograda',
        description: '¡Felicidades! Has conquistado por completo tu meta de bienestar.',
        unlocked: goalPct >= 100
      }
    ];
  });

  loadPortalDataFromCache(userEmail: string) {
    try {
      const cachedPatientStr = localStorage.getItem(`portal_patient_${userEmail}`);
      const cachedProgressStr = localStorage.getItem(`portal_progress_${userEmail}`);
      const cachedAptStr = localStorage.getItem(`portal_next_appointment_${userEmail}`);

      if (cachedPatientStr) {
        const cachedPatient = JSON.parse(cachedPatientStr);
        this.patient.set(cachedPatient);
        this.titleService.setTitle(`Portal de ${cachedPatient.nombre} - Nutrilev`);
        this.loading.set(false);
      }

      if (cachedProgressStr) {
        this.progress.set(JSON.parse(cachedProgressStr));
      }

      if (cachedAptStr) {
        const cachedApt = JSON.parse(cachedAptStr);
        if (cachedApt && cachedApt.hasAppointment) {
          this.nextAppointment.set(cachedApt);
        } else {
          this.nextAppointment.set(null);
        }
      }
    } catch (err) {
      console.error('Error loading data from cache:', err);
    }
  }

  async loadPortalData(userEmail: string, forceRefresh = false) {
    try {
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

        try {
          localStorage.setItem(`portal_patient_${userEmail}`, JSON.stringify(currentPatient));
          localStorage.setItem(`portal_progress_${userEmail}`, JSON.stringify(history || []));
          localStorage.setItem(`portal_next_appointment_${userEmail}`, JSON.stringify(apt));
        } catch (cacheErr) {
          console.error('Failed to write portal data cache:', cacheErr);
        }

        if (menuChanged) {
          console.log('PWA: Menu changed! Resetting shopping list signal...');
          this.shoppingList.set([]);
          this.loadShoppingListFromCache(currentPatient);
        } else if (!oldPatient) {
          this.loadShoppingListFromCache(currentPatient);
        }

        this.loadDailyHabits();

        setTimeout(() => {
          this.checkNewMilestones();
        }, 1000);
      }
    } catch (err) {
      console.error('Error loading portal data', err);
      this.toastService.show('No se pudo actualizar el plan clínico. Mostrando última copia guardada.', 'error');
    }
  }

  loadShoppingListFromCache(p: Patient) {
    const menu = this.getActiveMenu();
    if (!menu || !menu.created_at) return;
    const cacheKey = `nutri_shop_list_${p.email}_${menu.created_at}`;
    const cached = this.storageService.getItem<ShoppingCategory[]>(cacheKey);
    if (cached && !cached.some(cat => cat.category.includes('ERROR'))) {
      const sorted = this.sortShoppingCategoryItems(cached);
      this.shoppingList.set(sorted);
      console.log('Shopping list loaded from cache');
    }
  }

  loadDailyHabits() {
    const key = this.getHabitsStorageKey();
    if (!key) return;
    const cached = this.storageService.getItem<any>(key);
    if (cached) {
      this.dailyHabits.set(cached);
    } else {
      this.dailyHabits.set({ water: false, activity: false, diet: false, sleep: false });
    }
  }

  saveDailyHabits(habits: { water: boolean; activity: boolean; diet: boolean; sleep: boolean }) {
    const key = this.getHabitsStorageKey();
    if (!key) return;
    this.dailyHabits.set(habits);
    this.storageService.setItem(key, habits);
  }

  getHabitsStorageKey(): string {
    const user = this.authService.user;
    if (!user || !user.email) return '';
    const email = user.email.toLowerCase();
    const todayStr = new Date().toLocaleDateString('sv');
    return `nutri_habits_${email}_${todayStr}`;
  }

  checkNewMilestones() {
    const list = this.milestones();
    if (list.length === 0) return;

    let celebrated: string[] = [];
    try {
      const stored = localStorage.getItem('celebrated_milestones');
      if (stored) {
        celebrated = JSON.parse(stored);
      }
    } catch (e) {
      console.error('Error parsing celebrated_milestones', e);
    }

    const toCelebrate = list.find(ms => ms.unlocked && !celebrated.includes(ms.id));
    if (toCelebrate) {
      this.activeCelebration.set(toCelebrate);
      celebrated.push(toCelebrate.id);
      localStorage.setItem('celebrated_milestones', JSON.stringify(celebrated));
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

  async confirmAppointment() {
    const apt = this.nextAppointment();
    const p = this.patient();
    if (!apt || !apt.eventId || !p || !p.email) return;

    this.loadingAppointmentAction.set(true);
    try {
      const res = await this.appointmentService.confirmAppointment(p.email, apt.eventId);
      if (res && res.success) {
        if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
          navigator.vibrate([40, 45, 40]);
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

  async confirmCancelAppointment() {
    const apt = this.nextAppointment();
    const p = this.patient();
    if (!apt || !apt.eventId || !p || !p.email) return;

    this.showCancelConfirmModal.set(false);
    this.loadingAppointmentAction.set(true);
    try {
      const res = await this.appointmentService.cancelAppointment(p.email, apt.eventId);
      if (res && res.success) {
        if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
          navigator.vibrate(60);
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

  sortShoppingCategoryItems(list: ShoppingCategory[]): ShoppingCategory[] {
    return list.map(cat => ({
      ...cat,
      items: [
        ...cat.items.filter(i => !i.checked),
        ...cat.items.filter(i => i.checked)
      ]
    }));
  }
}
