import { Component, OnInit, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { PatientService } from '../../services/patient';
import { AuthService } from '../../services/auth.service';
import { supabase } from '../../supabase';

@Component({
  selector: 'app-patient-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './patient-detail.html',
  styleUrl: './patient-detail.css'
})
export class PatientDetailComponent implements OnInit {
  patient = input<any | null>(null);
  activeTab = signal<number>(0);
  saving = signal<boolean>(false);
  showSuccess = signal<boolean>(false);
  isEditing = signal<boolean>(false);
  
  // Progress signals
  progressHistory = signal<any[]>([]);
  newProgress = signal<any>({ weight: null, body_fat: null, muscle_mass: null, notes: '' });
  addingProgress = signal<boolean>(false);
  isUploadingMenu = signal<boolean>(false);
  lastGeneratedUrl = signal<string | null>(null);
  copied = signal<boolean>(false);
  originalEmail = '';

  constructor(private patientService: PatientService, private authService: AuthService) {}

  ngOnInit() {
    this.loadProgress();
  }

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
      this.newProgress.set({ weight: null, body_fat: null, muscle_mass: null, notes: '' });
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
      if (exitEditMode) this.isEditing.set(false);
      this.showSuccess.set(true);
      setTimeout(() => this.showSuccess.set(false), 3000);
    } catch (err) {
      console.error('Error al guardar cambios', err);
      this.saving.set(false);
      alert('Error al guardar los cambios');
    }
  }

  async uploadMenu(event: Event) {
    const fileInput = event.target as HTMLInputElement;
    if (!fileInput.files || fileInput.files.length === 0) return;
    const file = fileInput.files[0];
    const p = this.patient();
    if (!p || !p.email) return;

    this.isUploadingMenu.set(true);
    try {
      const fileName = `menu_${p.email}.pdf`;

      const { data, error } = await supabase.storage
        .from('patient_menus')
        .upload(fileName, file, { upsert: true });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from('patient_menus')
        .getPublicUrl(fileName);

      p.menu_url = publicUrlData.publicUrl;
      p.menu_created_at = new Date().toISOString();
      
      const updatePayload = {
        email: p.email,
        menu_url: p.menu_url,
        menu_created_at: p.menu_created_at,
        action: "update"
      };

      await this.patientService.addPatientEntry(updatePayload);
      
      try {
        this.lastGeneratedUrl.set(p.menu_url);
        
        const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000/api/notify-menu' : '/api/notify-menu';
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
            menu_url: p.menu_url
          })
        });
      } catch (e) {
        console.error('Error enviando notificación de correo', e);
      }
      
      this.showSuccess.set(true);
      setTimeout(() => this.showSuccess.set(false), 3000);
    } catch (err) {
      console.error('Error uploading menu', err);
      alert('Error al subir el menú. Verifica que el archivo no sea muy grande y que el bucket "patient_menus" exista.');
    } finally {
      this.isUploadingMenu.set(false);
      fileInput.value = ''; // Reset input
    }
  }

  copyToClipboard() {
    const url = this.lastGeneratedUrl();
    if (url) {
      navigator.clipboard.writeText(url).then(() => {
        this.copied.set(true);
        setTimeout(() => this.copied.set(false), 2000);
      });
    }
  }
}
