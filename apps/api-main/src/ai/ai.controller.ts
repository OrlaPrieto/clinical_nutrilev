import { Controller, Post, Body, Headers } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiResponse } from '../common/interfaces';
import { ProcessMenuDto, NotifyMenuDto } from './dto/ai-request.dto';

@Controller('api')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('process-menu')
  async processMenu(
    @Body() data: ProcessMenuDto,
    @Headers('authorization') authHeader: string,
  ): Promise<AiResponse> {
    return this.aiService.processMenu(data, authHeader || '');
  }

  @Post('notify-menu')
  async notifyMenu(@Body() data: NotifyMenuDto): Promise<AiResponse> {
    return this.aiService.notifyMenu(data);
  }
}
