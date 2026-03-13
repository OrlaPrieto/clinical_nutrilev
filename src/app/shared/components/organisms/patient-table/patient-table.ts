import { Component, input, output, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Patient } from '../../../../models/patient.model';
import { ButtonComponent } from '../../atoms/button/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-patient-table',
  standalone: true,
  imports: [CommonModule, ButtonComponent, MatIconModule],
  templateUrl: './patient-table.html',
  styleUrl: './patient-table.css'
})
export class PatientTableOrganism {
  patients = input.required<Patient[]>();
  activeTooltipId = signal<string | null>(null);

  view = output<Patient>();
  delete = output<Patient>();
  schedule = output<Patient>();

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
}
