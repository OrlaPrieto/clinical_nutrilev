import { Test, TestingModule } from '@nestjs/testing';
import { PatientController } from './patient.controller';
import { PatientService } from './patient.service';
import type { PatientUpdate } from '../common/interfaces';
import { AdminGuard } from '../common/guards/admin.guard';
import { PatientAuthGuard } from '../common/guards/patient-auth.guard';

describe('PatientController', () => {
  let controller: PatientController;

  const mockPatientService = {
    findAll: jest.fn(),
    findByEmail: jest.fn(),
    update: jest.fn(),
    getProgress: jest.fn(),
    addProgress: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PatientController],
      providers: [{ provide: PatientService, useValue: mockPatientService }],
    })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PatientAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PatientController>(PatientController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of patients', async () => {
      const result = [{ email: 'test@test.com' }];
      mockPatientService.findAll.mockResolvedValue(result);

      expect(await controller.findAll()).toBe(result);
    });
  });

  describe('findOne', () => {
    it('should return a single patient', async () => {
      const result = { email: 'test@test.com' };
      mockPatientService.findByEmail.mockResolvedValue(result);

      expect(await controller.findOne('test@test.com')).toBe(result);
    });
  });

  describe('update', () => {
    it('should update a patient', async () => {
      const result = { id: '1', nombre: 'Updated' };
      mockPatientService.update.mockResolvedValue(result);

      const updateData: PatientUpdate = { nombre: 'Updated' };
      expect(await controller.update('1', updateData)).toBe(result);
    });
  });

  describe('remove', () => {
    it('should remove a patient', async () => {
      const result = { success: true };
      mockPatientService.remove.mockResolvedValue(result);

      expect(await controller.remove('test@test.com')).toBe(result);
    });
  });
});
