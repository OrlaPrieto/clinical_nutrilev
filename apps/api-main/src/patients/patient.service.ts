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
import { UpdateProgressDto } from './dto/update-progress.dto';


@Injectable()
export class PatientService {
  private shoppingListCache = new Map<string, any>();

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
      .ilike('email', email)
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

    if (cleanData.email) {
      cleanData.email = cleanData.email.toLowerCase();
    }

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

    if (emailChanged && cleanData.email) {
      try {
        await (this.supabaseService.getClient() as any)
          .from('push_subscriptions')
          .update({ email: cleanData.email })
          .eq('email', originalEmail.toLowerCase());
      } catch (err) {
        console.error('Failed to update push subscriptions on email change:', err);
      }
    }

    return data as Patient;
  }

  async getProgress(patientEmailOrId: string): Promise<PatientProgress[]> {
    let patientId = patientEmailOrId;
    if (patientEmailOrId.includes('@')) {
      const patient = await this.findByEmail(patientEmailOrId);
      if (!patient) return [];
      patientId = patient.id;
    }

    const { data, error } = await this.supabaseService
      .getClient()
      .from('patient_progress')
      .select('*')
      .eq('patient_id', patientId)
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

  async updateProgress(
    id: string,
    progressData: UpdateProgressDto,
  ): Promise<PatientProgress> {
    const formattedData = { ...progressData } as Record<string, unknown>;

    // Remove id and metadata fields from update payload if they exist
    delete formattedData.id;
    delete formattedData.created_at;

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
      .update(formattedData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as PatientProgress;
  }

  async removeProgress(id: string): Promise<{ success: boolean }> {
    const { error } = await this.supabaseService
      .getClient()
      .from('patient_progress')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  }

  async remove(identifier: string): Promise<{ success: boolean }> {
    let email: string | null = null;
    if (identifier.includes('@')) {
      email = identifier.toLowerCase().trim();
    } else {
      try {
        const { data } = await this.supabaseService
          .getClient()
          .from('patients')
          .select('email')
          .eq('nombre', identifier)
          .maybeSingle() as any;
        if (data && data.email) {
          email = data.email.toLowerCase().trim();
        }
      } catch (err) {
        console.error('Failed to resolve patient email for deletion:', err);
      }
    }

    if (email) {
      try {
        const client = this.supabaseService.getClient();
        if (client && client.storage) {
          const { data: files } = await client.storage
            .from('patient_menus')
            .list();
        
          if (files && files.length > 0) {
            const prefix = `menu_${email}_`;
            const filesToDelete = files
              .filter((f) => f.name.startsWith(prefix))
              .map((f) => f.name);
            
            if (filesToDelete.length > 0) {
              await client.storage
                .from('patient_menus')
                .remove(filesToDelete);
            }
          }
        }
      } catch (storageErr) {
        console.error(`Failed to clean up storage for deleted patient ${email}:`, storageErr);
      }
    }

    const { error } = await this.supabaseService
      .getClient()
      .from('patients')
      .delete()
      .or(`email.eq.${identifier},nombre.eq.${identifier}`);

    if (error) throw error;
    return { success: true };
  }

  async getShoppingList(menuUrl: string, clientIp?: string): Promise<any> {
    const cached = this.shoppingListCache.get(menuUrl);
    if (cached) {
      return cached;
    }

    const flaskApiUrl = this.configService.get<string>('FLASK_API_URL');

    if (!flaskApiUrl) {
      throw new Error('FLASK_API_URL is not defined in environment variables');
    }

    const headers: Record<string, string> = {
      'x-internal-key': this.configService.get<string>('INTERNAL_API_KEY') || '',
    };

    if (clientIp) {
      headers['x-forwarded-for'] = clientIp;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${flaskApiUrl.replace(/\/$/, '')}/api/shopping-list`,
          {
            menu_url: menuUrl,
          },
          {
            headers,
            timeout: 120000,
          }, // 120 second timeout
        ),
      );
      
      const result = response.data;
      const hasError = Array.isArray(result) && result.some(cat => cat.category?.includes('ERROR'));
      if (!hasError) {
        this.shoppingListCache.set(menuUrl, result);
      }
      return result;
    } catch (error) {
      console.error(
        'Error calling Python AI service (Shopping List):',
        error instanceof Error ? error.message : error,
      );
      throw error;
    }
  }

  async cleanupOldStorageFiles(): Promise<{ deletedCount: number }> {
    try {
      const client = this.supabaseService.getClient();
      if (!client || !client.storage) return { deletedCount: 0 };

      let allFiles: any[] = [];
      let page = 0;
      const limit = 1000;
      
      while (true) {
        const { data: files } = await client.storage
          .from('patient_menus')
          .list('', {
            limit,
            offset: page * limit,
            sortBy: { column: 'name', order: 'asc' }
          });
          
        if (!files || files.length === 0) break;
        allFiles = allFiles.concat(files);
        if (files.length < limit) break;
        page++;
      }

      const now = new Date();
      const cutoffDate = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);
      const filesToDelete = allFiles
        .filter(f => f.name !== '.emptyFolderPlaceholder' && new Date(f.created_at) < cutoffDate)
        .map(f => f.name);

      if (filesToDelete.length > 0) {
        const chunkSize = 100;
        for (let i = 0; i < filesToDelete.length; i += chunkSize) {
          const chunk = filesToDelete.slice(i, i + chunkSize);
          await client.storage.from('patient_menus').remove(chunk);
        }
      }

      return { deletedCount: filesToDelete.length };
    } catch (err) {
      console.error('Failed to run automated storage cleanup:', err);
      throw err;
    }
  }
}
