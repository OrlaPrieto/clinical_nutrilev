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
  
  // Form values
  email = '';
  password = '';
  
  // Password Reset values
  newPassword = '';
  confirmPassword = '';
  
  // Visibility toggles
  showPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;
  
  loading = false;
  localErrorMessage: string | null = null;
  localSuccessMessage: string | null = null;
  
  // UI Mode: 'login' | 'request-reset'
  currentMode: 'login' | 'request-reset' = 'login';

  constructor(public authService: AuthService) {}

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleNewPasswordVisibility() {
    this.showNewPassword = !this.showNewPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  setMode(mode: 'login' | 'request-reset') {
    this.currentMode = mode;
    this.localErrorMessage = null;
    this.localSuccessMessage = null;
  }

  async onLogin() {
    if (!this.email || !this.email.includes('@') || !this.password) return;
    
    this.loading = true;
    const status = await this.authService.loginWithPassword(this.email, this.password);
    this.loading = false;
    
    if (status === 'denied') {
      this.localErrorMessage = 'Credenciales incorrectas o correo no autorizado.';
      setTimeout(() => this.localErrorMessage = null, 5000);
    } else if (status === 'pending') {
      this.localErrorMessage = 'Tu cuenta está pendiente de activación. Contacta a tu nutrióloga.';
      setTimeout(() => this.localErrorMessage = null, 5000);
    }
  }

  async onRequestReset() {
    if (!this.email || !this.email.includes('@')) return;
    
    this.loading = true;
    const result = await this.authService.sendPasswordResetLink(this.email);
    this.loading = false;
    
    if (result.success) {
      this.localSuccessMessage = 'Enlace enviado. Revisa tu bandeja de entrada.';
      this.localErrorMessage = null;
    } else {
      this.localErrorMessage = result.message || 'Error al enviar el enlace.';
      this.localSuccessMessage = null;
    }
  }

  async onResetPassword() {
    if (!this.newPassword || this.newPassword.length < 6) {
      this.localErrorMessage = 'La contraseña debe tener al menos 6 caracteres.';
      return;
    }
    
    if (this.newPassword !== this.confirmPassword) {
      this.localErrorMessage = 'Las contraseñas no coinciden.';
      return;
    }
    
    this.loading = true;
    const result = await this.authService.updatePassword(this.newPassword);
    this.loading = false;
    
    if (result.success) {
      this.localSuccessMessage = 'Contraseña actualizada con éxito. Redirigiendo...';
      this.localErrorMessage = null;
    } else {
      this.localErrorMessage = result.message || 'Error al actualizar la contraseña.';
      this.localSuccessMessage = null;
    }
  }
}
