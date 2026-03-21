import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SocialAuthService } from '@abacritt/angularx-social-login';
import { AuthService } from '../../services/auth.service';
import { LoginCardOrganism } from '../../shared/components/organisms/login-card/login-card';
import { ThemeService } from '../../shared/services/theme.service';
import { IconComponent } from '../../shared/components/atoms/icon/icon';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, LoginCardOrganism, IconComponent],
  templateUrl: './login-page.html',
  styleUrl: './login-page.css'
})
export class LoginPage {
  private socialAuthService = inject(SocialAuthService);
  private authService = inject(AuthService);
  public themeService = inject(ThemeService);
  errorMessage: string | null = null;

  constructor() {
    this.socialAuthService.authState.subscribe(async (user) => {
      if (user) {
        const status = await this.authService.login(user);
        if (status === 'denied') {
          this.errorMessage = 'Acceso denegado. Este correo no está autorizado.';
        } else if (status === 'pending') {
          this.errorMessage = 'Tu cuenta está pendiente de activación. Contacta a tu nutrióloga.';
        }
        
        if (this.errorMessage) {
          setTimeout(() => this.errorMessage = null, 5000);
        }
      }
    });
  }
}
