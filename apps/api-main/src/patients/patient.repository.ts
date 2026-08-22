import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.service';
import { Patient, PatientProgress } from '@shared/index';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { CreateProgressDto } from './dto/create-progress.dto';
import { UpdateProgressDto } from './dto/update-progress.dto';

@Injectable()
export class PatientRepository {
  constructor(private readonly supabaseService: SupabaseService) {}

  async findAll(): Promise<Patient[]> {
    const client: any = this.supabaseService.getClient();
    const { data, error } = await client
      .from('patients')
      .select('*')
      .order('nombre');

    if (error) {
      console.error('[PatientRepository] Error in findAll:', error);
      throw error;
    }
    return data || [];
  }

  async findByEmail(email: string): Promise<Patient> {
    const client: any = this.supabaseService.getClient();
    const { data, error } = await client
      .from('patients')
      .select('*')
      .ilike('email', email)
      .single();

    if (error) {
      console.error('[PatientRepository] Error in findByEmail:', error);
      throw error;
    }
    return data;
  }

  async findById(id: string): Promise<Patient> {
    const client: any = this.supabaseService.getClient();
    const { data, error } = await client
      .from('patients')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('[PatientRepository] Error in findById:', error);
      throw error;
    }
    if (!data) {
      throw new NotFoundException(`Patient with ID ${id} not found`);
    }
    return data;
  }

  async update(id: string, updateData: UpdatePatientDto): Promise<Patient> {
    const client: any = this.supabaseService.getClient();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) || id.startsWith('uuid-');
    
    let query = client.from('patients').update(updateData);
    if (!isUuid) {
      query = query.eq('email', id);
    } else {
      query = query.eq('id', id);
    }
    
    const { data, error } = await query.select();

    if (error) {
      console.error('[PatientRepository] Error in update:', error);
      throw error;
    }
    if (!data || data.length === 0) {
      throw new NotFoundException(`Patient with ID ${id} not found or not updated`);
    }
    return data[0];
  }

  async remove(identifier: string): Promise<boolean> {
    const client: any = this.supabaseService.getClient();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier) || identifier.startsWith('uuid-');
    
    let query = client.from('patients').delete();
    if (isUuid) {
      query = query.eq('id', identifier);
    } else {
      query = query.or(`email.eq.${identifier},nombre.eq.${identifier}`);
    }
    
    const { error } = await query;
    if (error) {
      console.error('[PatientRepository] Error in remove:', error);
      throw error;
    }
    return true;
  }

  async getProgress(patientId: string): Promise<PatientProgress[]> {
    const client: any = this.supabaseService.getClient();
    const { data, error } = await client
      .from('patient_progress')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[PatientRepository] Error in getProgress:', error);
      throw error;
    }
    return data || [];
  }

  async addProgress(progressData: CreateProgressDto): Promise<PatientProgress> {
    const client: any = this.supabaseService.getClient();
    const { data, error } = await client
      .from('patient_progress')
      .insert(progressData)
      .select()
      .single();

    if (error) {
      console.error('[PatientRepository] Error in addProgress:', error);
      throw error;
    }
    return data;
  }

  async updateProgress(id: string, progressData: UpdateProgressDto): Promise<PatientProgress> {
    const client: any = this.supabaseService.getClient();
    const { data, error } = await client
      .from('patient_progress')
      .update(progressData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[PatientRepository] Error in updateProgress:', error);
      throw error;
    }
    return data;
  }

  async removeProgress(id: string): Promise<boolean> {
    const client: any = this.supabaseService.getClient();
    const { error } = await client.from('patient_progress').delete().eq('id', id);

    if (error) {
      console.error('[PatientRepository] Error in removeProgress:', error);
      throw error;
    }
    return true;
  }

  async getGlucoseLogs(patientEmail: string): Promise<any[]> {
    const client: any = this.supabaseService.getClient();
    const { data, error } = await client
      .from('patient_glucose_logs')
      .select('*')
      .ilike('patient_email', patientEmail)
      .order('recorded_at', { ascending: false });

    if (error) {
      console.warn('[PatientRepository] Could not fetch glucose logs from Supabase:', error.message);
      return [];
    }
    return data || [];
  }

  async addGlucoseLog(logData: {
    patient_email: string;
    patient_id?: string | null;
    glucose_value: number;
    context: string;
    notes?: string | null;
    recorded_at?: string;
  }): Promise<any> {
    const client: any = this.supabaseService.getClient();
    const payload = {
      patient_email: logData.patient_email.toLowerCase(),
      patient_id: logData.patient_id || null,
      glucose_value: Number(logData.glucose_value),
      context: logData.context,
      notes: logData.notes || null,
      recorded_at: logData.recorded_at || new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    const { data, error } = await client
      .from('patient_glucose_logs')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      console.error('[PatientRepository] Error inserting glucose log into Supabase:', error);
      if (error.code === 'PGRST205') {
        throw new Error("La tabla 'patient_glucose_logs' aún no ha sido creada en Supabase. Ejecuta el script SQL en el Editor de Supabase.");
      }
      throw error;
    }
    return data;
  }

  async deleteGlucoseLog(id: string, patientEmail: string): Promise<boolean> {
    const client: any = this.supabaseService.getClient();
    const { error } = await client
      .from('patient_glucose_logs')
      .delete()
      .eq('id', id)
      .ilike('patient_email', patientEmail);

    if (error) {
      console.error('[PatientRepository] Error deleting glucose log:', error);
      throw error;
    }
    return true;
  }
}
