import { TestBed } from '@angular/core/testing';
import { PatientService } from './patient';

describe('PatientService', () => {
  let service: PatientService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PatientService],
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
