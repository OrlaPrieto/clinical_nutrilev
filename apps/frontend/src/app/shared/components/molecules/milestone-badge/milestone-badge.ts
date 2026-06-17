import { Component, input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../atoms/icon/icon';
import { ThemeService } from '../../../services/theme.service';

@Component({
  selector: 'app-m-milestone-badge',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="flex flex-row sm:flex-col items-center gap-5 sm:gap-4 transition-all duration-500 group relative w-full sm:w-auto"
         [ngClass]="unlocked() ? 'opacity-100 cursor-pointer' : 'opacity-40 cursor-not-allowed select-none'">
      
      <!-- Premium White Medal (Clean & High Visibility) -->
      <div class="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center border transition-all duration-700 relative bg-white dark:bg-[#121212] shadow-sm md:group-hover:scale-110 md:group-hover:rotate-[5deg] shrink-0"
           [ngClass]="unlocked() ? 'border-nutri-rose/20 dark:border-white/10 shadow-xl shadow-nutri-rose/5 animate-pulse-soft scale-105' : 'border-slate-200/60 dark:border-white/5 opacity-70'">
        
        <!-- Glow Effect behind unlocked medals -->
        @if (unlocked()) {
          <div class="absolute -inset-1 rounded-full blur-lg opacity-40 animate-glow-pulse"
               [ngClass]="{
                 'bg-gradient-to-tr from-orange-400 to-amber-200': id() === '25-percent',
                 'bg-gradient-to-tr from-yellow-500 to-amber-300': id() === 'halfway',
                 'bg-gradient-to-tr from-sky-400 to-indigo-300': id() === 'goal-reached'
               }"></div>
        }

        <!-- Vector Medals -->
        <div class="relative z-10 w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center transition-transform duration-700 group-hover:scale-110">
          @if (id() === '25-percent') {
            <!-- Bronze Star Badge -->
            <svg viewBox="0 0 64 64" class="w-full h-full filter drop-shadow-[0_4px_6px_rgba(156,93,48,0.2)]">
              <defs>
                <linearGradient id="bronzeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#FFCDA3" />
                  <stop offset="30%" stop-color="#D98A53" />
                  <stop offset="70%" stop-color="#B26C3B" />
                  <stop offset="100%" stop-color="#80441C" />
                </linearGradient>
                <linearGradient id="bronzeBg" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stop-color="#FCF6F0" />
                  <stop offset="100%" stop-color="#EBE0D5" />
                </linearGradient>
              </defs>
              <circle cx="32" cy="32" r="28" fill="url(#bronzeBg)" stroke="url(#bronzeGrad)" stroke-width="2" />
              <circle cx="32" cy="32" r="24" fill="none" stroke="url(#bronzeGrad)" stroke-width="0.75" stroke-dasharray="3 2" />
              <circle cx="32" cy="32" r="20" fill="url(#bronzeGrad)" fill-opacity="0.1" stroke="url(#bronzeGrad)" stroke-width="1.25" />
              <polygon points="32,17 35.5,24.5 43.5,24.5 37,29.5 39.5,37 32,32 24.5,37 27,29.5 20.5,24.5 28.5,24.5" fill="url(#bronzeGrad)" transform="scale(1.35)" transform-origin="32 32" />
              <polygon points="32,17 32,32 24.5,37 27,29.5 20.5,24.5 28.5,24.5" fill="#FFFFFF" fill-opacity="0.15" transform="scale(1.35)" transform-origin="32 32" />
            </svg>
          } @else if (id() === 'halfway') {
            <!-- Gold Medal with ribbons -->
            <svg viewBox="0 0 64 64" class="w-full h-full filter drop-shadow-[0_5px_8px_rgba(192,57,43,0.15)]">
              <defs>
                <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#FFF3B0" />
                  <stop offset="35%" stop-color="#F9D423" />
                  <stop offset="70%" stop-color="#E67E22" />
                  <stop offset="100%" stop-color="#935116" />
                </linearGradient>
                <linearGradient id="ribbonGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stop-color="#C0392B" />
                  <stop offset="50%" stop-color="#E74C3C" />
                  <stop offset="100%" stop-color="#962D22" />
                </linearGradient>
                <linearGradient id="goldBg" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stop-color="#FFFDF0" />
                  <stop offset="100%" stop-color="#FFF5D6" />
                </linearGradient>
              </defs>
              <path d="M 24,24 L 16,48 L 25,43 L 32,48 L 39,43 L 48,48 L 40,24 Z" fill="url(#ribbonGrad)" />
              <path d="M 28,24 L 32,48 L 36,24 Z" fill="#FFFFFF" fill-opacity="0.1" />
              <circle cx="32" cy="28" r="22" fill="url(#goldBg)" stroke="url(#goldGrad)" stroke-width="2.5" />
              <circle cx="32" cy="28" r="18" fill="url(#goldGrad)" fill-opacity="0.08" stroke="url(#goldGrad)" stroke-width="0.75" stroke-dasharray="2 2" />
              <polygon points="32,15 35,21.5 42,21.5 36.5,25.5 38.5,32 32,28 25.5,32 27.5,25.5 22,21.5 29,21.5" fill="url(#goldGrad)" transform="scale(1.35)" transform-origin="32 28" />
              <polygon points="32,15 32,28 25.5,32 27.5,25.5 22,21.5 29,21.5" fill="#FFFFFF" fill-opacity="0.2" transform="scale(1.35)" transform-origin="32 28" />
            </svg>
          } @else if (id() === 'goal-reached') {
            <!-- Diamond Gemstone Badge -->
            <svg viewBox="0 0 64 64" class="w-full h-full filter drop-shadow-[0_6px_10px_rgba(79,172,254,0.25)]">
              <defs>
                <linearGradient id="diamondGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#BFF0FA" />
                  <stop offset="35%" stop-color="#4FACFE" />
                  <stop offset="70%" stop-color="#0052D4" />
                  <stop offset="100%" stop-color="#4364F7" />
                </linearGradient>
                <linearGradient id="diamondBg" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stop-color="#F2FBFC" />
                  <stop offset="100%" stop-color="#E1F3F7" />
                </linearGradient>
                <linearGradient id="gemGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#00F2FE" />
                  <stop offset="50%" stop-color="#4FACFE" />
                  <stop offset="100%" stop-color="#8E2DE2" />
                </linearGradient>
              </defs>
              <polygon points="32,6 54,22 54,48 32,58 10,48 10,22" fill="url(#diamondBg)" stroke="url(#diamondGrad)" stroke-width="2.5" stroke-linejoin="round" />
              <polygon points="32,9 50,23 50,45 32,54 14,45 14,23" fill="none" stroke="url(#diamondGrad)" stroke-width="0.75" stroke-dasharray="3 3" stroke-linejoin="round" />
              <g transform="translate(0, -1)">
                <polygon points="20,22 44,22 38,15 26,15" fill="url(#gemGrad)" opacity="0.85" stroke="url(#diamondBg)" stroke-width="0.5" />
                <polygon points="12,22 20,22 26,15" fill="url(#gemGrad)" opacity="0.75" stroke="url(#diamondBg)" stroke-width="0.5" />
                <polygon points="44,22 52,22 38,15" fill="url(#gemGrad)" opacity="0.7" stroke="url(#diamondBg)" stroke-width="0.5" />
                <polygon points="12,22 32,45 20,22" fill="url(#gemGrad)" opacity="0.9" stroke="url(#diamondBg)" stroke-width="0.5" />
                <polygon points="20,22 32,45 44,22" fill="url(#gemGrad)" stroke="url(#diamondBg)" stroke-width="0.5" />
                <polygon points="44,22 32,45 52,22" fill="url(#gemGrad)" opacity="0.8" stroke="url(#diamondBg)" stroke-width="0.5" />
                <polygon points="20,22 32,45 32,22" fill="#FFFFFF" fill-opacity="0.18" />
                <polygon points="26,15 32,22 20,22" fill="#FFFFFF" fill-opacity="0.1" />
              </g>
            </svg>
          }
        </div>

        <!-- Lock Overlay for locked medals -->
        @if (!unlocked()) {
          <div class="absolute inset-0 bg-slate-500/10 dark:bg-black/40 rounded-full flex items-center justify-center backdrop-blur-[0.5px]">
            <app-a-icon name="lock" size="16px" class="text-slate-400 dark:text-slate-600"></app-a-icon>
          </div>
        }

        <!-- Unlocked Checkmark -->
        @if (unlocked()) {
          <div class="absolute -top-1 -right-1 w-6 h-6 bg-nutri-rose text-white rounded-full flex items-center justify-center border-2 border-white dark:border-[#1a1a1a] shadow-lg animate-pop-in z-20">
            <app-a-icon name="check" size="12px"></app-a-icon>
          </div>
        }
      </div>

      <!-- Content -->
      <div class="text-left sm:text-center space-y-1 flex-1 sm:flex-initial">
        <h4 class="text-[11px] font-black uppercase tracking-[0.25em] serif transition-colors text-left sm:text-center"
            [ngClass]="unlocked() ? 'text-nutri-text dark:text-slate-200' : 'text-slate-400 dark:text-slate-600'">
          {{ title() }}
        </h4>
        <p class="text-[9px] text-nutri-text/40 dark:text-slate-500 font-medium leading-tight max-w-[200px] sm:max-w-[120px] text-left sm:text-center">{{ description() }}</p>
        
        <!-- Desktop Action Indicator (Pill Button) -->
        @if (unlocked()) {
          <span class="hidden sm:inline-block text-[7.5px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 text-slate-400 group-hover:text-nutri-rose group-hover:bg-nutri-rose/10 group-hover:border-nutri-rose/25 transition-all mt-1.5 duration-300">
            Detalles ↗
          </span>
        }
      </div>

      <!-- Mobile Chevron (Pushed to the far right on mobile row layout) -->
      @if (unlocked()) {
        <app-a-icon name="chevron_right" size="16px" class="text-slate-300 dark:text-slate-600 group-hover:text-nutri-rose sm:hidden transition-colors shrink-0 ml-auto mr-1"></app-a-icon>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    @keyframes pulseSoft {
      0%, 100% { transform: scale(1.05); }
      50% { transform: scale(1.08); }
    }
    .animate-pulse-soft {
      animation: pulseSoft 4s infinite ease-in-out;
    }
    @keyframes popIn {
      from { opacity: 0; transform: scale(0.5); }
      to { opacity: 1; transform: scale(1); }
    }
    .animate-pop-in {
      animation: popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }
    @keyframes glowPulse {
      0%, 100% { opacity: 0.25; transform: scale(0.95); filter: blur(8px); }
      50% { opacity: 0.45; transform: scale(1.1); filter: blur(12px); }
    }
    .animate-glow-pulse {
      animation: glowPulse 4s infinite ease-in-out;
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
