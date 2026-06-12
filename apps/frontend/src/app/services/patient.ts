import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Patient } from '../models/patient.model';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';
import { PatientProgress, ShoppingCategory, PatientUpdate, PatientProgressInsert } from '@shared/models/interfaces';
import { MOCK_PATIENTS, MOCK_PROGRESS } from '../shared/mocks/mock-data';

@Injectable({
  providedIn: 'root'
})
export class PatientService {
  private readonly apiUrl = `${environment.apiUrl}/patients`;
  private authService = inject(AuthService);
  private http = inject(HttpClient);

  constructor() { }

  async getPatients(): Promise<Patient[]> {
    if (this.authService.isDevMode()) {
      return new Promise(resolve => setTimeout(() => resolve(MOCK_PATIENTS), 500));
    }
    return firstValueFrom(this.http.get<Patient[]>(this.apiUrl));
  }

  async getPatientByEmail(email: string): Promise<Patient> {
    if (this.authService.isDevMode()) {
      const p = MOCK_PATIENTS.find(p => p.email === email) || MOCK_PATIENTS[0];
      return new Promise(resolve => setTimeout(() => resolve(p), 500));
    }
    return firstValueFrom(this.http.get<Patient>(`${this.apiUrl}/${email}`));
  }

  async addPatientEntry(
    payload: PatientUpdate & { action?: string; originalEmail?: string },
  ): Promise<any> {
    const { action, email, originalEmail } = payload;
    
    if (action === 'update') {
      // Prioritize ID (UUID) for reliable identification with non-unique emails
      const targetId = payload.id || originalEmail || email;
      return firstValueFrom(this.http.put<any>(`${this.apiUrl}/${targetId}`, payload));
    }

    return firstValueFrom(this.http.post<any>(this.apiUrl, payload));
  }

  async deletePatient(email: string, name: string): Promise<any> {
    return firstValueFrom(this.http.delete<any>(`${this.apiUrl}/${email || name}`));
  }

  // Progress Tracking Methods
  async getPatientProgress(email: string): Promise<PatientProgress[]> {
    if (this.authService.isDevMode()) {
      const prog = MOCK_PROGRESS.filter(p => p.patient_email === email);
      return new Promise(resolve => setTimeout(() => resolve(prog), 500));
    }
    return firstValueFrom(this.http.get<PatientProgress[]>(`${this.apiUrl}/${email}/progress`));
  }

  async addProgressEntry(entry: PatientProgressInsert): Promise<any> {
    return firstValueFrom(this.http.post<any>(`${this.apiUrl}/progress`, entry));
  }

  async updateProgressEntry(id: string, entry: Partial<PatientProgress>): Promise<any> {
    if (this.authService.isDevMode()) {
      const index = MOCK_PROGRESS.findIndex(p => p.id === id);
      if (index !== -1) {
        MOCK_PROGRESS[index] = { ...MOCK_PROGRESS[index], ...entry };
        return new Promise(resolve => setTimeout(() => resolve(MOCK_PROGRESS[index]), 500));
      }
      throw new Error('Progress entry not found in mock data');
    }
    return firstValueFrom(this.http.put<any>(`${this.apiUrl}/progress/${id}`, entry));
  }

  async getShoppingList(menuUrl: string): Promise<ShoppingCategory[]> {
    return firstValueFrom(this.http.post<ShoppingCategory[]>(`${this.apiUrl}/shopping-list`, { menu_url: menuUrl }));
  }
}

