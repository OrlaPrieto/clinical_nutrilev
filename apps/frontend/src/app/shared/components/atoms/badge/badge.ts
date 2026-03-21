import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icon/icon';

export type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'ghost';

@Component({
  selector: 'app-a-badge',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './badge.html',
  styleUrl: './badge.css'
})
export class BadgeComponent {
  label = input<string>('');
  variant = input<BadgeVariant>('primary');
  size = input<'sm' | 'md'>('md');
  icon = input<string | undefined>();
  customClass = input<string>('');

  get badgeClasses(): string {
    const base = 'inline-flex items-center gap-1.5 font-bold uppercase tracking-widest transition-all duration-300';
    
    const variants = {
      primary: 'bg-nutri-rose/10 dark:bg-nutri-rose/20 text-nutri-rose border border-nutri-rose/10 dark:border-nutri-rose/30',
      success: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border border-emerald-100 dark:border-emerald-500/20',
      warning: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-100 dark:border-amber-500/20',
      danger: 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-500 border border-rose-100 dark:border-rose-500/20',
      info: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-500 border border-blue-100 dark:border-blue-500/20',
      ghost: 'bg-white dark:bg-white/5 text-nutri-text/60 dark:text-slate-400 border border-nutri-rose/5 dark:border-white/5'
    };

    const sizes = {
      sm: 'px-2 py-0.5 text-[8px] rounded-lg',
      md: 'px-3 py-1 text-[9px] rounded-full shadow-sm'
    };

    return `${base} ${variants[this.variant()]} ${sizes[this.size()]} ${this.customClass()}`;
  }
}
