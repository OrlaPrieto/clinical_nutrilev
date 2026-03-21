import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatCardModule } from '@angular/material/card';
import { MatNativeDateModule } from '@angular/material/core';

@Component({
  selector: 'app-a-calendar',
  standalone: true,
  imports: [CommonModule, MatDatepickerModule, MatCardModule, MatNativeDateModule],
  template: `
    <mat-card class="calendar-card !rounded-3xl !border-none !shadow-sm overflow-hidden bg-nutri-bg/30">
      <mat-calendar [selected]="selected()" (selectedChange)="onSelectedChange($event)" class="nutri-calendar"></mat-calendar>
    </mat-card>
  `,
  styles: [`
    :host ::ng-deep .mat-calendar { font-family: inherit; }
  `]
})
export class CalendarComponent {
  selected = input<Date | null>(null);
  selectedChange = output<Date | null>();

  onSelectedChange(date: Date | null) {
    this.selectedChange.emit(date);
  }
}
