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

  constructor(private patientService: PatientService) {}

  saveChanges() {
    if (!this.patient) return;
    this.saving = true;
    
    const updatePayload = {
      action: "update",
      email: this.patient.email,
      motivos_consulta: this.patient.motivos_consulta || '',
      alimentos_preferidos: this.patient.alimentos_preferidos || '',
      alimentos_no_agradan: this.patient.alimentos_no_agradan || '',
      alergias_alimentarias: this.patient.alergias_alimentarias || '',
      ejercicio_detalles: this.patient.ejercicio_detalles || '',
      tipo_actividad_horario: this.patient.tipo_actividad_horario || '',
      notas: this.patient.notas || ''
    };

    this.patientService.addPatientEntry(updatePayload).subscribe({
      next: () => {
        this.saving = false;
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
