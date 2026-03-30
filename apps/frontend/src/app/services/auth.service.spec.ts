import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';
import { SocialAuthService } from '@abacritt/angularx-social-login';
import { supabase } from '../supabase';

jest.mock('../supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: jest.fn(),
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      signInWithIdToken: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: null }),
  },
}));

describe('AuthService', () => {
  let service: AuthService;
  let router: any;
  let socialAuthService: any;

  beforeEach(() => {
    router = {
      navigate: jest.fn(),
      url: '/login',
    };
    socialAuthService = {
      signOut: jest.fn().mockResolvedValue(undefined),
    };

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: Router, useValue: router },
        { provide: SocialAuthService, useValue: socialAuthService },
      ],
    });
    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('isLoggedIn', () => {
    it('should return false when no user', () => {
      expect(service.isLoggedIn()).toBe(false);
    });

    it('should return true when user exists', () => {
      service.currentUser.set({ email: 'test@test.com' });
      expect(service.isLoggedIn()).toBe(true);
    });
  });

  describe('signInWithMagicLink', () => {
    it('should call fetch and return success', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
      });

      const result = await service.signInWithMagicLink('test@test.com');
      expect(result.error).toBeNull();
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should return error on failure', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
      });

      const result = await service.signInWithMagicLink('test@test.com');
      expect(result.error).toBeDefined();
    });
  });

  describe('logout', () => {
    it('should call sign out and navigate to login', async () => {
      await service.logout();
      expect(supabase.auth.signOut).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });
  });
});
