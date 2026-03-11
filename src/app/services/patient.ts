import { Injectable } from '@angular/core';
import { from, Observable, map } from 'rxjs';
import { Patient } from '../models/patient.model';
import { supabase } from '../supabase';

@Injectable({
  providedIn: 'root'
})
export class PatientService {
  constructor() { }

  getPatients(): Observable<Patient[]> {
    return from(
      supabase
        .from('patients')
        .select('*')
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data as Patient[];
      })
    );
  }

  addPatientEntry(payload: any): Observable<any> {
    const { action, email, ...data } = payload;
    
    if (action === 'update') {
      return from(
        supabase
          .from('patients')
          .update({ ...data, ultima_actualizacion: new Date().toISOString() })
          .eq('email', email)
      ).pipe(
        map(response => {
          if (response.error) throw response.error;
          return response.data;
        })
      );
    }

    return from(
      supabase
        .from('patients')
        .insert({ ...payload, ultima_actualizacion: new Date().toISOString() })
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data;
      })
    );
  }
}
