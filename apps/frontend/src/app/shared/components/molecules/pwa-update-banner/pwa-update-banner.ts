import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PwaUpdateService } from '../../../services/pwa-update.service';

@Component({
  selector: 'app-pwa-update-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pwa-update-banner.html',
  styleUrl: './pwa-update-banner.css',
})
export class PwaUpdateBannerComponent {
  public updateService = inject(PwaUpdateService);
}
