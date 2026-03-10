import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { SocialAuthService } from '@abacritt/angularx-social-login';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private router = inject(Router);
  private socialAuthService = inject(SocialAuthService);
  
  // Lista blanca de correos autorizados
  private readonly AUTHORIZED_EMAILS = [
    'orla08i@gmail.com',
    'velvetdelacruzvillegas@gmail.com'
  ];

  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor() {
    const savedUser = localStorage.getItem('nutrilev_user');
    if (savedUser) {
      this.currentUserSubject.next(JSON.parse(savedUser));
    }
  }

  login(googleUser: any): boolean {
    if (this.AUTHORIZED_EMAILS.includes(googleUser.email.toLowerCase())) {
      localStorage.setItem('nutrilev_user', JSON.stringify(googleUser));
      this.currentUserSubject.next(googleUser);
      this.router.navigate(['/dashboard']);
      return true;
    }
    return false;
  }

  logout() {
    this.socialAuthService.signOut().catch(() => {}).finally(() => {
      localStorage.removeItem('nutrilev_user');
      this.currentUserSubject.next(null);
      this.router.navigate(['/login']);
    });
  }

  isLoggedIn(): boolean {
    return this.currentUserSubject.value !== null;
  }

  get user() {
    return this.currentUserSubject.value;
  }
}
