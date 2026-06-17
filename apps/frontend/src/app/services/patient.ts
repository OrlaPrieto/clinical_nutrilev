import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Patient } from '../models/patient.model';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';
import { PatientProgress, ShoppingCategory, PatientUpdate, PatientProgressInsert } from '@shared/models/interfaces';
import { MOCK_PATIENTS, MOCK_PROGRESS } from '../shared/mocks/mock-data';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class PatientService {
  private readonly apiUrl = `${environment.apiUrl}/patients`;
  private authService = inject(AuthService);
  private http = inject(HttpClient);

  // Cache stores
  private patientsListCache: CacheEntry<Patient[]> | null = null;
  private patientByEmailCache = new Map<string, CacheEntry<Patient>>();
  private patientProgressCache = new Map<string, CacheEntry<PatientProgress[]>>();
  private readonly cacheDuration = 5 * 60 * 1000; // 5 minutes

  constructor() { }

  private isCacheValid<T>(entry: CacheEntry<T> | null | undefined): boolean {
    if (!entry) return false;
    return (Date.now() - entry.timestamp) < this.cacheDuration;
  }

  private invalidateCache(): void {
    this.patientsListCache = null;
    this.patientByEmailCache.clear();
    this.patientProgressCache.clear();
  }

  async getPatients(forceRefresh = false): Promise<Patient[]> {
    if (!forceRefresh && this.isCacheValid(this.patientsListCache)) {
      return this.patientsListCache!.data;
    }

    const data = await (async () => {
      if (this.authService.isDevMode()) {
        return new Promise<Patient[]>(resolve => setTimeout(() => resolve(MOCK_PATIENTS), 500));
      }
      return firstValueFrom(this.http.get<Patient[]>(this.apiUrl));
    })();

    this.patientsListCache = { data, timestamp: Date.now() };
    return data;
  }

  async getPatientByEmail(email: string, forceRefresh = false): Promise<Patient> {
    const cached = this.patientByEmailCache.get(email);
    if (!forceRefresh && this.isCacheValid(cached)) {
      return cached!.data;
    }

    const data = await (async () => {
      if (this.authService.isDevMode()) {
        const p = MOCK_PATIENTS.find(p => p.email === email) || MOCK_PATIENTS[0];
        return new Promise<Patient>(resolve => setTimeout(() => resolve(p), 500));
      }
      return firstValueFrom(this.http.get<Patient>(`${this.apiUrl}/${email}`));
    })();

    this.patientByEmailCache.set(email, { data, timestamp: Date.now() });
    return data;
  }

  async addPatientEntry(
    payload: PatientUpdate & { action?: string; originalEmail?: string },
  ): Promise<any> {
    const { action, email, originalEmail } = payload;
    let result;
    
    if (action === 'update') {
      // Prioritize ID (UUID) for reliable identification with non-unique emails
      const targetId = payload.id || originalEmail || email;
      result = await firstValueFrom(this.http.put<any>(`${this.apiUrl}/${targetId}`, payload));
    } else {
      result = await firstValueFrom(this.http.post<any>(this.apiUrl, payload));
    }

    this.invalidateCache();
    return result;
  }

  async deletePatient(email: string, name: string): Promise<any> {
    const result = await firstValueFrom(this.http.delete<any>(`${this.apiUrl}/${email || name}`));
    this.invalidateCache();
    return result;
  }

  // Progress Tracking Methods
  async getPatientProgress(email: string, forceRefresh = false): Promise<PatientProgress[]> {
    const cached = this.patientProgressCache.get(email);
    if (!forceRefresh && this.isCacheValid(cached)) {
      return cached!.data;
    }

    const data = await (async () => {
      if (this.authService.isDevMode()) {
        const prog = MOCK_PROGRESS.filter(p => p.patient_email === email);
        return new Promise<PatientProgress[]>(resolve => setTimeout(() => resolve(prog), 500));
      }
      return firstValueFrom(this.http.get<PatientProgress[]>(`${this.apiUrl}/${email}/progress`));
    })();

    this.patientProgressCache.set(email, { data, timestamp: Date.now() });
    return data;
  }

  async addProgressEntry(entry: PatientProgressInsert): Promise<any> {
    const result = await firstValueFrom(this.http.post<any>(`${this.apiUrl}/progress`, entry));
    this.invalidateCache();
    return result;
  }

  async updateProgressEntry(id: string, entry: Partial<PatientProgress>): Promise<any> {
    let result;
    if (this.authService.isDevMode()) {
      const index = MOCK_PROGRESS.findIndex(p => p.id === id);
      if (index !== -1) {
        MOCK_PROGRESS[index] = { ...MOCK_PROGRESS[index], ...entry };
        result = await new Promise(resolve => setTimeout(() => resolve(MOCK_PROGRESS[index]), 500));
      } else {
        throw new Error('Progress entry not found in mock data');
      }
    } else {
      result = await firstValueFrom(this.http.put<any>(`${this.apiUrl}/progress/${id}`, entry));
    }

    this.invalidateCache();
    return result;
  }

  async deleteProgressEntry(id: string): Promise<any> {
    let result;
    if (this.authService.isDevMode()) {
      const index = MOCK_PROGRESS.findIndex(p => p.id === id);
      if (index !== -1) {
        const removed = MOCK_PROGRESS.splice(index, 1);
        result = await new Promise(resolve => setTimeout(() => resolve(removed[0]), 500));
      } else {
        throw new Error('Progress entry not found in mock data');
      }
    } else {
      result = await firstValueFrom(this.http.delete<any>(`${this.apiUrl}/progress/${id}`));
    }

    this.invalidateCache();
    return result;
  }

  async getShoppingList(menuUrl: string): Promise<ShoppingCategory[]> {
    return firstValueFrom(this.http.post<ShoppingCategory[]>(`${this.apiUrl}/shopping-list`, { menu_url: menuUrl }));
  }
}

