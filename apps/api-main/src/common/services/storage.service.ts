import { Injectable, HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase.service';
import * as crypto from 'crypto';

@Injectable()
export class StorageService {
  constructor(
    private configService: ConfigService,
    private supabaseService: SupabaseService,
  ) {}

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

      const fileHash = crypto.createHash('md5').update(pdfBuffer).digest('hex');
      const cleanEmail = email.replace(/[^a-zA-Z0-9_-]/g, '_');
      const finalFileName = `menu_${cleanEmail}_${fileHash}.pdf`;

      const r2AccessKey = this.configService.get<string>('CLOUDFLARE_R2_ACCESS_KEY_ID');
      const r2SecretKey = this.configService.get<string>('CLOUDFLARE_R2_SECRET_ACCESS_KEY');
      const r2Endpoint = this.configService.get<string>('CLOUDFLARE_R2_ENDPOINT');
      const r2Bucket = this.configService.get<string>('CLOUDFLARE_R2_BUCKET_NAME');
      const r2PublicUrl = this.configService.get<string>('CLOUDFLARE_R2_PUBLIC_URL');

      const isR2Configured = r2AccessKey && r2SecretKey && r2Endpoint && r2Bucket && r2PublicUrl;

      if (isR2Configured) {
        console.log(`[PdfUpload] Uploading to Cloudflare R2 bucket: ${r2Bucket} as ${finalFileName}...`);
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
          Key: finalFileName,
          Body: pdfBuffer,
          ContentType: 'application/pdf',
          CacheControl: 'public, max-age=31536000, immutable',
        });

        await s3.send(command);
        const publicUrl = `${r2PublicUrl.replace(/\/$/, '')}/${finalFileName}`;
        console.log(`[PdfUpload] Uploaded to R2 successfully: ${publicUrl}`);
        return { url: publicUrl };
      } else {
        console.log('[PdfUpload] Cloudflare R2 is not fully configured. Falling back to Supabase Storage.');
        
        const client = this.supabaseService.getClient();
        const { data, error } = await client.storage
          .from('patient_menus')
          .upload(finalFileName, pdfBuffer, {
            upsert: true,
            contentType: 'application/pdf',
            cacheControl: 'public, max-age=31536000, immutable'
          });

        if (error) {
          console.error('[PdfUpload] Supabase upload failed:', error);
          throw error;
        }

        const { data: publicUrlData } = client.storage
          .from('patient_menus')
          .getPublicUrl(finalFileName);

        return { url: publicUrlData.publicUrl };
      }
    } catch (err) {
      console.error('[PdfUpload] Error in uploadMenuPdf:', err);
      throw new HttpException(err.message || 'Error uploading menu PDF', 500);
    }
  }

  async cleanupOldStorageFiles(): Promise<{ deletedCount: number }> {
    try {
      const client: any = this.supabaseService.getClient();
      
      const r2AccessKey = this.configService.get<string>('CLOUDFLARE_R2_ACCESS_KEY_ID');
      const r2SecretKey = this.configService.get<string>('CLOUDFLARE_R2_SECRET_ACCESS_KEY');
      const r2Endpoint = this.configService.get<string>('CLOUDFLARE_R2_ENDPOINT');
      const r2Bucket = this.configService.get<string>('CLOUDFLARE_R2_BUCKET_NAME');

      const isR2Configured = r2AccessKey && r2SecretKey && r2Endpoint && r2Bucket;

      const now = new Date();
      let deletedCount = 0;

      const { data: patients, error: pError } = await client
        .from('patients')
        .select('email, plan_duration_days');

      const patientMap = new Map<string, number>();
      if (!pError && patients) {
        for (const p of patients) {
          if (p.email) {
            const clean = p.email.toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_');
            patientMap.set(clean, p.plan_duration_days != null ? Number(p.plan_duration_days) : 7);
          }
        }
      }

      const isFileExpired = (fileName: string, createdAtDate: Date): boolean => {
        const nameLower = fileName.toLowerCase();
        let durationDays = 7;

        for (const [cleanEmail, days] of patientMap.entries()) {
          if (nameLower.startsWith(`menu_${cleanEmail}_`)) {
            durationDays = days;
            break;
          }
        }

        const fileLimitDays = durationDays >= 9999 ? 3650 : (durationDays + 1);
        const fileCutoffDate = new Date(now.getTime() - fileLimitDays * 24 * 60 * 60 * 1000);
        return createdAtDate < fileCutoffDate;
      };

      if (isR2Configured) {
        console.log(`[StorageCleanup] Running automated cleanup on Cloudflare R2 bucket: ${r2Bucket}...`);
        const { S3Client, ListObjectsV2Command, DeleteObjectsCommand } = require('@aws-sdk/client-s3');
        const s3 = new S3Client({
          region: 'auto',
          endpoint: r2Endpoint,
          credentials: {
            accessKeyId: r2AccessKey,
            secretAccessKey: r2SecretKey,
          },
        });

        let continuationToken: string | undefined = undefined;
        let filesToDelete: string[] = [];

        do {
          const listCommand: any = new ListObjectsV2Command({
            Bucket: r2Bucket,
            ContinuationToken: continuationToken,
          });
          const listResponse = await s3.send(listCommand);
          const contents = listResponse.Contents || [];

          for (const item of contents) {
            if (item.Key && item.Key !== '.emptyFolderPlaceholder' && item.LastModified) {
              if (isFileExpired(item.Key, new Date(item.LastModified))) {
                filesToDelete.push(item.Key);
              }
            }
          }
          continuationToken = listResponse.NextContinuationToken;
        } while (continuationToken);

        if (filesToDelete.length > 0) {
          const chunkSize = 1000;
          for (let i = 0; i < filesToDelete.length; i += chunkSize) {
            const chunk = filesToDelete.slice(i, i + chunkSize);
            const deleteCommand = new DeleteObjectsCommand({
              Bucket: r2Bucket,
              Delete: {
                Objects: chunk.map(key => ({ Key: key })),
                Quiet: true,
              },
            });
            await s3.send(deleteCommand);
          }
          deletedCount = filesToDelete.length;
          console.log(`[StorageCleanup] Deleted ${deletedCount} expired files from R2.`);
        }
      } else {
        console.log('[StorageCleanup] R2 not configured. Running automated cleanup on Supabase Storage.');
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

        const filesToDelete = allFiles
          .filter(f => f.name !== '.emptyFolderPlaceholder' && isFileExpired(f.name, new Date(f.created_at)))
          .map(f => f.name);

        if (filesToDelete.length > 0) {
          const chunkSize = 100;
          for (let i = 0; i < filesToDelete.length; i += chunkSize) {
            const chunk = filesToDelete.slice(i, i + chunkSize);
            await client.storage.from('patient_menus').remove(chunk);
          }
        }
        deletedCount = filesToDelete.length;
      }

      const globalCutoffIso = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000).toISOString();
      if (client && typeof client.from === 'function') {
        await client.from('ai_menu_cache').delete().lt('created_at', globalCutoffIso);
      }

      return { deletedCount };
    } catch (err) {
      console.error('Failed to run automated storage cleanup:', err);
      throw err;
    }
  }

  async deletePatientFiles(email: string): Promise<void> {
    try {
      const client = this.supabaseService.getClient();
      if (client && client.storage) {
        const { data: files } = await client.storage
          .from('patient_menus')
          .list();
      
        if (files && files.length > 0) {
          const prefix = `menu_${email.toLowerCase().trim()}_`;
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
}
