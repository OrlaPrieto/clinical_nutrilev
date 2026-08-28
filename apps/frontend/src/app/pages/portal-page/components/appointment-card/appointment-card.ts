import { Component, input, output, computed, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../../shared/components/atoms/icon/icon';
import { Patient, PatientProgress } from '@shared/models/interfaces';
import { Appointment } from '../../../../services/appointment.service';

export interface PackageSessionItem {
  sessionNumber: number;
  status: 'completed' | 'scheduled' | 'pending';
  dateLabel: string;
  shortDateLabel: string;
  badgeText: string;
  summary: string;
  isTentative: boolean;
  weight?: string | number;
}

@Component({
  selector: 'app-appointment-card',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './appointment-card.html',
  styleUrl: './appointment-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppointmentCardComponent {
  nextAppointment = input<Appointment | null>(null);
  patient = input<Patient | null>(null);
  progressHistory = input<PatientProgress[]>([]);
  showConfirmButtons = input<boolean>(false);
  loadingAppointmentAction = input<boolean>(false);
  appointmentDateStr = input<string>('');
  rescheduleWhatsappUrl = input<string>('');

  confirm = output<void>();
  cancel = output<void>();

  showDetailsModal = signal<boolean>(false);
  showDetailedTimeline = signal<boolean>(false);

  totalPlanCitas = computed(() => Number(this.patient()?.plan_citas || 0));
  completedPlanCitas = computed(() => Number(this.patient()?.plan_citas_completadas || 0));
  remainingPlanCitas = computed(() => Math.max(0, this.totalPlanCitas() - this.completedPlanCitas()));
  isPackageCompleted = computed(() => this.totalPlanCitas() > 0 && this.completedPlanCitas() >= this.totalPlanCitas());
  percentageCompleted = computed(() => {
    const total = this.totalPlanCitas();
    if (!total) return 0;
    return Math.min(100, Math.round((this.completedPlanCitas() / total) * 100));
  });

  sessionsTimeline = computed<PackageSessionItem[]>(() => {
    const total = this.totalPlanCitas();
    if (total <= 0) return [];

    const completedCount = this.completedPlanCitas();
    
    // Historial ordenado cronológicamente (más antiguo al más reciente)
    const sortedHistory = [...this.progressHistory()]
      .filter(p => p.date || (p as any).created_at)
      .sort((a, b) => new Date(a.date || (a as any).created_at!).getTime() - new Date(b.date || (b as any).created_at!).getTime());

    const nextApt = this.nextAppointment();
    const hasNextScheduled = !!(nextApt?.hasAppointment && nextApt?.start && nextApt?.status !== 'cancelled');

    // Determinar la fecha base para proyectar las citas futuras:
    // 1) Si hay próxima cita agendada en calendario, usar esa fecha
    // 2) Si no, usar la fecha de la última cita completada
    // 3) Si no hay citas previas, usar la fecha de creación del menú o la fecha de hoy
    let baseFutureDate: Date;
    let baseFutureSessionIndex = completedCount;

    if (hasNextScheduled) {
      baseFutureDate = new Date(nextApt!.start!);
      baseFutureSessionIndex = completedCount + 1;
    } else if (sortedHistory.length > 0) {
      const lastProg = sortedHistory[sortedHistory.length - 1];
      baseFutureDate = new Date(lastProg.date || (lastProg as any).created_at);
    } else if (this.patient()?.menu_created_at) {
      baseFutureDate = new Date(this.patient()!.menu_created_at!);
    } else {
      baseFutureDate = new Date();
    }

    const items: PackageSessionItem[] = [];

    for (let i = 1; i <= total; i++) {
      if (i <= completedCount) {
        // Cita completada
        const prog = sortedHistory[i - 1];
        let dateObj: Date | null = null;
        if (prog) {
          const raw = prog.date || (prog as any).created_at;
          if (raw) {
            const parsed = new Date(raw);
            if (!isNaN(parsed.getTime())) dateObj = parsed;
          }
        }

        const dateLabel = dateObj 
          ? dateObj.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
          : 'Asistió';
        const shortDateLabel = dateObj
          ? dateObj.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
          : 'Asistió';

        items.push({
          sessionNumber: i,
          status: 'completed',
          dateLabel,
          shortDateLabel,
          badgeText: 'Asistió ✅',
          summary: prog?.weight ? `Peso registrado: ${prog.weight} kg` : (i === 1 ? 'Consulta Inicial' : 'Seguimiento completado'),
          isTentative: false,
          weight: prog?.weight
        });
      } else if (i === completedCount + 1 && hasNextScheduled) {
        // Próxima cita ya agendada en Google Calendar
        const aptDate = new Date(nextApt!.start!);
        const dateLabel = !isNaN(aptDate.getTime())
          ? aptDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
          : (this.appointmentDateStr() || 'Próxima consulta');
        const shortDateLabel = !isNaN(aptDate.getTime())
          ? aptDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
          : 'Próxima';

        const isConfirmed = nextApt?.status === 'confirmed';
        items.push({
          sessionNumber: i,
          status: 'scheduled',
          dateLabel,
          shortDateLabel,
          badgeText: isConfirmed ? 'Confirmada 🟡' : 'Por confirmar 🟡',
          summary: 'Próxima consulta en agenda',
          isTentative: false
        });
      } else {
        // Citas restantes: Fechas tentativas proyectadas a intervalos semanales (cada 7 días)
        const stepsFromBase = i - baseFutureSessionIndex;
        const daysToAdd = Math.max(1, stepsFromBase) * 7;
        const projectedDate = new Date(baseFutureDate);
        projectedDate.setDate(projectedDate.getDate() + daysToAdd);

        const dateLabel = projectedDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
        const shortDateLabel = `~ ${projectedDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}`;

        items.push({
          sessionNumber: i,
          status: 'pending',
          dateLabel: `${dateLabel} (Tentativa)`,
          shortDateLabel,
          badgeText: 'Tentativa ⚪',
          summary: 'Fecha tentativa estimada (sujeta a cambios al agendar)',
          isTentative: true
        });
      }
    }

    return items;
  });

  renewalWhatsappUrl = computed(() => {
    const patientName = this.patient()?.nombre || 'Paciente';
    const total = this.totalPlanCitas();
    const msg = `Hola Nutrilev, soy ${patientName}. Ya completé las ${total} sesiones de mi paquete de citas y me gustaría renovar mi plan para continuar con mi seguimiento.`;
    return `https://wa.me/?text=${encodeURIComponent(msg)}`;
  });

  confirmAppointment() {
    this.confirm.emit();
  }

  cancelAppointment() {
    this.cancel.emit();
  }

  toNumber(val: any): number {
    return Number(val);
  }
}
