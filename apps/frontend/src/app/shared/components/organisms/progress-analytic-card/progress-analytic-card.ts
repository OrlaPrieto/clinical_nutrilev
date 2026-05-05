import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Patient, PatientProgress } from '@shared/models/interfaces';
import { IconComponent } from '../../atoms/icon/icon';

@Component({
  selector: 'app-progress-analytic-card',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './progress-analytic-card.html'
})
export class ProgressAnalyticCardComponent {
  progress = input.required<PatientProgress>();
  patient = input<Patient | null>(null);
}
