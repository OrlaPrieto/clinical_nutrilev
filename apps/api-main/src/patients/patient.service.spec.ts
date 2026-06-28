import { Test, TestingModule } from '@nestjs/testing';
import { PatientService } from './patient.service';
import { SupabaseService } from '../common/supabase.service';
import { PatientUpdate, PatientProgressInsert } from '@shared/index';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

describe('PatientService', () => {
  let service: PatientService;

  const mockSupabaseClient = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn(),
  };

  const mockSupabaseService = {
    getClient: jest.fn().mockReturnValue(mockSupabaseClient),
  };

  const mockHttpService = {
    post: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('http://localhost'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientService,
        { provide: SupabaseService, useValue: mockSupabaseService },
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<PatientService>(PatientService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all patients ordered by name', async () => {
      const mockPatients = [{ nombre: 'Juan' }, { nombre: 'Pedro' }];
      mockSupabaseClient.order.mockResolvedValue({
        data: mockPatients,
        error: null,
      });

      const result = await service.findAll();
      expect(result).toEqual(mockPatients);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('patients');
      expect(mockSupabaseClient.select).toHaveBeenCalledWith('*');
      expect(mockSupabaseClient.order).toHaveBeenCalledWith('nombre');
    });

    it('should throw error if supabase returns error', async () => {
      mockSupabaseClient.order.mockResolvedValue({
        data: null,
        error: new Error('DB Error'),
      });
      await expect(service.findAll()).rejects.toThrow('DB Error');
    });
  });

  describe('findByEmail', () => {
    it('should return a single patient by email', async () => {
      const mockPatient = { email: 'test@test.com' };
      mockSupabaseClient.single.mockResolvedValue({
        data: mockPatient,
        error: null,
      });

      const result = await service.findByEmail('test@test.com');
      expect(result).toEqual(mockPatient);
      expect(mockSupabaseClient.ilike).toHaveBeenCalledWith(
        'email',
        'test@test.com',
      );
    });
  });

  describe('update', () => {
    it('should update a patient by ID (UUID)', async () => {
      const id = 'uuid-123';
      const updateData: PatientUpdate = { nombre: 'Updated Name' };
      const mockPatient = { id, ...updateData };

      mockSupabaseClient.single.mockResolvedValue({
        data: mockPatient,
        error: null,
      });

      const result = await service.update(id, updateData);
      expect(result).toEqual(mockPatient);
      expect(mockSupabaseClient.update).toHaveBeenCalled();
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', id);
    });

    it('should update a patient by email', async () => {
      const email = 'test@test.com';
      const updateData: PatientUpdate = { nombre: 'Updated Name' };

      mockSupabaseClient.single.mockResolvedValue({
        data: { email, ...updateData },
        error: null,
      });

      await service.update(email, updateData);
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('email', email);
    });

    it('should update push subscriptions when patient email changes', async () => {
      const id = 'uuid-123';
      const originalEmail = 'old@test.com';
      const newEmail = 'new@test.com';
      const updateData = {
        email: newEmail,
        originalEmail,
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: { id, email: newEmail },
        error: null,
      });

      await service.update(id, updateData);
      
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('push_subscriptions');
      expect(mockSupabaseClient.update).toHaveBeenCalledWith({ email: newEmail });
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('email', originalEmail);
    });
  });

  describe('addProgress', () => {
    it('should add progress entry', async () => {
      const progressData: PatientProgressInsert = {
        patient_id: 'uuid-123',
        weight: 70,
      };
      mockSupabaseClient.single.mockResolvedValue({
        data: progressData,
        error: null,
      });

      const result = await service.addProgress(progressData);
      expect(result).toEqual(progressData);
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith({
        patient_id: 'uuid-123',
        weight: '70',
      });
    });
  });

  describe('remove', () => {
    it('should delete a patient by email or name', async () => {
      mockSupabaseClient.or.mockResolvedValue({ error: null });

      const result = await service.remove('test@test.com');
      expect(result).toEqual({ success: true });
      expect(mockSupabaseClient.delete).toHaveBeenCalled();
      expect(mockSupabaseClient.or).toHaveBeenCalledWith(
        'email.eq.test@test.com,nombre.eq.test@test.com',
      );
    });
  });
});
