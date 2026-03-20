import { Controller, Post, Body, Headers } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiResponse } from '../common/interfaces';
import type {
  ProcessMenuRequest as IProcessMenuRequest,
  NotifyMenuRequest as INotifyMenuRequest,
} from '../common/interfaces';

@Controller('api')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('process-menu')
  async processMenu(
    @Body() data: IProcessMenuRequest,
    @Headers('authorization') authHeader: string,
  ): Promise<AiResponse> {
    return this.aiService.processMenu(data, authHeader || '');
  }

  @Post('notify-menu')
  async notifyMenu(@Body() data: INotifyMenuRequest): Promise<AiResponse> {
    return this.aiService.notifyMenu(data);
  }
}
