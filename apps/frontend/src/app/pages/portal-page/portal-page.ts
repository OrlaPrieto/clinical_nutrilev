import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { PatientService } from '../../services/patient';
import { Patient } from '../../models/patient.model';
import { ButtonComponent } from '../../shared/components/atoms/button/button';
import { IconComponent } from '../../shared/components/atoms/icon/icon';
import { APP_VERSION } from '../../version';

@Component({
  selector: 'app-portal-page',
  standalone: true,
  imports: [CommonModule, ButtonComponent, IconComponent],
  templateUrl: './portal-page.html',
  styleUrl: './portal-page.css'
})
export class PortalPage implements OnInit {
  public version = APP_VERSION;
  private authService = inject(AuthService);
  private patientService = inject(PatientService);

  patient = signal<Patient | null>(null);
  progress = signal<any[]>([]);
  loading = signal<boolean>(true);

  firstName = computed(() => {
    const p = this.patient();
    if (!p || !p.nombre) return 'Usuario';
    return p.nombre.split(' ')[0];
  });

  isMenuValid = computed(() => {
    const p = this.patient();
    if (!p || !p.menu_url || !p.menu_created_at) return false;
    const createdAt = new Date(p.menu_created_at).getTime();
    const now = Date.now();
    const diffDays = (now - createdAt) / (1000 * 60 * 60 * 24);
    return diffDays <= 7;
  });

  openMenu() {
    const p = this.patient();
    if (p && p.menu_url) {
      window.open(p.menu_url, '_blank', 'noopener');
    }
  }

  async ngOnInit() {
    const user = this.authService.user;
    if (user && user.email) {
      try {
        // Cargar datos del paciente
        const patients = await this.patientService.getPatients();
        const currentPatient = patients.find(p => p.email.toLowerCase() === user.email.toLowerCase());
        
        if (currentPatient) {
          this.patient.set(currentPatient);
          // Cargar historial
          const history = await this.patientService.getPatientProgress(user.email);
          this.progress.set(history);
        }
      } catch (err) {
        console.error('Error loading portal data', err);
      } finally {
        this.loading.set(false);
      }
    }
  }

  logout() {
    this.authService.logout();
  }
}
