import { Component, OnInit, input, signal, computed, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '../../atoms/button/button';
import { IconComponent } from '../../atoms/icon/icon';
import { InputComponent } from '../../atoms/input/input';
import { BadgeComponent } from '../../atoms/badge/badge';
import { StatCardComponent } from '../../molecules/stat-card/stat-card';
import { DetailFieldComponent } from '../../molecules/detail-field/detail-field';
import { PatientService } from '../../../../services/patient';
import { AuthService } from '../../../../services/auth.service';
import { supabase } from '../../../../supabase';
import { environment } from '../../../../../environments/environment';
import { ProgressAnalyticCardComponent } from '../progress-analytic-card/progress-analytic-card';
import { ProgressHistoryComponent } from '../progress-history/progress-history';

@Component({
  selector: 'app-o-patient-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent, IconComponent, InputComponent, BadgeComponent, StatCardComponent, DetailFieldComponent, ProgressHistoryComponent],
  templateUrl: './patient-detail.html',
  styleUrl: './patient-detail.scss'
})
export class PatientDetailComponent implements OnInit {
  patient = input<any | null>(null);
  activeTab = signal<number>(0);
  saving = signal<boolean>(false);
  showSuccess = signal<boolean>(false);
  isEditing = signal<boolean>(false);
  headerCollapsed = signal<boolean>(false);
  saved = output<void>();
  
  fruitImages = [
    'https://fonts.gstatic.com/s/e/notoemoji/latest/1f34d/512.png', // Pineapple
    'https://fonts.gstatic.com/s/e/notoemoji/latest/1f34e/512.png', // Red Apple
    'https://fonts.gstatic.com/s/e/notoemoji/latest/1f34f/512.png', // Green Apple
    'https://fonts.gstatic.com/s/e/notoemoji/latest/1f349/512.png', // Watermelon
    'https://fonts.gstatic.com/s/e/notoemoji/latest/1f955/512.png', // Carrot
    'https://fonts.gstatic.com/s/e/notoemoji/latest/1f345/512.png', // Tomato
    'https://fonts.gstatic.com/s/e/notoemoji/latest/1f951/512.png', // Avocado
    'https://fonts.gstatic.com/s/e/notoemoji/latest/1f34a/512.png', // Orange
    'https://fonts.gstatic.com/s/e/notoemoji/latest/1f966/512.png', // Broccoli
    'https://fonts.gstatic.com/s/e/notoemoji/latest/1f34c/512.png', // Banana
    'https://fonts.gstatic.com/s/e/notoemoji/latest/1f353/512.png', // Strawberry
    'https://fonts.gstatic.com/s/e/notoemoji/latest/1f347/512.png', // Grapes
    'https://fonts.gstatic.com/s/e/notoemoji/latest/1f350/512.png', // Pear
    'https://fonts.gstatic.com/s/e/notoemoji/latest/1f352/512.png', // Cherry
    'https://fonts.gstatic.com/s/e/notoemoji/latest/1f34b/512.png', // Lemon
    'https://fonts.gstatic.com/s/e/notoemoji/latest/1f96d/512.png', // Mango
    'https://fonts.gstatic.com/s/e/notoemoji/latest/1f351/512.png', // Peach
    'https://fonts.gstatic.com/s/e/notoemoji/latest/1f346/512.png', // Eggplant
    'https://fonts.gstatic.com/s/e/notoemoji/latest/1f33d/512.png', // Corn
    'https://fonts.gstatic.com/s/e/notoemoji/latest/1f95d/512.png', // Kiwi
    'https://fonts.gstatic.com/s/e/notoemoji/latest/1f954/512.png', // Potato
    'https://fonts.gstatic.com/s/e/notoemoji/latest/1f952/512.png', // Cucumber
    'https://fonts.gstatic.com/s/e/notoemoji/latest/1f96c/512.png', // Leafy Green
    'https://fonts.gstatic.com/s/e/notoemoji/latest/1f9c4/512.png', // Garlic
    'https://fonts.gstatic.com/s/e/notoemoji/latest/1f9c5/512.png', // Onion
  ];
  
  randomFruit = signal(this.fruitImages[0]);
  tabs = signal([
    { label: 'Personal', icon: 'person' },
    { label: 'Antecedentes', icon: 'history_edu' },
    { label: 'Estilo de Vida', icon: 'self_improvement' },
    { label: 'Nutrición', icon: 'restaurant' },
    { label: 'Seguimiento', icon: 'analytics' },
    { label: 'Notas', icon: 'description' }
  ]);

  ngOnInit() {
    this.assignPersistentFruit();
    this.loadProgress();
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      this.headerCollapsed.set(true);
    }
  }

  assignPersistentFruit() {
    const p = this.patient();
    const seed = p?.id || p?.nombre || 'default';
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % this.fruitImages.length;
    this.randomFruit.set(this.fruitImages[index]);
  }
  showMenuModal = signal<boolean>(false);
  toast = signal<{ message: string; type: 'success' | 'error' | null }>({ message: '', type: null });
  highlightCopy = signal<boolean>(false);

  
  // Progress signals
  progressHistory = signal<any[]>([]);
  changedFields = signal<Record<string, boolean>>({});
  hasHistory = computed(() => this.progressHistory().length > 0);
  newProgress = signal<any>({ 
    weight: null, body_fat: null, muscle_mass: null, 
    agua_corporal: null, proteinas: null, minerales: null, masa_grasa: null, 
    masa_magra: null, imc: null, pgc: null,
    brazo_der_grasa: null, brazo_der_musculo: null, brazo_der_cm: null,
    brazo_izq_grasa: null, brazo_izq_musculo: null, brazo_izq_cm: null,
    tronco_grasa: null, tronco_musculo: null,
    pierna_der_grasa: null, pierna_der_musculo: null, pierna_der_cm: null,
    pierna_izq_grasa: null, pierna_izq_musculo: null, pierna_izq_cm: null,
    icc: null, gv: null, abdomen: null, cintura: null, cadera: null,
    edad_metabolica: null, presion_arterial: '', pulso: null, pliegue_cutaneo: null,
    notes: '' 
  });
  addingProgress = signal<boolean>(false);
  isUploadingMenu = signal<boolean>(false);
  lastGeneratedUrl = signal<string | null>(null);
  menuFilesToUpload = signal<Array<{ file: File | null; name: string }>>([
    { file: null, name: 'Menú Principal' }
  ]);
  copied = signal<boolean>(false);
  originalEmail = '';

  constructor(private patientService: PatientService, private authService: AuthService) {}


  currentGoal = computed(() => this.patient()?.meta_objetivo || null);

  progressPercentage = computed(() => {
    const p = this.patient();
    const history = this.progressHistory();
    const goal = this.currentGoal();
    if (!p || !goal || history.length === 0) return 0;

    const currentRecord = history[0];
    const initialRecord = history[history.length - 1];

    let start = 0;
    let current = 0;
    let target = 0;

    switch (goal) {
      case 'bajar_peso':
        start = Number(p.peso_habitual || initialRecord.weight || 0);
        current = Number(currentRecord.weight || 0);
        target = Number(p.peso_meta || 0);
        break;
      case 'bajar_grasa':
        start = Number(initialRecord.body_fat || 0);
        current = Number(currentRecord.body_fat || 0);
        target = Number(p.grasa_meta || 0);
        break;
      case 'subir_musculo':
        // Muscle Gain: start is the oldest record that HAS muscle_mass. If none, using 0 is risky for progress %.
        // Let's assume the first recorded muscle mass is the 'start'.
        const firstRecordWithMuscle = [...history].reverse().find(r => r.muscle_mass);
        start = firstRecordWithMuscle ? Number(firstRecordWithMuscle.muscle_mass) : Number(currentRecord.muscle_mass || 0);
        current = Number(currentRecord.muscle_mass || 0);
        target = Number(p.musculo_meta || 0);
        break;
    }

    if (target === 0 || start === target) return 0;
    
    let progress = 0;
    if (goal === 'subir_musculo') {
      // For muscle gain, increase is the goal.
      // (amount gained) / (total gain needed)
      const gainNeeded = target - start;
      if (gainNeeded <= 0) return current >= target ? 100 : 0;
      progress = ((current - start) / gainNeeded) * 100;
    } else {
      // For losing weight/fat, decrease is the goal.
      // (amount lost) / (total loss needed)
      const lossNeeded = start - target;
      if (lossNeeded <= 0) return current <= target ? 100 : 0;
      progress = ((start - current) / lossNeeded) * 100;
    }

    return Math.max(0, Math.min(100, Math.round(progress)));
  });

  milestones = computed(() => {
    const p = this.progressPercentage();
    return [
      { label: '25%', achieved: p >= 25 },
      { label: '50%', achieved: p >= 50 },
      { label: '75%', achieved: p >= 75 },
      { label: '100%', achieved: p >= 100 }
    ];
  });

  async loadProgress() {
    const p = this.patient();
    if (p && p.email) {
      try {
        const history = await this.patientService.getPatientProgress(p.email);
        this.progressHistory.set(history);
        this.initializeNewProgressFromLastRecord();
      } catch (err) {
        console.error('Error loading progress history', err);
      }
    }
  }

  initializeNewProgressFromLastRecord() {
    const history = this.progressHistory();
    if (history && history.length > 0) {
      const lastRecord = history[0];
      const prevData: any = {};
      const fields = [
        'weight', 'body_fat', 'muscle_mass', 
        'agua_corporal', 'proteinas', 'minerales', 'masa_grasa', 
        'masa_magra', 'imc', 'pgc',
        'brazo_der_grasa', 'brazo_der_musculo', 'brazo_der_cm',
        'brazo_izq_grasa', 'brazo_izq_musculo', 'brazo_izq_cm',
        'tronco_grasa', 'tronco_musculo',
        'pierna_der_grasa', 'pierna_der_musculo', 'pierna_der_cm',
        'pierna_izq_grasa', 'pierna_izq_musculo', 'pierna_izq_cm',
        'icc', 'gv', 'abdomen', 'cintura', 'cadera',
        'edad_metabolica', 'presion_arterial', 'pulso', 'pliegue_cutaneo'
      ];
      
      for (const field of fields) {
        const val = lastRecord[field];
        prevData[field] = (val !== undefined && val !== null) ? val : (field === 'presion_arterial' ? '' : null);
      }
      
      prevData.notes = '';
      this.newProgress.set(prevData);
      
      const flags: Record<string, boolean> = {};
      for (const field of fields) {
        flags[field] = false;
      }
      this.changedFields.set(flags);
    } else {
      this.resetNewProgress();
    }
  }

  resetNewProgress() {
    this.newProgress.set({ 
      weight: null, body_fat: null, muscle_mass: null,
      agua_corporal: null, proteinas: null, minerales: null, masa_grasa: null, 
      masa_magra: null, imc: null, pgc: null,
      brazo_der_grasa: null, brazo_der_musculo: null, brazo_der_cm: null,
      brazo_izq_grasa: null, brazo_izq_musculo: null, brazo_izq_cm: null,
      tronco_grasa: null, tronco_musculo: null,
      pierna_der_grasa: null, pierna_der_musculo: null, pierna_der_cm: null,
      pierna_izq_grasa: null, pierna_izq_musculo: null, pierna_izq_cm: null,
      icc: null, gv: null, abdomen: null, cintura: null, cadera: null,
      edad_metabolica: null, presion_arterial: '', pulso: null, pliegue_cutaneo: null,
      notes: '' 
    });
    this.changedFields.set({});
  }

  updateProgressField(key: string, value: any) {
    const current = this.newProgress();
    const updated = {
      ...current,
      [key]: value
    };
    this.newProgress.set(updated);
    
    const history = this.progressHistory();
    const lastRecord = history && history.length > 0 ? history[0] : null;
    const prevValue = lastRecord ? lastRecord[key] : null;
    
    const isDifferent = this.isFieldValueDifferent(prevValue, value);
    
    this.changedFields.update(flags => ({
      ...flags,
      [key]: isDifferent
    }));
  }

  private isFieldValueDifferent(prev: any, current: any): boolean {
    if (prev === current) return false;
    
    const normalizedPrev = (prev === null || prev === undefined || prev === '') ? null : String(prev).trim();
    const normalizedCurrent = (current === null || current === undefined || current === '') ? null : String(current).trim();
    
    if (normalizedPrev === normalizedCurrent) return false;
    
    if (normalizedPrev !== null && normalizedCurrent !== null) {
      const numPrev = Number(normalizedPrev);
      const numCurrent = Number(normalizedCurrent);
      if (!isNaN(numPrev) && !isNaN(numCurrent)) {
        return numPrev !== numCurrent;
      }
    }
    
    return true;
  }

  async addProgressRecord() {
    const p = this.patient();
    if (!p || !p.email) return;
    
    this.addingProgress.set(true);
    try {
      const progressData = this.newProgress();
      await this.patientService.addProgressEntry({
        patient_email: p.email,
        ...progressData
      });
      this.resetNewProgress();
      await this.loadProgress();
      this.showSuccess.set(true);
      setTimeout(() => this.showSuccess.set(false), 3000);
    } catch (err) {
      console.error('Error adding progress entry', err);
      alert('Error al agregar el registro de progreso');
    } finally {
      this.addingProgress.set(false);
    }
  }

  toggleEdit() {
    if (!this.isEditing()) {
      this.originalEmail = this.patient()?.email;
    }
    this.isEditing.update(val => !val);
  }

  saveChanges() {
    const currentPatient = this.patient();
    if (!currentPatient) return;
    this.saving.set(true);
    
    // Update last update date
    currentPatient.ultima_actualizacion = new Date().toISOString();

    const updatePayload = {
      ...currentPatient,
      originalEmail: this.originalEmail,
      action: "update"
    };

    this.sendUpdate(updatePayload, true);
  }

  toggleDeactivation() {
    const currentPatient = this.patient();
    if (!currentPatient) return;
    
    currentPatient.ultima_actualizacion = new Date().toISOString();
    
    const updatePayload = {
      email: currentPatient.email,
      nombre: currentPatient.nombre,
      dado_de_baja: currentPatient.dado_de_baja,
      acceso_portal: currentPatient.dado_de_baja ? false : currentPatient.acceso_portal,
      ultima_actualizacion: currentPatient.ultima_actualizacion,
      action: "update"
    };

    if (currentPatient.dado_de_baja) {
      currentPatient.acceso_portal = false;
    }

    this.sendUpdate(updatePayload, false);
  }

  togglePortalAccess() {
    const currentPatient = this.patient();
    if (!currentPatient) return;
    
    currentPatient.ultima_actualizacion = new Date().toISOString();
    
    const updatePayload = {
      email: currentPatient.email,
      nombre: currentPatient.nombre,
      acceso_portal: currentPatient.acceso_portal,
      ultima_actualizacion: currentPatient.ultima_actualizacion,
      action: "update"
    };

    this.sendUpdate(updatePayload, false);
  }

  private async sendUpdate(payload: any, exitEditMode: boolean) {
    try {
      await this.patientService.addPatientEntry(payload);
      this.saving.set(false);
      if (exitEditMode) this.isEditing.set(false);
      
      this.saved.emit();
      
      const isFileUpdate = payload.action === "update" && payload.current_menus;
      this.toast.set({ 
        message: isFileUpdate ? 'Archivos subidos y paciente notificado' : 'Cambios guardados correctamente', 
        type: 'success' 
      });
      setTimeout(() => this.toast.set({ message: '', type: null }), 5000);
      
    } catch (error) {
      console.error('Error in sendUpdate:', error);
      this.saving.set(false);
      this.isUploadingMenu.set(false);
      this.toast.set({ message: 'Error al procesar la solicitud', type: 'error' });
      setTimeout(() => this.toast.set({ message: '', type: null }), 5000);
    }
  }

  addMenuSlot() {
    if (this.menuFilesToUpload().length < 4) {
      this.menuFilesToUpload.update(files => [...files, { file: null, name: `Archivo ${files.length + 1}` }]);
    }
  }

  removeMenuSlot(index: number) {
    this.menuFilesToUpload.update(files => files.filter((_, i) => i !== index));
  }

  onFileSelected(event: Event, index: number) {
    const fileInput = event.target as HTMLInputElement;
    if (fileInput.files && fileInput.files.length > 0) {
      const file = fileInput.files[0];
      this.menuFilesToUpload.update(files => {
        const newFiles = [...files];
        newFiles[index].file = file;
        return newFiles;
      });
    }
  }

  async uploadMenus() {
    const filesToUpload = this.menuFilesToUpload().filter(m => m.file !== null);
    if (filesToUpload.length === 0) return;

    const p = this.patient();
    if (!p || !p.email) return;

    this.isUploadingMenu.set(true);
    try {
      // Eliminar menús anteriores de Supabase Storage para evitar fugas de espacio
      const oldMenus = p.current_menus || [];
      if (oldMenus.length > 0) {
        const filesToDelete = oldMenus
          .map((m: any) => {
            if (!m.url) return null;
            try {
              return m.url.substring(m.url.lastIndexOf('/') + 1);
            } catch (e) {
              return null;
            }
          })
          .filter(Boolean) as string[];

        if (filesToDelete.length > 0) {
          await supabase.storage
            .from('patient_menus')
            .remove(filesToDelete);
        }
      } else if (p.menu_url) {
        try {
          const oldFileName = p.menu_url.substring(p.menu_url.lastIndexOf('/') + 1);
          await supabase.storage.from('patient_menus').remove([oldFileName]);
        } catch (e) {
          console.error('Failed to clean up legacy menu_url:', e);
        }
      }

      const uploadedMenus = [];

      for (let i = 0; i < filesToUpload.length; i++) {
        const item = filesToUpload[i];
        const fileName = `menu_${p.email}_${Date.now()}_${i}.pdf`;
        
        const { error } = await supabase.storage
          .from('patient_menus')
          .upload(fileName, item.file!, { 
            upsert: true,
            contentType: 'application/pdf',
            cacheControl: '3600'
          });

        if (error) throw error;

        const { data: publicUrlData } = supabase.storage
          .from('patient_menus')
          .getPublicUrl(fileName);

        uploadedMenus.push({
          name: item.name,
          url: publicUrlData.publicUrl,
          uploaded_at: new Date().toISOString()
        });
      }

      const updatePayload = {
        email: p.email,
        current_menus: uploadedMenus,
        // Legacy support (optional)
        menu_url: uploadedMenus[0].url,
        menu_created_at: uploadedMenus[0].uploaded_at,
        action: "update"
      };

      await this.patientService.addPatientEntry(updatePayload);
      
      // Update local state
      p.current_menus = uploadedMenus;
      
      try {
        const apiUrl = `${environment.apiUrl}/notify-menu`;
        const token = this.authService.accessToken;
        
        await fetch(apiUrl, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ 
            email: p.email, 
            nombre: p.nombre || 'Paciente',
            menus: uploadedMenus.map(m => ({ name: m.name, url: m.url }))
          })
        });
      } catch (e) {
        console.error('Error sending email notification', e);
      }
      
      this.toast.set({ message: 'Archivos subidos y paciente notificado correctamente', type: 'success' });
      this.highlightCopy.set(true);
      setTimeout(() => this.toast.set({ message: '', type: null }), 5000);
      
      // Reset upload slots
      this.menuFilesToUpload.set([{ file: null, name: 'Menú Principal' }]);
    } catch (err) {
      console.error('Error uploading menus', err);
      this.toast.set({ message: 'Error al subir los archivos. Por favor intenta de nuevo.', type: 'error' });
      setTimeout(() => this.toast.set({ message: '', type: null }), 5000);
    } finally {
      this.isUploadingMenu.set(false);
    }
  }

  copyToClipboard() {
    const p = this.patient();
    const patientName = p?.nombre || 'Paciente';
    const menus = p?.current_menus || [];
    
    let message = `¡Hola ${patientName}!\n`;
    message += `El plan alimenticio ya se encuentra listo. 🥗🍎 Adjunto a este mensaje se envía el menú correspondiente. 🥑🍗 Si surge alguna duda o se necesita algo adicional, favor de escribir por este medio para darle seguimiento. 🥦🥛 ¡Excelente día!\n\n`;

    if (menus.length > 0) {
      if (menus.length === 1) {
        message += menus[0].url;
      } else {
        message += `Archivos disponibles:\n`;
        menus.forEach((m: any) => {
          message += `- ${m.name}: ${m.url}\n`;
        });
      }
    } else if (p?.menu_url) {
      message += p.menu_url;
    } else {
      return;
    }

    navigator.clipboard.writeText(message).then(() => {
      this.copied.set(true);
      this.highlightCopy.set(false); // Reset highlight when copied
      setTimeout(() => this.copied.set(false), 2000);
    });
  }
}
