import { Component, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GoogleCalendarService } from '../../../../services/google-calendar.service';
import { AppointmentCalendarOrganism } from '../appointment-calendar/appointment-calendar';

@Component({
  selector: 'app-o-appointment-modal',
  standalone: true,
  imports: [CommonModule, AppointmentCalendarOrganism],
  templateUrl: './appointment-modal.html',
  styleUrl: './appointment-modal.css',
  encapsulation: ViewEncapsulation.None
})
export class AppointmentModalComponent {
  @Input() patientName: string = '';
  @Input() patientEmail: string = '';
  @Output() onScheduled = new EventEmitter<any>();
  @Output() onClosed = new EventEmitter<void>();

  loading: boolean = false;
  errorMessage: string | null = null;
  
  constructor(private calendarService: GoogleCalendarService) {}

  close() {
    if (!this.loading) {
      this.onClosed.emit();
    }
  }

  handleScheduled(event: any) {
    this.loading = true;
    this.errorMessage = null;

    // Enforce America/Chihuahua (UTC-6) RFC 3339 format
    const startIso = `${event.selectedDate}T${event.startTime}:00-06:00`;
    const endIso = `${event.selectedDate}T${event.endTime}:00-06:00`;

    this.calendarService.createEvent(
      this.patientName,
      this.patientEmail,
      startIso,
      endIso,
      event.cost,
      event.appointmentNumber
    ).subscribe({
      next: (res) => {
        this.loading = false;
        this.onScheduled.emit(res);
      },
      error: (err) => {
        console.error('Error scheduling appointment', err);
        this.loading = false;
        if (err.status === 401) {
          this.errorMessage = 'Tu sesión ha expirado o no tienes permisos. Vuelve a iniciar sesión.';
        } else {
          this.errorMessage = 'Error de conexión. Inténtalo de nuevo.';
        }
      }
    });
  }
}
