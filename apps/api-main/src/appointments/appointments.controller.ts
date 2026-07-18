import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { GoogleCalendarService } from './google-calendar.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PatientAuthGuard } from '../common/guards/patient-auth.guard';
import { ConfigService } from '@nestjs/config';
import { PatientService } from '../patients/patient.service';

@Controller('api/appointments')
export class AppointmentsController {
  // Diagnostic reload comment
  private readonly logger = new Logger(AppointmentsController.name);

  constructor(
    private readonly calendarService: GoogleCalendarService,
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService,
    private readonly patientService: PatientService,
  ) {}

  /**
   * Retrieves the next upcoming appointment for a specific patient.
   */
  @Get('next/:email')
  @UseGuards(PatientAuthGuard)
  async getNextAppointment(@Param('email') email: string) {
    try {
      const event = await this.calendarService.getNextAppointment(email);
      if (!event) {
        return { hasAppointment: false };
      }

      // Map colorId to a standard status string
      // Esmeralda '7' u otros -> pending
      // Morado '3' o Verde Musgo '10' -> confirmed
      // Rojo '11' -> cancelled
      let status = 'pending';
      const colorId = event.colorId;
      if (colorId === '3' || colorId === '10') {
        status = 'confirmed';
      } else if (colorId === '11') {
        status = 'cancelled';
      }

      return {
        hasAppointment: true,
        eventId: event.id,
        summary: event.summary,
        description: event.description,
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        status,
        colorId,
      };
    } catch (error: any) {
      this.logger.error(`Error fetching next appointment for ${email}: ${error.message}`);
      throw new HttpException(
        'Error al obtener la siguiente cita de Google Calendar',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Confirms a patient's appointment.
   */
  @Post('confirm')
  @UseGuards(PatientAuthGuard)
  async confirmAppointment(@Body() body: { email: string; eventId: string }) {
    const { eventId, email } = body;
    if (!eventId || !email) {
      throw new HttpException('Faltan parámetros requeridos (email o eventId)', HttpStatus.BAD_REQUEST);
    }

    try {
      const event = await this.calendarService.getEvent(eventId);
      const currentColor = event.colorId;
      const currentDescription = event.description || '';

      // Sigue la regla de color de la cita pagada:
      // - Si es Verde Esmeralda ('7' o '2' según la traducción/dispositivo), cambiar a Morado Intenso '3' (Uva)
      // - Cualquier otro color cambiar a Verde Musgo '10' (Albahaca)
      const newColorId = (currentColor === '2' || currentColor === '7') ? '3' : '10';

      const note = '\n\n[Cita confirmada mediante la aplicación Nutrilev]';
      let newDescription = currentDescription;
      if (!currentDescription.includes('[Cita confirmada')) {
        newDescription = (currentDescription.trim() + note).trim();
      }

      await this.calendarService.updateEventColorAndDescription(eventId, newColorId, newDescription);
      this.logger.log(`[Appointments] Appointment confirmed by patient: ${email} (EventID: ${eventId})`);
      return { success: true, status: 'confirmed', colorId: newColorId };
    } catch (error: any) {
      this.logger.error(`Error confirming event ${eventId}: ${error.message}`);
      throw new HttpException(
        'Error al confirmar la cita en Google Calendar',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Rejects/cancels a patient's appointment.
   */
  @Post('cancel')
  @UseGuards(PatientAuthGuard)
  async cancelAppointment(@Body() body: { email: string; eventId: string }) {
    const { eventId, email } = body;
    if (!eventId || !email) {
      throw new HttpException('Faltan parámetros requeridos (email o eventId)', HttpStatus.BAD_REQUEST);
    }

    try {
      // Regla de color para cancelar es siempre Rojo '11' (Tomate)
      await this.calendarService.updateEventColor(eventId, '11');
      this.logger.log(`[Appointments] Appointment cancelled/rejected by patient: ${email} (EventID: ${eventId})`);
      return { success: true, status: 'cancelled', colorId: '11' };
    } catch (error: any) {
      this.logger.error(`Error cancelling event ${eventId}: ${error.message}`);
      throw new HttpException(
        'Error al rechazar/cancelar la cita en Google Calendar',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Cron endpoint called externally (e.g., from cron-job.org) to send Web Push reminders
   * to patients who have appointments scheduled for tomorrow.
   */
  @Get('cron/send-reminders')
  async runCronReminders(@Query('secret') secret: string) {
    const expectedSecret = this.configService.get<string>('CRON_SECRET');
    if (!expectedSecret || secret !== expectedSecret) {
      throw new HttpException('No autorizado', HttpStatus.UNAUTHORIZED);
    }

    this.logger.log('Executing appointment reminder cron job triggered via cron-job.org...');

    try {
      // 1. Calculate the time window for tomorrow in Mexico City (UTC-6)
      const offset = -6 * 60; // -360 minutes
      const nowUtc = new Date();
      const nowMexico = new Date(nowUtc.getTime() + (offset + nowUtc.getTimezoneOffset()) * 60 * 1000);
      const dayOfWeek = nowMexico.getDay(); // 0: Sunday, 6: Saturday

      let daysToAdd = 1;
      if (dayOfWeek === 6) {
        daysToAdd = 2; // On Saturday, send for Monday
      } else if (dayOfWeek === 0) {
        this.logger.log('Skipping Sunday run. Monday reminders were sent on Saturday.');
        return { message: 'Skipping Sunday run. Monday reminders were sent on Saturday.' };
      }

      const targetDate = new Date(nowMexico);
      targetDate.setDate(nowMexico.getDate() + daysToAdd);

      // Create start and end date objects for target day in Mexico
      const timeMinDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0);
      const timeMaxDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59);

      // Convert back to UTC representation for Calendar API (representing the same absolute moment)
      const timeMin = new Date(timeMinDate.getTime() - (offset + timeMinDate.getTimezoneOffset()) * 60 * 1000).toISOString();
      const timeMax = new Date(timeMaxDate.getTime() - (offset + timeMaxDate.getTimezoneOffset()) * 60 * 1000).toISOString();

      this.logger.log(`Fetching events between: ${timeMin} and ${timeMax}`);
      const events = await this.calendarService.getEventsForRange(timeMin, timeMax);

      if (events.length === 0) {
        this.logger.log('No events found for tomorrow.');
        return { message: 'No events found for tomorrow.', processed: 0 };
      }

      const results: any[] = [];
      const targetDayStr = dayOfWeek === 6 ? 'el lunes' : 'mañana';

      // 2. Loop and process push notifications
      for (const event of events) {
        let contact = event.description;

        // Fallback to attendees
        if (!contact && event.attendees && event.attendees.length > 0) {
          const nonSelfAttendee = event.attendees.find(
            (a) => !a.self && a.email && !a.email.includes('resource.calendar')
          );
          if (nonSelfAttendee) {
            contact = nonSelfAttendee.email;
          }
        }

        // Standardize clean email
        if (!contact || !contact.includes('@')) {
          this.logger.warn(`Skipping event "${event.summary}": No valid email contact found.`);
          results.push({ summary: event.summary, status: 'skipped - no valid contact' });
          continue;
        }

        const emailMatch = contact.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        const cleanEmail = emailMatch ? emailMatch[0].toLowerCase().trim() : contact.toLowerCase().trim();

        // Resolve patient's first name
        let patientName = '';
        try {
          const patient = await this.patientService.findByEmail(cleanEmail);
          if (patient && patient.nombre) {
            const firstName = patient.nombre.trim().split(/\s+/)[0];
            patientName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
          }
        } catch (err) {
          this.logger.warn(`Could not find patient in DB by email: ${cleanEmail}. Fallback to event summary.`);
        }

        if (!patientName) {
          // Fallback: clean the Google Calendar event summary
          const summaryCleaned = (event.summary || '')
            .replace(/\s*\(\d+\)\s*/g, '')
            .replace(/virtual/gi, '')
            .replace(/cita/gi, '')
            .replace(/consulta/gi, '')
            .replace(/\s*\d+\/\d+\s*/g, '')
            .trim();
          const firstWord = summaryCleaned.split(/\s+/)[0] || 'Paciente';
          patientName = firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase();
        }

        // Format start time in UTC-6
        const eventStartDate = new Date(event.start.dateTime || event.start.date);
        const eventStartMexico = new Date(eventStartDate.getTime() + (offset + eventStartDate.getTimezoneOffset()) * 60 * 1000);
        
        let hours = eventStartMexico.getHours();
        const minutes = eventStartMexico.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // 0 should be 12
        const minutesStr = minutes < 10 ? '0' + minutes : minutes;
        const timeStr = `${hours}:${minutesStr} ${ampm}`;

        try {
          // Send push notification
          await this.notificationsService.sendAppointmentReminderPushNotification(
            cleanEmail,
            patientName,
            timeStr,
            event.id,
            targetDayStr,
          );
          this.logger.log(`[Push Sent] Notified ${patientName} (${cleanEmail}) for ${targetDayStr} at ${timeStr}`);
          results.push({ patientName, email: cleanEmail, status: 'notified' });
        } catch (err: any) {
          this.logger.error(`Failed sending reminder push to ${patientName}: ${err.message}`);
          results.push({ patientName, email: cleanEmail, status: 'error', error: err.message });
        }
      }

      return {
        message: 'Recordatorios de citas procesados exitosamente',
        processed: results.length,
        results,
      };
    } catch (error: any) {
      this.logger.error(`Error running reminders cron: ${error.message}`);
      throw new HttpException(
        'Error interno al procesar recordatorios',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Cron endpoint called externally (e.g., from cron-job.org every 10-15 minutes) to send Web Push reminders
   * to patients whose appointments start in approximately 30 minutes.
   */
  @Get('cron/send-reminders-30min')
  async runCron30MinReminders(@Query('secret') secret: string) {
    const expectedSecret = this.configService.get<string>('CRON_SECRET');
    if (!expectedSecret || secret !== expectedSecret) {
      throw new HttpException('No autorizado', HttpStatus.UNAUTHORIZED);
    }

    this.logger.log('Executing 30-minute pre-appointment reminder cron job...');

    try {
      const now = new Date();
      // Search for events starting in [now + 10 mins, now + 45 mins]
      const timeMin = new Date(now.getTime() + 10 * 60 * 1000).toISOString();
      const timeMax = new Date(now.getTime() + 45 * 60 * 1000).toISOString();

      this.logger.log(`Fetching upcoming events between: ${timeMin} and ${timeMax}`);
      const events = await this.calendarService.getEventsForRange(timeMin, timeMax);

      if (events.length === 0) {
        this.logger.log('No events found starting in the next 10 to 45 minutes.');
        return { message: 'No events found.', processed: 0 };
      }

      const results: any[] = [];
      const offset = -6 * 60; // UTC-6

      for (const event of events) {
        // Skip cancelled events
        if (event.colorId === '11') {
          results.push({ summary: event.summary, status: 'skipped - cancelled event' });
          continue;
        }

        const description = event.description || '';
        // Skip if already notified
        if (description.includes('[Notificado 30m]')) {
          results.push({ summary: event.summary, status: 'skipped - already notified' });
          continue;
        }

        let contact = event.description;
        // Fallback to attendees
        if (!contact && event.attendees && event.attendees.length > 0) {
          const nonSelfAttendee = event.attendees.find(
            (a) => !a.self && a.email && !a.email.includes('resource.calendar')
          );
          if (nonSelfAttendee) {
            contact = nonSelfAttendee.email;
          }
        }

        // Standardize clean email
        if (!contact || !contact.includes('@')) {
          this.logger.warn(`Skipping event "${event.summary}": No valid email contact found.`);
          results.push({ summary: event.summary, status: 'skipped - no valid contact' });
          continue;
        }

        const emailMatch = contact.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        const cleanEmail = emailMatch ? emailMatch[0].toLowerCase().trim() : contact.toLowerCase().trim();

        // Resolve patient's first name
        let patientName = '';
        try {
          const patient = await this.patientService.findByEmail(cleanEmail);
          if (patient && patient.nombre) {
            const firstName = patient.nombre.trim().split(/\s+/)[0];
            patientName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
          }
        } catch (err) {
          this.logger.warn(`Could not find patient in DB by email: ${cleanEmail}. Fallback to event summary.`);
        }

        if (!patientName) {
          // Fallback: clean the Google Calendar event summary
          const summaryCleaned = (event.summary || '')
            .replace(/\s*\(\d+\)\s*/g, '')
            .replace(/virtual/gi, '')
            .replace(/cita/gi, '')
            .replace(/consulta/gi, '')
            .replace(/\s*\d+\/\d+\s*/g, '')
            .trim();
          const firstWord = summaryCleaned.split(/\s+/)[0] || 'Paciente';
          patientName = firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase();
        }

        // Format start time in UTC-6
        const eventStartDate = new Date(event.start.dateTime || event.start.date);
        const eventStartMexico = new Date(eventStartDate.getTime() + (offset + eventStartDate.getTimezoneOffset()) * 60 * 1000);
        
        let hours = eventStartMexico.getHours();
        const minutes = eventStartMexico.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // 0 should be 12
        const minutesStr = minutes < 10 ? '0' + minutes : minutes;
        const timeStr = `${hours}:${minutesStr} ${ampm}`;

        // Calculate exact minutes remaining
        const diffMs = eventStartDate.getTime() - now.getTime();
        const minutesRemaining = Math.max(1, Math.round(diffMs / 60000));

        try {
          // Send push notification
          await this.notificationsService.sendAppointmentShortReminderPushNotification(
            cleanEmail,
            patientName,
            timeStr,
            minutesRemaining,
          );

          // Mark event as notified by patching description
          await this.calendarService.updateEventDescription(event.id, `${description}\n[Notificado 30m]`.trim());

          this.logger.log(`[Push Sent] 30m Notification sent to ${patientName} (${cleanEmail}) for appointment at ${timeStr}`);
          results.push({ patientName, email: cleanEmail, status: 'notified' });
        } catch (err: any) {
          this.logger.error(`Failed sending 30m reminder push to ${patientName}: ${err.message}`);
          results.push({ patientName, email: cleanEmail, status: 'error', error: err.message });
        }
      }

      return {
        message: 'Recordatorios de 30 minutos procesados exitosamente',
        processed: results.length,
        results,
      };
    } catch (error: any) {
      this.logger.error(`Error running 30m reminders cron: ${error.message}`);
      throw new HttpException(
        'Error interno al procesar recordatorios de 30 minutos',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Cron endpoint called externally to clean up expired menu files (older than 8 days)
   * from Supabase Storage.
   */
  @Get('cron/cleanup-storage')
  async runCronStorageCleanup(@Query('secret') secret: string) {
    const expectedSecret = this.configService.get<string>('CRON_SECRET');
    if (!expectedSecret || secret !== expectedSecret) {
      throw new HttpException('No autorizado', HttpStatus.UNAUTHORIZED);
    }

    this.logger.log('Executing storage cleanup cron job...');

    try {
      const result = await this.patientService.cleanupOldStorageFiles();
      this.logger.log(`Storage cleanup cron completed. Deleted ${result.deletedCount} files.`);
      return {
        success: true,
        message: `Limpieza de storage completada exitosamente. Se eliminaron ${result.deletedCount} archivos.`,
        ...result
      };
    } catch (error: any) {
      this.logger.error(`Error running storage cleanup cron: ${error.message}`);
      throw new HttpException(
        `Error al ejecutar limpieza de storage: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

