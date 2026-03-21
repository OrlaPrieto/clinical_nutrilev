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

  valueChange = output<any>();

  onInput(event: any) {
    this.valueChange.emit(event.target.value);
  }

  increment() {
    if (this.disabled()) return;
    const currentVal = parseFloat(this.value() || 0);
    const newVal = (currentVal + 0.1).toFixed(1);
    this.valueChange.emit(newVal);
  }

  decrement() {
    if (this.disabled()) return;
    const currentVal = parseFloat(this.value() || 0);
    const newVal = Math.max(0, currentVal - 0.1).toFixed(1);
    this.valueChange.emit(newVal);
  }
}
