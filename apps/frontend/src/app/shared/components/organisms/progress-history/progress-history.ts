import { Component, Input, computed, signal, input, output, effect, OnDestroy, OnInit, inject, ElementRef } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { IconComponent } from '../../atoms/icon/icon';
import { ButtonComponent } from '../../atoms/button/button';
import { ProgressAnalyticCardComponent } from '../progress-analytic-card/progress-analytic-card';
import { toBlob } from 'html-to-image';
import { ThemeService } from '../../../services/theme.service';
import { PatientService } from '../../../../services/patient';
import { FormsModule } from '@angular/forms';

import { PortalModule } from '@angular/cdk/portal';

@Component({
  selector: 'app-progress-history',
  standalone: true,
  imports: [
    CommonModule, 
    DecimalPipe, 
    DatePipe, 
    IconComponent, 
    ButtonComponent,
    ProgressAnalyticCardComponent,
    FormsModule
  ],
  templateUrl: './progress-history.html'
})
export class ProgressHistoryComponent implements OnInit, OnDestroy {
  private themeService = inject(ThemeService);
  private patientService = inject(PatientService);
  private elementRef = inject(ElementRef);

  history = input.required<any[]>();
  patient = input<any>(null);
  showActions = input<boolean>(false);

  viewMode = signal<'cards' | 'table'>('table');
  selectedRecordForDetail = signal<any | null>(null);
  copyingRecordId = signal<string | null>(null);
  toast = signal<{ message: string; type: 'success' | 'error' | null }>({ message: '', type: null });

  isEditing = signal<boolean>(false);
  editableRecord = signal<any | null>(null);
  progressUpdated = output<void>();
  deleteRequested = output<any>();

  visibleCount = signal<number>(6);

  loadMore() {
    this.visibleCount.update(c => c + 6);
  }

  deleteRecord(record: any, event: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.deleteRequested.emit(record);
  }

  deleteRecordFromDetail(record: any) {
    this.deleteRecord(record, null as any);
  }

  startEdit(record: any) {
    this.editableRecord.set({ ...record });
    this.isEditing.set(true);
  }

  cancelEdit() {
    this.isEditing.set(false);
    this.editableRecord.set(null);
  }

  updateEditableField(key: string, value: any) {
    const current = this.editableRecord();
    if (current) {
      this.editableRecord.set({
        ...current,
        [key]: value
      });
    }
  }

  closeModal() {
    this.selectedRecordForDetail.set(null);
    this.isEditing.set(false);
    this.editableRecord.set(null);

    // Scroll host element into view after DOM has updated to show the list and sibling forms
    setTimeout(() => {
      this.elementRef.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  async saveEdit() {
    const record = this.editableRecord();
    if (!record || !record.id) return;

    if (!record.weight || isNaN(Number(record.weight))) {
      this.toast.set({ message: 'El peso es requerido y debe ser un número', type: 'error' });
      setTimeout(() => this.toast.set({ message: '', type: null }), 3000);
      return;
    }

    try {
      const whitelistedKeys = [
        'patient_email', 'date', 'weight', 'body_fat', 'muscle_mass',
        'agua_corporal', 'proteinas', 'minerales', 'masa_grasa', 'masa_magra', 'imc',
        'brazo_der_grasa', 'brazo_der_musculo', 'brazo_der_cm',
        'brazo_izq_grasa', 'brazo_izq_musculo', 'brazo_izq_cm',
        'tronco_grasa', 'tronco_musculo',
        'pierna_der_grasa', 'pierna_der_musculo', 'pierna_der_cm',
        'pierna_izq_grasa', 'pierna_izq_musculo', 'pierna_izq_cm',
        'icc', 'gv', 'abdomen', 'cintura', 'cadera', 'edad_metabolica',
        'presion_arterial', 'pulso', 'pliegue_cutaneo', 'notes', 'numero_cita'
      ];
      
      const payload: any = {};
      whitelistedKeys.forEach(key => {
        if (record[key] !== undefined) {
          payload[key] = record[key];
        }
      });

      const recordId = record.id;

      // Clean up fields: convert empty strings to null, and make sure numbers are numbers
      Object.keys(payload).forEach(key => {
        if (payload[key] === '') {
          payload[key] = null;
        } else if (key !== 'presion_arterial' && key !== 'notes' && key !== 'date' && key !== 'patient_email') {
          if (payload[key] !== null && payload[key] !== undefined) {
            const num = Number(payload[key]);
            payload[key] = isNaN(num) ? null : num;
          }
        }
      });

      // Call service to update progress entry on DB or Mock
      await this.patientService.updateProgressEntry(recordId, payload);

      this.toast.set({ message: 'Registro actualizado con éxito', type: 'success' });
      setTimeout(() => this.toast.set({ message: '', type: null }), 3000);

      this.isEditing.set(false);
      this.editableRecord.set(null);
      
      // Restore ID for selected record detail display
      payload.id = recordId;
      this.selectedRecordForDetail.set(payload);

      this.progressUpdated.emit();
    } catch (err: any) {
      console.error('Error saving progress update:', err);
      let errMsg = 'Error al guardar los cambios';
      if (err && err.error && err.error.message) {
        if (Array.isArray(err.error.message)) {
          errMsg = err.error.message.join(', ');
        } else if (typeof err.error.message === 'string') {
          errMsg = err.error.message;
        }
      }
      this.toast.set({ message: errMsg, type: 'error' });
      setTimeout(() => this.toast.set({ message: '', type: null }), 4000);
    }
  }

  ngOnInit() {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      this.viewMode.set('cards');
    } else {
      this.viewMode.set('table');
    }
  }

  constructor() {
    effect(() => {
      const selected = this.selectedRecordForDetail();
      if (selected) {
        document.body.classList.add('modal-open');
        // Scroll host element into view so the detail starts at the top
        setTimeout(() => {
          this.elementRef.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
      } else {
        document.body.classList.remove('modal-open');
      }
    });
  }

  ngOnDestroy() {
    document.body.classList.remove('modal-open');
  }

  toNumber(val: any): number {
    return Number(val);
  }

  calculateDelta(current: any, previous: any, field: string): number | null {
    if (current === null || current === undefined || previous === null || previous === undefined) return null;
    
    const currVal = Number(current[field]);
    const prevVal = Number(previous[field]);

    if (isNaN(currVal) || isNaN(prevVal)) return null;
    
    return currVal - prevVal;
  }

  getDeltaColor(delta: number, field: string, type: 'text' | 'bg' = 'text'): string {
    if (delta === 0) return type === 'text' ? 'text-slate-400' : 'bg-slate-100 dark:bg-white/5';
    
    const positiveIsGoodFields = [
      'muscle_mass', 'masa_magra', 'proteinas', 'agua_corporal', 'minerales',
      'brazo_der_musculo', 'brazo_izq_musculo', 'tronco_musculo', 'pierna_der_musculo', 'pierna_izq_musculo'
    ];
    const negativeIsGoodFields = [
      'weight', 'body_fat', 'gv', 'masa_grasa', 'imc', 'cintura', 'abdomen', 'cadera',
      'brazo_der_grasa', 'brazo_izq_grasa', 'tronco_grasa', 'pierna_der_grasa', 'pierna_izq_grasa',
      'icc', 'edad_metabolica', 'pliegue_cutaneo'
    ];

    let isGood = false;
    if (positiveIsGoodFields.includes(field)) {
      isGood = delta > 0;
    } else if (negativeIsGoodFields.includes(field)) {
      isGood = delta < 0;
    } else {
      return type === 'text' ? 'text-nutri-rose' : 'bg-nutri-rose/5';
    }
    
    if (type === 'text') {
      return isGood ? 'text-emerald-500' : 'text-rose-500';
    } else {
      return isGood ? 'bg-emerald-500/10 dark:bg-emerald-500/20' : 'bg-rose-500/10 dark:bg-rose-500/20';
    }
  }

  hasValue(val: any): boolean {
    return val !== null && val !== undefined && val !== '';
  }

  hasGroupFields(record: any, fields: any[]): boolean {
    if (!record) return false;
    return fields.some(f => record[f.key] !== null && record[f.key] !== undefined && record[f.key] !== '');
  }

  getPreviousRecord(record: any): any | null {
    const history = this.history();
    const index = history.findIndex(r => r.id === record.id || (r.date === record.date && r.weight === record.weight));
    return index !== -1 && index < history.length - 1 ? history[index + 1] : null;
  }

  async copyProgressAsImage(entry: any, elementContainer: HTMLElement) {
    if (!elementContainer) return;
    
    const originalDisplay = elementContainer.style.display;
    elementContainer.style.display = 'block';
    this.copyingRecordId.set(entry.id || entry.date);

    let targetElement: HTMLElement | null = null;
    try {
      targetElement = elementContainer.querySelector('.progress-analytic-card-container') as HTMLElement;
      if (!targetElement) throw new Error('Target element not found');

      // Add temporary class to make SVG and text sharp/opaque during copying
      targetElement.classList.add('is-copying-image');

      await new Promise(resolve => setTimeout(resolve, 100));

      const activeTheme = this.themeService.theme();
      const bgColor = activeTheme === 'dark' ? '#080808' : 
                      activeTheme === 'purple' ? '#fcfbff' : 
                      activeTheme === 'vibrant' ? '#fdfffd' : '#ffffff';

      const blob = await toBlob(targetElement, {
        quality: 1,
        pixelRatio: 2.5, // Slightly higher ratio for crisper text/numbers
        backgroundColor: bgColor,
        skipFonts: true,
        style: {
          transform: 'none',
          borderRadius: '0',
          boxShadow: 'none'
        }
      });
      
      if (!blob) throw new Error('Failed to generate image blob');
      
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blob
        })
      ]);
      
      this.toast.set({ message: '¡Copiado con éxito!', type: 'success' });
      setTimeout(() => this.toast.set({ message: '', type: null }), 3000);
      
    } catch (err) {
      console.error('Error copying image:', err);
      this.toast.set({ message: 'Error al copiar la imagen', type: 'error' });
      setTimeout(() => this.toast.set({ message: '', type: null }), 3000);
    } finally {
      if (targetElement) {
        targetElement.classList.remove('is-copying-image');
      }
      elementContainer.style.display = originalDisplay;
      this.copyingRecordId.set(null);
    }
  }
}
