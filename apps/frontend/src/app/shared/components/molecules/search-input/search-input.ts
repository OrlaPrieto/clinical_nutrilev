import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputComponent } from '../../atoms/input/input';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-search-input',
  standalone: true,
  imports: [CommonModule, FormsModule, InputComponent, MatIconModule],
  templateUrl: './search-input.html',
  styleUrl: './search-input.css'
})
export class SearchInputComponent {
  placeholder = input<string>('Buscar...');
  value = input<string>('');
  loading = input<boolean>(false);
  
  search = output<string>();
  clear = output<void>();

  onInput(newValue: string) {
    this.search.emit(newValue);
  }

  onClear() {
    this.clear.emit();
  }
}
