import { Component, OnInit, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PatientService } from '../../services/patient';
import { AuthService } from '../../services/auth.service';
import { Patient } from '../../models/patient.model';
import { ButtonComponent } from '../../shared/components/atoms/button/button';
import { SearchInputComponent } from '../../shared/components/molecules/search-input/search-input';
import { BadgeComponent } from '../../shared/components/atoms/badge/badge';
import { ThemeService } from '../../shared/services/theme.service';
import { PatientTableOrganism } from '../../shared/components/organisms/patient-table/patient-table';
import { PatientDetailComponent } from '../../shared/components/organisms/patient-detail/patient-detail';
import { DashboardHeaderComponent } from '../../shared/components/organisms/dashboard-header/dashboard-header';
import { MatIconModule } from '@angular/material/icon';
import { IconComponent } from '../../shared/components/atoms/icon/icon';
import { Router, RouterModule } from '@angular/router';
import { environment } from '../../../environments/environment';
import { APP_VERSION } from '../../version';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-patient-list-page',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    ButtonComponent, 
    PatientTableOrganism,
    PatientDetailComponent,
    DashboardHeaderComponent,
    BadgeComponent,
    RouterModule,
    IconComponent
  ],
  templateUrl: './patient-list.html',
  styleUrl: './patient-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PatientListPage implements OnInit {
  public authService = inject(AuthService);
  public themeService = inject(ThemeService);
  private patientService = inject(PatientService);
  private router = inject(Router);
  private titleService = inject(Title);

  // Signals
  uniquePatients = signal<Patient[]>([]);
  searchTerm = signal<string>('');
  currentFilter = signal<'total' | 'activos' | 'pendientes' | 'baja'>('total');
  loading = signal<boolean>(true);
  displayDetail = signal<boolean>(false);
  selectedPatient = signal<Patient | null>(null);
  showDeleteConfirm = signal<boolean>(false);
  patientToDelete = signal<Patient | null>(null);

  // Pagination Signals
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

  // Computed
  filteredPatients = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const filter = this.currentFilter();
    const patients = this.uniquePatients();
    
    let filtered = patients;
    
    if (filter === 'activos') {
      filtered = filtered.filter(p => !p.dado_de_baja && p.acceso_portal);
    } else if (filter === 'pendientes') {
      filtered = filtered.filter(p => !p.dado_de_baja && !p.acceso_portal);
    } else if (filter === 'baja') {
      filtered = filtered.filter(p => p.dado_de_baja);
    }

    if (!term) return filtered;
    
    return filtered.filter(p => 
      p.nombre.toLowerCase().includes(term) || 
      p.email.toLowerCase().includes(term) ||
      (p.telefono && p.telefono.includes(term))
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
    const current = this.currentPage();
    const pages: (number | string)[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (current <= 4) {
        pages.push(2, 3, 4, 5);
        pages.push('...');
        pages.push(total);
      } else if (current >= total - 3) {
        pages.push('...');
        for (let i = total - 4; i <= total; i++) {
          if (i > 1) {
            pages.push(i);
          }
        }
      } else {
        pages.push('...');
        pages.push(current - 1, current, current + 1);
        pages.push('...');
        pages.push(total);
      }
    }
    return pages;
  });

  // Statistics Computed
  totalCount = computed(() => this.uniquePatients().length);
  activeCount = computed(() => this.uniquePatients().filter(p => !p.dado_de_baja && p.acceso_portal).length);
  pendingCount = computed(() => this.uniquePatients().filter(p => !p.dado_de_baja && !p.acceso_portal).length);
  bajaCount = computed(() => this.uniquePatients().filter(p => p.dado_de_baja).length);

  ngOnInit() {
    this.titleService.setTitle('Panel de Pacientes - Nutrilev');
    this.loadPatients();
  }

  async loadPatients(forceRefresh = false) {
    this.loading.set(true);
    try {
      const data = await this.patientService.getPatients(forceRefresh);
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
    const grouped = data.reduce<Record<string, Patient>>((acc, curr) => {
      const key = curr.email || curr.nombre;
      
      const currFechaHoy = curr.fecha_hoy ? new Date(curr.fecha_hoy).getTime() : 0;
      const accFechaHoy = (acc[key]?.fecha_hoy) ? new Date(acc[key].fecha_hoy).getTime() : 0;

      if (!acc[key] || currFechaHoy > accFechaHoy) {
        acc[key] = { ...curr };
      }

      const currUltima = curr.ultima_actualizacion ? new Date(curr.ultima_actualizacion).getTime() : 0;
      const accUltima = (acc[key]?.ultima_actualizacion) ? new Date(acc[key].ultima_actualizacion).getTime() : 0;

      if (currUltima > accUltima) {
        acc[key].ultima_actualizacion = curr.ultima_actualizacion;
      }
      return acc;
    }, {});
    
    const sorted = Object.values(grouped).sort((a, b) => {
      const dateA = a.ultima_actualizacion ? new Date(a.ultima_actualizacion).getTime() : 0;
      const dateB = b.ultima_actualizacion ? new Date(b.ultima_actualizacion).getTime() : 0;
      return dateB - dateA;
    });
    
    this.uniquePatients.set(sorted);
  }

  onSearch() {
    this.currentPage.set(1);
  }

  setFilter(filter: 'total' | 'activos' | 'pendientes' | 'baja') {
    this.currentFilter.set(filter);
    this.currentPage.set(1);
  }

  goToPage(page: number | string) {
    const pageNum = Number(page);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= this.totalPages()) {
      this.currentPage.set(pageNum);
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
