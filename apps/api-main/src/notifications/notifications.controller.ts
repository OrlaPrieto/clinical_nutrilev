import { Controller, Post, Body, UseGuards, Logger } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { PatientAuthGuard } from '../common/guards/patient-auth.guard';

@Controller('api/notifications')
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('subscribe')
  @UseGuards(PatientAuthGuard)
  async subscribe(
    @Body('email') email: string,
    @Body('subscription') subscription: any,
  ): Promise<{ success: boolean }> {
    this.logger.log(`[Notifications] Push subscription registered/updated for: ${email}`);
    const success = await this.notificationsService.saveSubscription(email, subscription);
    return { success };
  }
}
