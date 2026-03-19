import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { GoogleSigninButtonModule } from '@abacritt/angularx-social-login';
import { AuthService } from '../../../../services/auth.service';

@Component({
  selector: 'app-login-card',
  standalone: true,
  imports: [CommonModule, GoogleSigninButtonModule, FormsModule, MatIconModule],
  templateUrl: './login-card.html',
  styleUrl: './login-card.css'
})
export class LoginCardOrganism {
  errorMessage = input<string | null>(null);
  email = '';
  loading = false;
  sent = false;

  constructor(private authService: AuthService) {}

  async onMagicLink() {
    if (!this.email || !this.email.includes('@')) return;
    
    this.loading = true;
    const { error } = await this.authService.signInWithMagicLink(this.email);
    this.loading = false;
    
    if (error) {
      console.error('Magic link error:', error);
    } else {
      this.sent = true;
    }
  }
}
