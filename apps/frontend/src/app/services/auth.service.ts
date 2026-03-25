import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, of } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { SocialAuthService } from '@abacritt/angularx-social-login';
import { supabase } from '../supabase';
import { User } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { StorageService } from '../shared/services/storage.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private router = inject(Router);
  private http = inject(HttpClient);
  private socialAuthService = inject(SocialAuthService);
  private storage = inject(StorageService);
  
  // Lista blanca de correos autorizados
  private readonly AUTHORIZED_EMAILS = [
    'orla08i@gmail.com',
    'velvetdelacruzvillegas@gmail.com'
  ];

  public currentUser = signal<User | null>(null);
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
    this.pingServer(); // Wake up backend ASAP
  }

  private pingServer() {
    // Ping with health endpoint. We use /api/auth/health now.
    const apiUrl = `${environment.apiUrl}/auth/health`;
    
    // Check if we are already logged in to avoid unnecessary pings if session is restored
    // But Render might still need a wake up call
    this.http.get(apiUrl, { responseType: 'text' })
      .pipe(
        timeout(5000), 
        catchError(() => of(null))
      )
      .subscribe();
  }

  private async initializeAuth() {
    console.log('Auth: Initializing...');
    
    // Set up listener for ALL events
    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`Auth: Event [${event}]`, session?.user?.email);
      
      if (event === 'SIGNED_OUT') {
        // Only clear if we were previously logged in or if this is an explicit sign out
        if (this.currentUser()) {
          console.warn('Auth: Session signed out, clearing local state');
          this.clearLocalSession();
        }
        return;
      }

      if (event === 'TOKEN_REFRESHED') {
        console.log('Auth: Token refreshed successfully');
      }

      if (session?.user) {
        if (this.currentUser()?.id !== session.user.id || !this.userRole()) {
          console.log('Auth: User state updated from event', session.user.email);
          this.currentUser.set(session.user);
          const role = await this.determineRole(session.user.email!);
          this.userRole.set(role);
          if (role) this.storage.setItem('nutrilev_role', role);
          this.roleReady.set(true);
        }
      }
    });

    // Initial session recovery
    try {
      // Fast check for session to unblock guards ASAP
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        console.log('Auth: Session recovered for', session.user.email);
        this.currentUser.set(session.user);
        
        // Optimistic restore to avoid Render cold-start blocking PWA load
        const cachedRole = this.storage.getItem<'admin' | 'patient' | 'pending' | 'denied' | null>('nutrilev_role');
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
              this.storage.setItem('nutrilev_role', role);
            }
          });
        } else {
          // No cache, must fetch initial role but we allow guards to wait
          const role = await this.determineRole(session.user.email!);
          this.userRole.set(role);
          if (role) this.storage.setItem('nutrilev_role', role);
          this.roleReady.set(true);
          this.isInitialLoading.set(false);
        }
      } else {
        console.log('Auth: No session found');
        this.isInitialLoading.set(false);
      }
    } catch (err) {
      console.error('Auth: Initial recovery error', err);
      this.isInitialLoading.set(false);
    } finally {
      this.resolveReady();
      // Guard against stuck loading state
      setTimeout(() => {
        if (this.isInitialLoading()) {
          console.warn('Auth: Loading state safeguard triggered');
          this.isInitialLoading.set(false);
        }
      }, 5000);
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
        const apiUrl = `${environment.apiUrl}/auth/get-role`;
        
        // We use HttpClient here to benefit from the httpResilienceInterceptor (retries)
        const obs = this.http.post<{role: string}>(apiUrl, { email: cleanEmail }).pipe(
          timeout(40000), // Wait up to 40s for cold starts (interceptor will retry within this)
          catchError((err) => {
             console.error('Auth: Error fetching role from server', err);
             const cached = this.storage.getItem<'admin' | 'patient' | 'pending' | 'denied' | null>('nutrilev_role');
             return of({ role: (cached as any) || 'none' });
          })
        );

        const response = await firstValueFrom(obs);
        const role = response?.role;
        return role === 'none' ? null : (role as any);
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
      if (role) this.storage.setItem('nutrilev_role', role);
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
    const apiUrl = `${environment.apiUrl}/auth/magic-link`;
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
    this.storage.removeItem('nutrilev_role');
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
