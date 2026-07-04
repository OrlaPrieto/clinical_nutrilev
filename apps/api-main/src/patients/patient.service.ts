import { Injectable, HttpException } from '@nestjs/common';
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
    const client: any = this.supabaseService.getClient();

    // 1. Consultar si ya existe en la base de datos de caché
    const { data: cached } = await client
      .from('ai_menu_cache')
      .select('shopping_list')
      .eq('menu_url', menuUrl)
      .single();

    if (cached && cached.shopping_list) {
      return cached.shopping_list;
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
      if (result && !result.error) {
        // Upsert en la tabla de caché
        await client.from('ai_menu_cache').upsert({
          menu_url: menuUrl,
          shopping_list: result,
        });
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

  async getParsedMenu(menuUrl: string, clientIp?: string): Promise<any> {
    const client: any = this.supabaseService.getClient();

    // 1. Consultar si ya existe en la base de datos de caché
    const { data: cached } = await client
      .from('ai_menu_cache')
      .select('parsed_menu')
      .eq('menu_url', menuUrl)
      .single();

    if (cached && cached.parsed_menu) {
      return cached.parsed_menu;
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
          `${flaskApiUrl.replace(/\/$/, '')}/api/parsed-menu`,
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
      if (result && !result.error) {
        // Upsert en la tabla de caché
        await client.from('ai_menu_cache').upsert({
          menu_url: menuUrl,
          parsed_menu: result,
        });
      }
      return result;
    } catch (error: any) {
      console.error(
        'Error calling Python AI service (Parsed Menu):',
        error instanceof Error ? error.message : error,
      );
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        if (data && data.error && data.message) {
          throw new HttpException(
            { error: data.error, message: data.message },
            status,
          );
        }
      }
      throw error;
    }
  }

  async cleanupOldStorageFiles(): Promise<{ deletedCount: number }> {
    try {
      const client: any = this.supabaseService.getClient();
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

      // Limpiar caché de IA obsoleto (> 8 días)
      const cutoffIso = cutoffDate.toISOString();
      await client.from('ai_menu_cache').delete().lt('created_at', cutoffIso);

      return { deletedCount: filesToDelete.length };
    } catch (err) {
      console.error('Failed to run automated storage cleanup:', err);
      throw err;
    }
  }

  async uploadMenuPdf(file: any, email: string, fileName: string): Promise<{ url: string }> {
    try {
      if (!file || !file.buffer) {
        throw new HttpException('No file buffer provided', 400);
      }

      console.log(`[PdfUpload] Starting upload process for ${fileName} (${file.size} bytes)...`);

      let pdfBuffer = file.buffer;
      try {
        const { PDFDocument } = require('pdf-lib');
        const pdfDoc = await PDFDocument.load(file.buffer);
        
        // Apply compression settings
        // useObjectStreams: true compresses the internal structures into binary object streams
        pdfBuffer = Buffer.from(
          await pdfDoc.save({
            useObjectStreams: true,
            addGlyphMapGroups: false,
          })
        );
        console.log(`[PdfUpload] Structurally compressed PDF from ${file.size} to ${pdfBuffer.length} bytes.`);
      } catch (pdfError) {
        console.error('[PdfUpload] pdf-lib compression failed, uploading original buffer:', pdfError);
      }

      const r2AccessKey = this.configService.get<string>('CLOUDFLARE_R2_ACCESS_KEY_ID');
      const r2SecretKey = this.configService.get<string>('CLOUDFLARE_R2_SECRET_ACCESS_KEY');
      const r2Endpoint = this.configService.get<string>('CLOUDFLARE_R2_ENDPOINT');
      const r2Bucket = this.configService.get<string>('CLOUDFLARE_R2_BUCKET_NAME');
      const r2PublicUrl = this.configService.get<string>('CLOUDFLARE_R2_PUBLIC_URL');

      const isR2Configured = r2AccessKey && r2SecretKey && r2Endpoint && r2Bucket && r2PublicUrl;

      if (isR2Configured) {
        console.log(`[PdfUpload] Uploading to Cloudflare R2 bucket: ${r2Bucket}...`);
        const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
        const s3 = new S3Client({
          region: 'auto',
          endpoint: r2Endpoint,
          credentials: {
            accessKeyId: r2AccessKey,
            secretAccessKey: r2SecretKey,
          },
        });

        const command = new PutObjectCommand({
          Bucket: r2Bucket,
          Key: fileName,
          Body: pdfBuffer,
          ContentType: 'application/pdf',
          CacheControl: 'public, max-age=31536000, immutable',
        });

        await s3.send(command);
        const publicUrl = `${r2PublicUrl.replace(/\/$/, '')}/${fileName}`;
        console.log(`[PdfUpload] Uploaded to R2 successfully: ${publicUrl}`);
        return { url: publicUrl };
      } else {
        console.log('[PdfUpload] Cloudflare R2 is not fully configured. Falling back to Supabase Storage.');
        
        // Upload to Supabase Storage using the service client
        const client = this.supabaseService.getClient();
        const { data, error } = await client.storage
          .from('patient_menus')
          .upload(fileName, pdfBuffer, {
            upsert: true,
            contentType: 'application/pdf',
            cacheControl: 'public, max-age=31536000, immutable'
          });

        if (error) {
          console.error('[PdfUpload] Supabase upload failed:', error);
          throw error;
        }

        // Get public URL
        const { data: publicUrlData } = client.storage
          .from('patient_menus')
          .getPublicUrl(fileName);

        return { url: publicUrlData.publicUrl };
      }
    } catch (err) {
      console.error('[PdfUpload] Error in uploadMenuPdf:', err);
      throw new HttpException(err.message || 'Error uploading menu PDF', 500);
    }
  }
}
