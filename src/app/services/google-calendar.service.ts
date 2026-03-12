import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { SocialAuthService, GoogleLoginProvider } from '@abacritt/angularx-social-login';
import { from, Observable, of, switchMap, take, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GoogleCalendarService {
  private apiUrl = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

  constructor(
    private http: HttpClient,
    private authService: SocialAuthService
  ) { }

  createEvent(patientName: string, patientEmail: string, startTime: string, endTime: string, cost?: string, appointmentNumber?: string): Observable<any> {
    // Try to get token from current state first to avoid popups
    return this.authService.authState.pipe(
      take(1),
      switchMap(user => {
        if (user?.authToken) {
          return of(user.authToken);
        }
        // Fallback to getAccessToken if not present
        return from(this.authService.getAccessToken(GoogleLoginProvider.PROVIDER_ID));
      }),
      switchMap(token => {
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        });

        let summary = patientName;
        if (cost) summary += ` (${cost})`;
        if (appointmentNumber) summary += ` ${appointmentNumber}`;

        const event = {
          'summary': summary,
          'description': `${patientEmail}`,
          'location': 'Nutrilev, Privada de, Priv. Miguel Angel Olea 1034, Cuauhtémoc, Santa Rita, 31020 Chihuahua, Chih., México',
          'colorId': '3',
          'start': {
            'dateTime': startTime,
            'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone
          },
          'end': {
            'dateTime': endTime,
            'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone
          },
          'reminders': {
            'useDefault': true
          }
        };

        return this.http.post(this.apiUrl, event, { headers });
      })
    );
  }
}
