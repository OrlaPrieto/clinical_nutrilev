import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';
import { SocialAuthService } from '@abacritt/angularx-social-login';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { supabase } from '../supabase';

jest.mock('../supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: jest.fn(),
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      signInWithIdToken: jest.fn(),
      signInWithPassword: jest.fn(),
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
  let mockHttpClient: any;

  beforeEach(() => {
    router = {
      navigate: jest.fn(),
      url: '/login',
    };
    socialAuthService = {
      signOut: jest.fn().mockResolvedValue(undefined),
    };
    mockHttpClient = {
      get: jest.fn().mockReturnValue(of('')),
      post: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: Router, useValue: router },
        { provide: SocialAuthService, useValue: socialAuthService },
        { provide: HttpClient, useValue: mockHttpClient },
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

  describe('loginWithPassword', () => {
    it('should return denied on error', async () => {
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: new Error('Invalid credentials'),
      });

      const result = await service.loginWithPassword('test@test.com', 'wrongpassword');
      expect(result).toBe('denied');
      expect(supabase.auth.signInWithPassword).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should call sign out and navigate to login', async () => {
      await service.logout();
      expect(supabase.auth.signOut).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('sendPasswordResetLink', () => {
    it('should return success true on server success', async () => {
      mockHttpClient.post.mockReturnValue(of({ success: true }));
      const result = await service.sendPasswordResetLink('test@test.com');
      expect(result).toEqual({ success: true });
      expect(mockHttpClient.post).toHaveBeenCalledWith('/api/auth/send-reset-password', {
        email: 'test@test.com'
      });
    });

    it('should return success false and message on error', async () => {
      const mockError = { error: { message: 'Some error' } };
      const { throwError } = require('rxjs');
      mockHttpClient.post.mockReturnValue(throwError(() => mockError));

      const result = await service.sendPasswordResetLink('test@test.com');
      expect(result.success).toBe(false);
      expect(result.message).toBe('Some error');
    });
  });
});
