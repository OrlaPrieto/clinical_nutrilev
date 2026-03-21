import { Injectable, inject } from '@angular/core';
import { Patient } from '../models/patient.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class PatientService {
  private readonly apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000/api/patients' : '/api/patients';
  private authService = inject(AuthService);

  constructor() { }

  private get headers(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    const userEmail = this.authService.currentUser()?.email;
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
    const { action, email, originalEmail, ...data } = payload;
    
    if (action === 'update') {
      const id = payload.id;
      const targetId = id || originalEmail || email;
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
  async getPatientProgress(email: string): Promise<any[]> {
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
}
