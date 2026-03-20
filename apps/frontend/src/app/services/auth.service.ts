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
    // Escuchar cambios de autenticación (Magic Link, Logout, etc)
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const role = await this.determineRole(session.user.email!);
        if (role) {
          this.currentUser.set(session.user);
          this.userRole.set(role);
          localStorage.setItem('nutrilev_role', role);
          
          // Redirección automática si estamos en login y el rol es válido
          if (this.router.url.includes('/login') && (role === 'admin' || role === 'patient')) {
            this.router.navigate([role === 'admin' ? '/dashboard' : '/portal']);
          }

          // Si el rol es restringido, forzamos salida para seguridad
          if (role === 'denied' || role === 'pending') {
            // No navegamos, dejamos que el componente de Login muestre el error
            // pero nos aseguramos de no persistir sesión si no es necesario
          }
        }
      } else if (event === 'SIGNED_OUT') {
        this.clearLocalSession();
      }
    });

    // Cargar sesión inicial
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const role = await this.determineRole(session.user.email!);
        this.currentUser.set(session.user);
        this.userRole.set(role);
      }
    } finally {
      this.resolveReady();
    }
  }

  private async determineRole(email: string): Promise<'admin' | 'patient' | 'pending' | 'denied' | null> {
    const cleanEmail = email.toLowerCase();
    
    // 1. Check Admin whitelist
    if (this.AUTHORIZED_EMAILS.includes(cleanEmail)) {
      return 'admin';
    }

    // 2. Check Patients table
    const { data: patient } = await supabase
      .from('patients')
      .select('email, acceso_portal, dado_de_baja')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (!patient) return null;
    if (patient.dado_de_baja) return 'denied'; 
    return patient.acceso_portal ? 'patient' : 'pending';
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
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000/api/auth/magic-link' : '/api/auth/magic-link';
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
