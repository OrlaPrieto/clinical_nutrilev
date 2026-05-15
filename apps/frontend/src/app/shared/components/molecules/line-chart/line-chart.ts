import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

interface DataPoint {
  x: number;
  y: number;
  value: number;
  label: string;
}

@Component({
  selector: 'app-m-line-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-full h-full flex flex-col">
      <div class="flex-1 relative" #container>
        <svg class="w-full h-full overflow-visible" preserveAspectRatio="none">
          <!-- Area under the line -->
          <path [attr.d]="areaPath()" class="fill-nutri-rose/10 transition-all duration-700"></path>
          
          <!-- Line -->
          <path [attr.d]="linePath()" 
                class="fill-none stroke-nutri-rose stroke-2 transition-all duration-1000"
                stroke-linecap="round" stroke-linejoin="round"></path>
          
          <!-- Points -->
          @for (p of points(); track $index) {
            <g class="group/point">
              <circle [attr.cx]="p.x + '%'" [attr.cy]="p.y + '%'" r="4" 
                      class="fill-white stroke-nutri-rose stroke-2 transition-all duration-300 group-hover/point:r-6"></circle>
              
              <!-- Tooltip -->
              <g class="opacity-0 group-hover/point:opacity-100 transition-opacity pointer-events-none">
                <rect [attr.x]="(p.x > 80 ? p.x - 15 : p.x - 5) + '%'" 
                      [attr.y]="(p.y - 12) + '%'" 
                      width="40" height="20" rx="4"
                      class="fill-nutri-text dark:fill-black"></rect>
                <text [attr.x]="(p.x > 80 ? p.x - 13 : p.x - 3) + '%'" 
                      [attr.y]="(p.y - 6) + '%'" 
                      class="fill-white text-[8px] font-bold">{{ p.value }}{{ unit() }}</text>
              </g>
            </g>
          }
        </svg>
      </div>
      
      <!-- X Axis Labels -->
      <div class="flex justify-between mt-2 px-[5%]">
        @for (p of points(); track $index) {
          <span class="text-[7px] font-black uppercase tracking-widest text-nutri-text/30 dark:text-white/20">{{ p.label }}</span>
        }
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; height: 100%; }
    svg { filter: drop-shadow(0 4px 6px rgba(216, 27, 96, 0.1)); }
  `]
})
export class LineChartComponent {
  data = input.required<{ value: number; label: string }[]>();
  unit = input<string>('');

  points = computed(() => {
    const d = this.data();
    if (d.length === 0) return [];

    const min = Math.min(...d.map(i => i.value)) * 0.95;
    const max = Math.max(...d.map(i => i.value)) * 1.05;
    const range = max - min;

    return d.map((item, i) => ({
      x: (i / (d.length - 1)) * 90 + 5, // Margin of 5%
      y: 100 - ((item.value - min) / (range || 1)) * 80 - 10, // Margin of 10%
      value: item.value,
      label: item.label
    }));
  });

  linePath = computed(() => {
    const pts = this.points();
    if (pts.length < 2) return '';
    return pts.reduce((path, p, i) => 
      path + (i === 0 ? `M ${p.x}% ${p.y}%` : ` L ${p.x}% ${p.y}%`), '');
  });

  areaPath = computed(() => {
    const pts = this.points();
    if (pts.length < 2) return '';
    const baseLine = '100%';
    const path = this.linePath();
    return `${path} L ${pts[pts.length - 1].x}% ${baseLine} L ${pts[0].x}% ${baseLine} Z`;
  });
}
