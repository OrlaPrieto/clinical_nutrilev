import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../atoms/icon/icon';

@Component({
  selector: 'app-m-milestone-badge',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="flex flex-col items-center gap-4 transition-all duration-500 group"
         [ngClass]="unlocked() ? 'opacity-100' : 'opacity-30 grayscale blur-[1.5px]'">
      
      <!-- Premium White Medal (Clean & High Visibility) -->
      <div class="w-24 h-24 rounded-full flex items-center justify-center border-2 transition-all duration-700 relative bg-white shadow-sm"
           [ngClass]="unlocked() ? 'border-nutri-rose/30 shadow-xl shadow-nutri-rose/10 animate-pulse-soft scale-105' : 'border-slate-100 opacity-60'">
        
        <!-- Star Image - Now seamlessly blends with the white background -->
        <img [src]="image()" [alt]="title()" 
             class="w-16 h-16 object-contain transition-transform duration-700 group-hover:scale-110 drop-shadow-sm mix-blend-multiply">
        
        <!-- Unlocked Checkmark - Positioned outside to avoid clipping -->
        @if (unlocked()) {
          <div class="absolute -top-1 -right-1 w-7 h-7 bg-nutri-rose text-white rounded-full flex items-center justify-center border-4 border-white shadow-lg animate-pop-in z-20">
            <app-a-icon name="check" size="14px"></app-a-icon>
          </div>
        }
      </div>

      <!-- Content -->
      <div class="text-center space-y-1">
        <h4 class="text-[11px] font-black uppercase tracking-[0.25em] serif transition-colors"
            [ngClass]="unlocked() ? 'text-nutri-text' : 'text-slate-400'">
          {{ title() }}
        </h4>
        <p class="text-[9px] text-nutri-text/40 font-medium leading-tight max-w-[120px] mx-auto">{{ description() }}</p>
      </div>

      <!-- Prominent Status Pill -->
      <div class="px-5 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.3em] transition-all"
           [ngClass]="unlocked() ? 'bg-nutri-rose text-white shadow-md shadow-nutri-rose/20' : 'bg-slate-50 text-slate-300'">
        {{ unlocked() ? 'Logro Desbloqueado' : 'Por Descubrir' }}
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    @keyframes pulseSoft {
      0%, 100% { transform: scale(1.05); box-shadow: 0 0 25px rgba(232, 107, 131, 0.15); }
      50% { transform: scale(1.08); box-shadow: 0 0 40px rgba(232, 107, 131, 0.2); }
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
  `]
})
export class MilestoneBadgeComponent {
  image = input.required<string>();
  title = input.required<string>();
  description = input.required<string>();
  unlocked = input<boolean>(false);
}
