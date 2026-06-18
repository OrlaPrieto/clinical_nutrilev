import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { injectSpeedInsights } from '@vercel/speed-insights';
import { ThemeService } from './shared/services/theme.service';
import { AuthService } from './services/auth.service';
import { DashboardFooterComponent } from './shared/components/organisms/dashboard-footer/dashboard-footer';
import { PwaBannerComponent } from './shared/components/molecules/pwa-banner/pwa-banner';
import { PwaUpdateBannerComponent } from './shared/components/molecules/pwa-update-banner/pwa-update-banner';
import { APP_VERSION } from './version';
import { PortalModule } from '@angular/cdk/portal';
import { AnalyticsService } from './shared/services/analytics.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, DashboardFooterComponent, PwaBannerComponent, PwaUpdateBannerComponent],
  template: `
    @if (isOffline()) {
      <div class="fixed top-0 left-0 right-0 z-[10000] bg-amber-500 text-white text-[11px] font-bold py-1.5 px-4 text-center shadow-md flex items-center justify-center gap-2 animate-fade-in">
        <span class="material-symbols-rounded !text-[14px]">wifi_off</span>
        Sin conexión a internet. Mostrando versión local sin conexión.
      </div>
    }

    <router-outlet></router-outlet>
    
    @if (authService.isInitialLoading()) {
      <div class="fixed inset-0 bg-nutri-bg dark:bg-[#050505] z-[9999] flex items-center justify-center animate-fade-in">
          <div class="flex flex-col items-center">
              <div class="w-12 h-12 rounded-full border-[3px] border-nutri-rose/20 border-t-nutri-rose animate-spin mb-4"></div>
              <p class="text-nutri-text/60 dark:text-white/40 text-sm font-medium">Nutrilev está cargando...</p>
          </div>
      </div>
    }
    
    @if (authService.isLoggedIn() && authService.userRole() !== 'patient') {
      <app-o-dashboard-footer [version]="version"></app-o-dashboard-footer>
    }
    <app-pwa-banner></app-pwa-banner>
    <app-pwa-update-banner></app-pwa-update-banner>
  `,
})
export class App implements OnInit {
  public version = APP_VERSION;
  title = 'clinical-nutrilev';
  public authService = inject(AuthService);
  private themeService = inject(ThemeService);
  private analytics = inject(AnalyticsService);
  public isOffline = signal<boolean>(typeof window !== 'undefined' ? !navigator.onLine : false);

  ngOnInit(): void {
    injectSpeedInsights();

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.isOffline.set(false));
      window.addEventListener('offline', () => this.isOffline.set(true));
    }
  }
}
