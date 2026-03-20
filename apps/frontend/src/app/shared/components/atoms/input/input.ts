import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-input',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './input.html',
  styleUrl: './input.css'
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

  valueChange = output<any>();

  onInput(event: any) {
    this.valueChange.emit(event.target.value);
  }
}
