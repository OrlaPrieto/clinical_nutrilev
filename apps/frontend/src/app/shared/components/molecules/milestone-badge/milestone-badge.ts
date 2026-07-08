import { Component, input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../atoms/icon/icon';
import { ThemeService } from '../../../services/theme.service';

@Component({
  selector: 'app-m-milestone-badge',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <!-- Glassmorphic Card Container -->
    <div class="p-6 rounded-[2.5rem] bg-white/40 dark:bg-white/[0.02] border border-white/20 dark:border-white/5 backdrop-blur-md shadow-sm flex flex-row sm:flex-col items-center gap-5 sm:gap-4 transition-all duration-500 group relative w-full sm:w-64 h-auto sm:h-72 justify-between overflow-hidden"
         [ngClass]="unlocked() ? 'opacity-100 cursor-pointer hover:scale-[1.03] hover:shadow-lg hover:shadow-nutri-rose/5 dark:hover:shadow-none' : 'opacity-40 cursor-not-allowed select-none'">
      
      <!-- Background Ambient Light Glow -->
      @if (unlocked()) {
        <div class="absolute -right-8 -top-8 w-28 h-28 rounded-full blur-xl opacity-25 pointer-events-none z-0"
             [ngClass]="{
               'bg-amber-500': id() === '25-percent',
               'bg-yellow-500': id() === 'halfway',
               'bg-sky-500': id() === 'goal-reached'
             }"></div>
      }

      <!-- Icon Emblem Container -->
      <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center border transition-all duration-700 relative bg-white/50 dark:bg-[#121212]/40 backdrop-blur-sm shadow-sm md:group-hover:scale-105 shrink-0 z-10"
           [ngClass]="unlocked() ? 'border-white/35 dark:border-white/10' : 'border-slate-200/40 dark:border-white/5'">
        
        <!-- Vector Emblem (Option B: Minimalist Sports Shields) -->
        <div class="relative w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center transition-transform duration-700">
          @if (id() === '25-percent') {
            <svg viewBox="0 0 64 64" class="w-full h-full filter drop-shadow-[0_4px_6px_rgba(198,130,84,0.15)]">
              <defs>
                <linearGradient id="shieldGrad25" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#E5A97D" />
                  <stop offset="55%" stop-color="#C68254" />
                  <stop offset="100%" stop-color="#93562C" />
                </linearGradient>
              </defs>
              <circle cx="32" cy="32" r="29" fill="none" stroke="url(#shieldGrad25)" stroke-width="0.75" stroke-dasharray="2 1.5" />
              <circle cx="32" cy="32" r="26" fill="none" stroke="url(#shieldGrad25)" stroke-width="1.25" opacity="0.5" />
              <circle cx="32" cy="32" r="22" fill="url(#shieldGrad25)" fill-opacity="0.08" />
              <polygon points="32,17 34.5,22 39.5,22.5 35.5,25.5 36.5,30.5 32,28 27.5,30.5 28.5,25.5 24.5,22.5 29.5,22" fill="url(#shieldGrad25)" />
              <text x="32" y="42" font-family="system-ui, sans-serif" font-weight="900" font-size="12" fill="url(#shieldGrad25)" text-anchor="middle" letter-spacing="-0.02em">25%</text>
              <path d="M 18,36 C 18,44 26,48 32,48 C 38,48 46,44 46,36" fill="none" stroke="url(#shieldGrad25)" stroke-width="1" stroke-linecap="round" opacity="0.6" />
            </svg>
          } @else if (id() === 'halfway') {
            <svg viewBox="0 0 64 64" class="w-full h-full filter drop-shadow-[0_4px_6px_rgba(245,158,11,0.15)]">
              <defs>
                <linearGradient id="shieldGrad50" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#FCD34D" />
                  <stop offset="55%" stop-color="#F59E0B" />
                  <stop offset="100%" stop-color="#D97706" />
                </linearGradient>
              </defs>
              <circle cx="32" cy="32" r="29" fill="none" stroke="url(#shieldGrad50)" stroke-width="0.75" stroke-dasharray="2 1.5" />
              <circle cx="32" cy="32" r="26" fill="none" stroke="url(#shieldGrad50)" stroke-width="1.25" opacity="0.5" />
              <circle cx="32" cy="32" r="22" fill="url(#shieldGrad50)" fill-opacity="0.08" />
              <polygon points="32,17 34.5,22 39.5,22.5 35.5,25.5 36.5,30.5 32,28 27.5,30.5 28.5,25.5 24.5,22.5 29.5,22" fill="url(#shieldGrad50)" />
              <text x="32" y="42" font-family="system-ui, sans-serif" font-weight="900" font-size="12" fill="url(#shieldGrad50)" text-anchor="middle" letter-spacing="-0.02em">50%</text>
              <path d="M 18,36 C 18,44 26,48 32,48 C 38,48 46,44 46,36" fill="none" stroke="url(#shieldGrad50)" stroke-width="1" stroke-linecap="round" opacity="0.6" />
            </svg>
          } @else if (id() === 'goal-reached') {
            <svg viewBox="0 0 64 64" class="w-full h-full filter drop-shadow-[0_4px_6px_rgba(59,130,246,0.15)]">
              <defs>
                <linearGradient id="shieldGrad100" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#60A5FA" />
                  <stop offset="55%" stop-color="#3B82F6" />
                  <stop offset="100%" stop-color="#4F46E5" />
                </linearGradient>
              </defs>
              <circle cx="32" cy="32" r="29" fill="none" stroke="url(#shieldGrad100)" stroke-width="0.75" stroke-dasharray="2 1.5" />
              <circle cx="32" cy="32" r="26" fill="none" stroke="url(#shieldGrad100)" stroke-width="1.25" opacity="0.5" />
              <circle cx="32" cy="32" r="22" fill="url(#shieldGrad100)" fill-opacity="0.08" />
              <polygon points="32,17 34.5,22 39.5,22.5 35.5,25.5 36.5,30.5 32,28 27.5,30.5 28.5,25.5 24.5,22.5 29.5,22" fill="url(#shieldGrad100)" />
              <text x="32" y="42" font-family="system-ui, sans-serif" font-weight="900" font-size="11" fill="url(#shieldGrad100)" text-anchor="middle" letter-spacing="-0.02em">100%</text>
              <path d="M 18,36 C 18,44 26,48 32,48 C 38,48 46,44 46,36" fill="none" stroke="url(#shieldGrad100)" stroke-width="1" stroke-linecap="round" opacity="0.6" />
            </svg>
          }
        </div>

        <!-- Lock Overlay for locked medals -->
        @if (!unlocked()) {
          <div class="absolute inset-0 bg-slate-500/10 dark:bg-black/40 rounded-full flex items-center justify-center backdrop-blur-[0.5px]">
            <app-a-icon name="lock" size="14px" class="text-slate-400 dark:text-slate-600"></app-a-icon>
          </div>
        }
      </div>

      <!-- Unlocked Checkmark Badge (Top-Right) -->
      @if (unlocked()) {
        <div class="absolute top-4 right-4 w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-md animate-pop-in z-20">
          <app-a-icon name="check" size="10px"></app-a-icon>
        </div>
      }

      <!-- Content -->
      <div class="text-left sm:text-center space-y-1.5 flex-1 sm:flex-initial relative z-10 w-full">
        <h4 class="text-[11px] font-black uppercase tracking-[0.2em] serif transition-colors text-left sm:text-center"
            [ngClass]="unlocked() ? 'text-nutri-text dark:text-slate-200' : 'text-slate-400 dark:text-slate-600'">
          {{ title() }}
        </h4>
        <p class="text-[9px] text-nutri-text/50 dark:text-slate-400 font-medium leading-tight text-left sm:text-center max-w-[200px] sm:max-w-none mx-auto">{{ description() }}</p>
      </div>

      <!-- Action Indicator (Pill Button) -->
      @if (unlocked()) {
        <span class="hidden sm:inline-block text-[7.5px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-white/30 dark:bg-white/5 border border-white/20 dark:border-white/5 text-nutri-text/60 dark:text-slate-400 group-hover:text-white group-hover:bg-nutri-rose group-hover:border-nutri-rose transition-all duration-300 relative z-10">
          Detalles ↗
        </span>
      }

      <!-- Mobile Chevron (Pushed to the far right on mobile row layout) -->
      @if (unlocked()) {
        <app-a-icon name="chevron_right" size="16px" class="text-slate-400 dark:text-slate-500 sm:hidden shrink-0 ml-auto mr-1 z-10"></app-a-icon>
      }
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; }
    @keyframes popIn {
      from { opacity: 0; transform: scale(0.5); }
      to { opacity: 1; transform: scale(1); }
    }
    .animate-pop-in {
      animation: popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }
  `]
})
export class MilestoneBadgeComponent {
  themeService = inject(ThemeService);
  id = input.required<string>();
  title = input.required<string>();
  description = input.required<string>();
  unlocked = input<boolean>(false);
}
