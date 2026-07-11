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

    let taskId: string;
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${flaskApiUrl.replace(/\/$/, '')}/api/parsed-menu`,
          {
            menu_url: menuUrl,
          },
          {
            headers,
            timeout: 15000,
          },
        ),
      );
      taskId = response.data?.task_id;
      if (!taskId) {
        throw new Error('Python AI service did not return a task ID');
      }
    } catch (error: any) {
      this.handleError(error, 'Error al iniciar análisis de menú');
    }

    const maxRetries = 80;
    const pollIntervalMs = 3000;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
      
      try {
        const response = await firstValueFrom(
          this.httpService.get(
            `${flaskApiUrl.replace(/\/$/, '')}/api/tasks/${taskId}`,
            {
              headers,
              timeout: 10000,
            },
          ),
        );
        const task = response.data;
        if (task.status === 'completed') {
          return task.result;
        } else if (task.status === 'failed') {
          throw new HttpException(
            task.error || 'Error en el procesamiento de IA',
            task.is_transient ? 429 : 500,
          );
        }
      } catch (error: any) {
        if (error instanceof HttpException) {
          throw error;
        }
        if (error && error.response) {
          const status = error.response.status;
          const data = error.response.data;
          throw new HttpException(
            data?.error || data?.message || 'Error al obtener estado de la tarea de IA',
            status || 502,
          );
        }
        console.warn(`[AiGateway] Polling task ${taskId} failed on attempt ${attempt + 1}: ${error.message}`);
      }
    }
    
    throw new HttpException('Tiempo de espera agotado para el procesamiento del menú', 504);
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
