import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { SocialAuthService, GoogleLoginProvider } from '@abacritt/angularx-social-login';
import { from, Observable, of, switchMap, take, tap, catchError, map, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GoogleCalendarService {
  private apiUrl = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
  
  // Claves para localStorage
  private readonly TOKEN_KEY = 'google_calendar_access_token';
  private readonly EXPIRY_KEY = 'google_calendar_token_expiry';

  constructor(
    private http: HttpClient,
    private authService: SocialAuthService
  ) { }

  // Obtiene el token de caché o vuelve a pedirlo con getAccessToken
  private getAccessToken(forcePrompt: boolean = false): Observable<string> {
    const now = new Date().getTime();
    
    if (!forcePrompt) {
       const cachedToken = localStorage.getItem(this.TOKEN_KEY);
       const expiryStr = localStorage.getItem(this.EXPIRY_KEY);
       
       if (cachedToken && expiryStr) {
           const expiryTime = parseInt(expiryStr, 10);
           if (expiryTime > now) {
               return of(cachedToken);
           } else {
               // Limpiar si expiró
               localStorage.removeItem(this.TOKEN_KEY);
               localStorage.removeItem(this.EXPIRY_KEY);
           }
       }
    }

    return from(this.authService.getAccessToken(GoogleLoginProvider.PROVIDER_ID)).pipe(
      tap(token => {
         // Guardamos el token por 12 horas en localStorage para que sobreviva a recargas de página (F5)
         const expiryTime = new Date().getTime() + (12 * 60 * 60 * 1000);
         localStorage.setItem(this.TOKEN_KEY, token);
         localStorage.setItem(this.EXPIRY_KEY, expiryTime.toString());
      })
    );
  }

  createEvent(patientName: string, patientEmail: string, startTime: string, endTime: string, cost?: string, appointmentNumber?: string): Observable<any> {
    return this.getAccessToken(false).pipe(
      switchMap(token => this.doCreateEventCall(token, patientName, patientEmail, startTime, endTime, cost, appointmentNumber)),
      catchError(err => {
        // En caso de que haya aspirado el token nativo pero Google devuelva 401, forzamos un nuevo popup
        if (err.status === 401 || err.status === 403) {
          localStorage.removeItem(this.TOKEN_KEY);
          localStorage.removeItem(this.EXPIRY_KEY);
          return this.getAccessToken(true).pipe(
            switchMap(newToken => this.doCreateEventCall(newToken, patientName, patientEmail, startTime, endTime, cost, appointmentNumber))
          );
        }
        return throwError(() => err);
      })
    );
  }

  private doCreateEventCall(token: string, patientName: string, patientEmail: string, startTime: string, endTime: string, cost?: string, appointmentNumber?: string): Observable<any> {
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
      'colorId': '8',
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
  }
}
