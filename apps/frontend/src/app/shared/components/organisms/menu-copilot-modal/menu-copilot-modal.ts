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
  weeklyDisplayMode = signal<'tabs' | 'all'>('tabs');
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
    const data = this.copilotData();
    if (!data) return this.selectedFormat() === 'semanal';
    return data.format_type === 'semanal' || (!!data.days && data.days.length > 0);
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

  onFormatChange(format: 'auto' | 'equivalencias' | 'semanal') {
    this.selectedFormat.set(format);
  }

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

    const plainText = data.formatted_clipboard_text || this.buildPlanPlainText(data);
    const htmlText = this.buildPlanHtmlTable(data);
    this.executeCopy(plainText, htmlText, 'full_plan', 'Plan completo copiado (Tabla para Word)');
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

    const htmlText = this.buildMenuHtmlTable(menu);
    this.executeCopy(text, htmlText, `menu_${menu.id}`, `Menú "${menu.title}" copiado (Tabla para Word)`);
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

    const htmlText = this.buildDayHtmlTable(day);
    this.executeCopy(text, htmlText, `day_${day.id}`, `Menú de "${day.day_name}" copiado (Tabla para Word)`);
  }

  copyMeal(mealName: string, dish?: any) {
    if (!dish) return;
    let text = `🍽️ ${mealName.toUpperCase()}: ${dish.platillo}\n`;
    text += `Ingredientes:\n• ${dish.ingredientes.join('\n• ')}\n`;
    if (dish.preparacion_rapida) {
      text += `Preparación: ${dish.preparacion_rapida}\n`;
    }
    const htmlText = this.buildMealHtmlTable(mealName, dish);
    this.executeCopy(text, htmlText, mealName, `${mealName} copiado (Tabla para Word)`);
  }

  private buildPlanHtmlTable(data: MenuCopilotResponse): string {
    const isWeekly = data.format_type === 'semanal' || (!!data.days && data.days.length > 0);
    let html = `
    <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.4;">
      <div style="padding: 10px 0; border-bottom: 2px solid #0f172a; font-family: Arial, sans-serif; margin-bottom: 10px;">
        <h2 style="margin: 0; font-size: 14px; font-weight: bold; text-transform: uppercase; color: #0f172a; letter-spacing: 0.5px;">
          NUTRILEV · PROPUESTA DE MENÚ CLÍNICO PERSONALIZADO
        </h2>
        <p style="margin: 4px 0 0 0; font-size: 11px; color: #475569;">
          Paciente: <strong>${this.escapeHtml(this.patient()?.nombre || 'Paciente')}</strong> | 
          Objetivo: <strong>${data.clinical_analysis?.macro_distribution?.calories || this.targetCalories()} kcal</strong> | 
          Formato: <strong>${isWeekly ? 'Plan Semanal (7 Días)' : 'Equivalencias (3 Opciones)'}</strong>
        </p>
      </div>
    `;

    if (isWeekly && data.days && data.days.length > 0) {
      const dayCount = data.days.length;
      const colWidth = Math.floor(84 / dayCount);

      html += `
      <table border="1" cellpadding="6" cellspacing="0" style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 11px; border: 1px solid #cbd5e1; background-color: #ffffff;">
        <thead>
          <tr style="background-color: #f8fafc; color: #0f172a;">
            <th style="padding: 8px 6px; border: 1px solid #cbd5e1; width: 16%; text-align: center; font-size: 11px; font-weight: bold; text-transform: uppercase;">TIEMPO DE COMIDA</th>
      `;

      data.days.forEach((d) => {
        html += `
            <th style="padding: 8px 6px; border: 1px solid #cbd5e1; width: ${colWidth}%; text-align: left; font-size: 11px; font-weight: bold; text-transform: uppercase;">
              ${this.escapeHtml(d.day_name.toUpperCase())}
            </th>
        `;
      });

      html += `
          </tr>
        </thead>
        <tbody>
      `;

      const meals = [
        { label: 'DESAYUNO', key: 'desayuno' },
        { label: 'COLACIÓN MATUTINA', key: 'colacion_matutina' },
        { label: 'COMIDA', key: 'comida' },
        { label: 'COLACIÓN VESPERTINA', key: 'colacion_vespertina' },
        { label: 'CENA', key: 'cena' }
      ];

      meals.forEach((meal) => {
        const hasMeal = data.days!.some((d: any) => !!d[meal.key]);
        if (!hasMeal) return;

        html += `
          <tr>
            <td style="background-color: #f8fafc; color: #0f172a; font-weight: bold; text-align: center; vertical-align: top; padding: 8px 6px; border: 1px solid #cbd5e1; font-size: 11px;">
              ${meal.label}
            </td>
        `;

        data.days!.forEach((d: any) => {
          html += `
            <td style="vertical-align: top; padding: 8px 6px; border: 1px solid #cbd5e1; font-size: 11px;">${this.formatMealCellHtml(d[meal.key])}</td>
          `;
        });

        html += `
          </tr>
        `;
      });

      html += `
        </tbody>
      </table>
      `;
    } else if (data.menus && data.menus.length > 0) {
      const optionCount = data.menus.length;
      const colWidth = Math.floor(82 / optionCount);

      html += `
      <table border="1" cellpadding="6" cellspacing="0" style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 11px; border: 1px solid #cbd5e1; background-color: #ffffff;">
        <thead>
          <tr style="background-color: #f8fafc; color: #0f172a;">
            <th style="padding: 8px 6px; border: 1px solid #cbd5e1; width: 18%; text-align: center; font-size: 11px; font-weight: bold; text-transform: uppercase;">TIEMPO DE COMIDA</th>
      `;

      data.menus.forEach((m, idx) => {
        html += `
            <th style="padding: 8px 6px; border: 1px solid #cbd5e1; width: ${colWidth}%; text-align: left; font-size: 11px; font-weight: bold; text-transform: uppercase;">
              ${this.escapeHtml((m.title || `Opción ${idx + 1}`).toUpperCase())}
            </th>
        `;
      });

      html += `
          </tr>
        </thead>
        <tbody>
      `;

      const meals = [
        { label: 'DESAYUNO', key: 'desayuno' },
        { label: 'COLACIÓN MATUTINA', key: 'colacion_matutina' },
        { label: 'COMIDA', key: 'comida' },
        { label: 'COLACIÓN VESPERTINA', key: 'colacion_vespertina' },
        { label: 'CENA', key: 'cena' }
      ];

      meals.forEach((meal) => {
        const hasMeal = data.menus!.some((m: any) => !!m[meal.key]);
        if (!hasMeal) return;

        html += `
          <tr>
            <td style="background-color: #f8fafc; color: #0f172a; font-weight: bold; text-align: center; vertical-align: top; padding: 8px 6px; border: 1px solid #cbd5e1; font-size: 11px;">
              ${meal.label}
            </td>
        `;

        data.menus!.forEach((m: any) => {
          html += `
            <td style="vertical-align: top; padding: 8px 6px; border: 1px solid #cbd5e1; font-size: 11px;">${this.formatMealCellHtml(m[meal.key])}</td>
          `;
        });

        html += `
          </tr>
        `;
      });

      html += `
        </tbody>
      </table>
      `;
    }

    html += `</div>`;
    return html;
  }

  private buildDayHtmlTable(day: MenuCopilotDay): string {
    let html = `
    <div style="font-family: Arial, sans-serif; color: #0f172a; max-width: 750px; line-height: 1.4;">
      <div style="padding: 8px 0; border-bottom: 2px solid #0f172a; font-weight: bold; font-size: 13px; margin-bottom: 8px;">
        MENÚ DEL DÍA: ${this.escapeHtml(day.day_name.toUpperCase())}
      </div>
      <table border="1" cellpadding="6" cellspacing="0" style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 11px; border: 1px solid #cbd5e1; background-color: #ffffff;">
        <thead>
          <tr style="background-color: #f8fafc; color: #0f172a;">
            <th style="padding: 8px 6px; border: 1px solid #cbd5e1; width: 25%; text-align: left; font-size: 11px; font-weight: bold;">TIEMPO DE COMIDA</th>
            <th style="padding: 8px 6px; border: 1px solid #cbd5e1; width: 75%; text-align: left; font-size: 11px; font-weight: bold;">PLATILLO E INGREDIENTES</th>
          </tr>
        </thead>
        <tbody>
    `;

    const meals = [
      { label: 'DESAYUNO', dish: day.desayuno },
      { label: 'COLACIÓN MATUTINA', dish: day.colacion_matutina },
      { label: 'COMIDA', dish: day.comida },
      { label: 'COLACIÓN VESPERTINA', dish: day.colacion_vespertina },
      { label: 'CENA', dish: day.cena }
    ];

    meals.forEach((m) => {
      if (m.dish) {
        html += `
          <tr>
            <td style="background-color: #f8fafc; color: #0f172a; font-weight: bold; vertical-align: top; padding: 8px 6px; border: 1px solid #cbd5e1; font-size: 11px;">${m.label}</td>
            <td style="vertical-align: top; padding: 8px 6px; border: 1px solid #cbd5e1; font-size: 11px;">${this.formatMealCellHtml(m.dish)}</td>
          </tr>
        `;
      }
    });

    html += `
        </tbody>
      </table>
    </div>
    `;
    return html;
  }

  private buildMenuHtmlTable(menu: MenuCopilotOption): string {
    let html = `
    <div style="font-family: Arial, sans-serif; color: #0f172a; max-width: 750px; line-height: 1.4;">
      <div style="padding: 8px 0; border-bottom: 2px solid #0f172a; font-weight: bold; font-size: 13px; margin-bottom: 8px;">
        ${this.escapeHtml(menu.title.toUpperCase())}
      </div>
      <table border="1" cellpadding="6" cellspacing="0" style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 11px; border: 1px solid #cbd5e1; background-color: #ffffff;">
        <thead>
          <tr style="background-color: #f8fafc; color: #0f172a;">
            <th style="padding: 8px 6px; border: 1px solid #cbd5e1; width: 25%; text-align: left; font-size: 11px; font-weight: bold;">TIEMPO DE COMIDA</th>
            <th style="padding: 8px 6px; border: 1px solid #cbd5e1; width: 75%; text-align: left; font-size: 11px; font-weight: bold;">PLATILLO E INGREDIENTES</th>
          </tr>
        </thead>
        <tbody>
    `;

    const meals = [
      { label: 'DESAYUNO', dish: menu.desayuno },
      { label: 'COLACIÓN MATUTINA', dish: menu.colacion_matutina },
      { label: 'COMIDA', dish: menu.comida },
      { label: 'COLACIÓN VESPERTINA', dish: menu.colacion_vespertina },
      { label: 'CENA', dish: menu.cena }
    ];

    meals.forEach((m) => {
      if (m.dish) {
        html += `
          <tr>
            <td style="background-color: #f8fafc; color: #0f172a; font-weight: bold; vertical-align: top; padding: 8px 6px; border: 1px solid #cbd5e1; font-size: 11px;">${m.label}</td>
            <td style="vertical-align: top; padding: 8px 6px; border: 1px solid #cbd5e1; font-size: 11px;">${this.formatMealCellHtml(m.dish)}</td>
          </tr>
        `;
      }
    });

    html += `
        </tbody>
      </table>
    </div>
    `;
    return html;
  }

  private buildMealHtmlTable(mealName: string, dish: any): string {
    return `
    <div style="font-family: Arial, sans-serif; color: #0f172a; max-width: 500px; line-height: 1.4;">
      <table border="1" cellpadding="6" cellspacing="0" style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 11px; border: 1px solid #cbd5e1; background-color: #ffffff;">
        <thead>
          <tr style="background-color: #f8fafc; color: #0f172a;">
            <th style="padding: 8px 6px; border: 1px solid #cbd5e1; text-align: left; font-size: 12px; font-weight: bold;">${this.escapeHtml(mealName.toUpperCase())}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 8px 6px; border: 1px solid #cbd5e1;">
              ${this.formatMealCellHtml(dish)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    `;
  }

  private formatMealCellHtml(dish: any): string {
    if (!dish || !dish.platillo) return '<span style="color: #94a3b8; font-style: italic;">Sin platillo asignado</span>';
    
    let html = `<div style="font-weight: bold; color: #0f172a; margin-bottom: 3px; font-size: 11px;">${this.escapeHtml(dish.platillo)}</div>`;
    
    if (dish.ingredientes && dish.ingredientes.length > 0) {
      const cleanIngs = dish.ingredientes
        .map((ing: string) => this.escapeHtml(ing.replace(/^[•\-\*\s]+/, '')))
        .join('<br/>');
      html += `<div style="color: #334155; font-size: 10.5px; line-height: 1.3; margin-bottom: 3px;">${cleanIngs}</div>`;
    }
    
    if (dish.preparacion_rapida) {
      html += `<div style="font-style: italic; color: #64748b; font-size: 9.5px; margin-top: 3px; border-top: 1px dashed #cbd5e1; padding-top: 2px;">💡 ${this.escapeHtml(dish.preparacion_rapida)}</div>`;
    }
    
    return html;
  }

  private escapeHtml(str: string): string {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private buildPlanPlainText(data: MenuCopilotResponse): string {
    let out = `NUTRILEV · PROPUESTA DE MENÚ CLÍNICO PERSONALIZADO\n`;
    out += `Paciente: ${this.patient()?.nombre || 'Paciente'} | Objetivo: ${data.clinical_analysis?.macro_distribution?.calories || this.targetCalories()} kcal\n`;
    out += `Formato: ${data.format_type === 'semanal' ? 'Plan Semanal (7 Días)' : 'Equivalencias (3 Opciones)'}\n`;
    out += `-------------------------------------------------------\n\n`;

    if (data.days && data.days.length > 0) {
      data.days.forEach((d) => {
        out += `${d.day_name.toUpperCase()}\n`;
        out += `-------------------------------------------------------\n`;
        if (d.desayuno) out += `DESAYUNO: ${d.desayuno.platillo}\n${d.desayuno.ingredientes.map(i => i.replace(/^[•\-\*\s]+/, '')).join('\n')}\n\n`;
        if (d.colacion_matutina) out += `COLACIÓN 1: ${d.colacion_matutina.platillo}\n${d.colacion_matutina.ingredientes.map(i => i.replace(/^[•\-\*\s]+/, '')).join('\n')}\n\n`;
        if (d.comida) out += `COMIDA: ${d.comida.platillo}\n${d.comida.ingredientes.map(i => i.replace(/^[•\-\*\s]+/, '')).join('\n')}\n\n`;
        if (d.colacion_vespertina) out += `COLACIÓN 2: ${d.colacion_vespertina.platillo}\n${d.colacion_vespertina.ingredientes.map(i => i.replace(/^[•\-\*\s]+/, '')).join('\n')}\n\n`;
        if (d.cena) out += `CENA: ${d.cena.platillo}\n${d.cena.ingredientes.map(i => i.replace(/^[•\-\*\s]+/, '')).join('\n')}\n\n`;
      });
    } else if (data.menus && data.menus.length > 0) {
      data.menus.forEach((m, idx) => {
        out += `OPCIÓN ${idx + 1}: ${m.title}\n`;
        out += `-------------------------------------------------------\n`;
        if (m.desayuno) out += `OPCIÓN ${idx + 1} - DESAYUNO: ${m.desayuno.platillo}\n${m.desayuno.ingredientes.map(i => i.replace(/^[•\-\*\s]+/, '')).join('\n')}\n\n`;
        if (m.colacion_matutina) out += `OPCIÓN ${idx + 1} - COLACIÓN 1: ${m.colacion_matutina.platillo}\n${m.colacion_matutina.ingredientes.map(i => i.replace(/^[•\-\*\s]+/, '')).join('\n')}\n\n`;
        if (m.comida) out += `OPCIÓN ${idx + 1} - COMIDA: ${m.comida.platillo}\n${m.comida.ingredientes.map(i => i.replace(/^[•\-\*\s]+/, '')).join('\n')}\n\n`;
        if (m.colacion_vespertina) out += `OPCIÓN ${idx + 1} - COLACIÓN 2: ${m.colacion_vespertina.platillo}\n${m.colacion_vespertina.ingredientes.map(i => i.replace(/^[•\-\*\s]+/, '')).join('\n')}\n\n`;
        if (m.cena) out += `OPCIÓN ${idx + 1} - CENA: ${m.cena.platillo}\n${m.cena.ingredientes.map(i => i.replace(/^[•\-\*\s]+/, '')).join('\n')}\n\n`;
      });
    }

    return out;
  }

  private async executeCopy(plainText: string, htmlText: string, sectionKey: string, toastMsg: string) {
    try {
      if (navigator.clipboard && (window as any).ClipboardItem) {
        const textBlob = new Blob([plainText], { type: 'text/plain' });
        const htmlBlob = new Blob([htmlText], { type: 'text/html' });
        const item = new (window as any).ClipboardItem({
          'text/plain': textBlob,
          'text/html': htmlBlob,
        });
        await navigator.clipboard.write([item]);
      } else {
        await navigator.clipboard.writeText(plainText);
      }
      this.copiedSection.set(sectionKey);
      this.toastService.show(toastMsg, 'success', 3000);
      setTimeout(() => {
        if (this.copiedSection() === sectionKey) {
          this.copiedSection.set(null);
        }
      }, 2500);
    } catch (err) {
      console.error('Error al copiar con ClipboardItem:', err);
      try {
        await navigator.clipboard.writeText(plainText);
        this.copiedSection.set(sectionKey);
        this.toastService.show(toastMsg, 'success', 3000);
      } catch (e) {
        this.toastService.show('No se pudo copiar automáticamente. Copia el texto manualmente.', 'error', 4000);
      }
    }
  }

  closeModal() {
    this.closed.emit();
  }
}
