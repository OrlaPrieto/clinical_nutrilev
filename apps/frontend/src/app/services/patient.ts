import { Injectable, inject } from '@angular/core';
import { Patient } from '../models/patient.model';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';
import { PatientProgress, ShoppingCategory } from '@shared/models/interfaces';
import { User } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root'
})
export class PatientService {
  private readonly apiUrl = `${environment.apiUrl}/patients`;
  private authService = inject(AuthService);

  constructor() { }

  private get headers(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    const user = this.authService.currentUser() as User | null;
    const userEmail = user?.email;
    if (userEmail) {
      headers['x-user-email'] = userEmail;
    }
    
    return headers;
  }

  async getPatients(): Promise<Patient[]> {
    const response = await fetch(this.apiUrl);
    if (!response.ok) throw new Error('Error fetching patients');
    return response.json();
  }

  async addPatientEntry(payload: any): Promise<any> {
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
    const response = await fetch(`${this.apiUrl}/${email}/progress`);
    if (!response.ok) throw new Error('Error fetching patient progress');
    return response.json();
  }

  async addProgressEntry(entry: any): Promise<any> {
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
