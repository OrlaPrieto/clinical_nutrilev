import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

export interface Appointment {
  hasAppointment: boolean;
  eventId?: string;
  summary?: string;
  description?: string;
  start?: string;
  end?: string;
  status?: 'pending' | 'confirmed' | 'cancelled';
  colorId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {
  private readonly apiUrl = `${environment.apiUrl}/appointments`;
  private authService = inject(AuthService);
  private http = inject(HttpClient);

  constructor() {}

  async getNextAppointment(email: string): Promise<Appointment> {
    if (this.authService.isDevMode()) {
      // Mock tomorrow's appointment in Dev Mode
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 30, 0, 0);

      const cachedStatus = localStorage.getItem('mock_appointment_status') as any;

      return new Promise(resolve => setTimeout(() => resolve({
        hasAppointment: true,
        eventId: 'mock-event-id-999',
        summary: 'Consulta de Seguimiento Nutrición',
        description: `Paciente: ${email}\nConsulta clínica presencial.`,
        start: tomorrow.toISOString(),
        end: new Date(tomorrow.getTime() + 60*60*1000).toISOString(),
        status: cachedStatus || 'pending',
        colorId: cachedStatus === 'confirmed' ? '10' : (cachedStatus === 'cancelled' ? '11' : '2')
      }), 500));
    }

    return firstValueFrom(this.http.get<Appointment>(`${this.apiUrl}/next/${email}`));
  }

  async confirmAppointment(email: string, eventId: string): Promise<any> {
    if (this.authService.isDevMode()) {
      localStorage.setItem('mock_appointment_status', 'confirmed');
      return new Promise(resolve => setTimeout(() => resolve({ success: true, status: 'confirmed' }), 500));
    }

    return firstValueFrom(this.http.post<any>(`${this.apiUrl}/confirm`, { email, eventId }));
  }

  async cancelAppointment(email: string, eventId: string): Promise<any> {
    if (this.authService.isDevMode()) {
      localStorage.setItem('mock_appointment_status', 'cancelled');
      return new Promise(resolve => setTimeout(() => resolve({ success: true, status: 'cancelled' }), 500));
    }

    return firstValueFrom(this.http.post<any>(`${this.apiUrl}/cancel`, { email, eventId }));
  }
}

