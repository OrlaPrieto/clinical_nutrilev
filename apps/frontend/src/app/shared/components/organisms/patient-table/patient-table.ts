import { Component, input, output, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Patient } from '../../../../models/patient.model';
import { ButtonComponent } from '../../atoms/button/button';
import { BadgeComponent } from '../../atoms/badge/badge';
import { IconComponent } from '../../atoms/icon/icon';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-o-patient-table',
  standalone: true,
  imports: [CommonModule, ButtonComponent, BadgeComponent, IconComponent],
  templateUrl: './patient-table.html',
  styleUrl: './patient-table.css'
})
export class PatientTableOrganism {
  patients = input.required<Patient[]>();
  activeTooltipId = signal<string | null>(null);
  expandedPatientId = signal<string | null>(null);

  view = output<Patient>();
  delete = output<Patient>();
  editObjetivo = output<Patient>();
  editPaquete = output<Patient>();

  onObjetivoClick(patient: Patient, event: Event) {
    event.stopPropagation();
    this.editObjetivo.emit(patient);
  }

  onPaqueteClick(patient: Patient, event: Event) {
    event.stopPropagation();
    this.editPaquete.emit(patient);
  }

  toggleExpand(patientId: string, event: Event) {
    event.stopPropagation();
    if (this.expandedPatientId() === patientId) {
      this.expandedPatientId.set(null);
    } else {
      this.expandedPatientId.set(patientId);
    }
  }

  toggleTooltip(id: string, event: Event) {
    event.stopPropagation();
    if (this.activeTooltipId() === id) {
      this.activeTooltipId.set(null);
    } else {
      this.activeTooltipId.set(id);
    }
  }

  @HostListener('document:click')
  onDocumentClick() {
    this.activeTooltipId.set(null);
  }

  getMenuStatus(patient: Patient): 'active' | 'expired' | 'none' {
    if (!patient.menu_url || !patient.menu_created_at) return 'none';
    const createdAt = new Date(patient.menu_created_at).getTime();
    const now = Date.now();
    const diffDays = (now - createdAt) / (1000 * 60 * 60 * 24);
    const limit = patient.plan_duration_days != null ? Number(patient.plan_duration_days) : environment.menuDurationDays;
    return diffDays <= limit ? 'active' : 'expired';
  }

  openMenu(url: string, event: Event) {
    event.stopPropagation();
    if (url) {
      window.open(url, '_blank', 'noopener');
    }
  }
}
