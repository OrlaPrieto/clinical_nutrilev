import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SocialAuthService } from '@abacritt/angularx-social-login';
import { AuthService } from '../../services/auth.service';
import { LoginCardOrganism } from '../../shared/components/organisms/login-card/login-card';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, LoginCardOrganism],
  templateUrl: './login-page.html',
  styleUrl: './login-page.css'
})
export class LoginPage {
  private socialAuthService = inject(SocialAuthService);
  private authService = inject(AuthService);
  errorMessage: string | null = null;

  constructor() {
    this.socialAuthService.authState.subscribe(async (user) => {
      if (user) {
        const success = await this.authService.login(user);
        if (!success) {
          this.errorMessage = 'Acceso denegado. Este correo no está en la lista blanca o falló la verificación.';
          setTimeout(() => this.errorMessage = null, 5000);
        }
      }
    });
  }
}
