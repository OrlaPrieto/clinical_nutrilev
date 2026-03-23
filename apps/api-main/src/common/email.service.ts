import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { NotifyMenuRequest } from '@shared/index';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resendApiKey: string;
  private readonly emailFrom: string;

  constructor(private configService: ConfigService) {
    this.resendApiKey = this.configService.get<string>('RESEND_API_KEY') || '';
    this.emailFrom =
      this.configService.get<string>('EMAIL_FROM') || 'onboarding@resend.dev';
  }

  async sendMenuNotification(data: NotifyMenuRequest): Promise<boolean> {
    if (!this.resendApiKey) {
      this.logger.error('Resend API Key is missing');
      return false;
    }

    const { email, nombre, menu_url } = data;

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
    </head>
    <body style="font-family: 'Inter', -apple-system, sans-serif; background-color: #faf9f6; padding: 20px; color: #444;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 24px; padding: 40px; box-shadow: 0 10px 25px rgba(255, 65, 248, 0.05);">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #ff41f8; font-family: 'Playfair Display', serif; font-size: 28px; font-weight: 700; letter-spacing: -0.5px; margin: 0;">Nutrilev</h1>
            </div>
            
            <h2 style="font-size: 20px; color: #222; margin-bottom: 15px; font-weight: 600;">¡Hola, ${nombre}!</h2>
            <p style="font-size: 15px; line-height: 1.6; margin-bottom: 25px; color: #555;">
                Tu especialista en nutrición acaba de subir tu nuevo plan alimenticio estructurado a tu portal.
            </p>
            
            <div style="text-align: center; margin: 35px 0;">
                ${menu_url ? `<a href="${menu_url}" style="background-color: #ff41f8; color: white; padding: 14px 32px; text-decoration: none; border-radius: 14px; font-weight: 600; font-size: 15px; display: inline-block; margin-bottom: 15px;">Descargar Plan PDF</a><br>` : ''}
                <a href="${this.configService.get('FRONTEND_URL') || 'http://localhost:4200'}/portal" style="color: #ff41f8; text-decoration: none; font-size: 14px; font-weight: 500;">
                    O ingresa a tu Portal »
                </a>
            </div>
            
            <div style="background-color: #fdf5ff; border: 1px solid #ffd9fd; border-radius: 12px; padding: 18px; margin-bottom: 20px;">
                <p style="font-size: 13px; margin: 0; line-height: 1.5; color: #b32eb0;">
                    <strong>⚠️ Aviso de Privacidad:</strong> Por seguridad de tu expediente, el menú estará disponible para previsualización y descarga únicamente durante <strong>7 días</strong>. Asegúrate de guardarlo localmente.
                </p>
            </div>
            
            <hr style="border: none; border-top: 1px solid #f0f0f0; margin: 30px 0;">
            <p style="font-size: 11px; color: #999; text-align: center; line-height: 1.5;">
                Este es un correo automático generado por la plataforma clínica Nutrilev.<br>Por favor no respondas a este mensaje.
            </p>
        </div>
    </body>
    </html>
    `;

    try {
      await axios.post(
        'https://api.resend.com/emails',
        {
          from: `Nutrilev <${this.emailFrom}>`,
          to: [email],
          subject: '🍏 ¡Tu plan nutricional está listo!',
          html: htmlContent,
        },
        {
          headers: {
            Authorization: `Bearer ${this.resendApiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );
      return true;
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error sending email via Resend: ${errMsg}`);
      if (axios.isAxiosError(error) && error.response) {
        this.logger.error(
          `Resend API Error: ${JSON.stringify(error.response.data)}`,
        );
      }
      return false;
    }
  }
}
