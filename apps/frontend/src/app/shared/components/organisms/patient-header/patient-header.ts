import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../../atoms/button/button';
import { IconComponent } from '../../atoms/icon/icon';
import { NutriImagePipe } from '../../../pipes/nutri-image.pipe';

@Component({
  selector: 'app-o-patient-header',
  standalone: true,
  imports: [CommonModule, ButtonComponent, IconComponent, NutriImagePipe],
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
