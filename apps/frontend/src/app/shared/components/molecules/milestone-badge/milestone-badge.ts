import { Component, input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../atoms/icon/icon';
import { ThemeService } from '../../../services/theme.service';

@Component({
  selector: 'app-m-milestone-badge',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <!-- Solid Dynamic Card Container (Samsung Health Style) -->
    <div class="p-6 rounded-[2.5rem] border shadow-sm flex flex-row sm:flex-col items-center gap-5 sm:gap-4 transition-all duration-500 group relative w-full sm:w-64 h-auto sm:h-72 justify-between overflow-hidden"
         [ngClass]="{
           'opacity-100 cursor-pointer hover:scale-[1.03] hover:shadow-lg hover:shadow-nutri-rose/5 dark:hover:shadow-none': unlocked(),
           'opacity-40 cursor-not-allowed select-none bg-slate-50 dark:bg-white/[0.03] border-slate-200/50 dark:border-white/5': !unlocked(),
           'text-white': unlocked()
         }"
         [style.background]="unlocked() ? (id() === '25-percent' ? 'linear-gradient(135deg, #f97316, #d97706)' : id() === 'halfway' ? 'linear-gradient(135deg, #facc15, #f97316)' : 'linear-gradient(135deg, #38bdf8, #4f46e5)') : null"
         [style.borderColor]="unlocked() ? (id() === '25-percent' ? 'rgba(249, 115, 22, 0.2)' : id() === 'halfway' ? 'rgba(250, 204, 21, 0.2)' : 'rgba(56, 189, 248, 0.2)') : null"
         [style.boxShadow]="unlocked() ? (id() === '25-percent' ? '0 10px 15px -3px rgba(249, 115, 22, 0.15)' : id() === 'halfway' ? '0 10px 15px -3px rgba(250, 204, 21, 0.15)' : '0 10px 15px -3px rgba(56, 189, 248, 0.15)') : null">
      
      <!-- Background Ambient Light Glow -->
      @if (unlocked()) {
        <div class="absolute -right-8 -top-8 w-28 h-28 rounded-full blur-xl opacity-20 pointer-events-none z-0"
             [ngClass]="{
               'bg-amber-400': id() === '25-percent',
               'bg-yellow-400': id() === 'halfway',
               'bg-sky-400': id() === 'goal-reached'
             }"></div>
      }

      <!-- Icon Emblem Container -->
      <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center border transition-all duration-700 relative shrink-0 z-10"
           [ngClass]="unlocked() ? 'bg-white/20 border-white/30 backdrop-blur-sm shadow-inner' : 'bg-slate-200/50 dark:bg-[#121212]/40 border-slate-200/40 dark:border-white/5'">
        
        <!-- Vector Emblem (Option B: Minimalist Sports Shields) -->
        <div class="relative w-14 h-14 sm:w-18 sm:h-18 flex items-center justify-center transition-transform duration-700">
          @if (id() === '25-percent') {
            <svg viewBox="0 0 64 64" class="w-full h-full filter drop-shadow-[0_4px_6px_rgba(198,130,84,0.25)]">
              <defs>
                <linearGradient id="shieldGrad25" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#FFFFFF" />
                  <stop offset="45%" stop-color="#F3E5D8" />
                  <stop offset="100%" stop-color="#C68254" />
                </linearGradient>
              </defs>
              <circle cx="32" cy="32" r="29" fill="none" stroke="url(#shieldGrad25)" stroke-width="0.75" stroke-dasharray="2 1.5" />
              <circle cx="32" cy="32" r="26" fill="none" stroke="url(#shieldGrad25)" stroke-width="1.25" opacity="0.5" />
              <circle cx="32" cy="32" r="22" fill="url(#shieldGrad25)" fill-opacity="0.08" />
              <polygon points="32,18 36,27 45.5,28 38,34.5 40.5,44 32,39 23.5,44 26,34.5 18.5,28 28,27" fill="url(#shieldGrad25)" />
              <path d="M 18,36 C 18,44 26,48 32,48 C 38,48 46,44 46,36" fill="none" stroke="url(#shieldGrad25)" stroke-width="1" stroke-linecap="round" opacity="0.6" />
            </svg>
          } @else if (id() === 'halfway') {
            <svg viewBox="0 0 64 64" class="w-full h-full filter drop-shadow-[0_4px_6px_rgba(245,158,11,0.25)]">
              <defs>
                <linearGradient id="shieldGrad50" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#FFFFFF" />
                  <stop offset="45%" stop-color="#FEF9E7" />
                  <stop offset="100%" stop-color="#F1C40F" />
                </linearGradient>
              </defs>
              <circle cx="32" cy="32" r="29" fill="none" stroke="url(#shieldGrad50)" stroke-width="0.75" stroke-dasharray="2 1.5" />
              <circle cx="32" cy="32" r="26" fill="none" stroke="url(#shieldGrad50)" stroke-width="1.25" opacity="0.5" />
              <circle cx="32" cy="32" r="22" fill="url(#shieldGrad50)" fill-opacity="0.08" />
              <polygon points="32,18 36,27 45.5,28 38,34.5 40.5,44 32,39 23.5,44 26,34.5 18.5,28 28,27" fill="url(#shieldGrad50)" />
              <path d="M 18,36 C 18,44 26,48 32,48 C 38,48 46,44 46,36" fill="none" stroke="url(#shieldGrad50)" stroke-width="1" stroke-linecap="round" opacity="0.6" />
            </svg>
          } @else if (id() === 'goal-reached') {
            <svg viewBox="0 0 64 64" class="w-full h-full filter drop-shadow-[0_4px_6px_rgba(59,130,246,0.15)]">
              <defs>
                <linearGradient id="shieldGrad100" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#FFFFFF" />
                  <stop offset="40%" stop-color="#E0F7FA" />
                  <stop offset="100%" stop-color="#00BCD4" />
                </linearGradient>
              </defs>
              <circle cx="32" cy="32" r="29" fill="none" stroke="url(#shieldGrad100)" stroke-width="0.75" stroke-dasharray="2 1.5" />
              <circle cx="32" cy="32" r="26" fill="none" stroke="url(#shieldGrad100)" stroke-width="1.25" opacity="0.5" />
              <circle cx="32" cy="32" r="22" fill="url(#shieldGrad100)" fill-opacity="0.08" />
              <polygon points="32,18 36,27 45.5,28 38,34.5 40.5,44 32,39 23.5,44 26,34.5 18.5,28 28,27" fill="url(#shieldGrad100)" />
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
        <div class="absolute top-4 right-4 w-5 h-5 bg-white text-emerald-600 rounded-full flex items-center justify-center shadow-md animate-pop-in z-20">
          <app-a-icon name="check" size="10px"></app-a-icon>
        </div>
      }

      <!-- Content -->
      <div class="text-left sm:text-center space-y-1.5 flex-1 sm:flex-initial relative z-10 w-full">
        <h4 class="text-[11px] font-black uppercase tracking-[0.2em] serif transition-colors text-left sm:text-center"
            [ngClass]="unlocked() ? 'text-white' : 'text-slate-400 dark:text-slate-600'">
          {{ title() }}
        </h4>
        <p class="text-[9px] font-medium leading-tight text-left sm:text-center max-w-[200px] sm:max-w-none mx-auto"
           [ngClass]="unlocked() ? 'text-white/80' : 'text-slate-400/80 dark:text-slate-500/60'">{{ description() }}</p>
      </div>

      <!-- Action Indicator (Pill Button) -->
      @if (unlocked()) {
        <span class="hidden sm:inline-block text-[7.5px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-white/20 hover:bg-white/35 border border-white/25 text-white transition-all duration-300 relative z-10">
          Detalles ↗
        </span>
      }

      <!-- Mobile Chevron (Pushed to the far right on mobile row layout) -->
      @if (unlocked()) {
        <app-a-icon name="chevron_right" size="16px" class="text-white/70 sm:hidden shrink-0 ml-auto mr-1 z-10"></app-a-icon>
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
