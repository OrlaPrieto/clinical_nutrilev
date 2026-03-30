import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PatientListPage } from './patient-list';
import { PatientService } from '../../services/patient';
import { AuthService } from '../../services/auth.service';
import { Router, RouterModule } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('PatientListPage', () => {
  let component: PatientListPage;
  let fixture: ComponentFixture<PatientListPage>;
  let patientServiceMock: any;
  let authServiceMock: any;
  let routerMock: any;

  beforeEach(async () => {
    patientServiceMock = {
      getPatients: jest.fn().mockResolvedValue([]),
      deletePatient: jest.fn().mockResolvedValue({ success: true }),
    };
    authServiceMock = {
      user: jest.fn().mockReturnValue(null),
      logout: jest.fn(),
    };
    routerMock = {
      navigate: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [
        PatientListPage,
        NoopAnimationsModule,
        HttpClientTestingModule,
        RouterModule.forRoot([]),
      ],
      providers: [
        { provide: PatientService, useValue: patientServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PatientListPage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load patients on init', async () => {
    const mockPatients: any[] = [
      { nombre: 'Juan', email: 'juan@test.com', fecha_hoy: '2024-01-01' },
    ];
    patientServiceMock.getPatients.mockResolvedValue(mockPatients);

    // Call loadPatients directly and wait
    await component.loadPatients();
    fixture.detectChanges();

    expect(patientServiceMock.getPatients).toHaveBeenCalled();
    expect(component.uniquePatients().length).toBe(1);
    expect(component.uniquePatients()[0].nombre).toBe('Juan');
  });

  it('should filter patients by search term', () => {
    const mockPatients: any[] = [
      { nombre: 'Juan', email: 'juan@test.com', fecha_hoy: '2024-01-01' },
      { nombre: 'Maria', email: 'maria@test.com', fecha_hoy: '2024-01-01' },
    ];
    component.uniquePatients.set(mockPatients);

    component.searchTerm.set('Juan');

    expect(component.filteredPatients().length).toBe(1);
    expect(component.filteredPatients()[0].nombre).toBe('Juan');
  });

  it('should open delete confirmation', () => {
    const mockPatient = { nombre: 'Juan', email: 'juan@test.com' } as any;
    component.openDeleteConfirm(mockPatient);

    expect(component.showDeleteConfirm()).toBe(true);
    expect(component.patientToDelete()).toEqual(mockPatient);
  });

  it('should delete patient and reload list', async () => {
    const mockPatient = { nombre: 'Juan', email: 'juan@test.com' } as any;
    component.patientToDelete.set(mockPatient);
    patientServiceMock.deletePatient.mockResolvedValue({ success: true });

    const loadSpy = jest.spyOn(component, 'loadPatients').mockImplementation(async () => {});

    await component.confirmDelete();

    expect(patientServiceMock.deletePatient).toHaveBeenCalled();
    expect(loadSpy).toHaveBeenCalled();
    expect(component.showDeleteConfirm()).toBe(false);
  });
});
