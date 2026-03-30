import { Injectable, inject } from '@angular/core';
import { Patient } from '../models/patient.model';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';
import { PatientProgress, ShoppingCategory, PatientUpdate, PatientProgressInsert } from '@shared/models/interfaces';
import { User } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root'
})
export class PatientService {
  private readonly apiUrl = `${environment.apiUrl}/patients`;
  private authService = inject(AuthService);

  constructor() { }

  private get headers(): Record<string, string> {
    const reqHeaders: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    const token = this.authService.accessToken;
    if (token) {
      reqHeaders['Authorization'] = `Bearer ${token}`;
    }
    
    // Legacy support for x-user-email if still needed by some old guards
    const user = this.authService.currentUser();
    if (user?.email) {
      reqHeaders['x-user-email'] = user.email;
    }
    
    return reqHeaders;
  }

  async getPatients(): Promise<Patient[]> {
    const response = await fetch(this.apiUrl, {
      headers: this.headers
    });
    if (!response.ok) throw new Error('Error fetching patients');
    return response.json();
  }

  async getPatientByEmail(email: string): Promise<Patient> {
    const response = await fetch(`${this.apiUrl}/${email}`, {
      headers: this.headers
    });
    if (!response.ok) throw new Error('Error fetching patient');
    return response.json();
  }

  async addPatientEntry(
    payload: PatientUpdate & { action?: string; originalEmail?: string },
  ): Promise<any> {
    const { action, email, originalEmail } = payload;
    
    if (action === 'update') {
      // Prioritize ID (UUID) for reliable identification with non-unique emails
      const targetId = payload.id || originalEmail || email;
      const response = await fetch(`${this.apiUrl}/${targetId}`, {
        method: 'PUT',
        headers: this.headers,
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('Error updating patient');
      return response.json();
    }

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('Error adding patient');
    return response.json();
  }

  async deletePatient(email: string, name: string): Promise<any> {
    const response = await fetch(`${this.apiUrl}/${email || name}`, {
      method: 'DELETE',
      headers: this.headers
    });
    if (!response.ok) throw new Error('Error deleting patient');
    return response.json();
  }

  // Progress Tracking Methods
  async getPatientProgress(email: string): Promise<PatientProgress[]> {
    const response = await fetch(`${this.apiUrl}/${email}/progress`, {
      headers: this.headers
    });
    if (!response.ok) throw new Error('Error fetching patient progress');
    return response.json();
  }

  async addProgressEntry(entry: PatientProgressInsert): Promise<any> {
    const response = await fetch(`${this.apiUrl}/progress`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(entry)
    });
    if (!response.ok) throw new Error('Error adding progress entry');
    return response.json();
  }

  async getShoppingList(menuUrl: string): Promise<ShoppingCategory[]> {
    const response = await fetch(`${this.apiUrl}/shopping-list`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ menu_url: menuUrl })
    });
    if (!response.ok) throw new Error('Error fetching shopping list');
    return response.json();
  }
}
