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
      const { data: patient, error: pError } = await this.supabaseService
        .getClient()
        .from('patients')
        .select('acceso_portal, dado_de_baja')
        .eq('email', cleanEmail)
        .maybeSingle();

      const p = patient as unknown as { acceso_portal: boolean; dado_de_baja: boolean };
      if (pError || !p || !p.acceso_portal || p.dado_de_baja) {
        throw new Error(
          'Unauthorized: Account not approved, unsubscribed, or not found.',
        );
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
}
