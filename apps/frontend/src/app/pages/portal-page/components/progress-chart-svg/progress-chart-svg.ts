import { Component, input, signal, computed, effect, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { IconComponent } from '../../../../shared/components/atoms/icon/icon';
import { Patient, PatientProgress } from '@shared/models/interfaces';

@Component({
  selector: 'app-progress-chart-svg',
  standalone: true,
  imports: [CommonModule, IconComponent, DatePipe],
  templateUrl: './progress-chart-svg.html',
  styleUrl: './progress-chart-svg.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProgressChartSvgComponent {
  progress = input<PatientProgress[]>([]);
  patient = input<Patient | null>(null);

  // Local state signals
  activeMetrics = signal<{ weight: boolean; fat: boolean; muscle: boolean }>({
    weight: true,
    fat: false,
    muscle: false
  });
  filterMonth = signal<string>('all');
  limitRecords = signal<number>(5);
  hoveredPoint = signal<{ index: number; key: 'weight' | 'fat' | 'muscle' } | null>(null);

  constructor() {
    // Automatically initialize active metrics based on patient objective
    effect(() => {
      const p = this.patient();
      if (p) {
        const goal = p.meta_objetivo;
        this.activeMetrics.set({
          weight: goal === 'bajar_peso' || !goal,
          fat: goal === 'bajar_grasa',
          muscle: goal === 'subir_musculo'
        });
      }
    });
  }

  currentGoal = computed(() => this.patient()?.meta_objetivo || null);

  availableMonths = computed(() => {
    const list = this.progress();
    const months = new Set<string>();
    list.forEach(entry => {
      if (entry.date) {
        const yyyymm = entry.date.substring(0, 7);
        months.add(yyyymm);
      }
    });
    return Array.from(months).sort().reverse().map(yyyymm => {
      const [year, month] = yyyymm.split('-');
      const date = new Date(Number(year), Number(month) - 1, 1);
      const name = date.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
      const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
      return {
        value: yyyymm,
        label: capitalized
      };
    });
  });

  filteredProgress = computed(() => {
    let list = this.progress();
    const selectedMonth = this.filterMonth();
    if (selectedMonth !== 'all') {
      list = list.filter(entry => entry.date && entry.date.startsWith(selectedMonth));
    }
    const limit = this.limitRecords();
    list = list.slice(0, limit);
    return [...list].reverse();
  });

  activeLines = computed(() => {
    const prog = this.filteredProgress();
    const p = this.patient();
    const active = this.activeMetrics();
    if (prog.length < 1 || !p) return [];

    const lines: any[] = [];
    const width = 400;
    const height = 100;
    const stepX = prog.length > 1 ? width / (prog.length - 1) : width / 2;

    const getScale = (values: number[], target: number | null) => {
      const allValues = target !== null && target > 0 ? [...values, target] : values;
      const minValue = Math.min(...allValues) - 1;
      const maxValue = Math.max(...allValues) + 1;
      const range = maxValue - minValue || 1;
      return { minValue, maxValue, range };
    };

    const createLineData = (
      key: 'weight' | 'fat' | 'muscle',
      label: string,
      unit: string,
      color: string,
      targetColor: string,
      values: number[],
      target: number | null,
      isGoodFn: (diff: number) => boolean
    ) => {
      const { minValue, range } = getScale(values, target);
      
      const points = values.map((val, i) => {
        const diff = i > 0 ? val - values[i - 1] : 0;
        const isGood = i > 0 ? isGoodFn(diff) : true;
        const diffText = i > 0 
          ? `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}${unit}`
          : '';
        const tooltipShift = i === 0 ? 35 : (i === prog.length - 1 ? -35 : 0);
        const y = height - ((val - minValue) / range * height);
        return {
          x: i * stepX,
          y,
          value: val,
          date: prog[i].date,
          unit,
          diff: diffText,
          isGood,
          tooltipShift
        };
      });

      const path = points.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');
      const targetY = target !== null && target > 0 ? height - ((target - minValue) / range * height) : null;

      return {
        key,
        label,
        unit,
        color,
        targetColor,
        points,
        path,
        targetY,
        targetValue: target
      };
    };

    // 1. Weight Line
    if (active.weight) {
      const values = prog.map(pt => Number(pt.weight || 0));
      const target = this.currentGoal() === 'bajar_peso' ? Number(p.peso_meta || 0) : null;
      lines.push(
        createLineData(
          'weight',
          'Peso',
          'kg',
          '#6366F1',
          '#818CF8',
          values,
          target,
          (diff) => diff <= 0
        )
      );
    }

    // 2. Fat Line
    if (active.fat) {
      const values = prog.map(pt => Number(pt.body_fat || 0));
      const target = this.currentGoal() === 'bajar_grasa' ? Number(p.grasa_meta || 0) : null;
      lines.push(
        createLineData(
          'fat',
          'Grasa',
          '%',
          '#F59E0B',
          '#FBBF24',
          values,
          target,
          (diff) => diff <= 0
        )
      );
    }

    // 3. Muscle Line
    if (active.muscle) {
      const values = prog.map(pt => Number(pt.muscle_mass || 0));
      const target = this.currentGoal() === 'subir_musculo' ? Number(p.musculo_meta || 0) : null;
      lines.push(
        createLineData(
          'muscle',
          'M. Esquelético',
          'kg',
          '#D81B60',
          '#E91E63',
          values,
          target,
          (diff) => diff >= 0
        )
      );
    }

    return lines;
  });

  toggleMetric(key: 'weight' | 'fat' | 'muscle') {
    const current = this.activeMetrics();
    const activeCount = (current.weight ? 1 : 0) + (current.fat ? 1 : 0) + (current.muscle ? 1 : 0);
    if (current[key] && activeCount === 1) {
      return;
    }
    this.activeMetrics.set({
      ...current,
      [key]: !current[key]
    });
  }

  togglePoint(index: number, key: 'weight' | 'fat' | 'muscle') {
    const cur = this.hoveredPoint();
    if (cur && cur.index === index && cur.key === key) {
      this.hoveredPoint.set(null);
    } else {
      this.hoveredPoint.set({ index, key });
    }
  }

  onMonthChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.filterMonth.set(target.value);
  }
}
