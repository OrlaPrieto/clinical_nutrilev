import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  AiResponse,
  ProcessMenuRequest,
  NotifyMenuRequest,
} from '../common/interfaces';
import { EmailService } from '../common/email.service';

@Injectable()
export class AiService {
  private readonly flaskBaseUrl: string;

  constructor(
    private configService: ConfigService,
    private emailService: EmailService,
    private httpService: HttpService,
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
          },
        },
      ),
    );
    return responseData;
  }

  async notifyMenu(data: NotifyMenuRequest): Promise<AiResponse> {
    const success = await this.emailService.sendMenuNotification(data);
    return {
      success,
      message: success ? 'Email sent successfully' : 'Failed to send email',
    };
  }
}
