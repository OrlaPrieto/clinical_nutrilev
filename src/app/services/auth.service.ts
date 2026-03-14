import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { SocialAuthService } from '@abacritt/angularx-social-login';
import { supabase } from '../supabase';

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

  async login(googleUser: any): Promise<boolean> {
    if (this.AUTHORIZED_EMAILS.includes(googleUser.email.toLowerCase())) {
      try {
        // Enviar idToken a Supabase para iniciar sesión de forma segura
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: googleUser.idToken
        });
        
        if (error) {
          console.error('Error authenticating with Supabase:', error);
          return false;
        }

        localStorage.setItem('nutrilev_user', JSON.stringify(googleUser));
        this.currentUserSubject.next(googleUser);
        this.router.navigate(['/dashboard']);
        return true;
      } catch (err) {
        console.error('Unexpected error during login:', err);
        return false;
      }
    }
    return false;
  }

  async logout(): Promise<void> {
    try {
      await supabase.auth.signOut();
      await this.socialAuthService.signOut();
    } catch (e) {
      console.error('Error signing out', e);
    } finally {
      localStorage.removeItem('nutrilev_user');
      this.currentUserSubject.next(null);
      this.router.navigate(['/login']);
    }
  }

  isLoggedIn(): boolean {
    return this.currentUserSubject.value !== null;
  }

  get user() {
    return this.currentUserSubject.value;
  }
}
