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
  public isRecoveryMode = signal<boolean>(false);
  private _accessToken = signal<string | null>(null);
  
  public ready: Promise<void>;
  private resolveReady!: () => void;
  public roleReady = signal<boolean>(false);
  public isDevMode = signal<boolean>(false);

  constructor() {
    this.ready = new Promise((resolve) => {
      this.resolveReady = resolve;
    });

    // Detectar parámetros de recuperación de forma sincrónica para evitar condiciones de carrera (race conditions)
    const search = window.location.search || '';
    const hash = window.location.hash || '';
    const href = window.location.href || '';
    const isRecovery = search.includes('recovery=true') || 
                       search.includes('recovery') ||
                       hash.includes('type=recovery') || 
                       href.includes('type=recovery') || 
                       hash.includes('recovery') || 
                       (typeof window !== 'undefined' && (window as any).__supabase_recovery_mode === true);
                       
    if (isRecovery) {
      console.log('Auth: Parámetros de recuperación detectados en la URL de forma síncrona.');
      this.isRecoveryMode.set(true);
    }

    this.initializeAuth();
    this.pingServer();
    this.checkDevMode();

    // Guard against stuck loading state (e.g. Supabase deadlocks or Zone.js microtask queue hangs)
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        if (this.isInitialLoading()) {
          console.warn('Auth: Loading state safeguard triggered from constructor');
          this.isInitialLoading.set(false);
          this.resolveReady();
        }
      }, 3000);
    }
  }

  private checkDevMode() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('dev') === 'true' || this.storage.getItem('nutrilev_dev_mode') === 'true') {
      this.enableDevMode();
    }
  }

  public enableDevMode() {
    console.log('Auth: ENABLING DEV MODE');
    this.isDevMode.set(true);
    this.storage.setItem('nutrilev_dev_mode', 'true');
    this.currentUser.set({
      id: 'dev-user-id',
      email: 'dev@nutrilev.com',
      user_metadata: { full_name: 'Developer Mode' }
    } as any);
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const roleParam = params?.get('role');
    const role = (roleParam === 'patient' || roleParam === 'admin') ? roleParam : 'admin';
    this.userRole.set(role);
    this.roleReady.set(true);
    this.isInitialLoading.set(false);
  }

  public disableDevMode() {
    this.isDevMode.set(false);
    this.storage.removeItem('nutrilev_dev_mode');
    window.location.href = '/';
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
      const email = session?.user?.email;
      console.log(`Auth: Event [${event}] for ${email || 'unknown user'}`);
      this._accessToken.set(session?.access_token || null);
      
      if (event === 'PASSWORD_RECOVERY') {
        console.log('Auth: PASSWORD_RECOVERY event detected. Switching to recovery mode.');
        this.isRecoveryMode.set(true);
      }
      
      if (event === 'SIGNED_OUT') {
        // Log the reason if possible (though Supabase doesn't always provide it)
        console.warn('Auth: SIGNED_OUT event detected. Current state:', {
          hasUser: !!this.currentUser(),
          hasLocalRole: !!this.storage.getItem('nutrilev_role')
        });

        if (this.currentUser()) {
          console.warn('Auth: Session was active but event is SIGNED_OUT. Clearing local state.');
          this.clearLocalSession();
        }
        return;
      }

      if (event === 'TOKEN_REFRESHED') {
        console.log('Auth: Token refreshed successfully at', new Date().toLocaleTimeString());
      }

      if (session?.user) {
        if (this.currentUser()?.id !== session.user.id || !this.userRole()) {
          console.log('Auth: User session valid. Email:', session.user.email);
          this.currentUser.set(session.user);
          const role = await this.determineRole(session.user.email!);
          this.userRole.set(role);
          if (role) {
            console.log('Auth: Role confirmed:', role);
            this.storage.setItem('nutrilev_role', role);
          }
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
        this._accessToken.set(session.access_token || null);
        
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
          timeout(50000), // Increased to 50s for extreme cold starts
          catchError((err) => {
             console.error('Auth: Error fetching role from server', err);
             const cached = this.storage.getItem<'admin' | 'patient' | 'pending' | 'denied' | null>('nutrilev_role');
             
             if (cached) {
               console.log('Auth: Server failed, falling back to cached role:', cached);
               return of({ role: cached });
             }
             
             // If everything fails and no cache, we still return 'none' to avoid breaking types
             return of({ role: 'none' });
          })
        );

        const response = await firstValueFrom(obs);
        const role = response?.role;
        
        // Cache the result if we got a valid role
        if (role && role !== 'none') {
          this.storage.setItem('nutrilev_role', role);
        }

        return role === 'none' ? null : (role as any);
      } catch (finalErr) {
        console.error('Auth: Final role determination failure', finalErr);
        return null;
      } finally {
        setTimeout(() => {
          if (this.lastCheckedEmail === cleanEmail) {
            this.roleCheckPromise = null;
            this.lastCheckedEmail = null;
          }
        }, 5000); // 5s debouncing
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

  async loginWithPassword(email: string, password: string): Promise<'success' | 'pending' | 'denied'> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error || !data.user) {
        console.error('Password login error:', error);
        return 'denied';
      }

      this._accessToken.set(data.session?.access_token || null);

      const role = await this.determineRole(data.user.email!);
      this.userRole.set(role);
      if (role) this.storage.setItem('nutrilev_role', role);
      this.roleReady.set(true);

      if (role === 'admin' || role === 'patient') {
        const target = role === 'admin' ? '/dashboard' : '/portal';
        console.log(`Auth: Login with password success, navigating to ${target}`);
        await this.router.navigate([target]);
        return 'success';
      }

      await this.logout();
      return role === 'pending' ? 'pending' : 'denied';
    } catch (err) {
      console.error('Password login error:', err);
      return 'denied';
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
    return this._accessToken();
  }

  async sendPasswordResetLink(email: string): Promise<{ success: boolean; message?: string }> {
    const cleanEmail = email.toLowerCase();
    
    try {
      const apiUrl = `${environment.apiUrl}/auth/send-reset-password`;
      const obs = this.http.post<{ success: boolean; message?: string }>(apiUrl, { email: cleanEmail });
      const response = await firstValueFrom(obs);
      return response || { success: false, message: 'Respuesta inválida del servidor.' };
    } catch (err: any) {
      console.error('Send reset password link error:', err);
      return { 
        success: false, 
        message: err?.error?.message || 'Error al enviar el enlace de configuración.' 
      };
    }
  }

  async updatePassword(password: string): Promise<{ success: boolean; message?: string }> {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      console.error('Update password error:', error);
      return { success: false, message: 'Error al actualizar la contraseña: ' + error.message };
    }
    
    // Restablecer el estado de recuperación tras actualizar con éxito
    this.isRecoveryMode.set(false);
    
    // Obtener y confirmar el rol del usuario que acaba de recuperar contraseña para redirección
    const session = (await supabase.auth.getSession()).data.session;
    if (session?.user?.email) {
      this.currentUser.set(session.user);
      const role = await this.determineRole(session.user.email);
      this.userRole.set(role);
      if (role) {
        this.storage.setItem('nutrilev_role', role);
        const target = role === 'admin' ? '/dashboard' : '/portal';
        await this.router.navigate([target]);
      }
    }

    return { success: true };
  }
}
