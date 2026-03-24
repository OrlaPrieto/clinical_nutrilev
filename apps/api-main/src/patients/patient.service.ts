import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  Patient,
  PatientProgress,
  PatientUpdate,
  PatientProgressInsert,
} from '@shared/index';

@Injectable()
export class PatientService {
  constructor(
    private supabaseService: SupabaseService,
    private httpService: HttpService,
    private configService: ConfigService,
  ) {}

  async findAll(): Promise<Patient[]> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('patients')
      .select('*')
      .order('nombre');

    if (error) throw error;
    return (data as Patient[]) || [];
  }

  async findByEmail(email: string): Promise<Patient> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('patients')
      .select('*')
      .eq('email', email)
      .single();

    if (error) throw error;
    return data as Patient;
  }

  async update(
    id: string,
    updateData: PatientUpdate & { action?: string; originalEmail?: string },
  ): Promise<Patient> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { action, originalEmail, id: _id, ...cleanData } = updateData;

    let query = this.supabaseService
      .getClient()
      .from('patients')
      // @ts-expect-error Supabase inference issue with 'patients' table
      .update({
        ...cleanData,
        ultima_actualizacion: new Date().toISOString(),
      });

    // Check if id is an email or a UUID
    if (id.includes('@')) {
      query = query.eq('email', id);
    } else {
      query = query.eq('id', id);
    }

    const { data, error } = await query.select().single();

    if (error) throw error;
    return data as Patient;
  }

  async getProgress(patientEmail: string): Promise<PatientProgress[]> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('patient_progress')
      .select('*')
      .eq('patient_email', patientEmail)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data as PatientProgress[]) || [];
  }

  async addProgress(
    progressData: PatientProgressInsert,
  ): Promise<PatientProgress> {
    const { weight, body_fat, muscle_mass, ...rest } = progressData;

    const formattedData = {
      ...rest,
      weight: weight.toString(),
      body_fat: body_fat?.toString() || null,
      muscle_mass: muscle_mass?.toString() || null,
    };

    const { data, error } = await this.supabaseService
      .getClient()
      .from('patient_progress')
      // @ts-expect-error Supabase inference issue with 'patient_progress' table
      .insert(formattedData)
      .select()
      .single();

    if (error) throw error;
    return data as PatientProgress;
  }

  async remove(identifier: string): Promise<{ success: boolean }> {
    const { error } = await this.supabaseService
      .getClient()
      .from('patients')
      .delete()
      .or(`email.eq.${identifier},nombre.eq.${identifier}`);

    if (error) throw error;
    return { success: true };
  }

  async getShoppingList(menuUrl: string): Promise<any> {
    const flaskApiUrl = this.configService.get<string>('FLASK_API_URL');
    const geminiKey = this.configService.get<string>('GEMINI_API_KEY');

    if (!flaskApiUrl) {
      throw new Error('FLASK_API_URL is not defined in environment variables');
    }

    const response = await firstValueFrom(
      this.httpService.post(`${flaskApiUrl.replace(/\/$/, '')}/api/shopping-list`, {
        menu_url: menuUrl,
        api_key: geminiKey,
      }),
    );

    return response.data;
  }
}
