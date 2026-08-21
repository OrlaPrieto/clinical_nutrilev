import {
  Controller,
  Post,
  Body,
  Headers,
  UseInterceptors,
  UploadedFile,
  Res,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AiService } from './ai.service';
import { PatientService } from '../patients/patient.service';
import { AdminGuard } from '../common/guards/admin.guard';
import type { AiResponse, NotifyMenuRequest } from '@shared/index';
import type { Response } from 'express';

@Controller('api')
@UseGuards(AdminGuard)
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly patientService: PatientService,
  ) {}

  @Post('process-menu')
  async processMenu(
    @Body() data: any,
    @Headers('authorization') authHeader: string,
  ): Promise<AiResponse> {
    return this.aiService.processMenu(data, authHeader || '');
  }

  @Post('notify-menu')
  async notifyMenu(@Body() data: NotifyMenuRequest): Promise<AiResponse> {
    return this.aiService.notifyMenu(data);
  }

  @Post('generate-ai-menu')
  @UseInterceptors(FileInterceptor('file'))
  async generateAiMenu(
    @UploadedFile() file: any,
    @Body('patient_context') patientContextStr: string,
    @Body('calories') calories: string,
    @Body('extra_notes') extraNotes: string,
    @Res() res: Response,
  ) {
    try {
      const patientContext = JSON.parse(patientContextStr || '{}');

      // --- FETCH LAST 3 PROGRESS RECORDS ---
      if (patientContext.email) {
        try {
          const progress = await this.patientService.getProgress(
            patientContext.email,
          );
          patientContext.progreso_historial = progress.slice(0, 3);
          console.log(
            `[AiController] Agregados ${patientContext.progreso_historial.length} registros de progreso para ${patientContext.email}`,
          );
        } catch (err) {
          console.warn(
            '[AiController] No se pudo obtener el historial de progreso:',
            err.message,
          );
        }
      }

      const pdfBuffer = await this.aiService.generateAiMenu(
        patientContext,
        parseInt(calories, 10) || 2000,
        extraNotes,
        file,
      );

      console.log(
        `[AiController] Successfully generated AI Menu docx for patient: ${patientContext?.email || 'unknown'} (${calories} kcal)`,
      );

      res.set({
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': 'attachment; filename=menu_personalizado.docx',
      });

      res.send(Buffer.from(pdfBuffer));
    } catch (error) {
      console.error('--- [CONTROLLER ERROR] generateAiMenu ---');
      console.error(error);
      res.status(500).json({
        error: 'Error generating AI menu',
        message: error.message,
      });
    }
  }

  @Post('suggest-menu-copilot')
  async suggestMenuCopilot(
    @Body()
    body: {
      patient_context: any;
      prev_progress?: any;
      latest_progress?: any;
      previous_menu_summary?: string;
      calories?: number;
      extra_notes?: string;
      menu_format?: string;
    },
  ) {
    const response = await this.aiService.suggestMenuCopilot(body);
    if (response && response.success && response.data && body.patient_context) {
      const patientIdOrEmail = body.patient_context.id || body.patient_context.email;
      if (patientIdOrEmail) {
        this.patientService
          .saveCopilotSuggestion(patientIdOrEmail, response.data)
          .catch((err) =>
            console.warn('[AiController] Error persisting copilot suggestion:', err),
          );
      }
    }
    return response;
  }
}
