import { Component, input, output, signal, HostListener, ChangeDetectionStrategy, inject, computed, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../../shared/components/atoms/icon/icon';
import { ThemeService } from '../../../../shared/services/theme.service';

@Component({
  selector: 'app-habits-tracker',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './habits-tracker.html',
  styleUrl: './habits-tracker.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HabitsTrackerComponent {
  dailyHabits = input<{ water: boolean; activity: boolean; diet: boolean; sleep: boolean }>({
    water: false,
    activity: false,
    diet: false,
    sleep: false
  });
  habitsPercentage = input<number>(0);

  toggle = output<'water' | 'activity' | 'diet' | 'sleep'>();

  showHabitsFloatingModal = signal<boolean>(false);

  private themeService = inject(ThemeService);

  private isHistoryPushed = false;

  constructor() {
    effect(() => {
      const open = this.showHabitsFloatingModal();
      untracked(() => {
        if (open) {
          if (!this.isHistoryPushed) {
            window.history.pushState({ modalOpen: 'habits' }, '');
            this.isHistoryPushed = true;
          }
        } else {
          if (this.isHistoryPushed) {
            this.isHistoryPushed = false;
            if (window.history.state && window.history.state.modalOpen === 'habits') {
              window.history.back();
            }
          }
        }
      });
    }, { allowSignalWrites: true });
  }

  @HostListener('window:popstate', ['$event'])
  onPopState(event: PopStateEvent) {
    if (this.isHistoryPushed) {
      this.isHistoryPushed = false;
      this.showHabitsFloatingModal.set(false);
    }
  }

  themeClasses = computed(() => {
    const activeTheme = this.themeService.theme();
    switch (activeTheme) {
      case 'vibrant':
        return {
          btnBorderShadow: 'border-emerald-500/20 dark:border-emerald-500/10 shadow-[0_4px_16px_rgba(16,185,129,0.18)] dark:shadow-[0_4px_16px_rgba(16,185,129,0.08)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.28)]',
          svgRing: 'text-emerald-500',
          icon: 'text-emerald-500 dark:text-emerald-400',
          badge: 'bg-emerald-500',
          progressBg: 'bg-gradient-to-r from-emerald-500 to-teal-400'
        };
      case 'purple':
        return {
          btnBorderShadow: 'border-blue-500/20 dark:border-blue-500/10 shadow-[0_4px_16px_rgba(37,99,235,0.18)] dark:shadow-[0_4px_16px_rgba(37,99,235,0.08)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.28)]',
          svgRing: 'text-blue-500',
          icon: 'text-blue-500 dark:text-blue-400',
          badge: 'bg-blue-500',
          progressBg: 'bg-gradient-to-r from-blue-600 to-sky-400'
        };
      case 'dark':
        return {
          btnBorderShadow: 'border-nutri-rose/20 dark:border-white/10 shadow-[0_4px_16px_rgba(216,27,96,0.18)] dark:shadow-[0_4px_16px_rgba(216,27,96,0.08)] hover:shadow-[0_6px_20px_rgba(216,27,96,0.28)]',
          svgRing: 'text-nutri-rose',
          icon: 'text-nutri-rose dark:text-nutri-rose-soft',
          badge: 'bg-nutri-rose',
          progressBg: 'bg-gradient-to-r from-nutri-rose to-[#ad1457]'
        };
      case 'light':
      default:
        return {
          btnBorderShadow: 'border-nutri-rose/20 dark:border-white/10 shadow-[0_4px_16px_rgba(216,27,96,0.18)] dark:shadow-[0_4px_16px_rgba(216,27,96,0.08)] hover:shadow-[0_6px_20px_rgba(216,27,96,0.28)]',
          svgRing: 'text-nutri-rose',
          icon: 'text-nutri-rose dark:text-nutri-rose-soft',
          badge: 'bg-nutri-rose',
          progressBg: 'bg-gradient-to-r from-nutri-rose to-pink-500'
        };
    }
  });

  @HostListener('document:click')
  onDocumentClick() {
    this.showHabitsFloatingModal.set(false);
  }

  toggleModal(event: Event) {
    this.showHabitsFloatingModal.update(v => !v);
    event.stopPropagation();
  }

  toggleHabit(habitKey: 'water' | 'activity' | 'diet' | 'sleep') {
    this.toggle.emit(habitKey);
  }
}
