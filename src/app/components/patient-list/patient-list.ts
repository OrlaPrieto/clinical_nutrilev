import { Component, OnInit, HostListener, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PatientService } from '../../services/patient';
import { Patient } from '../../models/patient.model';
import { PatientDetailComponent } from '../patient-detail/patient-detail';
import { AuthService } from '../../services/auth.service';
import { AppointmentModalComponent } from '../appointment-modal/appointment-modal';

@Component({
  selector: 'app-patient-list',
  standalone: true,
  imports: [CommonModule, FormsModule, PatientDetailComponent, AppointmentModalComponent],
  templateUrl: './patient-list.html',
  styleUrl: './patient-list.css'
})
export class PatientListComponent implements OnInit {
  patients = signal<Patient[]>([]);
  uniquePatients = signal<any[]>([]);
  searchTerm = signal<string>('');
  loading = signal<boolean>(true);
  displayDetail = signal<boolean>(false);
  selectedPatient = signal<Patient | null>(null);
  
  // Delete confirm
  showDeleteConfirm = signal<boolean>(false);
  patientToDelete = signal<Patient | null>(null);
  
  // Appointment
  showAppointmentModal = signal<boolean>(false);
  patientForAppointment = signal<Patient | null>(null);
  appointmentSuccess = signal<boolean>(false);
  
  // Pagination
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

  // Tooltip Interaction
  activeTooltipId = signal<string | null>(null);

  // Computed state
  filteredPatients = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const patients = this.uniquePatients();
    
    if (!term) return patients;

    return patients.filter(p => 
      (p.nombre?.toLowerCase().includes(term)) || 
      (p.email?.toLowerCase().includes(term)) ||
      (p.telefono?.toLowerCase().includes(term))
    );
  });

  totalPages = computed(() => {
    return Math.ceil(this.filteredPatients().length / this.pageSize());
  });

  paginatedPatients = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    const end = start + this.pageSize();
    return this.filteredPatients().slice(start, end);
  });

  pageNumbers = computed(() => {
    const pages = [];
    for (let i = 1; i <= this.totalPages(); i++) {
      pages.push(i);
    }
    return pages;
  });

  constructor(
    private patientService: PatientService,
    public authService: AuthService
  ) {}

  ngOnInit() {
    this.loadPatients();
  }

  async loadPatients() {
    this.loading.set(true);
    try {
      const data = await this.patientService.getPatients();
      this.patients.set(data);
      this.groupPatients(data);
    } catch (err) {
      console.error('Error loading patients', err);
    } finally {
      this.loading.set(false);
    }
  }

  groupPatients(data: Patient[]) {
    const grouped = data.reduce((acc: any, curr) => {
      const key = curr.email || curr.nombre;
      // Si no existe el paciente o si la entrada actual es más reciente que la guardada
      if (!acc[key] || new Date(curr.fecha_hoy) > new Date(acc[key].fecha_hoy)) {
        acc[key] = { ...curr };
      }
      // Asegurar que la fecha de actualización más reciente se conserve
      if (curr.ultima_actualizacion && (!acc[key].ultima_actualizacion || new Date(curr.ultima_actualizacion) > new Date(acc[key].ultima_actualizacion))) {
        acc[key].ultima_actualizacion = curr.ultima_actualizacion;
      }
      return acc;
    }, {});
    
    const sorted = Object.values(grouped).sort((a: any, b: any) => {
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

  onPageSizeChange() {
    this.currentPage.set(1);
  }

  showDetail(patient: Patient) {
    this.selectedPatient.set(patient);
    this.displayDetail.set(true);
  }

  toggleTooltip(id: string, event: Event) {
    event.stopPropagation();
    if (this.activeTooltipId() === id) {
      this.activeTooltipId.set(null);
    } else {
      this.activeTooltipId.set(id);
    }
  }

  @HostListener('document:click')
  onDocumentClick() {
    this.activeTooltipId.set(null);
  }

  openAppointment(patient: Patient, event: Event) {
    event.stopPropagation();
    this.patientForAppointment.set(patient);
    this.showAppointmentModal.set(true);
  }

  handleScheduled(event: any) {
    this.showAppointmentModal.set(false);
    this.appointmentSuccess.set(true);
    setTimeout(() => this.appointmentSuccess.set(false), 5000);
  }

  openDeleteConfirm(patient: Patient, event: Event) {
    event.stopPropagation();
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
    
    this.loading.set(true);
    this.showDeleteConfirm.set(false);
    
    try {
      await this.patientService.deletePatient(patient.email, patient.nombre);
      this.loadPatients();
      this.patientToDelete.set(null);
    } catch (err) {
      console.error('Error deleting patient', err);
      alert('Hubo un error al eliminar al paciente.');
      this.loading.set(false);
      this.patientToDelete.set(null);
    }
  }
}
