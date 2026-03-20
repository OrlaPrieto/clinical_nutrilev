import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../../atoms/button/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-patient-header',
  standalone: true,
  imports: [CommonModule, ButtonComponent, MatIconModule],
  templateUrl: './patient-header.html',
  styleUrl: './patient-header.css'
})
export class PatientHeaderOrganism {
  patient = input.required<any>();
  isEditing = input<boolean>(false);
  saving = input<boolean>(false);

  editToggle = output<void>();
  save = output<void>();
  emailChange = output<string>();
}
