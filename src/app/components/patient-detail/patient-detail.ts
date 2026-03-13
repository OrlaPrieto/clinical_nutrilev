import { Component, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PatientService } from '../../services/patient';

@Component({
  selector: 'app-patient-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './patient-detail.html',
  styleUrl: './patient-detail.css'
})
export class PatientDetailComponent {
  patient = input<any | null>(null);
  activeTab = signal<number>(0);
  saving = signal<boolean>(false);
  showSuccess = signal<boolean>(false);
  isEditing = signal<boolean>(false);

  constructor(private patientService: PatientService) {}

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

  private sendUpdate(payload: any, exitEditMode: boolean) {
    this.patientService.addPatientEntry(payload).subscribe({
      next: () => {
        this.saving.set(false);
        if (exitEditMode) this.isEditing.set(false);
        this.showSuccess.set(true);
        setTimeout(() => this.showSuccess.set(false), 3000);
      },
      error: (err) => {
        console.error('Error al guardar cambios', err);
        this.saving.set(false);
        alert('Error al guardar los cambios');
      }
    });
  }
}
