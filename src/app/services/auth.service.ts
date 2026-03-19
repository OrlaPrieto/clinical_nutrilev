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
    this.initializeAuth();
  }

  private async initializeAuth() {
    // Escuchar cambios de autenticación (Magic Link, Logout, etc)
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const role = await this.determineRole(session.user.email!);
        if (role) {
          this.currentUser.set(session.user);
          this.userRole.set(role);
          localStorage.setItem('nutrilev_role', role);
          
          // Redirección automática si estamos en login y venimos de un magic link
          if (this.router.url.includes('/login')) {
            this.router.navigate([role === 'admin' ? '/dashboard' : '/portal']);
          }
        }
      } else if (event === 'SIGNED_OUT') {
        this.clearLocalSession();
      }
    });

    // Cargar sesión inicial
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const role = await this.determineRole(session.user.email!);
      this.currentUser.set(session.user);
      this.userRole.set(role);
    }
  }

  private async determineRole(email: string): Promise<'admin' | 'patient' | null> {
    const cleanEmail = email.toLowerCase();
    
    // 1. Check Admin whitelist
    if (this.AUTHORIZED_EMAILS.includes(cleanEmail)) {
      return 'admin';
    }

    // 2. Check Patients table
    const { data: patient } = await supabase
      .from('patients')
      .select('email')
      .eq('email', cleanEmail)
      .maybeSingle();

    return patient ? 'patient' : null;
  }

  async login(googleUser: any): Promise<boolean> {
    try {
      const role = await this.determineRole(googleUser.email);
      if (!role) return false;

      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: googleUser.idToken
      });
      
      return !error;
    } catch (err) {
      console.error('Login error:', err);
      return false;
    }
  }

  async signInWithMagicLink(email: string): Promise<{error: any}> {
    return await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin + '/login'
      }
    });
  }

  async logout(): Promise<void> {
    try {
      await supabase.auth.signOut();
      try {
        await this.socialAuthService.signOut();
      } catch (e) {}
    } finally {
      this.clearLocalSession();
      this.router.navigate(['/login']);
    }
  }

  private clearLocalSession() {
    localStorage.removeItem('nutrilev_role');
    this.currentUser.set(null);
    this.userRole.set(null);
  }

  isLoggedIn(): boolean {
    return this.currentUser() !== null;
  }

  get user() {
    return this.currentUser();
  }

  get accessToken(): string | null {
    // Supabase recovers session from cookies/storage automatically
    // But we can also get it from the client
    return (supabase.auth as any).session?.access_token || null;
  }
}
