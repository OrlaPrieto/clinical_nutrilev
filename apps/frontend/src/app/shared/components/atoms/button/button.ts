import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './button.html',
  styleUrl: './button.css'
})
export class ButtonComponent {
  label = input<string>('');
  variant = input<ButtonVariant>('primary');
  size = input<ButtonSize>('md');
  icon = input<string | undefined>();
  disabled = input<boolean>(false);
  loading = input<boolean>(false);
  type = input<'button' | 'submit'>('button');
  customClass = input<string>('');

  onClick = output<MouseEvent>();

  handleClick(event: MouseEvent) {
    if (!this.disabled() && !this.loading()) {
      this.onClick.emit(event);
    }
  }

  get buttonClasses(): string {
    const base = 'flex items-center justify-center gap-2 font-bold transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:grayscale disabled:pointer-events-none';
    
    const variants = {
      primary: 'bg-nutri-rose text-white shadow-lg shadow-nutri-rose/20 hover:bg-nutri-rose/90',
      secondary: 'bg-nutri-rose/10 text-nutri-rose hover:bg-nutri-rose/20',
      outline: 'bg-white border-2 border-nutri-rose/20 text-nutri-rose hover:bg-nutri-rose/5 hover:border-nutri-rose',
      ghost: 'bg-transparent text-nutri-rose hover:bg-nutri-rose/5',
      danger: 'bg-rose-500 text-white shadow-lg shadow-rose-500/20 hover:bg-rose-600'
    };

    const sizes = {
      sm: 'px-3 py-1.5 rounded-xl text-[10px] uppercase tracking-wider',
      md: 'px-4 py-2 rounded-2xl text-[11px] uppercase tracking-widest',
      lg: 'px-6 py-3 rounded-2xl text-[11px] uppercase tracking-widest',
      xl: 'px-8 py-4 rounded-[2rem] text-xs tracking-widest uppercase'
    };

    return `${base} ${variants[this.variant()]} ${sizes[this.size()]} ${this.customClass()}`;
  }

  get iconClasses(): string {
    const s = this.size();
    const base = 'material-symbols-rounded transition-all duration-300';
    const mapper: Record<string, string> = {
      sm: 'text-lg',
      md: 'text-xl',
      lg: 'text-2xl',
      xl: 'text-3xl'
    };
    return `${base} ${mapper[s] || 'text-xl'}`;
  }
}
