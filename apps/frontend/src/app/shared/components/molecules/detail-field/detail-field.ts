import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../atoms/icon/icon';

@Component({
  selector: 'app-m-detail-field',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="flex gap-4 items-start group/field transition-all">
      @if (icon()) {
        <div class="w-8 h-8 shrink-0 rounded-xl bg-nutri-rose/5 dark:bg-white/5 flex items-center justify-center text-nutri-rose text-xs group-hover/field:bg-nutri-rose group-hover/field:text-white transition-all duration-300">
          <app-a-icon [name]="icon()!" customClass="text-sm"></app-a-icon>
        </div>
      }
      <div class="flex-1">
        <h4 class="font-bold text-[10px] uppercase tracking-widest text-nutri-text/70 dark:text-slate-500 mb-1 group-hover/field:text-nutri-rose transition-colors">{{ label() }}</h4>
        
        @if (!isEditing()) {
          <p class="text-sm leading-relaxed font-medium text-nutri-text dark:text-slate-200 transition-colors whitespace-pre-wrap">
            {{ value() || '---' }}
          </p>
        } @else {
          @if (type() === 'textarea') {
            <textarea [ngModel]="value()" 
                      (ngModelChange)="valueChange.emit($event)"
                      class="w-full bg-nutri-rose/5 dark:bg-white/5 rounded-xl p-3 text-sm font-medium outline-none border border-transparent focus:border-nutri-rose/20 dark:focus:border-white/10 resize-none min-h-[80px] dark:text-slate-300 focus:ring-4 focus:ring-nutri-rose/5 transition-all"
                      [placeholder]="placeholder()"></textarea>
          } @else {
            <input [ngModel]="value()" 
                   (ngModelChange)="valueChange.emit($event)"
                   [type]="type()"
                   class="w-full h-10 bg-nutri-rose/5 dark:bg-white/5 dark:text-slate-300 rounded-xl px-3 py-2 text-sm font-medium outline-none border border-transparent focus:border-nutri-rose/20 dark:focus:border-white/10 focus:ring-4 focus:ring-nutri-rose/5 transition-all"
                   [placeholder]="placeholder()">
          }
        }
      </div>
    </div>
  `
})
export class DetailFieldComponent {
  label = input.required<string>();
  value = input<any>();
  icon = input<string>();
  isEditing = input<boolean>(false);
  type = input<'text' | 'number' | 'date' | 'textarea'>('text');
  placeholder = input<string>('');
  
  valueChange = output<any>();
}
