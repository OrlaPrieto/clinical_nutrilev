import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { PatientService } from '../../services/patient';
import { Patient } from '../../models/patient.model';
import { ButtonComponent } from '../../shared/components/atoms/button/button';
import { IconComponent } from '../../shared/components/atoms/icon/icon';
import { APP_VERSION } from '../../version';

import { NutriImagePipe } from '../../shared/pipes/nutri-image.pipe';
import { MilestoneBadgeComponent } from '../../shared/components/molecules/milestone-badge/milestone-badge';

@Component({
  selector: 'app-portal-page',
  standalone: true,
  imports: [CommonModule, ButtonComponent, IconComponent, NutriImagePipe, MilestoneBadgeComponent],
  templateUrl: './portal-page.html',
  styleUrl: './portal-page.css',
  providers: [DatePipe]
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

  bmi = computed(() => {
    const p = this.patient();
    const prog = this.progress();
    if (!p || !p.estatura) return null;
    
    const weight = prog.length > 0 ? prog[0].weight : parseFloat(p.peso_habitual || '0');
    const height = parseFloat(p.estatura) / 100;
    
    if (!weight || !height) return null;
    return (weight / (height * height)).toFixed(1);
  });

  weightTrendPath = computed(() => {
    const prog = [...this.progress()].reverse();
    if (prog.length < 2) return '';
    
    const weights = prog.map(p => p.weight);
    const minWeight = Math.min(...weights) - 2;
    const maxWeight = Math.max(...weights) + 2;
    const range = maxWeight - minWeight;
    
    const width = 400;
    const height = 100;
    const stepX = width / (prog.length - 1);
    
    return prog.map((p, i) => {
      const x = i * stepX;
      const y = height - ((p.weight - minWeight) / range * height);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  });

  chartPoints = computed(() => {
    const prog = [...this.progress()].reverse();
    if (prog.length < 1) return [];
    
    const weights = prog.map(p => p.weight);
    const minWeight = Math.min(...weights) - 2;
    const maxWeight = Math.max(...weights) + 2;
    const range = maxWeight - minWeight;
    
    const width = 400;
    const height = 100;
    const stepX = prog.length > 1 ? width / (prog.length - 1) : width / 2;
    
    return prog.map((p, i) => ({
      x: i * stepX,
      y: height - ((p.weight - minWeight) / range * height),
      weight: p.weight,
      date: p.date
    }));
  });

  goalPercentage = computed(() => {
    const p = this.patient();
    const prog = this.progress();
    if (!p || !p.peso_meta || !p.peso_habitual) return 0;
    
    const start = parseFloat(p.peso_habitual);
    const target = parseFloat(p.peso_meta);
    const current = prog.length > 0 ? prog[0].weight : start;
    
    if (start === target) return 100;
    
    const totalDist = Math.abs(start - target);
    const currentDist = Math.abs(start - current);
    const pct = (currentDist / totalDist) * 100;
    return Math.min(Math.max(pct, 0), 100);
  });

  milestones = computed(() => {
    const p = this.patient();
    const prog = this.progress();
    if (!p || !p.peso_habitual) return [];

    const startWeight = parseFloat(p.peso_habitual);
    const currentWeight = prog.length > 0 ? prog[0].weight : startWeight;
    const targetWeight = parseFloat(p.peso_meta || '0');
    const lostWeight = startWeight - currentWeight;
    const goalPct = this.goalPercentage();

    return [
      {
        id: 'first-2kg',
        image: 'images/milestones/star_bronze.png',
        title: 'Primer Paso',
        description: 'Pierde tus primeros 2kg.',
        unlocked: lostWeight >= 2
      },
      {
        id: 'halfway',
        image: 'images/milestones/star_gold.png',
        title: 'A Medio Camino',
        description: 'Logra el 50% de tu meta.',
        unlocked: goalPct >= 50
      },
      {
        id: 'goal-reached',
        image: 'images/milestones/star_diamond.png',
        title: 'Meta Lograda',
        description: 'Alcanza tu peso objetivo.',
        unlocked: targetWeight > 0 && currentWeight <= targetWeight
      }
    ];
  });

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
