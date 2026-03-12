import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Patient } from '../../models/patient.model';
import { PatientService } from '../../services/patient';

@Component({
  selector: 'app-patient-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './patient-detail.html',
  styleUrl: './patient-detail.css'
})
export class PatientDetailComponent {
  @Input() patient: any | null = null;
  activeTab: number = 0;
  saving: boolean = false;
  showSuccess: boolean = false;
  isEditing: boolean = false;

  constructor(private patientService: PatientService) {}

  toggleEdit() {
    this.isEditing = !this.isEditing;
  }

  saveChanges() {
    if (!this.patient) return;
    this.saving = true;
    
    // Global update: Send everything
    const updatePayload = {
      ...this.patient,
      action: "update"
    };

    this.patientService.addPatientEntry(updatePayload).subscribe({
      next: () => {
        this.saving = false;
        this.isEditing = false; // Add this line
        this.showSuccess = true;
        setTimeout(() => this.showSuccess = false, 3000);
      },
      error: (err) => {
        console.error('Error al guardar cambios', err);
        this.saving = false;
        alert('Error al guardar los cambios');
      }
    });
  }
}
