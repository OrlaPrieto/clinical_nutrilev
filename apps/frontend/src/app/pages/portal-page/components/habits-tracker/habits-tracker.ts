import { Component, input, output, signal, HostListener, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../../shared/components/atoms/icon/icon';

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
