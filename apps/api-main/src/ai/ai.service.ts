import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  AiResponse,
  ProcessMenuRequest,
  NotifyMenuRequest,
} from '@shared/index';
import { EmailService } from '../common/email.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AiService {
  private readonly flaskBaseUrl: string;

  constructor(
    private configService: ConfigService,
    private emailService: EmailService,
    private httpService: HttpService,
    private notificationsService: NotificationsService,
  ) {
    this.flaskBaseUrl =
      this.configService.get<string>('FLASK_API_URL') ||
      'http://localhost:8000';
  }

  async processMenu(
    data: ProcessMenuRequest,
    authHeader: string,
  ): Promise<AiResponse> {
    const { data: responseData } = await firstValueFrom(
      this.httpService.post<AiResponse>(
        `${this.flaskBaseUrl}/api/process-menu`,
        data,
        {
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/json',
            'x-internal-key':
              this.configService.get<string>('INTERNAL_API_KEY'),
          },
        },
      ),
    );
    return responseData;
  }

  async notifyMenu(data: NotifyMenuRequest): Promise<AiResponse> {
    const success = await this.emailService.sendMenuNotification(data);
    
    if (success) {
      this.notificationsService.sendMenuPushNotification(data.email, data.nombre)
        .catch(err => console.error('Failed to send push notification:', err));
    }

    return {
      success,
      message: success ? 'Email sent successfully' : 'Failed to send email',
    };
  }

  async generateAiMenu(
    patientContext: any,
    calories: number,
    extraNotes: string,
    file?: any,
  ): Promise<any> {
    const formData = new FormData();
    formData.append('patient_context', JSON.stringify(patientContext));
    formData.append('calories', calories.toString());
    formData.append('extra_notes', extraNotes || '');

    if (file) {
      const blob = new Blob([file.buffer], { type: file.mimetype });
      formData.append('file', blob, file.originalname);
    }

    try {
      const { data: responseData } = await firstValueFrom(
        this.httpService.post(
          `${this.flaskBaseUrl}/api/generate-ai-menu`,
          formData,
          {
            headers: {
              'x-internal-key':
                this.configService.get<string>('INTERNAL_API_KEY'),
            },
            responseType: 'arraybuffer',
            timeout: 120000,
          },
        ),
      );
      return responseData;
    } catch (error) {
      console.error('--- [NESTJS AI SERVICE ERROR] ---');
      if (error.response) {
        let errorMessage = 'Unknown error from Python service';
        try {
          if (error.response.data instanceof ArrayBuffer) {
            const decoder = new TextDecoder('utf-8');
            errorMessage = decoder.decode(error.response.data);
          } else {
            errorMessage = JSON.stringify(error.response.data);
          }
        } catch (e) {
          errorMessage = error.message;
        }
        console.error('Status:', error.response.status);
        console.error('Data:', errorMessage);
        throw new Error(`Python AI Error (${error.response.status}): ${errorMessage}`);
      }
      console.error('Message:', error.message);
      throw error;
    }
  }
}
