import { Injectable, HttpException } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.service';
import { StorageService } from '../common/services/storage.service';
import { AiGatewayService } from '../common/services/ai-gateway.service';
import { PatientRepository } from './patient.repository';
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
    private readonly patientRepository: PatientRepository,
    private readonly storageService: StorageService,
    private readonly aiGatewayService: AiGatewayService,
    private readonly supabaseService: SupabaseService,
  ) {}

  async findAll(): Promise<Patient[]> {
    const patients = await this.patientRepository.findAll();
    try {
      const supabase = this.supabaseService.getClient() as any;
      const loginMap = new Map<string, string>();

      // 1. Fetch real Supabase Auth users to get official last_sign_in_at timestamps
      const { data: authData } = await supabase.auth.admin.listUsers();
      if (authData && authData.users) {
        authData.users.forEach((u: any) => {
          if (u.email && u.last_sign_in_at) {
            loginMap.set(u.email.toLowerCase(), u.last_sign_in_at);
          }
        });
      }

      // 2. Fetch push_subscriptions as secondary fallback/supplement
      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('email, updated_at');
        
      if (subs && subs.length > 0) {
        subs.forEach((s: any) => {
          if (s.email && s.updated_at) {
            const email = s.email.toLowerCase();
            const existingTime = loginMap.get(email);
            if (!existingTime || new Date(s.updated_at) > new Date(existingTime)) {
              loginMap.set(email, s.updated_at);
            }
          }
        });
      }

      // 3. Attach exact login timestamps to patients
      patients.forEach((p: any) => {
        const cleanEmail = p.email?.toLowerCase();
        if (cleanEmail && loginMap.has(cleanEmail)) {
          p.ultimo_login = loginMap.get(cleanEmail);
        }
      });
    } catch (e) {
      console.warn('[PatientService] Suppressed error in Supabase Auth login timestamp sync:', e);
    }
    return patients;
  }

  async findByEmail(email: string): Promise<Patient> {
    return this.patientRepository.findByEmail(email);
  }

  async update(
    id: string,
    updateData: PatientUpdate & { action?: string; originalEmail?: string },
  ): Promise<Patient> {
    const { action, originalEmail, id: _id, ultimo_login: _ultimo_login, ...cleanData } = updateData;

    const emailChanged =
      originalEmail &&
      cleanData.email &&
      originalEmail.toLowerCase() !== cleanData.email.toLowerCase();

    if (cleanData.email) {
      cleanData.email = cleanData.email.toLowerCase();
    }

    const updated = await this.patientRepository.update(id, {
      ...cleanData,
      ultima_actualizacion: new Date().toISOString(),
    } as any);

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

    return updated;
  }

  async getProgress(patientEmailOrId: string): Promise<PatientProgress[]> {
    let patientId = patientEmailOrId;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(patientEmailOrId) || patientEmailOrId.startsWith('uuid-');
    if (!isUuid) {
      const patient = await this.findByEmail(patientEmailOrId);
      if (!patient) return [];
      patientId = patient.id;
    }

    return this.patientRepository.getProgress(patientId);
  }

  async addProgress(
    progressData: PatientProgressInsert,
  ): Promise<PatientProgress> {
    const formattedData = { ...progressData } as Record<string, unknown>;

    Object.keys(formattedData).forEach((key) => {
      const value = formattedData[key];
      if (typeof value === 'number') {
        formattedData[key] = value.toString();
      }
    });

    const created = await this.patientRepository.addProgress(formattedData as any);

    // Auto-generate Copilot Menu suggestion in background upon adding new progress record
    if (created && created.patient_id) {
      this.triggerAutoCopilotSuggestion(created.patient_id).catch((err) =>
        console.warn(`[MenuCopilot] Auto-suggestion background error for ${created.patient_id}:`, err?.message || err),
      );
    }

    return created;
  }

  async updateProgress(
    id: string,
    progressData: UpdateProgressDto,
  ): Promise<PatientProgress> {
    const formattedData = { ...progressData } as Record<string, unknown>;

    delete formattedData.id;
    delete formattedData.created_at;

    Object.keys(formattedData).forEach((key) => {
      const value = formattedData[key];
      if (typeof value === 'number') {
        formattedData[key] = value.toString();
      }
    });

    return this.patientRepository.updateProgress(id, formattedData as any);
  }

  async removeProgress(id: string): Promise<{ success: boolean }> {
    await this.patientRepository.removeProgress(id);
    return { success: true };
  }

  async remove(identifier: string): Promise<{ success: boolean }> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier) || identifier.startsWith('uuid-');
    let email = identifier;
    
    if (isUuid) {
      const patient = await this.patientRepository.findById(identifier);
      email = patient.email;
    }

    if (email) {
      await this.storageService.deletePatientFiles(email);
    }

    await this.patientRepository.remove(identifier);
    return { success: true };
  }

  async getShoppingList(menuUrl: string, clientIp?: string): Promise<any> {
    const client: any = this.supabaseService.getClient();
    const cleanMenuUrl = menuUrl.split('?')[0];

    const { data: cached } = await client
      .from('ai_menu_cache')
      .select('shopping_list')
      .eq('menu_url', cleanMenuUrl)
      .maybeSingle() as any;

    if (cached && cached.shopping_list) {
      console.log(`[ShoppingList] Cache HIT for menu URL: ${cleanMenuUrl}`);
      return cached.shopping_list;
    }

    console.log(`[ShoppingList] Cache MISS. Generating shopping list via AI for menu URL: ${cleanMenuUrl}...`);
    const result = await this.aiGatewayService.getShoppingList(menuUrl, clientIp);

    if (result && !result.error) {
      console.log(`[ShoppingList] Successfully generated shopping list via AI for menu URL: ${cleanMenuUrl}`);
      await client.from('ai_menu_cache').upsert({
        menu_url: cleanMenuUrl,
        shopping_list: result,
      });
    }
    return result;
  }

  async getParsedMenu(menuUrl: string, clientIp?: string): Promise<any> {
    const client: any = this.supabaseService.getClient();
    const cleanMenuUrl = menuUrl.split('?')[0];

    const { data: cached } = await client
      .from('ai_menu_cache')
      .select('parsed_menu')
      .eq('menu_url', cleanMenuUrl)
      .maybeSingle() as any;

    if (cached && cached.parsed_menu) {
      console.log(`[ParsedMenu] Cache HIT for menu URL: ${cleanMenuUrl}`);
      return cached.parsed_menu;
    }

    console.log(`[ParsedMenu] Cache MISS. Parsing menu document via AI for menu URL: ${cleanMenuUrl}...`);
    const result = await this.aiGatewayService.getParsedMenu(menuUrl, clientIp);

    if (result && !result.error) {
      console.log(`[ParsedMenu] Successfully parsed clinical menu via AI for menu URL: ${cleanMenuUrl}`);
      await client.from('ai_menu_cache').upsert({
        menu_url: cleanMenuUrl,
        parsed_menu: result,
      });
    }
    return result;
  }

  async getCopilotSuggestion(patientEmailOrId: string): Promise<any> {
    const client: any = this.supabaseService.getClient();
    let patientId = patientEmailOrId;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(patientEmailOrId) || patientEmailOrId.startsWith('uuid-');
    
    if (!isUuid) {
      const patient = await this.findByEmail(patientEmailOrId);
      if (!patient) return null;
      patientId = patient.id;
    }

    const cacheKey = `copilot_${patientId}`;
    const { data: cached } = await client
      .from('ai_menu_cache')
      .select('parsed_menu, created_at')
      .eq('menu_url', cacheKey)
      .maybeSingle() as any;

    if (cached && cached.parsed_menu) {
      return {
        ...cached.parsed_menu,
        created_at: cached.created_at,
      };
    }

    return null;
  }

  async saveCopilotSuggestion(patientEmailOrId: string, suggestionData: any): Promise<void> {
    const client: any = this.supabaseService.getClient();
    let patientId = patientEmailOrId;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(patientEmailOrId) || patientEmailOrId.startsWith('uuid-');
    
    if (!isUuid) {
      const patient = await this.findByEmail(patientEmailOrId);
      if (!patient) return;
      patientId = patient.id;
    }

    const cacheKey = `copilot_${patientId}`;
    await client.from('ai_menu_cache').upsert({
      menu_url: cacheKey,
      parsed_menu: suggestionData,
      created_at: new Date().toISOString(),
    });
  }

  async triggerAutoCopilotSuggestion(patientId: string): Promise<void> {
    try {
      const patient = await this.patientRepository.findById(patientId);
      if (!patient) return;

      const progress = await this.patientRepository.getProgress(patientId);
      const latestProgress = progress.length > 0 ? progress[0] : null;
      const prevProgress = progress.length > 1 ? progress[1] : null;
      const prevMenu = patient.menu_url || (patient.current_menus && patient.current_menus.length > 0 ? patient.current_menus[0].name : '') || '';

      console.log(`[MenuCopilot] Auto-generating suggestion in background for patient: ${patient.nombre} (${patientId})`);

      const response = await this.aiGatewayService.suggestMenuCopilot({
        patient_context: patient,
        prev_progress: prevProgress,
        latest_progress: latestProgress,
        previous_menu_summary: prevMenu,
        calories: 1800,
        extra_notes: '',
        menu_format: 'auto',
      });

      if (response && response.success && response.data) {
        await this.saveCopilotSuggestion(patientId, response.data);
        console.log(`[MenuCopilot] Auto-suggestion successfully precalculated and stored in DB for ${patient.nombre}`);
      }
    } catch (err: any) {
      console.warn(`[MenuCopilot] Error in triggerAutoCopilotSuggestion: ${err?.message || err}`);
    }
  }

  async cleanupOldStorageFiles(): Promise<{ deletedCount: number }> {
    return this.storageService.cleanupOldStorageFiles();
  }

  async uploadMenuPdf(file: any, email: string, fileName: string): Promise<{ url: string }> {
    return this.storageService.uploadMenuPdf(file, email, fileName);
  }
}
