import { TestBed } from '@angular/core/testing';
import { PatientService } from './patient';
import { AuthService } from './auth.service';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';

describe('PatientService', () => {
  let service: PatientService;
  let mockHttpClient: any;

  beforeEach(() => {
    const mockAuthService = {
      accessToken: 'dummy-token',
      currentUser: jest.fn().mockReturnValue({ email: 'test@test.com' }),
      isDevMode: jest.fn().mockReturnValue(false),
    };

    mockHttpClient = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        PatientService,
        { provide: AuthService, useValue: mockAuthService },
        { provide: HttpClient, useValue: mockHttpClient },
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
      mockHttpClient.get.mockReturnValue(of(mockPatients));

      const result = await service.getPatients();
      expect(result).toEqual(mockPatients);
      expect(mockHttpClient.get).toHaveBeenCalledWith(service['apiUrl']);
    });
  });
});

