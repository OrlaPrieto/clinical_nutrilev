import { Component, input, output, signal, computed, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../atoms/icon/icon';
import { ToastService } from '../../../../shared/services/toast.service';
import { PatientService } from '../../../../services/patient';
import { MenuCopilotResponse, MenuCopilotOption, MenuCopilotDay, PatientProgress } from '@shared/models/interfaces';

@Component({
  selector: 'app-o-menu-copilot-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IconComponent
  ],
  templateUrl: './menu-copilot-modal.html',
  styleUrl: './menu-copilot-modal.scss'
})
export class MenuCopilotModalComponent {
  patient = input<any | null>(null);
  progressHistory = input<PatientProgress[]>([]);
  isOpen = input<boolean>(false);
  closed = output<void>();

  private patientService = inject(PatientService);
  private toastService = inject(ToastService);

  // Form & Execution state
  targetCalories = signal<number>(1800);
  extraNotes = signal<string>('');
  selectedFormat = signal<'auto' | 'equivalencias' | 'semanal'>('auto');
  isLoading = signal<boolean>(false);
  isPreloadedFromDb = signal<boolean>(false);
  copilotData = signal<MenuCopilotResponse | null>(null);
  activeMenuIndex = signal<number>(0);
  activeDayIndex = signal<number>(0);
  activeViewTab = signal<'visual' | 'plaintext'>('visual');
  copiedSection = signal<string | null>(null);

  constructor() {
    // Auto-load saved suggestion from DB on modal opening
    effect(() => {
      const open = this.isOpen();
      const p = this.patient();
      if (open && p?.email && !this.copilotData()) {
        this.loadPrecalculatedSuggestion(p.email);
      }
    });
  }

  // Analysis context computed
  prevProgress = computed<PatientProgress | null>(() => {
    const list = this.progressHistory();
    return list && list.length > 1 ? list[1] : null;
  });

  latestProgress = computed<PatientProgress | null>(() => {
    const list = this.progressHistory();
    return list && list.length > 0 ? list[0] : null;
  });

  deltaWeight = computed<string>(() => {
    const prev = this.prevProgress();
    const curr = this.latestProgress();
    if (!prev || !curr || prev.weight == null || curr.weight == null) return '';
    const diff = Number(curr.weight) - Number(prev.weight);
    return diff > 0 ? `+${diff.toFixed(1)} kg` : `${diff.toFixed(1)} kg`;
  });

  deltaFat = computed<string>(() => {
    const prev = this.prevProgress();
    const curr = this.latestProgress();
    const prevFat = prev?.body_fat ?? (prev as any)?.pct_grasa;
    const currFat = curr?.body_fat ?? (curr as any)?.pct_grasa;
    if (prevFat == null || currFat == null) return '';
    const diff = Number(currFat) - Number(prevFat);
    return diff > 0 ? `+${diff.toFixed(1)}%` : `${diff.toFixed(1)}%`;
  });

  deltaMuscle = computed<string>(() => {
    const prev = this.prevProgress();
    const curr = this.latestProgress();
    if (!prev || !curr || prev.muscle_mass == null || curr.muscle_mass == null) return '';
    const diff = Number(curr.muscle_mass) - Number(prev.muscle_mass);
    return diff > 0 ? `+${diff.toFixed(1)} kg` : `${diff.toFixed(1)} kg`;
  });

  isWeekly = computed<boolean>(() => {
    return this.copilotData()?.format_type === 'semanal';
  });

  activeMenu = computed<MenuCopilotOption | null>(() => {
    const data = this.copilotData();
    if (!data || !data.menus || data.menus.length === 0) return null;
    const idx = this.activeMenuIndex();
    return data.menus[idx] || data.menus[0];
  });

  activeDay = computed<MenuCopilotDay | null>(() => {
    const data = this.copilotData();
    if (!data || !data.days || data.days.length === 0) return null;
    const idx = this.activeDayIndex();
    return data.days[idx] || data.days[0];
  });

  async loadPrecalculatedSuggestion(email: string) {
    try {
      const cached = await this.patientService.getCopilotSuggestion(email);
      if (cached && (cached.menus || cached.days)) {
        this.copilotData.set(cached);
        this.isPreloadedFromDb.set(true);
        if (cached.clinical_analysis?.macro_distribution?.calories) {
          this.targetCalories.set(cached.clinical_analysis.macro_distribution.calories);
        }
        if (cached.format_type) {
          this.selectedFormat.set(cached.format_type);
        }
      }
    } catch (e) {
      console.warn('[MenuCopilotModal] No cached suggestion found in DB:', e);
    }
  }

  async generateSuggestion() {
    const p = this.patient();
    if (!p) return;

    this.isLoading.set(true);
    this.isPreloadedFromDb.set(false);
    try {
      const response = await this.patientService.suggestMenuCopilot({
        patient_context: p,
        prev_progress: this.prevProgress() || undefined,
        latest_progress: this.latestProgress() || undefined,
        previous_menu_summary: p.menu_url || (p.current_menus && p.current_menus.length > 0 ? p.current_menus[0].name : ''),
        calories: this.targetCalories(),
        extra_notes: this.extraNotes(),
        menu_format: this.selectedFormat()
      });

      if (response && response.success && response.data) {
        this.copilotData.set(response.data);
        this.activeMenuIndex.set(0);
        this.activeDayIndex.set(0);
        this.toastService.show('Propuesta clínica generada con éxito', 'success', 3500);
      } else {
        throw new Error('Respuesta inválida del servicio');
      }
    } catch (err: any) {
      console.error('[MenuCopilot] Error generando propuesta:', err);
      this.toastService.show('Error al generar la propuesta. Intenta nuevamente.', 'error', 4500);
    } finally {
      this.isLoading.set(false);
    }
  }

  copyFullPlan() {
    const data = this.copilotData();
    if (!data) return;

    const textToCopy = data.formatted_clipboard_text || this.buildPlanPlainText(data);
    this.executeCopy(textToCopy, 'full_plan', 'Plan completo copiado al portapapeles');
  }

  copyActiveMenu() {
    const menu = this.activeMenu();
    if (!menu) return;

    let text = `═══════════════════════════════════\n`;
    text += `🥗 ${menu.title.toUpperCase()}\n`;
    text += `═══════════════════════════════════\n\n`;

    if (menu.desayuno) {
      text += `🍳 DESAYUNO:\n• Platillo: ${menu.desayuno.platillo}\n• Ingredientes:\n  - ${menu.desayuno.ingredientes.join('\n  - ')}\n`;
      if (menu.desayuno.preparacion_rapida) text += `• Tip: ${menu.desayuno.preparacion_rapida}\n`;
      text += `\n`;
    }

    if (menu.colacion_matutina) {
      text += `🍏 COLACIÓN MATUTINA:\n• Platillo: ${menu.colacion_matutina.platillo}\n• Ingredientes:\n  - ${menu.colacion_matutina.ingredientes.join('\n  - ')}\n\n`;
    }

    if (menu.comida) {
      text += `🍲 COMIDA:\n• Platillo: ${menu.comida.platillo}\n• Ingredientes:\n  - ${menu.comida.ingredientes.join('\n  - ')}\n`;
      if (menu.comida.preparacion_rapida) text += `• Tip: ${menu.comida.preparacion_rapida}\n`;
      text += `\n`;
    }

    if (menu.colacion_vespertina) {
      text += `🫐 COLACIÓN VESPERTINA:\n• Platillo: ${menu.colacion_vespertina.platillo}\n• Ingredientes:\n  - ${menu.colacion_vespertina.ingredientes.join('\n  - ')}\n\n`;
    }

    if (menu.cena) {
      text += `🌙 CENA:\n• Platillo: ${menu.cena.platillo}\n• Ingredientes:\n  - ${menu.cena.ingredientes.join('\n  - ')}\n`;
      if (menu.cena.preparacion_rapida) text += `• Tip: ${menu.cena.preparacion_rapida}\n`;
      text += `\n`;
    }

    this.executeCopy(text, `menu_${menu.id}`, `Menú "${menu.title}" copiado al portapapeles`);
  }

  copyActiveDay() {
    const day = this.activeDay();
    if (!day) return;

    let text = `═══════════════════════════════════\n`;
    text += `📅 ${day.day_name.toUpperCase()}\n`;
    text += `═══════════════════════════════════\n\n`;

    if (day.desayuno) {
      text += `🍳 DESAYUNO: ${day.desayuno.platillo}\n• Ingredientes:\n  - ${day.desayuno.ingredientes.join('\n  - ')}\n`;
      if (day.desayuno.preparacion_rapida) text += `• Tip: ${day.desayuno.preparacion_rapida}\n`;
      text += `\n`;
    }

    if (day.colacion_matutina) {
      text += `🍏 COLACIÓN MATUTINA: ${day.colacion_matutina.platillo}\n• Ingredientes:\n  - ${day.colacion_matutina.ingredientes.join('\n  - ')}\n\n`;
    }

    if (day.comida) {
      text += `🍲 COMIDA: ${day.comida.platillo}\n• Ingredientes:\n  - ${day.comida.ingredientes.join('\n  - ')}\n`;
      if (day.comida.preparacion_rapida) text += `• Tip: ${day.comida.preparacion_rapida}\n`;
      text += `\n`;
    }

    if (day.colacion_vespertina) {
      text += `🫐 COLACIÓN VESPERTINA: ${day.colacion_vespertina.platillo}\n• Ingredientes:\n  - ${day.colacion_vespertina.ingredientes.join('\n  - ')}\n\n`;
    }

    if (day.cena) {
      text += `🌙 CENA: ${day.cena.platillo}\n• Ingredientes:\n  - ${day.cena.ingredientes.join('\n  - ')}\n`;
      if (day.cena.preparacion_rapida) text += `• Tip: ${day.cena.preparacion_rapida}\n`;
      text += `\n`;
    }

    this.executeCopy(text, `day_${day.id}`, `Menú de "${day.day_name}" copiado al portapapeles`);
  }

  copyMeal(mealName: string, dish?: any) {
    if (!dish) return;
    let text = `🍽️ ${mealName.toUpperCase()}: ${dish.platillo}\n`;
    text += `Ingredientes:\n• ${dish.ingredientes.join('\n• ')}\n`;
    if (dish.preparacion_rapida) {
      text += `Preparación: ${dish.preparacion_rapida}\n`;
    }
    this.executeCopy(text, mealName, `${mealName} copiado al portapapeles`);
  }

  private buildPlanPlainText(data: MenuCopilotResponse): string {
    let out = `NUTRILEV · PROPUESTA DE MENÚ CLÍNICO PERSONALIZADO\n`;
    out += `Paciente: ${this.patient()?.nombre || 'Paciente'} | Objetivo: ${data.clinical_analysis?.macro_distribution?.calories || this.targetCalories()} kcal\n`;
    out += `Formato: ${data.format_type === 'semanal' ? 'Plan Semanal (7 Días)' : 'Equivalencias (3 Opciones)'}\n`;
    out += `═══════════════════════════════════════════════════════\n\n`;

    if (data.days && data.days.length > 0) {
      data.days.forEach((d) => {
        out += `📅 ${d.day_name.toUpperCase()}\n`;
        out += `-------------------------------------------------------\n`;
        if (d.desayuno) out += `• DESAYUNO: ${d.desayuno.platillo}\n  ${d.desayuno.ingredientes.join(', ')}\n`;
        if (d.colacion_matutina) out += `• COLACIÓN 1: ${d.colacion_matutina.platillo}\n  ${d.colacion_matutina.ingredientes.join(', ')}\n`;
        if (d.comida) out += `• COMIDA: ${d.comida.platillo}\n  ${d.comida.ingredientes.join(', ')}\n`;
        if (d.colacion_vespertina) out += `• COLACIÓN 2: ${d.colacion_vespertina.platillo}\n  ${d.colacion_vespertina.ingredientes.join(', ')}\n`;
        if (d.cena) out += `• CENA: ${d.cena.platillo}\n  ${d.cena.ingredientes.join(', ')}\n\n`;
      });
    } else if (data.menus && data.menus.length > 0) {
      data.menus.forEach((m, idx) => {
        out += `OPCIÓN ${idx + 1}: ${m.title}\n`;
        out += `-------------------------------------------------------\n`;
        if (m.desayuno) out += `• DESAYUNO: ${m.desayuno.platillo}\n  ${m.desayuno.ingredientes.join(', ')}\n`;
        if (m.colacion_matutina) out += `• COLACIÓN 1: ${m.colacion_matutina.platillo}\n  ${m.colacion_matutina.ingredientes.join(', ')}\n`;
        if (m.comida) out += `• COMIDA: ${m.comida.platillo}\n  ${m.comida.ingredientes.join(', ')}\n`;
        if (m.colacion_vespertina) out += `• COLACIÓN 2: ${m.colacion_vespertina.platillo}\n  ${m.colacion_vespertina.ingredientes.join(', ')}\n`;
        if (m.cena) out += `• CENA: ${m.cena.platillo}\n  ${m.cena.ingredientes.join(', ')}\n\n`;
      });
    }

    return out;
  }

  private async executeCopy(text: string, sectionKey: string, toastMsg: string) {
    try {
      await navigator.clipboard.writeText(text);
      this.copiedSection.set(sectionKey);
      this.toastService.show(toastMsg, 'success', 3000);
      setTimeout(() => {
        if (this.copiedSection() === sectionKey) {
          this.copiedSection.set(null);
        }
      }, 2500);
    } catch (err) {
      console.error('Error al copiar al portapapeles:', err);
      this.toastService.show('No se pudo copiar automáticamente. Copia el texto manualmente.', 'error', 4000);
    }
  }

  closeModal() {
    this.closed.emit();
  }
}
