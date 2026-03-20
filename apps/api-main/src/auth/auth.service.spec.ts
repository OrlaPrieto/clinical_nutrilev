import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { SupabaseService } from '../common/supabase.service';
import { ConfigService } from '@nestjs/config';

describe('AuthService', () => {
  let service: AuthService;

  const mockSupabaseClient = {
    auth: {
      signInWithOtp: jest.fn(),
    },
  };

  const mockSupabaseService = {
    getClient: jest.fn().mockReturnValue(mockSupabaseClient),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('http://localhost:4200'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: SupabaseService, useValue: mockSupabaseService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('signInWithMagicLink', () => {
    it('should call signInWithOtp and return data', async () => {
      const mockData = { user: null, session: null };
      mockSupabaseClient.auth.signInWithOtp.mockResolvedValue({
        data: mockData,
        error: null,
      });

      const result = await service.signInWithMagicLink('test@test.com');
      expect(result).toEqual(mockData);
      expect(mockSupabaseClient.auth.signInWithOtp).toHaveBeenCalledWith({
        email: 'test@test.com',
        options: {
          emailRedirectTo: 'http://localhost:4200/portal',
        },
      });
    });

    it('should throw error if supabase returns error', async () => {
      mockSupabaseClient.auth.signInWithOtp.mockResolvedValue({
        data: null,
        error: new Error('Auth Error'),
      });
      await expect(
        service.signInWithMagicLink('test@test.com'),
      ).rejects.toThrow('Auth Error');
    });
  });
});
