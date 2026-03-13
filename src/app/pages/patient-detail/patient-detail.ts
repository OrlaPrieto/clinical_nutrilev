import { Component, input, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PatientService } from '../../services/patient';
import { PatientHeaderOrganism } from '../../shared/components/organisms/patient-header/patient-header';
import { TabNavComponent } from '../../shared/components/molecules/tab-nav/tab-nav';
import { StatCardComponent } from '../../shared/components/molecules/stat-card/stat-card';
import { ButtonComponent } from '../../shared/components/atoms/button/button';
import { BadgeComponent } from '../../shared/components/atoms/badge/badge';

@Component({
  selector: 'app-patient-detail-page',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    PatientHeaderOrganism, 
    TabNavComponent, 
    StatCardComponent,
    BadgeComponent
  ],
  templateUrl: './patient-detail.html',
  styleUrl: './patient-detail.css'
})
export class PatientDetailPage {
  patientInput = input<any | null>(null, { alias: 'patient' });
  
  // Signals
  activeTab = signal<number>(0);
  saving = signal<boolean>(false);
  showSuccess = signal<boolean>(false);
  isEditing = signal<boolean>(false);

  private patientService = inject(PatientService);

  toggleEdit() {
    this.isEditing.update(val => !val);
  }

  onEmailChange(newEmail: string) {
    if (this.patientInput()) {
      this.patientInput().email = newEmail;
    }
  }

  saveChanges() {
    const currentPatient = this.patientInput();
    if (!currentPatient) return;
    this.saving.set(true);
    
    const updatePayload = {
      ...currentPatient,
      action: "update"
    };

    this.sendUpdate(updatePayload, true);
  }

  toggleDeactivation() {
    const currentPatient = this.patientInput();
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
