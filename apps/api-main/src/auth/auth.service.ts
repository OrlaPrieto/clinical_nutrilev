import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../common/supabase.service';
import { AuthResponse } from '../common/interfaces';

@Injectable()
export class AuthService {
  constructor(
    private supabaseService: SupabaseService,
    private configService: ConfigService,
  ) {}

  async signInWithMagicLink(email: string): Promise<AuthResponse> {
    const cleanEmail = email.toLowerCase();
    const ADMIN_EMAILS = [
      'orla08i@gmail.com',
      'velvetdelacruzvillegas@gmail.com',
    ];

    // 1. Check if Admin
    if (!ADMIN_EMAILS.includes(cleanEmail)) {
      // 2. Check if Approved Patient
      const { data, error: pError } = await this.supabaseService
        .getClient()
        .from('patients')
        .select('email, acceso_portal, dado_de_baja')
        .ilike('email', cleanEmail)
        .maybeSingle();

      interface PatientAuthData {
        email: string;
        acceso_portal: boolean;
        dado_de_baja: boolean;
      }

      const patient = data as unknown as PatientAuthData;

      if (pError || !patient) {
        console.error('Auth check failed:', {
          email: cleanEmail,
          error: pError,
          found: !!patient,
        });
        throw new Error('Unauthorized or not found.');
      }

      if (!patient.acceso_portal || patient.dado_de_baja) {
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
    const ADMIN_EMAILS = [
      'orla08i@gmail.com',
      'velvetdelacruzvillegas@gmail.com',
    ];

    if (ADMIN_EMAILS.includes(cleanEmail)) {
      return { role: 'admin' };
    }

    const { data, error } = await this.supabaseService
      .getClient()
      .from('patients')
      .select('acceso_portal, dado_de_baja')
      .ilike('email', cleanEmail)
      .maybeSingle();

    if (error || !data) return { role: 'none' };
    const patient = data as { acceso_portal: boolean; dado_de_baja: boolean };
    if (patient.dado_de_baja) return { role: 'denied' };
    return { role: patient.acceso_portal ? 'patient' : 'pending' };
  }
}
