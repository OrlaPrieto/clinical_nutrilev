import { Component, input, output, computed, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../../shared/components/atoms/icon/icon';
import { Patient, PatientProgress } from '@shared/models/interfaces';
import { Appointment } from '../../../../services/appointment.service';

export interface PackageSessionItem {
  sessionNumber: number;
  status: 'completed' | 'scheduled' | 'pending';
  dateLabel: string;
  badgeText: string;
  summary: string;
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

  totalPlanCitas = computed(() => Number(this.patient()?.plan_citas || 0));
  completedPlanCitas = computed(() => Number(this.patient()?.plan_citas_completadas || 0));
  remainingPlanCitas = computed(() => Math.max(0, this.totalPlanCitas() - this.completedPlanCitas()));
  isPackageCompleted = computed(() => this.totalPlanCitas() > 0 && this.completedPlanCitas() >= this.totalPlanCitas());

  sessionsTimeline = computed<PackageSessionItem[]>(() => {
    const total = this.totalPlanCitas();
    if (total <= 0) return [];

    const completedCount = this.completedPlanCitas();
    const history = [...this.progressHistory()];
    // Si el historial viene del más reciente al más antiguo, invertimos los N completados
    const completedProgress = history.slice(0, completedCount).reverse();

    const hasNext = this.nextAppointment()?.hasAppointment && this.nextAppointment()?.status !== 'cancelled';
    const items: PackageSessionItem[] = [];

    for (let i = 1; i <= total; i++) {
      if (i <= completedCount) {
        const prog = completedProgress[i - 1];
        let dateStr = 'Asistió';
        if (prog) {
          const rawDate = prog.date || (prog as any).created_at;
          if (rawDate) {
            try {
              const d = new Date(rawDate);
              dateStr = d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
            } catch (e) {
              dateStr = String(rawDate);
            }
          }
        }
        items.push({
          sessionNumber: i,
          status: 'completed',
          dateLabel: dateStr,
          badgeText: 'Asistió ✅',
          summary: prog?.weight ? `Peso: ${prog.weight} kg` : (i === 1 ? 'Consulta Inicial' : 'Seguimiento completado'),
          weight: prog?.weight
        });
      } else if (i === completedCount + 1 && hasNext) {
        items.push({
          sessionNumber: i,
          status: 'scheduled',
          dateLabel: this.appointmentDateStr() || 'Próxima cita agendada',
          badgeText: this.nextAppointment()?.status === 'confirmed' ? 'Confirmada 🟡' : 'Por confirmar 🟡',
          summary: 'Próxima consulta en agenda'
        });
      } else {
        items.push({
          sessionNumber: i,
          status: 'pending',
          dateLabel: 'Por agendar',
          badgeText: 'Disponible ⚪',
          summary: 'Sesión restante'
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
