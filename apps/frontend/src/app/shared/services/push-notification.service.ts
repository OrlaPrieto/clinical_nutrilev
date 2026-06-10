import { Injectable, inject, signal } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PushNotificationService {
  private swPush = inject(SwPush);
  private http = inject(HttpClient);

  readonly VAPID_PUBLIC_KEY = (environment as any).vapidPublicKey || '';
  
  public isSubscribed = signal<boolean>(false);
  public loading = signal<boolean>(false);

  constructor() {
    // Sync subscription state on init
    this.swPush.subscription.subscribe(sub => {
      this.isSubscribed.set(!!sub);
    });
  }

  async requestSubscription(email: string) {
    if (!this.swPush.isEnabled) {
      console.warn('Service Worker / SwPush is not enabled in this environment (disabled in devMode by default).');
      return;
    }

    if (!this.VAPID_PUBLIC_KEY) {
      console.error('VAPID public key is missing in environment files. Cannot subscribe.');
      return;
    }

    this.loading.set(true);
    try {
      // Subscribes client via SwPush
      const sub = await this.swPush.requestSubscription({
        serverPublicKey: this.VAPID_PUBLIC_KEY
      });
      
      // Save subscription in the NestJS backend
      this.http.post(`${environment.apiUrl}/notifications/subscribe`, {
        email: email.toLowerCase(),
        subscription: sub
      }).subscribe({
        next: () => {
          this.isSubscribed.set(true);
          console.log('Push notification subscription successfully registered in NestJS.');
        },
        error: (err) => {
          console.error('Error saving push subscription in NestJS:', err);
        }
      });
    } catch (err) {
      console.error('Could not request push notification subscription:', err);
    } finally {
      this.loading.set(false);
    }
  }

  async unsubscribe() {
    this.loading.set(true);
    try {
      await this.swPush.unsubscribe();
      this.isSubscribed.set(false);
      console.log('Successfully unsubscribed from push notifications.');
    } catch (err) {
      console.error('Error unsubscribing from push notifications:', err);
    } finally {
      this.loading.set(false);
    }
  }
}
