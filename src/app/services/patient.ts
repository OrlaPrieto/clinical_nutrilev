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
    const { action, email, ...data } = payload;
    
    if (action === 'update') {
      const { data: resData, error } = await supabase
        .from('patients')
        .update({ ...data, ultima_actualizacion: new Date().toISOString() })
        .eq('email', email);
        
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
}
