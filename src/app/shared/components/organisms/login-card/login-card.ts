import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GoogleSigninButtonModule } from '@abacritt/angularx-social-login';

@Component({
  selector: 'app-login-card',
  standalone: true,
  imports: [CommonModule, GoogleSigninButtonModule],
  templateUrl: './login-card.html',
  styleUrl: './login-card.css'
})
export class LoginCardOrganism {
  errorMessage = input<string | null>(null);
}
