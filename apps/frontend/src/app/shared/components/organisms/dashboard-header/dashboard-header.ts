import { Component, input, output, inject } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { ThemeService } from '../../../services/theme.service';
import { AuthService } from '../../../../services/auth.service';
import { BadgeComponent } from '../../atoms/badge/badge';
import { ButtonComponent } from '../../atoms/button/button';
import { IconComponent } from '../../atoms/icon/icon';
import { SearchInputComponent } from '../../molecules/search-input/search-input';

@Component({
  selector: 'app-o-dashboard-header',
  standalone: true,
  imports: [
    CommonModule, 
    NgOptimizedImage, 
    BadgeComponent, 
    ButtonComponent, 
    IconComponent, 
    SearchInputComponent
  ],
  templateUrl: './dashboard-header.html',
  styleUrl: './dashboard-header.css'
})
export class DashboardHeaderComponent {
  public themeService = inject(ThemeService);
  public authService = inject(AuthService);

  loading = input<boolean>(false);
  searchTerm = input<string>('');
  showSearch = input<boolean>(true);

  search = output<string>();
  sync = output<void>();
  logout = output<void>();
  openAi = output<void>();
}
