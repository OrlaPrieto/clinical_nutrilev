import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PwaInstallService {
  private deferredPrompt: any = null;
  public showInstallBanner = signal(false);

  public isIos = false;

  constructor() {
    window.addEventListener('beforeinstallprompt', (e) => {
      // Evita que Chrome muestre el prompt nativo chico y en su lugar usamos nuestro banner.
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallBanner.set(true);
    });

    // Detectar iOS Safari para mostrar instrucciones manuales (ya que no soporta beforeinstallprompt)
    if (typeof window !== 'undefined' && window.navigator) {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
      const userAgent = window.navigator.userAgent.toLowerCase();
      this.isIos = /iphone|ipad|ipod/.test(userAgent);

      // Si está en iOS y la app NO está ya instalada (standalone), mostramos el banner a los 3 segundos
      if (this.isIos && !isStandalone) {
        setTimeout(() => {
          this.showInstallBanner.set(true);
        }, 3000);
      }
    }
  }

  installApp() {
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      this.deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        } else {
          console.log('User dismissed the install prompt');
        }
        this.deferredPrompt = null;
        this.showInstallBanner.set(false);
      });
    }
  }

  dismissBanner() {
    this.showInstallBanner.set(false);
  }
}
