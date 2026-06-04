import { Component, input, output, ViewEncapsulation, HostListener, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { CalendarComponent } from '../calendar/calendar';

@Component({
  selector: 'app-a-input',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, CalendarComponent],
  templateUrl: './input.html',
  styleUrl: './input.css',
  encapsulation: ViewEncapsulation.None
})
export class InputComponent {
  private elementRef = inject(ElementRef);
  
  label = input<string>('');
  placeholder = input<string>('');
  value = input<any>('');
  type = input<string>('text');
  icon = input<string | undefined>();
  disabled = input<boolean>(false);
  error = input<string | undefined>();
  customClass = input<string>('');
  inputClass = input<string>('');
  step = input<number>(1);
  showSpinner = input<boolean>(true);
  dimmed = input<boolean>(false);

  valueChange = output<any>();

  onInput(event: any) {
    this.valueChange.emit(event.target.value);
  }

  showCalendar = false;

  toggleCalendar() {
    if (this.disabled()) return;
    this.showCalendar = !this.showCalendar;
  }

  onDateSelect(date: Date | null) {
    if (date) {
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      const formattedDate = `${day}/${month}/${year}`;
      this.valueChange.emit(formattedDate);
    }
    this.showCalendar = false;
  }

  handleDateClick(input: HTMLInputElement) {
    if (this.type() === 'date' && !this.disabled()) {
      try {
        (input as any).showPicker();
      } catch (e) {
        // Fallback or ignore if not supported
        input.focus();
      }
    } else if (this.type() === 'calendar') {
      this.toggleCalendar();
    }
  }

  increment() {
    if (this.disabled()) return;
    const currentVal = parseFloat(this.value() || 0);
    const stepVal = this.step();
    const newVal = currentVal + stepVal;
    this.valueChange.emit(this.formatValue(newVal));
  }

  decrement() {
    if (this.disabled()) return;
    const currentVal = parseFloat(this.value() || 0);
    const stepVal = this.step();
    const newVal = Math.max(0, currentVal - stepVal);
    this.valueChange.emit(this.formatValue(newVal));
  }

  private formatValue(val: number): string | number {
    // If step is an integer, return an integer. Otherwise, keep 1 decimal place.
    return Number.isInteger(this.step()) ? Math.round(val) : parseFloat(val.toFixed(1));
  }
}
