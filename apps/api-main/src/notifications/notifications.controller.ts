import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { PatientAuthGuard } from '../common/guards/patient-auth.guard';

@Controller('api/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('subscribe')
  @UseGuards(PatientAuthGuard)
  async subscribe(
    @Body('email') email: string,
    @Body('subscription') subscription: any,
  ): Promise<{ success: boolean }> {
    const success = await this.notificationsService.saveSubscription(email, subscription);
    return { success };
  }
}
