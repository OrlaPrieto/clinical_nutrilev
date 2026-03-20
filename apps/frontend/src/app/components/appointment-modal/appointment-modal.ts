import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GoogleCalendarService } from '../../services/google-calendar.service';
import { AppointmentCalendarOrganism } from '../../shared/components/organisms/appointment-calendar/appointment-calendar';

@Component({
  selector: 'app-appointment-modal',
  standalone: true,
  imports: [CommonModule, AppointmentCalendarOrganism],
  templateUrl: './appointment-modal.html',
  styleUrl: './appointment-modal.css'
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

    const startDateTime = `${event.selectedDate}T${event.startTime}:00`;
    const endDateTime = `${event.selectedDate}T${event.endTime}:00`;
    
    const startDate = new Date(startDateTime);
    const endDate = new Date(endDateTime);

    this.calendarService.createEvent(
      this.patientName,
      this.patientEmail,
      startDate.toISOString(),
      endDate.toISOString(),
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
