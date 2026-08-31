import { Component, input, output, computed, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../../shared/components/atoms/icon/icon';
import { Patient, PatientProgress } from '@shared/models/interfaces';
import { Appointment } from '../../../../services/appointment.service';
import { environment } from '../../../../../environments/environment';

export interface PackageSessionItem {
  sessionNumber: number;
  status: 'completed' | 'scheduled' | 'pending';
  dateLabel: string;
  shortDateLabel: string;
  timeLabel?: string;
  badgeText: string;
  badgeVariant: 'completed' | 'confirmed' | 'pending' | 'tentative';
  summary: string;
  isTentative: boolean;
  isNextActive?: boolean;
  weight?: string | number;
}

function getDayKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseSafeDate(raw: string | Date | null | undefined): Date | null {
  if (!raw) return null;
  if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    // Manejar formato 'YYYY-MM-DD' para evitar desfase de zona horaria UTC
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [y, m, d] = trimmed.split('-').map(Number);
      return new Date(y, m - 1, d, 12, 0, 0);
    }
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function formatTime12h(date: Date): string {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minutesStr = minutes < 10 ? '0' + minutes : minutes;
  return `${hours}:${minutesStr} ${ampm}`;
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

  progressLineWidth = computed(() => {
    const total = this.totalPlanCitas();
    const completed = this.completedPlanCitas();
    if (total <= 1) return completed > 0 ? 100 : 0;
    // Ancho porcentual que conecta hasta el nodo actual
    return Math.min(100, Math.max(0, (completed / (total - 1)) * 100));
  });

  menuDurationDays = computed(() => {
    const raw = this.patient()?.plan_duration_days;
    const val = raw != null ? Number(raw) : environment.menuDurationDays;
    return (val > 0 && val < 9999) ? val : 7;
  });

  sessionsTimeline = computed<PackageSessionItem[]>(() => {
    const total = this.totalPlanCitas();
    if (total <= 0) return [];

    const completedCount = this.completedPlanCitas();
    
    // Historial ordenado cronológicamente (más antiguo al más reciente)
    const sortedHistory = [...this.progressHistory()]
      .filter(p => p.date || (p as any).created_at)
      .sort((a, b) => {
        const da = parseSafeDate(a.date || (a as any).created_at)?.getTime() || 0;
        const db = parseSafeDate(b.date || (b as any).created_at)?.getTime() || 0;
        return da - db;
      });

    // Los 'completedCount' registros más recientes del historial corresponden al paquete activo actual:
    const activePackageHistory = sortedHistory.slice(-completedCount);

    // Mapear registros de progreso para las citas completadas del paquete actual:
    const packageProgressRecords: (PatientProgress | undefined)[] = [];
    for (let i = 1; i <= completedCount; i++) {
      // Buscar primero si en el historial del paquete activo hay un registro con numero_cita = i explícito
      const explicitProg = activePackageHistory.find(p => Number(p.numero_cita) === i);
      packageProgressRecords[i - 1] = explicitProg || activePackageHistory[i - 1];
    }

    // Obtener la fecha del día de la última cita completada para evitar que la siguiente cita tome el mismo día ya asistido
    let latestCompletedDayKey: string | null = null;
    if (completedCount > 0) {
      const lastCompletedRecord = packageProgressRecords.filter(Boolean).pop();
      const lastCompDateObj = lastCompletedRecord
        ? parseSafeDate(lastCompletedRecord.date || (lastCompletedRecord as any).created_at)
        : (parseSafeDate(this.patient()?.ultima_actualizacion) || new Date());

      if (lastCompDateObj) {
        latestCompletedDayKey = getDayKey(lastCompDateObj);
      }
    }

    const nextApt = this.nextAppointment();
    
    // Obtener lista completa de citas próximas agendadas en Google Calendar (ordenadas por fecha de inicio)
    const allUpcoming = (nextApt?.upcomingAppointments && nextApt.upcomingAppointments.length > 0)
      ? nextApt.upcomingAppointments
      : (nextApt?.hasAppointment && nextApt?.start ? [nextApt] : []);

    const validUpcoming = allUpcoming
      .filter(apt => {
        if (!apt.hasAppointment || !apt.start || apt.status === 'cancelled') return false;
        if (latestCompletedDayKey) {
          const aptDate = parseSafeDate(apt.start);
          if (aptDate) {
            const aptDayKey = getDayKey(aptDate);
            // La cita siguiente en el calendario debe ser en días posteriores a la cita completada
            if (aptDayKey <= latestCompletedDayKey) {
              return false;
            }
          }
        }
        return true;
      })
      .sort((a, b) => {
        const da = parseSafeDate(a.start)?.getTime() || 0;
        const db = parseSafeDate(b.start)?.getTime() || 0;
        return da - db;
      });

    // Determinar fecha ancla para proyectar las citas tentativas que falten agendar:
    // 1) Si hay citas agendadas en calendario, usar la fecha de la ÚLTIMA cita agendada
    // 2) Si no hay citas agendadas pero hay historial completado, usar la fecha de la última consulta completada
    // 3) Si no hay nada, usar la fecha de creación del menú o la fecha de hoy
    let lastAnchorDate: Date;
    let lastAnchorSessionIndex = completedCount;

    if (validUpcoming.length > 0) {
      lastAnchorDate = parseSafeDate(validUpcoming[validUpcoming.length - 1].start!) || new Date();
      lastAnchorSessionIndex = completedCount + validUpcoming.length;
    } else if (packageProgressRecords.filter(Boolean).length > 0) {
      const lastProg = packageProgressRecords.filter(Boolean).pop()!;
      lastAnchorDate = parseSafeDate(lastProg.date || (lastProg as any).created_at) || new Date();
      lastAnchorSessionIndex = completedCount;
    } else if (sortedHistory.length > 0) {
      const lastProg = sortedHistory[sortedHistory.length - 1];
      lastAnchorDate = parseSafeDate(lastProg.date || (lastProg as any).created_at) || new Date();
      lastAnchorSessionIndex = completedCount;
    } else if (this.patient()?.menu_created_at) {
      lastAnchorDate = parseSafeDate(this.patient()!.menu_created_at!) || new Date();
      lastAnchorSessionIndex = 0;
    } else {
      lastAnchorDate = new Date();
      lastAnchorSessionIndex = 0;
    }

    const items: PackageSessionItem[] = [];

    for (let i = 1; i <= total; i++) {
      if (i <= completedCount) {
        // Cita completada en historial
        const prog = packageProgressRecords[i - 1];
        let dateObj: Date | null = prog ? parseSafeDate(prog.date || (prog as any).created_at) : null;
        
        if (!dateObj && i === completedCount) {
          dateObj = parseSafeDate(this.patient()?.ultima_actualizacion) || new Date();
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
          badgeText: 'Asistió',
          badgeVariant: 'completed',
          summary: prog?.weight ? `Peso registrado: ${prog.weight} kg` : (i === 1 ? 'Consulta Inicial' : 'Seguimiento completado'),
          isTentative: false,
          weight: prog?.weight
        });
      } else {
        // Cita futura del paquete: revisar si ya está agendada en Google Calendar
        const upcomingIndex = i - completedCount - 1;
        if (upcomingIndex < validUpcoming.length) {
          // Sesión encontrada en Google Calendar
          const apt = validUpcoming[upcomingIndex];
          const aptDate = parseSafeDate(apt.start);
          const hasTime = apt.start ? (apt.start.includes('T') || apt.start.includes(':')) : false;
          const timeLabel = (aptDate && hasTime) ? formatTime12h(aptDate) : undefined;

          const dateLabel = (aptDate && !isNaN(aptDate.getTime()))
            ? aptDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
            : (this.appointmentDateStr() || 'Consulta agendada');
          const shortDateLabel = (aptDate && !isNaN(aptDate.getTime()))
            ? aptDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
            : 'Agendada';

          const isConfirmed = apt.status === 'confirmed';
          const isFirstNext = (i === completedCount + 1);

          items.push({
            sessionNumber: i,
            status: 'scheduled',
            dateLabel,
            shortDateLabel,
            timeLabel,
            badgeText: isConfirmed ? 'Confirmada' : 'Por confirmar',
            badgeVariant: isConfirmed ? 'confirmed' : 'pending',
            summary: isFirstNext ? 'Próxima consulta en agenda' : 'Consulta agendada en calendario',
            isTentative: false,
            isNextActive: isFirstNext
          });
        } else {
          // Citas no agendadas aún: calcular fecha tentativa proyectada a partir de la última fecha real
          const intervalDays = this.menuDurationDays();
          const stepsFromAnchor = i - lastAnchorSessionIndex;
          const daysToAdd = Math.max(1, stepsFromAnchor) * intervalDays;
          const projectedDate = new Date(lastAnchorDate);
          projectedDate.setDate(projectedDate.getDate() + daysToAdd);

          const dateLabel = projectedDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
          const shortDateLabel = `~ ${projectedDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}`;

          items.push({
            sessionNumber: i,
            status: 'pending',
            dateLabel: `${dateLabel} (Tentativa)`,
            shortDateLabel,
            badgeText: 'Tentativa',
            badgeVariant: 'tentative',
            summary: `Fecha tentativa según vigencia del menú (${intervalDays} días)`,
            isTentative: true
          });
        }
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
