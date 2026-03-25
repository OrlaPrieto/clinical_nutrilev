import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { GoogleSigninButtonModule } from '@abacritt/angularx-social-login';
import { AuthService } from '../../../../services/auth.service';
import { ButtonComponent } from '../../atoms/button/button';
import { InputComponent } from '../../atoms/input/input';

@Component({
  selector: 'app-o-login-card',
  standalone: true,
  imports: [CommonModule, GoogleSigninButtonModule, FormsModule, MatIconModule, ButtonComponent, InputComponent],
  templateUrl: './login-card.html',
  styleUrl: './login-card.scss'
})
export class LoginCardOrganism {
  errorMessage = input<string | null>(null);
  email = '';
  loading = false;
  sent = false;
  localErrorMessage: string | null = null;

  constructor(private authService: AuthService) {}

  async onMagicLink() {
    if (!this.email || !this.email.includes('@')) return;
    
    this.loading = true;
    const { error } = await this.authService.signInWithMagicLink(this.email);
    this.loading = false;
    
    if (error) {
      console.error('Magic link error:', error);
      this.localErrorMessage = 'El correo no está autorizado o está pendiente de activación.';
      setTimeout(() => this.localErrorMessage = null, 5000);
    } else {
      this.sent = true;
    }
  }
}
