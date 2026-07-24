import { Injectable, inject, signal } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export type NotificationPermissionStatus = 'granted' | 'denied' | 'default' | 'unsupported';

@Injectable({
  providedIn: 'root'
})
export class PushNotificationService {
  private swPush = inject(SwPush);
  private http = inject(HttpClient);

  readonly VAPID_PUBLIC_KEY = (environment as any).vapidPublicKey || '';
  
  public isSubscribed = signal<boolean>(false);
  public loading = signal<boolean>(false);
  public permissionStatus = signal<NotificationPermissionStatus>('default');
  public isIos = signal<boolean>(false);
  public isStandalone = signal<boolean>(false);

  constructor() {
    this.detectEnvironment();
    this.checkPermission();

    // Sync subscription state on init
    if (this.swPush.isEnabled) {
      this.swPush.subscription.subscribe(sub => {
        this.isSubscribed.set(!!sub);
        this.checkPermission();
      });
    }
  }

  detectEnvironment() {
    if (typeof window !== 'undefined') {
      const ua = window.navigator.userAgent || '';
      const isIosDevice = /iPad|iPhone|iPod/.test(ua) || (window.navigator.maxTouchPoints > 0 && /Macintosh/.test(ua));
      this.isIos.set(isIosDevice);

      const standaloneMatch = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
      this.isStandalone.set(standaloneMatch);
    }
  }

  checkPermission(): NotificationPermissionStatus {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      this.permissionStatus.set('unsupported');
      return 'unsupported';
    }

    const currentPerm = Notification.permission as NotificationPermissionStatus;
    this.permissionStatus.set(currentPerm);
    return currentPerm;
  }

  async requestSubscription(email: string): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      this.permissionStatus.set('unsupported');
      return false;
    }

    this.loading.set(true);
    try {
      if (!this.swPush.isEnabled) {
        console.warn('Service Worker / SwPush is not enabled in devMode. Using native Notification.requestPermission for UI testing.');
        const perm = await Notification.requestPermission();
        this.checkPermission();
        if (perm === 'granted') {
          this.isSubscribed.set(true);
          return true;
        }
        return false;
      }

      if (!this.VAPID_PUBLIC_KEY) {
        console.error('VAPID public key is missing in environment files. Cannot subscribe.');
        return false;
      }

      // Subscribes client via SwPush (will open native browser prompt if status is 'default')
      const sub = await this.swPush.requestSubscription({
        serverPublicKey: this.VAPID_PUBLIC_KEY
      });
      
      // Save subscription in the NestJS backend
      await this.http.post(`${environment.apiUrl}/notifications/subscribe`, {
        email: email.toLowerCase(),
        subscription: sub
      }).toPromise();

      this.isSubscribed.set(true);
      this.checkPermission();
      console.log('Push notification subscription successfully registered in NestJS.');
      return true;
    } catch (err: any) {
      console.error('Could not request push notification subscription:', err);
      this.checkPermission();
      return false;
    } finally {
      this.loading.set(false);
    }
  }

  async unsubscribe(): Promise<boolean> {
    this.loading.set(true);
    try {
      if (this.swPush.isEnabled) {
        await this.swPush.unsubscribe();
      }
      this.isSubscribed.set(false);
      this.checkPermission();
      console.log('Successfully unsubscribed from push notifications.');
      return true;
    } catch (err) {
      console.warn('Could not unsubscribe via SwPush, updating state locally:', err);
      this.isSubscribed.set(false);
      this.checkPermission();
      return true;
    } finally {
      this.loading.set(false);
    }
  }
}

