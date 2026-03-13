import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputComponent } from '../../atoms/input/input';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule, FormsModule, InputComponent],
  templateUrl: './stat-card.html',
  styleUrl: './stat-card.css'
})
export class StatCardComponent {
  label = input.required<string>();
  value = input<any>('');
  isEditing = input<boolean>(false);
  type = input<string>('text');
  suffix = input<string>('');
  placeholder = input<string>('');
  icon = input<string | undefined>();

  valueChange = output<any>();

  onValueChange(newValue: any) {
    this.valueChange.emit(newValue);
  }
}
