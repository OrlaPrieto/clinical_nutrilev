import { Component, OnInit, HostListener } from '@angular/core';
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
  patients: Patient[] = [];
  uniquePatients: any[] = [];
  filteredPatients: any[] = [];
  searchTerm: string = '';
  loading: boolean = true;
  displayDetail: boolean = false;
  selectedPatient: Patient | null = null;
  
  // Delete confirm
  showDeleteConfirm: boolean = false;
  patientToDelete: Patient | null = null;
  
  // Appointment
  showAppointmentModal: boolean = false;
  patientForAppointment: Patient | null = null;
  appointmentSuccess: boolean = false;
  
  // Pagination
  currentPage: number = 1;
  pageSize: number = 10;
  totalPages: number = 1;
  paginatedPatients: any[] = [];

  // Tooltip Interaction
  activeTooltipId: string | null = null;

  constructor(
    private patientService: PatientService,
    public authService: AuthService
  ) {}

  ngOnInit() {
    this.loadPatients();
  }

  loadPatients() {
    this.loading = true;
    this.patientService.getPatients().subscribe({
      next: (data) => {
        this.patients = data;
        this.groupPatients(data);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading patients', err);
        this.loading = false;
      }
    });
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
    this.uniquePatients = Object.values(grouped);
    
    this.applyFilters();
  }

  onSearch() {
    this.currentPage = 1;
    this.applyFilters();
  }

  applyFilters() {
    if (!this.searchTerm) {
      this.filteredPatients = [...this.uniquePatients];
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredPatients = this.uniquePatients.filter(p => 
        p.nombre.toLowerCase().includes(term) || 
        p.email.toLowerCase().includes(term) ||
        p.telefono.toLowerCase().includes(term)
      );
    }
    this.updatePagination();
  }

  updatePagination() {
    this.totalPages = Math.ceil(this.filteredPatients.length / this.pageSize);
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.paginatedPatients = this.filteredPatients.slice(start, end);
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  onPageSizeChange() {
    this.currentPage = 1;
    this.updatePagination();
  }

  get pageNumbers(): number[] {
    const pages = [];
    for (let i = 1; i <= this.totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  showDetail(patient: Patient) {
    this.selectedPatient = patient;
    this.displayDetail = true;
  }

  toggleTooltip(id: string, event: Event) {
    event.stopPropagation();
    if (this.activeTooltipId === id) {
      this.activeTooltipId = null;
    } else {
      this.activeTooltipId = id;
    }
  }

  @HostListener('document:click')
  onDocumentClick() {
    this.activeTooltipId = null;
  }

  openAppointment(patient: Patient, event: Event) {
    event.stopPropagation();
    this.patientForAppointment = patient;
    this.showAppointmentModal = true;
  }

  handleScheduled(event: any) {
    this.showAppointmentModal = false;
    this.appointmentSuccess = true;
    setTimeout(() => this.appointmentSuccess = false, 5000);
  }

  openDeleteConfirm(patient: Patient, event: Event) {
    event.stopPropagation();
    this.patientToDelete = patient;
    this.showDeleteConfirm = true;
  }

  cancelDelete() {
    this.showDeleteConfirm = false;
    this.patientToDelete = null;
  }

  confirmDelete() {
    if (!this.patientToDelete) return;
    
    this.loading = true;
    this.showDeleteConfirm = false;
    
    this.patientService.deletePatient(this.patientToDelete.email, this.patientToDelete.nombre).subscribe({
      next: () => {
        this.loadPatients();
        this.patientToDelete = null;
      },
      error: (err) => {
        console.error('Error deleting patient', err);
        alert('Hubo un error al eliminar al paciente.');
        this.loading = false;
        this.patientToDelete = null;
      }
    });
  }
}
