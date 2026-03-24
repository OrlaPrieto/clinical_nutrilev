import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../common/supabase.service';
import { AuthResponse } from '@shared/index';

@Injectable()
export class AuthService {
  private readonly adminEmails: string[];

  constructor(
    private supabaseService: SupabaseService,
    private configService: ConfigService,
  ) {
    const adminStr = this.configService.get<string>('ADMIN_EMAILS') || '';
    this.adminEmails = adminStr
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0);
  }

  async signInWithMagicLink(email: string): Promise<AuthResponse> {
    const cleanEmail = email.toLowerCase();

    // 1. Check if Admin
    if (!this.adminEmails.includes(cleanEmail)) {
      // 2. Check if Approved Patient
      // Use select() without maybeSingle() to handle multiple records for the same email
      const { data: patients, error: pError } = await this.supabaseService
        .getClient()
        .from('patients')
        .select('email, acceso_portal, dado_de_baja')
        .ilike('email', cleanEmail);

      interface PatientAuthData {
        email: string;
        acceso_portal: boolean;
        dado_de_baja: boolean;
      }

      if (pError) {
        console.error('Auth check error (DB):', pError);
        throw new Error('Database error during auth check.');
      }

      const results = patients as unknown as PatientAuthData[];
      if (!results || results.length === 0) {
        console.warn(`Auth check: No patient found for ${cleanEmail}`);
        throw new Error('Unauthorized or not found.');
      }

      const activePatient = results.find(
        (p) => p.acceso_portal && !p.dado_de_baja,
      );

      if (!activePatient) {
        console.warn(
          `Auth check: Patient found for ${cleanEmail} but access is not authorized or is banned. Statuses:`,
          results.map((r) => ({
            portal: r.acceso_portal,
            baja: r.dado_de_baja,
          })),
        );
        throw new Error('Unauthorized: Access revoked or pending.');
      }
    }

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:4200';

    const { data, error } = await this.supabaseService
      .getClient()
      .auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${frontendUrl}/portal`,
        },
      });

    if (error) throw error;
    return data as AuthResponse;
  }

  private roleCache = new Map<string, { role: string; expiry: number }>();
  private readonly CACHE_TTL = 1000 * 60 * 5; // 5 minutes

  async getRole(email: string): Promise<{ role: string }> {
    const cleanEmail = email.toLowerCase();
    const now = Date.now();

    // Check cache
    const cached = this.roleCache.get(cleanEmail);
    if (cached && cached.expiry > now) {
      return { role: cached.role };
    }

    if (this.adminEmails.includes(cleanEmail)) {
      const result = { role: 'admin' };
      this.roleCache.set(cleanEmail, { ...result, expiry: now + this.CACHE_TTL });
      return result;
    }

    // Use select() to avoid .single() errors if multiple records exist
    const { data: patients, error } = await this.supabaseService
      .getClient()
      .from('patients')
      .select('acceso_portal, dado_de_baja')
      .ilike('email', cleanEmail);

    let role: string = 'none';

    if (error || !patients || patients.length === 0) {
      role = 'none';
    } else {
      const results = patients as {
        acceso_portal: boolean;
        dado_de_baja: boolean;
      }[];

      const isPatient = results.some((p) => p.acceso_portal && !p.dado_de_baja);
      if (isPatient) {
        role = 'patient';
      } else {
        const isPending = results.some((p) => !p.acceso_portal && !p.dado_de_baja);
        if (isPending) {
          role = 'pending';
        } else {
          role = 'denied';
        }
      }
    }

    const result = { role };
    this.roleCache.set(cleanEmail, { ...result, expiry: now + this.CACHE_TTL });
    return result;
  }
}
