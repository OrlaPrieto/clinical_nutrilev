import { Injectable } from '@angular/core';
import { Patient } from '../models/patient.model';
import { supabase } from '../supabase';

@Injectable({
  providedIn: 'root'
})
export class PatientService {
  constructor() { }

  async getPatients(): Promise<Patient[]> {
    const { data, error } = await supabase
      .from('patients')
      .select('*');
      
    if (error) throw error;
    return data as Patient[];
  }

  async addPatientEntry(payload: any): Promise<any> {
    const { action, email, originalEmail, ...data } = payload;
    
    if (action === 'update') {
      const filterEmail = originalEmail || email;
      const { data: resData, error } = await supabase
        .from('patients')
        .update({ ...data, email, ultima_actualizacion: new Date().toISOString() })
        .eq('email', filterEmail);
        
      if (error) throw error;
      return resData;
    }

    const { data: resData, error } = await supabase
      .from('patients')
      .insert({ ...payload, ultima_actualizacion: new Date().toISOString() });
      
    if (error) throw error;
    return resData;
  }

  async deletePatient(email: string, name: string): Promise<any> {
    let query = supabase.from('patients').delete();
    
    if (email) {
      query = query.eq('email', email);
    } else {
      query = query.eq('nombre', name);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  // Progress Tracking Methods
  async getPatientProgress(email: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('patient_progress')
      .select('*')
      .eq('patient_email', email)
      .order('date', { ascending: false });
      
    if (error) throw error;
    return data;
  }

  async addProgressEntry(entry: { patient_email: string, weight?: number, body_fat?: number, muscle_mass?: number, notes?: string }): Promise<any> {
    const { data, error } = await supabase
      .from('patient_progress')
      .insert({
        ...entry,
        date: new Date().toISOString()
      });
      
    if (error) throw error;
    return data;
  }
}
