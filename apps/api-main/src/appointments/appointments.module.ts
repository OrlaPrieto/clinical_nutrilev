import { Module } from '@nestjs/common';
import { AppointmentsController } from './appointments.controller';
import { GoogleCalendarService } from './google-calendar.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [AppointmentsController],
  providers: [GoogleCalendarService],
  exports: [GoogleCalendarService],
})
export class AppointmentsModule {}
