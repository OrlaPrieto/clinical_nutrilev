import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);
  private calendarId: string;
  private auth: any;

  constructor(private configService: ConfigService) {
    this.calendarId = this.configService.get<string>('GOOGLE_CALENDAR_ID') || 'orla08i@gmail.com';
    this.initializeAuth();
  }

  private initializeAuth() {
    const scopes = ['https://www.googleapis.com/auth/calendar'];
    const envCreds = this.configService.get<string>('GOOGLE_CREDENTIALS_JSON');

    if (envCreds) {
      try {
        const credentials = JSON.parse(envCreds);
        this.auth = new google.auth.GoogleAuth({
          credentials,
          scopes,
        });
        this.logger.log('Google Auth initialized successfully from GOOGLE_CREDENTIALS_JSON environment variable.');
        return;
      } catch (err: any) {
        this.logger.error('Failed to parse GOOGLE_CREDENTIALS_JSON environment variable:', err.message);
      }
    }

    // Fallback: Read file google-credentials.json
    const possiblePaths = [
      path.join(process.cwd(), 'google-credentials.json'),
      path.join(process.cwd(), 'apps', 'api-main', 'google-credentials.json'),
      path.join(__dirname, '..', '..', 'google-credentials.json'),
    ];

    let credentialsPath = '';
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        credentialsPath = p;
        break;
      }
    }

    if (credentialsPath) {
      this.logger.log(`Initializing Google Auth using file: ${credentialsPath}`);
      this.auth = new google.auth.GoogleAuth({
        keyFile: credentialsPath,
        scopes,
      });
    } else {
      this.logger.warn(
        'Google credentials not found. Set GOOGLE_CREDENTIALS_JSON in env or place google-credentials.json in apps/api-main'
      );
    }
  }

  private getCalendarClient() {
    if (!this.auth) {
      throw new Error('Google authentication has not been initialized.');
    }
    return google.calendar({ version: 'v3', auth: this.auth });
  }

  /**
   * Get tomorrow's events to send push notifications.
   */
  async getEventsForRange(timeMin: string, timeMax: string): Promise<any[]> {
    try {
      const calendar = this.getCalendarClient();
      const response = await calendar.events.list({
        calendarId: this.calendarId,
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: 'startTime',
      });
      return response.data.items || [];
    } catch (error: any) {
      this.logger.error(`Error fetching events for range: ${error.message}`);
      throw error;
    }
  }

  /**
   * Fetch the next appointment for a patient based on their email.
   * Looks up to 2 months in advance.
   */
  async getNextAppointment(email: string): Promise<any | null> {
    try {
      const calendar = this.getCalendarClient();
      const timeMin = new Date().toISOString();
      // Look up to 2 months in advance
      const timeMax = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
      const cleanEmail = email.toLowerCase().trim();

      const response = await calendar.events.list({
        calendarId: this.calendarId,
        timeMin,
        timeMax,
        q: cleanEmail,
        singleEvents: true,
        orderBy: 'startTime',
      });

      const events = response.data.items || [];
      
      // Filter events by description or attendee email containing the user's email
      const patientEvent = events.find(event => {
        const description = (event.description || '').toLowerCase();
        if (description.includes(cleanEmail)) {
          return true;
        }

        if (event.attendees && event.attendees.length > 0) {
          return event.attendees.some(
            attendee => attendee.email && attendee.email.toLowerCase() === cleanEmail
          );
        }

        return false;
      });

      return patientEvent || null;
    } catch (error: any) {
      this.logger.error(`Error searching next appointment for ${email}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Fetch a specific event by ID.
   */
  async getEvent(eventId: string): Promise<any> {
    try {
      const calendar = this.getCalendarClient();
      const response = await calendar.events.get({
        calendarId: this.calendarId,
        eventId,
      });
      return response.data;
    } catch (error: any) {
      this.logger.error(`Error getting event ${eventId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update color of an event.
   */
  async updateEventColor(eventId: string, colorId: string): Promise<void> {
    try {
      const calendar = this.getCalendarClient();
      await calendar.events.patch({
        calendarId: this.calendarId,
        eventId,
        requestBody: { colorId },
      });
      this.logger.log(`Event ${eventId} color updated to ${colorId}`);
    } catch (error: any) {
      this.logger.error(`Error patching event ${eventId} color to ${colorId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update description of an event.
   */
  async updateEventDescription(eventId: string, description: string): Promise<void> {
    try {
      const calendar = this.getCalendarClient();
      await calendar.events.patch({
        calendarId: this.calendarId,
        eventId,
        requestBody: { description },
      });
      this.logger.log(`Event ${eventId} description updated`);
    } catch (error: any) {
      this.logger.error(`Error patching event ${eventId} description: ${error.message}`);
      throw error;
    }
  }
}

