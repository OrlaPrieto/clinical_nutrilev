import { Injectable } from '@angular/core';
import { Patient } from '../models/patient.model';
import { supabase } from '../supabase';

@Injectable({
  providedIn: 'root'
})
export class PatientService {
  private readonly apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000/api/patients' : '/api/patients';

  constructor() { }

  async getPatients(): Promise<Patient[]> {
    const response = await fetch(this.apiUrl);
    if (!response.ok) throw new Error('Error fetching patients');
    return response.json();
  }

  async addPatientEntry(payload: any): Promise<any> {
    const { action, email, originalEmail, ...data } = payload;
    
    if (action === 'update') {
      const id = payload.id; // Assume id is present if it's an update
      const targetId = id || originalEmail || email;
      const response = await fetch(`${this.apiUrl}/${targetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('Error updating patient');
      return response.json();
    }

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('Error adding patient');
    return response.json();
  }

  async deletePatient(email: string, name: string): Promise<any> {
    // Note: delete endpoint not yet implemented in NestJS, but we'll adapt it
    const response = await fetch(`${this.apiUrl}/${email || name}`, {
      method: 'DELETE'
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry)
    });
    if (!response.ok) throw new Error('Error adding progress entry');
    return response.json();
  }
}
