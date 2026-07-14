import { Injectable, HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AiGatewayService {
  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {}

  async getShoppingList(menuUrl: string, clientIp?: string): Promise<any> {
    const flaskApiUrl = this.configService.get<string>('FLASK_API_URL');
    if (!flaskApiUrl) {
      throw new Error('FLASK_API_URL is not defined in environment variables');
    }

    const headers: Record<string, string> = {
      'x-internal-key': this.configService.get<string>('INTERNAL_API_KEY') || '',
    };

    if (clientIp) {
      headers['x-forwarded-for'] = clientIp;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${flaskApiUrl.replace(/\/$/, '')}/api/shopping-list`,
          {
            menu_url: menuUrl,
          },
          {
            headers,
            timeout: 240000,
          },
        ),
      );
      return response.data;
    } catch (error: any) {
      this.handleError(error, 'Error al llamar al servicio de lista de compras');
    }
  }

  async getParsedMenu(menuUrl: string, clientIp?: string): Promise<any> {
    const flaskApiUrl = this.configService.get<string>('FLASK_API_URL');
    if (!flaskApiUrl) {
      throw new Error('FLASK_API_URL is not defined in environment variables');
    }

    const headers: Record<string, string> = {
      'x-internal-key': this.configService.get<string>('INTERNAL_API_KEY') || '',
    };

    if (clientIp) {
      headers['x-forwarded-for'] = clientIp;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${flaskApiUrl.replace(/\/$/, '')}/api/parsed-menu`,
          {
            menu_url: menuUrl,
          },
          {
            headers,
            timeout: 240000, // 4 minutos de timeout para resiliencia ante rate limits
          },
        ),
      );
      return response.data;
    } catch (error: any) {
      this.handleError(error, 'Error al analizar el menú clínico');
    }
  }

  private handleError(error: any, defaultMsg: string) {
    if (error && error.response) {
      const status = error.response.status;
      const data = error.response.data;
      throw new HttpException(
        data?.error || data?.message || defaultMsg,
        status || 502,
      );
    }
    throw new HttpException(
      error instanceof Error ? error.message : defaultMsg,
      502,
    );
  }
}
