import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'ghost';

@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [CommonModule],
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
      primary: 'bg-nutri-rose/10 text-nutri-rose border border-nutri-rose/10',
      success: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
      warning: 'bg-amber-50 text-amber-600 border border-amber-100',
      danger: 'bg-rose-50 text-rose-600 border border-rose-100',
      info: 'bg-blue-50 text-blue-600 border border-blue-100',
      ghost: 'bg-white text-nutri-text/40 border border-nutri-rose/5'
    };

    const sizes = {
      sm: 'px-2 py-0.5 text-[8px] rounded-lg',
      md: 'px-3 py-1 text-[9px] rounded-full shadow-sm'
    };

    return `${base} ${variants[this.variant()]} ${sizes[this.size()]} ${this.customClass()}`;
  }
}
