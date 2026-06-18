import { Injectable, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// Declare the global gtag function
declare const gtag: Function;

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private router = inject(Router);

  constructor() {
    if (!environment.gaMeasurementId) return;

    // Listen to router navigation events to track page views automatically
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.logPageView(event.urlAfterRedirects);
    });
  }

  /**
   * Tracks page views inside GA4.
   */
  private logPageView(url: string) {
    if (typeof gtag !== 'undefined') {
      gtag('event', 'page_view', {
        page_path: url,
        send_to: environment.gaMeasurementId
      });
    }
  }

  /**
   * Logs a custom event in Google Analytics.
   * @param eventName Event identifier (snake_case recommended)
   * @param params Optional key-value metadata parameters
   */
  public logEvent(eventName: string, params: Record<string, any> = {}) {
    if (typeof gtag !== 'undefined') {
      gtag('event', eventName, params);
    } else {
      console.warn(`[Analytics] Event '${eventName}' was skipped because gtag is not loaded.`, params);
    }
  }
}
