import { Component, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Patient, PatientProgress } from '@shared/models/interfaces';

@Component({
  selector: 'app-progress-analytic-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './progress-analytic-card.html'
})
export class ProgressAnalyticCardComponent {
  progress = input.required<PatientProgress>();
  patient = input<Patient | null>(null);
  hoveredPart = signal<string | null>(null);

  togglePart(part: string) {
    if (this.hoveredPart() === part) {
      this.hoveredPart.set(null);
    } else {
      this.hoveredPart.set(part);
    }
  }
}
