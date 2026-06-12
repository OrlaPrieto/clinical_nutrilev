import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { SupabaseService } from '../common/supabase.service';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../common/email.service';

describe('AuthService', () => {
  let service: AuthService;

  const mockSupabaseClient = {
    auth: {
      signInWithOtp: jest.fn(),
      admin: {
        generateLink: jest.fn(),
        createUser: jest.fn(),
      },
    },
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
  };

  const mockSupabaseService = {
    getClient: jest.fn().mockReturnValue(mockSupabaseClient),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('http://localhost:4200'),
  };

  const mockEmailService = {
    sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: SupabaseService, useValue: mockSupabaseService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: EmailService, useValue: mockEmailService },
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
      mockSupabaseClient.from.mockReturnThis();
      mockSupabaseClient.select.mockReturnThis();
      mockSupabaseClient.ilike.mockResolvedValue({
        data: [
          {
            email: 'test@test.com',
            acceso_portal: true,
            dado_de_baja: false,
          },
        ],
        error: null,
      });

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
      mockSupabaseClient.from.mockReturnThis();
      mockSupabaseClient.select.mockReturnThis();
      mockSupabaseClient.ilike.mockResolvedValue({
        data: [
          {
            email: 'test@test.com',
            acceso_portal: true,
            dado_de_baja: false,
          },
        ],
        error: null,
      });

      mockSupabaseClient.auth.signInWithOtp.mockResolvedValue({
        data: null,
        error: new Error('Auth Error'),
      });
      await expect(
        service.signInWithMagicLink('test@test.com'),
      ).rejects.toThrow('Auth Error');
    });
  });

  describe('sendResetPassword', () => {
    it('should generate recovery link and send email if user already exists in auth', async () => {
      mockSupabaseClient.from.mockReturnThis();
      mockSupabaseClient.select.mockReturnThis();
      mockSupabaseClient.ilike.mockResolvedValue({
        data: [
          {
            acceso_portal: true,
            dado_de_baja: false,
          },
        ],
        error: null,
      });

      mockSupabaseClient.auth.admin.createUser.mockResolvedValue({
        data: null,
        error: { message: 'Email already registered' },
      });

      mockSupabaseClient.auth.admin.generateLink.mockResolvedValue({
        data: {
          properties: {
            action_link: 'http://localhost:4200/login?recovery=true&token=test',
          },
        },
        error: null,
      });

      mockEmailService.sendPasswordResetEmail.mockResolvedValue(true);

      const result = await service.sendResetPassword('patient@test.com');
      expect(result).toEqual({ success: true });
      expect(mockSupabaseClient.auth.admin.createUser).toHaveBeenCalledWith({
        email: 'patient@test.com',
        email_confirm: true,
      });
      expect(mockSupabaseClient.auth.admin.generateLink).toHaveBeenCalledWith({
        type: 'recovery',
        email: 'patient@test.com',
        options: {
          redirectTo: 'http://localhost:4200/login?recovery=true',
        },
      });
      expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        'patient@test.com',
        'http://localhost:4200/login?recovery=true&token=test',
      );
    });

    it('should create user and generate recovery link and send email if user does not exist in auth', async () => {
      mockSupabaseClient.from.mockReturnThis();
      mockSupabaseClient.select.mockReturnThis();
      mockSupabaseClient.ilike.mockResolvedValue({
        data: [
          {
            acceso_portal: true,
            dado_de_baja: false,
          },
        ],
        error: null,
      });

      mockSupabaseClient.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: 'new-user-id' } },
        error: null,
      });

      mockSupabaseClient.auth.admin.generateLink.mockResolvedValue({
        data: {
          properties: {
            action_link: 'http://localhost:4200/login?recovery=true&token=recovery',
          },
        },
        error: null,
      });

      mockEmailService.sendPasswordResetEmail.mockResolvedValue(true);

      const result = await service.sendResetPassword('newpatient@test.com');
      expect(result).toEqual({ success: true });
      expect(mockSupabaseClient.auth.admin.createUser).toHaveBeenCalledWith({
        email: 'newpatient@test.com',
        email_confirm: true,
      });
      expect(mockSupabaseClient.auth.admin.generateLink).toHaveBeenCalledWith({
        type: 'recovery',
        email: 'newpatient@test.com',
        options: {
          redirectTo: 'http://localhost:4200/login?recovery=true',
        },
      });
      expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        'newpatient@test.com',
        'http://localhost:4200/login?recovery=true&token=recovery',
      );
    });

    it('should return error message if role is none/pending/denied', async () => {
      mockSupabaseClient.from.mockReturnThis();
      mockSupabaseClient.select.mockReturnThis();
      mockSupabaseClient.ilike.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await service.sendResetPassword('unknown@test.com');
      expect(result.success).toBe(false);
      expect(result.message).toContain('no está registrado como paciente activo');
    });
  });
});
