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

    const emailChanged =
      originalEmail &&
      cleanData.email &&
      originalEmail.toLowerCase() !== cleanData.email.toLowerCase();

    if (emailChanged) {
      const oldEmailClean = originalEmail.toLowerCase();
      const newEmailClean = cleanData.email!.toLowerCase();
      const tempEmail = `temp_cascade_${Date.now()}_${Math.random().toString(36).substring(2, 7)}@clinical-nutrilev.com`;
      const client = this.supabaseService.getClient() as any;

      // 1. Create a temporary patient
      const { data: tempPatient, error: createTempErr } = await client
        .from('patients')
        .insert({
          nombre: 'Temp Update Cascade',
          email: tempEmail,
        })
        .select()
        .single();

      if (createTempErr) throw createTempErr;

      try {
        // 2. Point all progress records from oldEmail to tempEmail
        const { error: updateProgressToTempErr } = await client
          .from('patient_progress')
          .update({ patient_email: tempEmail })
          .eq('patient_email', oldEmailClean);

        if (updateProgressToTempErr) throw updateProgressToTempErr;

        // 3. Update the original patient's email to the new email
        let query = client
          .from('patients')
          .update({
            ...cleanData,
            email: newEmailClean,
            ultima_actualizacion: new Date().toISOString(),
          });

        if (id.includes('@')) {
          query = query.eq('email', id);
        } else {
          query = query.eq('id', id);
        }

        const { data: updatedPatient, error: updatePatientErr } = await query.select().single();

        if (updatePatientErr) throw updatePatientErr;

        // 4. Point all progress records from tempEmail to newEmail
        const { error: updateProgressToNewErr } = await client
          .from('patient_progress')
          .update({ patient_email: newEmailClean })
          .eq('patient_email', tempEmail);

        if (updateProgressToNewErr) throw updateProgressToNewErr;

        // 5. Clean up: Delete the temporary patient
        await client
          .from('patients')
          .delete()
          .eq('id', tempPatient.id);

        return updatedPatient as Patient;

      } catch (err) {
        // Rollback progress records to oldEmail if anything failed, and delete temp patient
        try {
          await client
            .from('patient_progress')
            .update({ patient_email: oldEmailClean })
            .eq('patient_email', tempEmail);
          
          await client
            .from('patients')
            .delete()
            .eq('id', tempPatient.id);
        } catch (cleanupErr) {
          console.error('Failed to clean up temp cascade update state:', cleanupErr);
        }
        throw err;
      }
    } else {
      // Normal update when email doesn't change
      let query = this.supabaseService
        .getClient()
        .from('patients')
        // @ts-expect-error Supabase inference issue with 'patients' table
        .update({
          ...cleanData,
          ultima_actualizacion: new Date().toISOString(),
        });

      if (id.includes('@')) {
        query = query.eq('email', id);
      } else {
        query = query.eq('id', id);
      }

      const { data, error } = await query.select().single();

      if (error) throw error;
      return data as Patient;
    }
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
    const formattedData = { ...progressData } as Record<string, unknown>;

    // Convert all numeric values to strings for Supabase storage consistency
    Object.keys(formattedData).forEach((key) => {
      const value = formattedData[key];
      if (typeof value === 'number') {
        formattedData[key] = value.toString();
      }
    });

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

    if (!flaskApiUrl) {
      throw new Error('FLASK_API_URL is not defined in environment variables');
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${flaskApiUrl.replace(/\/$/, '')}/api/shopping-list`,
          {
            menu_url: menuUrl,
          },
          {
            headers: {
              'x-internal-key':
                this.configService.get<string>('INTERNAL_API_KEY'),
            },
            timeout: 30000,
          }, // 30 second timeout
        ),
      );
      return response.data;
    } catch (error) {
      console.error(
        'Error calling Python AI service (Shopping List):',
        error instanceof Error ? error.message : error,
      );
      throw error;
    }
  }
}
