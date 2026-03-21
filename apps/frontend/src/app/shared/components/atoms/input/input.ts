import { Component, input, output, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-a-input',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './input.html',
  styleUrl: './input.css',
  encapsulation: ViewEncapsulation.None
})
export class InputComponent {
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

  valueChange = output<any>();

  onInput(event: any) {
    this.valueChange.emit(event.target.value);
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
