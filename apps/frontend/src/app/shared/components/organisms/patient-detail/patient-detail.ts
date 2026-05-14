import { Component, OnInit, input, signal, computed } from '@angular/core';
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
import { NutriImagePipe } from '../../../pipes/nutri-image.pipe';
import { environment } from '../../../../../environments/environment';
import { toBlob } from 'html-to-image';
import { ProgressAnalyticCardComponent } from '../progress-analytic-card/progress-analytic-card';

@Component({
  selector: 'app-o-patient-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent, IconComponent, InputComponent, BadgeComponent, StatCardComponent, DetailFieldComponent, NutriImagePipe, ProgressAnalyticCardComponent],
  templateUrl: './patient-detail.html',
  styleUrl: './patient-detail.scss'
})
export class PatientDetailComponent implements OnInit {
  patient = input<any | null>(null);
  activeTab = signal<number>(0);
  saving = signal<boolean>(false);
  showSuccess = signal<boolean>(false);
  isEditing = signal<boolean>(false);
  copyingRecordId = signal<string | null>(null);
  viewMode = signal<'cards' | 'table'>('cards');
  selectedRecordForDetail = signal<any | null>(null);
  showMenuModal = signal<boolean>(false);
  toast = signal<{ message: string; type: 'success' | 'error' | null }>({ message: '', type: null });
  highlightCopy = signal<boolean>(false);

  
  // Progress signals
  progressHistory = signal<any[]>([]);
  newProgress = signal<any>({ 
    weight: null, body_fat: null, muscle_mass: null, 
    agua_corporal: null, proteinas: null, minerales: null, masa_grasa: null, 
    musculo_esqueletico: null, masa_magra: null, imc: null, pgc: null,
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

  ngOnInit() {
    this.loadProgress();
  }

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

  totalProgressSummary = computed(() => {
    const history = this.progressHistory();
    if (history.length < 2) return null;

    const current = history[0];
    const initial = history[history.length - 1];

    return {
      weight: (Number(current.weight) || 0) - (Number(initial.weight) || 0),
      fat: (Number(current.body_fat) || 0) - (Number(initial.body_fat) || 0),
      muscle: (Number(current.muscle_mass) || 0) - (Number(initial.muscle_mass) || 0)
    };
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
      } catch (err) {
        console.error('Error loading progress history', err);
      }
    }
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
      // Reset form and reload
      this.newProgress.set({ 
        weight: null, body_fat: null, muscle_mass: null,
        agua_corporal: null, proteinas: null, minerales: null, masa_grasa: null, 
        musculo_esqueletico: null, masa_magra: null, imc: null, pgc: null,
        brazo_der_grasa: null, brazo_der_musculo: null, brazo_der_cm: null,
        brazo_izq_grasa: null, brazo_izq_musculo: null, brazo_izq_cm: null,
        tronco_grasa: null, tronco_musculo: null,
        pierna_der_grasa: null, pierna_der_musculo: null, pierna_der_cm: null,
        pierna_izq_grasa: null, pierna_izq_musculo: null, pierna_izq_cm: null,
        icc: null, gv: null, abdomen: null, cintura: null, cadera: null,
        edad_metabolica: null, presion_arterial: '', pulso: null, pliegue_cutaneo: null,
        notes: '' 
      });
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
    
    // Global update: Send everything
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
    
    const updatePayload = {
      email: currentPatient.email,
      nombre: currentPatient.nombre,
      dado_de_baja: currentPatient.dado_de_baja,
      acceso_portal: currentPatient.dado_de_baja ? false : currentPatient.acceso_portal,
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
    
    const updatePayload = {
      email: currentPatient.email,
      nombre: currentPatient.nombre,
      acceso_portal: currentPatient.acceso_portal,
      action: "update"
    };

    this.sendUpdate(updatePayload, false);
  }

  private async sendUpdate(payload: any, exitEditMode: boolean) {
    try {
      await this.patientService.addPatientEntry(payload);
      this.saving.set(false);
      if (exitEditMode)      this.isUploadingMenu.set(false);
      this.toast.set({ message: 'Archivos subidos y paciente notificado correctamente', type: 'success' });
      setTimeout(() => this.toast.set({ message: '', type: null }), 5000);
      
    } catch (error) {
      console.error('Error uploading menus:', error);
      this.isUploadingMenu.set(false);
      this.toast.set({ message: 'Error al subir los archivos. Por favor intenta de nuevo.', type: 'error' });
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
      const uploadedMenus = [];

      for (let i = 0; i < filesToUpload.length; i++) {
        const item = filesToUpload[i];
        const fileName = `menu_${p.email}_${Date.now()}_${i}.pdf`;
        
        const { error } = await supabase.storage
          .from('patient_menus')
          .upload(fileName, item.file!, { upsert: true });

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

  async copyProgressAsImage(entry: any, elementContainer: HTMLElement) {
    if (!elementContainer) return;
    
    const originalDisplay = elementContainer.style.display;
    elementContainer.style.display = 'block'; // Hacerlo visible temporalmente para html-to-image
    this.copyingRecordId.set(entry.id || entry.date);

    try {
      // Find the inner container
      const targetElement = elementContainer.querySelector('.progress-analytic-card-container') as HTMLElement;
      if (!targetElement) throw new Error('Target element not found');

      // Add a slight delay to ensure the DOM is fully rendered (especially SVG and web fonts)
      await new Promise(resolve => setTimeout(resolve, 100));

      const blob = await toBlob(targetElement, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#ffffff', // Asegurar fondo blanco sólido para contraste
        style: {
          transform: 'none',
          borderRadius: '0',
          boxShadow: 'none'
        }
      });
      
      if (!blob) throw new Error('Failed to generate image blob');
      
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blob
        })
      ]);
      
      console.log('Image copied to clipboard successfully!');
    } catch (err) {
      console.error('Error copying image:', err);
    } finally {
      elementContainer.style.display = originalDisplay;
      this.copyingRecordId.set(null);
    }
  }

  calculateDelta(current: any, previous: any, field: string): number | null {
    if (current === null || current === undefined || previous === null || previous === undefined) return null;
    
    const currVal = Number(current[field]);
    const prevVal = Number(previous[field]);

    if (isNaN(currVal) || isNaN(prevVal)) return null;
    
    return currVal - prevVal;
  }

  getDeltaColor(delta: number, field: string): string {
    if (delta === 0) return 'text-slate-400';
    
    // Logic for "good" or "bad" changes
    const positiveIsGoodFields = [
      'muscle_mass', 'musculo_esqueletico', 'masa_magra', 'proteinas',
      'brazo_der_musculo', 'brazo_izq_musculo', 'tronco_musculo', 'pierna_der_musculo', 'pierna_izq_musculo'
    ];
    const negativeIsGoodFields = [
      'weight', 'body_fat', 'pgc', 'gv', 'masa_grasa', 'imc', 'cintura', 'abdomen', 'cadera',
      'brazo_der_grasa', 'brazo_izq_grasa', 'tronco_grasa', 'pierna_der_grasa', 'pierna_izq_grasa',
      'icc', 'edad_metabolica', 'pliegue_cutaneo'
    ];

    if (positiveIsGoodFields.includes(field)) {
      return delta > 0 ? 'text-green-500' : 'text-rose-500';
    }
    
    if (negativeIsGoodFields.includes(field)) {
      return delta < 0 ? 'text-green-500' : 'text-rose-500';
    }

    return 'text-nutri-rose';
  }

  getPreviousRecord(record: any): any | null {
    const history = this.progressHistory();
    const index = history.findIndex(r => r.id === record.id || (r.date === record.date && r.weight === record.weight));
    return index !== -1 && index < history.length - 1 ? history[index + 1] : null;
  }

}
