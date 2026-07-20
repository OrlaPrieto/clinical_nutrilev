import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../common/supabase.service';
import { AuthResponse } from '@shared/index';
import { EmailService } from '../common/email.service';

@Injectable()
export class AuthService {
  private readonly adminEmails: string[];

  constructor(
    private supabaseService: SupabaseService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {
    const adminStr = this.configService.get<string>('ADMIN_EMAILS') || '';
    this.adminEmails = adminStr
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0);
  }

  async verifyToken(token: string) {
    return await this.supabaseService.getClient().auth.getUser(token);
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
        const isPending = results.some(
          (p) => !p.acceso_portal && !p.dado_de_baja,
        );
        if (isPending) {
          role = 'pending';
        } else {
          role = 'denied';
        }
      }
    }

    return { role };
  }

  async sendResetPassword(
    email: string,
  ): Promise<{ success: boolean; message?: string }> {
    const cleanEmail = email.toLowerCase();

    // 1. Verify role
    const { role } = await this.getRole(cleanEmail);
    if (role !== 'admin' && role !== 'patient') {
      if (role === 'pending') {
        return {
          success: false,
          message:
            'Tu cuenta está pendiente de activación. Contacta a tu nutrióloga.',
        };
      } else if (role === 'denied') {
        return { success: false, message: 'Acceso denegado para este correo.' };
      } else {
        return {
          success: false,
          message: 'Tu correo no está registrado como paciente activo.',
        };
      }
    }

    // Intentar crear el usuario en Supabase Auth en caso de que no exista aún.
    // Si ya existe, este llamado fallará con un error de duplicado (ej. 'Email already registered'),
    // el cual podemos ignorar de forma segura ya que el usuario ya existe.
    const { error: createError } = await this.supabaseService
      .getClient()
      .auth.admin.createUser({
        email: cleanEmail,
        email_confirm: true,
      });

    if (
      createError &&
      createError.message !== 'Email already registered' &&
      !createError.message.includes('already')
    ) {
      console.warn('Note: Suppressed Supabase Auth creation result:', createError.message);
    }

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:4200';

    // 2. Generate Link using Supabase Admin API (now guaranteed to exist)
    const { data, error } = await this.supabaseService
      .getClient()
      .auth.admin.generateLink({
        type: 'recovery',
        email: cleanEmail,
        options: {
          redirectTo: `${frontendUrl}/login?recovery=true`,
        },
      });

    if (error || !data?.properties?.action_link) {
      console.error('Error generating recovery link:', error);
      return {
        success: false,
        message:
          'Error al generar el enlace de recuperación: ' +
          (error?.message || 'enlace vacío'),
      };
    }

    // 3. Send email via Resend
    const emailSent = await this.emailService.sendPasswordResetEmail(
      cleanEmail,
      data.properties.action_link,
    );

    if (!emailSent) {
      return {
        success: false,
        message:
          'Error al enviar el correo de recuperación. Inténtalo más tarde.',
      };
    }

    return { success: true };
  }
}
