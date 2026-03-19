import { Component, OnInit, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { PatientService } from '../../services/patient';

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

  constructor(private patientService: PatientService) {}

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
      await this.patientService.addProgressEntry({
        patient_email: p.email,
        ...this.newProgress()
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
    this.isEditing.update(val => !val);
  }

  saveChanges() {
    const currentPatient = this.patient();
    if (!currentPatient) return;
    this.saving.set(true);
    
    // Global update: Send everything
    const updatePayload = {
      ...currentPatient,
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
}
