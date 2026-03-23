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

  async getRole(email: string): Promise<{ role: string }> {
    const cleanEmail = email.toLowerCase();

    if (this.adminEmails.includes(cleanEmail)) {
      return { role: 'admin' };
    }

    // Use select() to avoid .single() errors if multiple records exist
    const { data: patients, error } = await this.supabaseService
      .getClient()
      .from('patients')
      .select('acceso_portal, dado_de_baja')
      .ilike('email', cleanEmail);

    if (error || !patients || patients.length === 0) return { role: 'none' };

    const results = patients as {
      acceso_portal: boolean;
      dado_de_baja: boolean;
    }[];

    // Logic: If any record is an active patient, they are a patient
    const isPatient = results.some((p) => p.acceso_portal && !p.dado_de_baja);
    if (isPatient) return { role: 'patient' };

    // If any record is pending (not banned)
    const isPending = results.some((p) => !p.acceso_portal && !p.dado_de_baja);
    if (isPending) return { role: 'pending' };
    
    return { role: 'denied' };
  }
}
