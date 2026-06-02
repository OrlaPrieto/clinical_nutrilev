import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { injectSpeedInsights } from '@vercel/speed-insights';
import { ThemeService } from './shared/services/theme.service';
import { AuthService } from './services/auth.service';
import { DashboardFooterComponent } from './shared/components/organisms/dashboard-footer/dashboard-footer';
import { PwaBannerComponent } from './shared/components/molecules/pwa-banner/pwa-banner';
import { APP_VERSION } from './version';
import { PortalModule } from '@angular/cdk/portal';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, DashboardFooterComponent, PwaBannerComponent],
  template: `
    <router-outlet></router-outlet>
    
    @if (authService.isInitialLoading()) {
      <div class="fixed inset-0 bg-nutri-bg dark:bg-[#050505] z-[9999] flex items-center justify-center animate-fade-in">
          <div class="flex flex-col items-center">
              <div class="w-12 h-12 rounded-full border-[3px] border-nutri-rose/20 border-t-nutri-rose animate-spin mb-4"></div>
              <p class="text-nutri-text/60 dark:text-white/40 text-sm font-medium">Nutrilev está cargando...</p>
          </div>
      </div>
    }
    
    @if (authService.isLoggedIn()) {
      <app-o-dashboard-footer [version]="version"></app-o-dashboard-footer>
    }
    <app-pwa-banner></app-pwa-banner>
  `,
})
export class App implements OnInit {
  public version = APP_VERSION;
  title = 'clinical-nutrilev';
  public authService = inject(AuthService);
  private themeService = inject(ThemeService);

  ngOnInit(): void {
    injectSpeedInsights();
  }
}
