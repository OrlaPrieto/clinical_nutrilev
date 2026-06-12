import { Module } from '@nestjs/common';
import { AppointmentsController } from './appointments.controller';
import { GoogleCalendarService } from './google-calendar.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';
import { PatientModule } from '../patients/patient.module';

@Module({
  imports: [AuthModule, NotificationsModule, PatientModule],
  controllers: [AppointmentsController],
  providers: [GoogleCalendarService],
  exports: [GoogleCalendarService],
})
export class AppointmentsModule {}
