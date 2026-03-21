import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { injectSpeedInsights } from '@vercel/speed-insights';
import { ThemeService } from './shared/services/theme.service';
import { DashboardFooterComponent } from './shared/components/organisms/dashboard-footer/dashboard-footer';
import { APP_VERSION } from './version';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, DashboardFooterComponent],
  template: `
    <router-outlet></router-outlet>
    <app-o-dashboard-footer [version]="version"></app-o-dashboard-footer>
  `,
})
export class App implements OnInit {
  public version = APP_VERSION;
  title = 'clinical-nutrilev';
  private themeService = inject(ThemeService);

  ngOnInit(): void {
    injectSpeedInsights();
  }
}
