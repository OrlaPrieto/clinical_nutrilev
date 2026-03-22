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
  public userRole = signal<'admin' | 'patient' | 'pending' | 'denied' | null>(null);
  
  public ready: Promise<void>;
  private resolveReady!: () => void;

  constructor() {
    this.ready = new Promise((resolve) => {
      this.resolveReady = resolve;
    });
    this.initializeAuth();
  }

  private async initializeAuth() {
    console.log('Auth: Initializing...');
    
    // Set up listener for ALL events
    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`Auth: Event [${event}]`, session?.user?.email);
      
      if (event === 'SIGNED_OUT') {
        this.clearLocalSession();
        return;
      }

      // If we have a user, ensure we have their role
      if (session?.user) {
        // Only fetch if session changed or role is missing
        if (this.currentUser()?.id !== session.user.id || !this.userRole()) {
          const role = await this.determineRole(session.user.email!);
          this.currentUser.set(session.user);
          this.userRole.set(role);
          
          if (role) localStorage.setItem('nutrilev_role', role);

          // Redirect if user is on login page and has a valid role
          if (this.router.url.includes('/login') && (role === 'admin' || role === 'patient')) {
             this.router.navigate([role === 'admin' ? '/dashboard' : '/portal']);
          }
        }
      } else {
        this.currentUser.set(null);
        this.userRole.set(null);
      }
    });

    // Initial session recovery - this will also trigger onAuthStateChange
    // but we await it here to ensure 'ready' promise is correct for guards
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        console.log('Auth: Initial session recovery started');
        const role = await this.determineRole(session.user.email!);
        this.currentUser.set(session.user);
        this.userRole.set(role);
        if (role) localStorage.setItem('nutrilev_role', role);

        if (this.router.url.includes('/login') && (role === 'admin' || role === 'patient')) {
          this.router.navigate([role === 'admin' ? '/dashboard' : '/portal']);
        }
      }
    } catch (err) {
      console.error('Auth: Initial recovery error', err);
    } finally {
      console.log('Auth: Ready');
      this.resolveReady();
    }
  }

  private roleCheckPromise: Promise<any> | null = null;
  private lastCheckedEmail: string | null = null;

  private async determineRole(email: string): Promise<'admin' | 'patient' | 'pending' | 'denied' | null> {
    const cleanEmail = email.toLowerCase();
    
    // Deduplicate concurrent checks for the same email
    if (this.roleCheckPromise && this.lastCheckedEmail === cleanEmail) {
      return this.roleCheckPromise;
    }

    this.lastCheckedEmail = cleanEmail;
    this.roleCheckPromise = (async () => {
      try {
        const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000/api/auth/get-role' : 'https://clinical-nutrilev.onrender.com/api/auth/get-role';
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail })
        });
        
        if (!response.ok) throw new Error('Error fetching role');
        const { role } = await response.json();
        return role === 'none' ? null : role;
      } catch (err) {
        console.error('Auth: Error fetching role from server', err);
        // Fallback to cache during network issues
        const cached = localStorage.getItem('nutrilev_role');
        return (cached as any) || null;
      } finally {
        setTimeout(() => {
          if (this.lastCheckedEmail === cleanEmail) {
            this.roleCheckPromise = null;
            this.lastCheckedEmail = null;
          }
        }, 2000);
      }
    })();

    return this.roleCheckPromise;
  }

  async login(googleUser: any): Promise<'success' | 'pending' | 'denied'> {
    try {
      // 1. Iniciamos sesión en Supabase primero. 
      // Esto es necesario porque determinar el rol de un paciente 
      // requiere lectura de base de datos que suele estar protegida por RLS.
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: googleUser.idToken
      });
      
      if (error || !data.user) return 'denied';

      // 2. Una vez autenticados, validamos el rol con permisos de usuario logueado
      const role = await this.determineRole(data.user.email!);
      
      if (role === 'admin' || role === 'patient') {
        if (this.router.url.includes('/login')) {
          this.router.navigate([role === 'admin' ? '/dashboard' : '/portal']);
        }
        return 'success';
      }

      // 3. Si el rol no es válido, cerramos sesión de inmediato
      await this.logout();
      return role === 'pending' ? 'pending' : 'denied';
    } catch (err) {
      console.error('Login error:', err);
      return 'denied';
    }
  }

  async signInWithMagicLink(email: string): Promise<{error: any}> {
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000/api/auth/magic-link' : 'https://clinical-nutrilev.onrender.com/api/auth/magic-link';
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (!response.ok) throw new Error('Error sending magic link');
      return { error: null };
    } catch (err) {
      return { error: err };
    }
  }

  async logout(): Promise<void> {
    // Navigate immediately to improve perceived performance and avoid being stuck in an invalid state
    this.router.navigate(['/login']);
    
    // Clear local state
    this.clearLocalSession();

    // Perform background sign-outs without blocking the main thread
    Promise.allSettled([
      supabase.auth.signOut(),
      this.socialAuthService.signOut().catch(() => {})
    ]).catch(err => {
      console.warn('Background sign-out handled errors:', err);
    });
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
