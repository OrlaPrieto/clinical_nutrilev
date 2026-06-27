import { Component, inject, OnInit, signal, HostListener } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { SocialAuthService } from '@abacritt/angularx-social-login';
import { AuthService } from '../../services/auth.service';
import { LoginCardOrganism } from '../../shared/components/organisms/login-card/login-card';
import { ThemeService } from '../../shared/services/theme.service';
import { IconComponent } from '../../shared/components/atoms/icon/icon';
import { Router } from '@angular/router';
import { LegalModalComponent } from '../../shared/components/organisms/legal-modal/legal-modal';
import { Title } from '@angular/platform-browser';
import { APP_VERSION } from '../../version';
import { AccessibilityService } from '../../services/accessibility.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, LoginCardOrganism, IconComponent, NgOptimizedImage, LegalModalComponent],
  templateUrl: './login-page.html',
  styleUrl: './login-page.css'
})
export class LoginPage implements OnInit {
  private socialAuthService = inject(SocialAuthService);
  private authService = inject(AuthService);
  private router = inject(Router);
  public themeService = inject(ThemeService);
  public accessibilityService = inject(AccessibilityService);
  private titleService = inject(Title);
  public version = APP_VERSION;
  errorMessage: string | null = null;
  isLoggingIn = false;
  showLegalModal = signal<'privacy' | 'support' | null>(null);
  showAccessibilityMenu = signal<boolean>(false);

  @HostListener('document:click')
  onDocumentClick() {
    this.showAccessibilityMenu.set(false);
  }

  constructor() {
    this.socialAuthService.authState.subscribe(async (user) => {
      if (user) {
        this.isLoggingIn = true;
        const status = await this.authService.login(user);
        this.isLoggingIn = false;
        
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

  async ngOnInit() {
    this.titleService.setTitle('Iniciar Sesión - Nutrilev');
    console.log('Test log');
    
    await this.authService.ready;
    
    if (this.authService.isRecoveryMode()) {
      console.log('LoginPage: Recovery mode active. Preventing auto-redirect to dashboard.');
      return;
    }
    
    if (this.authService.isLoggedIn()) {
      const role = this.authService.userRole();
      if (role === 'admin') {
        this.router.navigate(['/dashboard']);
      } else if (role === 'patient') {
        this.router.navigate(['/portal']);
      }
    }
  }
}
