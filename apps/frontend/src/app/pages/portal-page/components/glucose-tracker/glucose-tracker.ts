import { Component, input, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../shared/components/atoms/icon/icon';
import { PatientService } from '../../../../services/patient';
import { ToastService } from '../../../../shared/services/toast.service';
import { PatientGlucoseLog, GlucoseContext } from '@shared/models/interfaces';

export interface GlucoseStatusInfo {
  status: 'hypo' | 'normal' | 'elevated' | 'high';
  label: string;
  badgeClass: string;
  bgCardClass: string;
  icon: string;
  advice: string;
}

export function evaluateGlucose(val: number, context: GlucoseContext): GlucoseStatusInfo {
  if (val < 70) {
    return {
      status: 'hypo',
      label: 'Baja (Hipoglucemia)',
      badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
      bgCardClass: 'bg-rose-500/[0.04] border-rose-500/20',
      icon: 'warning',
      advice: '⚠️ Nivel crítico bajo (<70 mg/dL). Consume 15g de carbohidrato de rápida absorción (ej. 1/2 vaso de jugo o 3 caramelos) y reevalúa en 15 minutos.'
    };
  }

  const isPostprandial = context === 'despues_comida_2h' || context === 'despues_cena_2h';

  if (isPostprandial) {
    if (val < 140) {
      return {
        status: 'normal',
        label: 'Óptima (Postprandial)',
        badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        bgCardClass: 'bg-emerald-500/[0.04] border-emerald-500/20',
        icon: 'check_circle',
        advice: '✅ Nivel óptimo 2 horas después de alimentos (<140 mg/dL).'
      };
    } else if (val < 180) {
      return {
        status: 'elevated',
        label: 'Moderadamente Elevada',
        badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        bgCardClass: 'bg-amber-500/[0.04] border-amber-500/20',
        icon: 'info',
        advice: '🟡 Ligera elevación postprandial. Realizar una caminata de 10-15 minutos ayuda a metabolizar la glucosa.'
      };
    } else {
      return {
        status: 'high',
        label: 'Alta (Hiperglucemia)',
        badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
        bgCardClass: 'bg-rose-500/[0.04] border-rose-500/20',
        icon: 'error',
        advice: '🔴 Nivel elevado (≥180 mg/dL). Mantén buena hidratación con agua pura y revisa tu consumo de porciones.'
      };
    }
  } else {
    // Ayuno o Preprandial
    if (val <= 99) {
      return {
        status: 'normal',
        label: 'Óptima (En Ayunas)',
        badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        bgCardClass: 'bg-emerald-500/[0.04] border-emerald-500/20',
        icon: 'check_circle',
        advice: '✅ Excelente nivel de glucosa en ayuno (70-99 mg/dL).'
      };
    } else if (val <= 125) {
      return {
        status: 'elevated',
        label: 'Elevada (Prediabetes/Alerta)',
        badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        bgCardClass: 'bg-amber-500/[0.04] border-amber-500/20',
        icon: 'info',
        advice: '🟡 Nivel en ayuno ligeramente elevado (100-125 mg/dL). Sigue las indicaciones del plan Nutrilev.'
      };
    } else {
      return {
        status: 'high',
        label: 'Alta (Hiperglucemia)',
        badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
        bgCardClass: 'bg-rose-500/[0.04] border-rose-500/20',
        icon: 'error',
        advice: '🔴 Glucosa alta en ayuno (≥126 mg/dL). Registra tus observaciones para comentarlas en tu consulta.'
      };
    }
  }
}

@Component({
  selector: 'app-glucose-tracker',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './glucose-tracker.html'
})
export class GlucoseTrackerComponent implements OnInit {
  patientEmail = input.required<string>();
  patientId = input<string | null>(null);

  private patientService = inject(PatientService);
  private toastService = inject(ToastService);

  logs = signal<PatientGlucoseLog[]>([]);
  loading = signal<boolean>(false);
  saving = signal<boolean>(false);
  showModal = signal<boolean>(false);

  // Form State
  inputValue = signal<number | null>(null);
  selectedContext = signal<GlucoseContext>('ayuno');
  inputNotes = signal<string>('');

  // Live status evaluation based on current input value
  currentEvaluation = computed<GlucoseStatusInfo | null>(() => {
    const val = this.inputValue();
    if (val == null || val <= 0) return null;
    return evaluateGlucose(val, this.selectedContext());
  });

  contextOptions: { key: GlucoseContext; label: string; icon: string }[] = [
    { key: 'ayuno', label: 'En Ayunas (Al despertar)', icon: 'wb_twilight' },
    { key: 'antes_comida', label: 'Antes de Comer', icon: 'restaurant' },
    { key: 'despues_comida_2h', label: '2h Después de Comer', icon: 'timer' },
    { key: 'antes_cena', label: 'Antes de Cenar', icon: 'nights_stay' },
    { key: 'despues_cena_2h', label: '2h Después de Cenar', icon: 'schedule' },
    { key: 'antes_dormir', label: 'Antes de Dormir', icon: 'bedtime' },
    { key: 'aleatorio', label: 'Aleatorio / Síntomas', icon: 'vital_signs' }
  ];

  // Stats computed
  latestLog = computed<PatientGlucoseLog | null>(() => {
    const list = this.logs();
    return list.length > 0 ? list[0] : null;
  });

  averageGlucose = computed<number | null>(() => {
    const list = this.logs();
    if (list.length === 0) return null;
    const sum = list.reduce((acc, curr) => acc + Number(curr.glucose_value), 0);
    return Math.round(sum / list.length);
  });

  latestStatus = computed<GlucoseStatusInfo | null>(() => {
    const log = this.latestLog();
    if (!log) return null;
    return evaluateGlucose(log.glucose_value, log.context);
  });

  ngOnInit() {
    this.loadLogs();
  }

  async loadLogs() {
    const email = this.patientEmail();
    if (!email) return;

    this.loading.set(true);
    try {
      const data = await this.patientService.getGlucoseLogs(email);
      this.logs.set(data || []);
    } catch (err) {
      console.error('[GlucoseTracker] Error loading glucose logs:', err);
    } finally {
      this.loading.set(false);
    }
  }

  openLogModal() {
    this.inputValue.set(null);
    this.selectedContext.set('ayuno');
    this.inputNotes.set('');
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  async submitLog() {
    const val = this.inputValue();
    const email = this.patientEmail();
    if (val == null || val <= 0 || !email) {
      this.toastService.show('Por favor ingresa una cifra de glucosa válida (mg/dL)', 'error', 3000);
      return;
    }

    this.saving.set(true);
    try {
      const newLog = await this.patientService.addGlucoseLog({
        patient_email: email,
        patient_id: this.patientId() || undefined,
        glucose_value: val,
        context: this.selectedContext(),
        notes: this.inputNotes() || undefined,
        recorded_at: new Date().toISOString()
      });

      this.logs.update(list => [newLog, ...list]);
      this.toastService.show('Toma de glucosa registrada con éxito', 'success', 3000);
      this.closeModal();
    } catch (err) {
      console.error('[GlucoseTracker] Error saving glucose log:', err);
      this.toastService.show('Error al guardar el registro. Intenta nuevamente.', 'error', 4000);
    } finally {
      this.saving.set(false);
    }
  }

  async deleteLog(id: string) {
    const email = this.patientEmail();
    if (!id || !email) return;

    try {
      await this.patientService.deleteGlucoseLog(id, email);
      this.logs.update(list => list.filter(item => item.id !== id));
      this.toastService.show('Registro eliminado', 'success', 2500);
    } catch (err) {
      console.error('[GlucoseTracker] Error deleting glucose log:', err);
      this.toastService.show('No se pudo eliminar el registro', 'error', 3000);
    }
  }

  getEvaluationFor(log: PatientGlucoseLog): GlucoseStatusInfo {
    return evaluateGlucose(log.glucose_value, log.context);
  }

  getContextLabel(key: GlucoseContext): string {
    const opt = this.contextOptions.find(o => o.key === key);
    return opt ? opt.label : key;
  }
}
