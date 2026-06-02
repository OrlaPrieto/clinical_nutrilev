import { Component, Input, computed, signal, input, effect, OnDestroy } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { IconComponent } from '../../atoms/icon/icon';
import { ButtonComponent } from '../../atoms/button/button';
import { ProgressAnalyticCardComponent } from '../progress-analytic-card/progress-analytic-card';
import { toBlob } from 'html-to-image';

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
    ProgressAnalyticCardComponent
  ],
  templateUrl: './progress-history.html'
})
export class ProgressHistoryComponent implements OnDestroy {
  history = input.required<any[]>();
  patient = input<any>(null);
  showActions = input<boolean>(false);

  viewMode = signal<'cards' | 'table'>('cards');
  selectedRecordForDetail = signal<any | null>(null);
  copyingRecordId = signal<string | null>(null);

  constructor() {
    // If not showing actions (Portal mode), default to table and hide toggles
    effect(() => {
      if (!this.showActions()) {
        this.viewMode.set('table');
      }
    });

    effect(() => {
      if (this.selectedRecordForDetail()) {
        document.body.classList.add('modal-open');
      } else {
        document.body.classList.remove('modal-open');
      }
    });
  }

  ngOnDestroy() {
    document.body.classList.remove('modal-open');
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
      'muscle_mass', 'musculo_esqueletico', 'masa_magra', 'proteinas',
      'brazo_der_musculo', 'brazo_izq_musculo', 'tronco_musculo', 'pierna_der_musculo', 'pierna_izq_musculo'
    ];
    const negativeIsGoodFields = [
      'weight', 'body_fat', 'pgc', 'gv', 'masa_grasa', 'imc', 'cintura', 'abdomen', 'cadera',
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

    try {
      const targetElement = elementContainer.querySelector('.progress-analytic-card-container') as HTMLElement;
      if (!targetElement) throw new Error('Target element not found');

      await new Promise(resolve => setTimeout(resolve, 100));

      const blob = await toBlob(targetElement, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
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
      
    } catch (err) {
      console.error('Error copying image:', err);
    } finally {
      elementContainer.style.display = originalDisplay;
      this.copyingRecordId.set(null);
    }
  }
}
