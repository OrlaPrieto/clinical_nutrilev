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

  public currentUser = signal<any>(null);
  public userRole = signal<'admin' | 'patient' | 'pending' | 'denied' | null>(null);
  public isInitialLoading = signal<boolean>(true);
  
  public ready: Promise<void>;
  private resolveReady!: () => void;
  public roleReady = signal<boolean>(false);

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

      if (session?.user) {
        if (this.currentUser()?.id !== session.user.id || !this.userRole()) {
          this.currentUser.set(session.user);
          const role = await this.determineRole(session.user.email!);
          this.userRole.set(role);
          if (role) localStorage.setItem('nutrilev_role', role);
          this.roleReady.set(true);
        }
      } else {
        this.clearLocalSession();
      }
    });

    // Initial session recovery
    try {
      // Fast check for session to unblock guards ASAP
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        this.currentUser.set(session.user);
        
        // Optimistic restore to avoid Render cold-start blocking PWA load
        const cachedRole = localStorage.getItem('nutrilev_role') as any;
        if (cachedRole) {
          console.log('Auth: Using cached role', cachedRole);
          this.userRole.set(cachedRole);
          this.roleReady.set(true);
          this.isInitialLoading.set(false);
          
          // Verify in background
          this.determineRole(session.user.email!).then(role => {
            if (role && role !== cachedRole) {
              console.log('Auth: Role updated from server', role);
              this.userRole.set(role);
              localStorage.setItem('nutrilev_role', role);
            }
          });
        } else {
          // No cache, must fetch initial role but we allow guards to wait
          this.determineRole(session.user.email!).then(role => {
            this.userRole.set(role);
            if (role) localStorage.setItem('nutrilev_role', role);
            this.roleReady.set(true);
            this.isInitialLoading.set(false);
          });
        }
      } else {
        this.isInitialLoading.set(false);
      }
    } catch (err) {
      console.error('Auth: Initial recovery error', err);
      this.isInitialLoading.set(false);
    } finally {
      console.log('Auth: Ready (resolved)');
      this.resolveReady();
      // Guard against stuck loading state
      setTimeout(() => this.isInitialLoading.set(false), 2000);
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
      const controller = new AbortController();
      // Fast timeout to fallback to cache if server is sleeping
      // 15s is safer for Render cold starts than 6s
      const timeoutId = setTimeout(() => controller.abort(), 15000); 

      try {
        const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000/api/auth/get-role' : 'https://clinical-nutrilev.onrender.com/api/auth/get-role';
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error('Error fetching role');
        const { role } = await response.json();
        return role === 'none' ? null : role;
      } catch (err) {
        clearTimeout(timeoutId);
        console.error('Auth: Error fetching role from server', err);
        // Fallback to cache during network issues or timeouts
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
      this.userRole.set(role);
      if (role) localStorage.setItem('nutrilev_role', role);
      this.roleReady.set(true);

      if (role === 'admin' || role === 'patient') {
        const target = role === 'admin' ? '/dashboard' : '/portal';
        console.log(`Auth: Login success, navigating to ${target}`);
        await this.router.navigate([target]);
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

  async waitForRole(): Promise<void> {
    if (this.roleReady()) return;
    
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.warn('Auth: waitForRole timed out after 15s');
        resolve();
      }, 15000);

      // Re-use check interval or use a more reactive approach if preferred
      // For now, simple polling of the signal is very reliable in guards
      const interval = setInterval(() => {
        if (this.roleReady()) {
          clearTimeout(timeout);
          clearInterval(interval);
          resolve();
        }
      }, 100);
    });
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
