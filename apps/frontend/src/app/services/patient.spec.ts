import { TestBed } from '@angular/core/testing';
import { PatientService } from './patient';
import { AuthService } from './auth.service';

describe('PatientService', () => {
  let service: PatientService;

  beforeEach(() => {
    const mockAuthService = {
      accessToken: 'dummy-token',
      currentUser: jest.fn().mockReturnValue({ email: 'test@test.com' }),
      isDevMode: jest.fn().mockReturnValue(false),
    };

    TestBed.configureTestingModule({
      providers: [
        PatientService,
        { provide: AuthService, useValue: mockAuthService }
      ],
    });
    service = TestBed.inject(PatientService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPatients', () => {
    it('should fetch patients', async () => {
      const mockPatients = [{ id: '1', email: 'test@test.com' }];
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockPatients),
      });

      const result = await service.getPatients();
      expect(result).toEqual(mockPatients);
      expect(global.fetch).toHaveBeenCalled();
    });
  });
});
