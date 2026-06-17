import { Component, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LegalModalComponent } from '../legal-modal/legal-modal';

@Component({
  selector: 'app-o-dashboard-footer',
  standalone: true,
  imports: [CommonModule, LegalModalComponent],
  template: `
    <footer class="fixed bottom-0 left-0 right-0 z-[50] bg-white/80 dark:bg-[#080808]/80 backdrop-blur-xl border-t border-nutri-rose/5 dark:border-white/5 transition-all duration-500">
        <div class="max-w-7xl mx-auto px-6 md:px-12 h-14 flex items-center justify-between gap-6">
            <div class="flex items-center gap-6">
                <div class="flex items-center gap-4">
                    <span class="text-[9px] font-black uppercase tracking-[0.4em] text-nutri-text/60 dark:text-white/60">v{{ version() }}</span>
                    <div class="w-1 h-1 rounded-full bg-nutri-rose/30"></div>
                    <span class="text-[9px] font-black uppercase tracking-[0.4em] text-nutri-text/60 dark:text-white/60">Nutrilev</span>
                </div>

                <div class="hidden md:flex items-center gap-4 border-l border-nutri-rose/10 dark:border-white/10 pl-6">
                    <button (click)="showLegalModal.set('privacy')" class="text-[8px] font-black uppercase tracking-widest text-nutri-text/30 dark:text-white/30 hover:text-nutri-rose transition-colors">Privacidad</button>
                    <button (click)="showLegalModal.set('support')" class="text-[8px] font-black uppercase tracking-widest text-nutri-text/30 dark:text-white/30 hover:text-nutri-rose transition-colors">Soporte</button>
                </div>
            </div>
            
            <p class="text-[8px] text-right text-nutri-text/40 dark:text-white/20 font-bold uppercase tracking-[0.2em] leading-relaxed hidden sm:block">
                Sistema Clínico Confidencial · Nutrilev &copy; 2026
            </p>
        </div>
    </footer>

    @if (showLegalModal()) {
        <app-o-legal-modal [type]="showLegalModal()!" (close)="showLegalModal.set(null)"></app-o-legal-modal>
    }
  `
})
export class DashboardFooterComponent {
  version = input<string>('1.0.0');
  showLegalModal = signal<'privacy' | 'support' | null>(null);
}
