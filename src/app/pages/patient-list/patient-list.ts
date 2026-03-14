import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PatientService } from '../../services/patient';
import { AuthService } from '../../services/auth.service';
import { Patient } from '../../models/patient.model';
import { ButtonComponent } from '../../shared/components/atoms/button/button';
import { SearchInputComponent } from '../../shared/components/molecules/search-input/search-input';
import { BadgeComponent } from '../../shared/components/atoms/badge/badge';
import { PatientTableOrganism } from '../../shared/components/organisms/patient-table/patient-table';
import { AppointmentModalComponent } from '../../components/appointment-modal/appointment-modal';
import { PatientDetailComponent } from '../../components/patient-detail/patient-detail';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-patient-list-page',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    ButtonComponent, 
    SearchInputComponent, 
    PatientTableOrganism,
    AppointmentModalComponent,
    PatientDetailComponent,
    BadgeComponent,
    MatIconModule,
    RouterModule,
    NgOptimizedImage
  ],
  templateUrl: './patient-list.html',
  styleUrl: './patient-list.css'
})
export class PatientListPage implements OnInit {
  public authService = inject(AuthService);
  private patientService = inject(PatientService);
  private router = inject(Router);

  // Signals
  uniquePatients = signal<Patient[]>([]);
  searchTerm = signal<string>('');
  loading = signal<boolean>(true);
  displayDetail = signal<boolean>(false);
  selectedPatient = signal<Patient | null>(null);
  showDeleteConfirm = signal<boolean>(false);
  patientToDelete = signal<Patient | null>(null);
  
  showAppointmentModal = signal<boolean>(false);
  patientForAppointment = signal<Patient | null>(null);
  appointmentSuccess = signal<boolean>(false);

  // Pagination Signals
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

  // Computed
  filteredPatients = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const patients = this.uniquePatients();
    if (!term) return patients;
    return patients.filter(p => 
      p.nombre.toLowerCase().includes(term) || 
      p.email.toLowerCase().includes(term) ||
      p.telefono?.includes(term)
    );
  });

  totalPages = computed(() => {
    return Math.ceil(this.filteredPatients().length / this.pageSize());
  });

  paginatedPatients = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredPatients().slice(start, start + this.pageSize());
  });

  pageNumbers = computed(() => {
    const total = this.totalPages();
    return Array.from({ length: total }, (_, i) => i + 1);
  });

  ngOnInit() {
    this.loadPatients();
  }

  async loadPatients() {
    this.loading.set(true);
    try {
      const data = await this.patientService.getPatients();
      this.processPatients(data);
    } catch (err) {
      console.error('Error loading patients', err);
    } finally {
      this.loading.set(false);
    }
  }

  navigateToAutomation() {
    this.router.navigate(['/menu-automation']);
  }

  private processPatients(data: Patient[]) {
    const grouped = data.reduce((acc: any, curr) => {
      const key = curr.email || curr.nombre;
      if (!acc[key] || new Date(curr.fecha_hoy) > new Date(acc[key].fecha_hoy)) {
        acc[key] = { ...curr };
      }
      if (curr.ultima_actualizacion && (!acc[key].ultima_actualizacion || new Date(curr.ultima_actualizacion) > new Date(acc[key].ultima_actualizacion))) {
        acc[key].ultima_actualizacion = curr.ultima_actualizacion;
      }
      return acc;
    }, {});
    
    const sorted = (Object.values(grouped) as Patient[]).sort((a: any, b: any) => {
      const dateA = a.ultima_actualizacion ? new Date(a.ultima_actualizacion).getTime() : 0;
      const dateB = b.ultima_actualizacion ? new Date(b.ultima_actualizacion).getTime() : 0;
      return dateB - dateA;
    });
    
    this.uniquePatients.set(sorted);
  }

  onSearch() {
    this.currentPage.set(1);
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  onPageSizeChange(event: any) {
    this.pageSize.set(Number(event.target.value));
    this.currentPage.set(1);
  }

  showDetail(patient: Patient) {
    this.selectedPatient.set(patient);
    this.displayDetail.set(true);
  }

  openAppointment(patient: Patient) {
    this.patientForAppointment.set(patient);
    this.showAppointmentModal.set(true);
  }

  handleScheduled(event: any) {
    this.showAppointmentModal.set(false);
    this.appointmentSuccess.set(true);
    setTimeout(() => this.appointmentSuccess.set(false), 5000);
  }

  openDeleteConfirm(patient: Patient) {
    this.patientToDelete.set(patient);
    this.showDeleteConfirm.set(true);
  }

  cancelDelete() {
    this.showDeleteConfirm.set(false);
    this.patientToDelete.set(null);
  }

  async confirmDelete() {
    const patient = this.patientToDelete();
    if (!patient) return;

    try {
      await this.patientService.deletePatient(patient.email, patient.nombre);
      this.loadPatients();
      this.cancelDelete();
    } catch (err) {
      console.error('Error deleting patient', err);
      alert('Error al eliminar paciente');
    }
  }
}
