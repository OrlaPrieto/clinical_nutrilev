import { Component, input, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../atoms/icon/icon';
import { ThemeService } from '../../../services/theme.service';
import confetti from 'canvas-confetti';

@Component({
  selector: 'app-m-milestone-badge',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="flex flex-row sm:flex-col items-center gap-5 sm:gap-4 transition-all duration-500 group relative w-full sm:w-auto cursor-pointer"
         [ngClass]="unlocked() ? 'opacity-100' : 'opacity-40'"
         (click)="toggleTooltip($event)">
      
      <!-- Premium White Medal (Clean & High Visibility) -->
      <div class="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center border transition-all duration-700 relative bg-white dark:bg-[#121212] shadow-sm md:group-hover:scale-110 md:group-hover:rotate-[5deg] shrink-0"
           [ngClass]="unlocked() ? 'border-nutri-rose/20 dark:border-white/10 shadow-xl shadow-nutri-rose/5 animate-pulse-soft scale-105' : 'border-slate-200/60 dark:border-white/5 opacity-70'">
        
        <!-- Glow Effect behind unlocked medals -->
        @if (unlocked()) {
          <div class="absolute inset-2 rounded-full blur-md opacity-30 animate-glow-pulse"
               [ngClass]="{
                 'bg-[#CD7F32]': id() === '25-percent',
                 'bg-[#F5B041]': id() === 'halfway',
                 'bg-[#4FACFE]': id() === 'goal-reached'
               }"></div>
        }

        <!-- Vector Medals -->
        <div class="relative z-10 w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center transition-transform duration-700 group-hover:scale-110">
          @if (id() === '25-percent') {
            <!-- Bronze Star -->
            <svg viewBox="0 0 64 64" class="w-full h-full">
              <defs>
                <linearGradient id="bronzeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#E5A97C" />
                  <stop offset="50%" stop-color="#C58351" />
                  <stop offset="100%" stop-color="#9C5D30" />
                </linearGradient>
              </defs>
              <circle cx="32" cy="32" r="28" fill="none" stroke="url(#bronzeGrad)" stroke-width="1.5" stroke-dasharray="2 2" />
              <circle cx="32" cy="32" r="24" fill="url(#bronzeGrad)" fill-opacity="0.12" />
              <polygon points="32,15 36,25 47,25 38,32 41,43 32,36 23,43 26,32 17,25 28,25" fill="url(#bronzeGrad)" />
            </svg>
          } @else if (id() === 'halfway') {
            <!-- Gold Medal -->
            <svg viewBox="0 0 64 64" class="w-full h-full">
              <defs>
                <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#FCE068" />
                  <stop offset="50%" stop-color="#F5B041" />
                  <stop offset="100%" stop-color="#C0392B" />
                </linearGradient>
              </defs>
              <circle cx="32" cy="32" r="28" fill="none" stroke="url(#goldGrad)" stroke-width="2" />
              <circle cx="32" cy="32" r="22" fill="url(#goldGrad)" fill-opacity="0.15" />
              <path d="M 22,25 C 22,35 32,41 32,41 C 32,41 42,35 42,25" fill="none" stroke="url(#goldGrad)" stroke-width="1.5" stroke-linecap="round" />
              <polygon points="32,20 34,26 40,26 35,30 37,36 32,32 27,36 29,30 24,26 30,26" fill="url(#goldGrad)" />
            </svg>
          } @else if (id() === 'goal-reached') {
            <!-- Diamond Jewel -->
            <svg viewBox="0 0 64 64" class="w-full h-full">
              <defs>
                <linearGradient id="diamondGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#00F2FE" />
                  <stop offset="100%" stop-color="#4FACFE" />
                </linearGradient>
                <linearGradient id="diamondGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#E0C3FC" />
                  <stop offset="100%" stop-color="#8EC5FC" />
                </linearGradient>
              </defs>
              <circle cx="32" cy="32" r="28" fill="none" stroke="url(#diamondGlow)" stroke-width="1.5" />
              <g fill="url(#diamondGrad)" fill-opacity="0.9">
                <polygon points="22,26 32,26 32,16 25,18" opacity="0.6"/>
                <polygon points="32,26 42,26 39,18 32,16" opacity="0.75"/>
                <polygon points="32,26 22,26 32,48" opacity="0.85"/>
                <polygon points="32,26 42,26 32,48" opacity="0.95"/>
                <polygon points="25,18 32,16 39,18 42,26 32,26 22,26" fill="url(#diamondGlow)"/>
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
      </div>

      <!-- Tooltip Content (Glassmorphic Card) -->
      @if (showTooltip()) {
        <div class="absolute bottom-full left-1/2 mb-4 w-60 p-4 rounded-2xl bg-white/95 dark:bg-black/95 backdrop-blur-md border border-slate-200/60 dark:border-white/10 shadow-2xl z-30 text-center animate-tooltip-in pointer-events-auto space-y-2"
             (click)="$event.stopPropagation()">
          
          <!-- Decorative Arrow -->
          <div class="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-white/95 dark:border-t-black/95"></div>
          
          <div class="flex items-center gap-2 justify-center mb-1">
            <span class="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
                  [ngClass]="unlocked() ? 'bg-nutri-rose/10 text-nutri-rose' : 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500'">
              {{ unlocked() ? '🏆 Desbloqueado' : '🔒 Por Desbloquear' }}
            </span>
          </div>
          
          <h5 class="text-[10px] font-black uppercase tracking-widest serif text-nutri-text dark:text-slate-200">{{ title() }}</h5>
          <p class="text-[9px] text-nutri-text/60 dark:text-slate-400 leading-normal font-medium max-w-[220px] mx-auto">
            {{ getTooltipMessage() }}
          </p>
          
          <span class="text-[8px] font-bold text-nutri-rose/60 uppercase tracking-widest pt-1 block">Toca fuera para cerrar</span>
        </div>
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
    @keyframes tooltipIn {
      from { opacity: 0; transform: translate(-50%, 8px) scale(0.95); }
      to { opacity: 1; transform: translate(-50%, 0) scale(1); }
    }
    .animate-tooltip-in {
      animation: tooltipIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
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

  showTooltip = signal<boolean>(false);

  toggleTooltip(event: Event) {
    event.stopPropagation();
    const willShow = !this.showTooltip();
    this.showTooltip.set(willShow);

    // If unlocked and opening, trigger confetti!
    if (willShow && this.unlocked()) {
      this.triggerConfetti();
    }
  }

  @HostListener('document:click')
  onDocumentClick() {
    this.showTooltip.set(false);
  }

  triggerConfetti() {
    let colors = ['#D81B60', '#F5B041', '#4FACFE'];
    if (this.id() === '25-percent') colors = ['#CD7F32', '#E5A97C', '#9C5D30'];
    else if (this.id() === 'halfway') colors = ['#F5B041', '#FCE068', '#C0392B'];
    else if (this.id() === 'goal-reached') colors = ['#00F2FE', '#4FACFE', '#E0C3FC'];

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
      colors: colors
    });
  }

  getTooltipMessage(): string {
    const isUnlocked = this.unlocked();
    switch (this.id()) {
      case '25-percent':
        return isUnlocked 
          ? '¡Excelente inicio! Has alcanzado el primer cuarto de tu camino. Tus hábitos están cambiando positivamente y vas con paso firme hacia tu meta.'
          : 'Logra completar el 25% de tu meta total de peso, grasa o músculo. ¡Sigue tu plan para desbloquear tu primera insignia!';
      case 'halfway':
        return isUnlocked
          ? '¡Hito increíble! Estás a la mitad del camino de tu meta de bienestar. Tu perseverancia y constancia están dando frutos extraordinarios.'
          : 'Llega al 50% de tu objetivo de consulta para desbloquear este logro. ¡El esfuerzo de hoy es tu resultado del mañana!';
      case 'goal-reached':
        return isUnlocked
          ? '¡META CUMPLIDA! Has alcanzado el 100% de tu objetivo. Tu disciplina es admirable y has transformado por completo tu calidad de vida. ¡Muchísimas felicidades!'
          : 'Alcanza el 100% de tu objetivo personalizado. La meta definitiva de tu plan nutricional te espera al final de este camino.';
      default:
        return 'Sigue sumando logros en tu plan nutricional para ver tu progreso.';
    }
  }
}
