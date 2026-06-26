import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../../shared/components/atoms/icon/icon';
import { Patient } from '@shared/models/interfaces';
import { Appointment } from '../../../../services/appointment.service';

@Component({
  selector: 'app-appointment-card',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './appointment-card.html',
  styleUrl: './appointment-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppointmentCardComponent {
  nextAppointment = input<Appointment | null>(null);
  patient = input<Patient | null>(null);
  showConfirmButtons = input<boolean>(false);
  loadingAppointmentAction = input<boolean>(false);
  appointmentDateStr = input<string>('');
  rescheduleWhatsappUrl = input<string>('');

  confirm = output<void>();
  cancel = output<void>();

  confirmAppointment() {
    this.confirm.emit();
  }

  cancelAppointment() {
    this.cancel.emit();
  }

  toNumber(val: any): number {
    return Number(val);
  }
}
