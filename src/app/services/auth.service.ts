import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
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

  // Replacing RxJS BehaviorSubject with Angular 19 Signals
  public currentUser = signal<any>(null);
  public userRole = signal<'admin' | 'patient' | null>(null);

  constructor() {
    const savedUser = localStorage.getItem('nutrilev_user');
    const savedRole = localStorage.getItem('nutrilev_role');
    if (savedUser) {
      this.currentUser.set(JSON.parse(savedUser));
      this.userRole.set(savedRole as any);
    }
  }

  async login(googleUser: any): Promise<boolean> {
    try {
      const email = googleUser.email.toLowerCase();
      
      // Determinar rol provisionalmente
      let role: 'admin' | 'patient' | null = null;
      if (this.AUTHORIZED_EMAILS.includes(email)) {
        role = 'admin';
      } else {
        // Verificar si es un paciente registrado
        const { data: patient, error: pError } = await supabase
          .from('patients')
          .select('email')
          .eq('email', email)
          .maybeSingle();
        
        if (patient) {
          role = 'patient';
        }
      }

      if (!role) {
        console.warn('Access denied for email:', email);
        return false;
      }

      // Proceder con login de Supabase
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: googleUser.idToken
      });
      
      if (error) {
        console.error('Error authenticating with Supabase:', error);
        return false;
      }

      localStorage.setItem('nutrilev_user', JSON.stringify(googleUser));
      localStorage.setItem('nutrilev_role', role);
      this.currentUser.set(googleUser);
      this.userRole.set(role);

      if (role === 'admin') {
        this.router.navigate(['/dashboard']);
      } else {
        this.router.navigate(['/portal']);
      }
      return true;
    } catch (err) {
      console.error('Unexpected error during login:', err);
      return false;
    }
  }

  async logout(): Promise<void> {
    try {
      await supabase.auth.signOut();
      await this.socialAuthService.signOut();
    } catch (e) {
      console.error('Error signing out', e);
    } finally {
      localStorage.removeItem('nutrilev_user');
      localStorage.removeItem('nutrilev_role');
      this.currentUser.set(null);
      this.userRole.set(null);
      this.router.navigate(['/login']);
    }
  }

  isLoggedIn(): boolean {
    return this.currentUser() !== null;
  }

  get user() {
    return this.currentUser();
  }
}
