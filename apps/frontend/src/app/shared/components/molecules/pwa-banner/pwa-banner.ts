import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PwaInstallService } from '../../../services/pwa-install';

@Component({
  selector: 'app-pwa-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pwa-banner.html',
  styleUrl: './pwa-banner.css',
})
export class PwaBannerComponent {
  public pwaService = inject(PwaInstallService);
}
