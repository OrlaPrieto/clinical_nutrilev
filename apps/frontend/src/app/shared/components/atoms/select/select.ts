import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-a-select',
  standalone: true,
  imports: [CommonModule, FormsModule, MatSelectModule, MatFormFieldModule, MatIconModule],
  template: `
    <mat-form-field [appearance]="appearance()" [class]="customClass()">
      <mat-label>{{ label() }}</mat-label>
      <mat-select [value]="value()" (selectionChange)="onSelectionChange($event.value)" [disabled]="disabled()">
        @for (option of options(); track option.value) {
          <mat-option [value]="option.value">{{ option.label }}</mat-option>
        }
      </mat-select>
      @if (icon()) {
        <mat-icon matPrefix class="material-symbols-rounded !text-sm ml-2 mr-2">{{ icon() }}</mat-icon>
      }
    </mat-form-field>
  `,
  styles: [`
    :host ::ng-deep .mat-mdc-form-field { width: 100%; }
  `]
})
export class SelectComponent {
  label = input<string>('');
  value = input<any>();
  options = input<{label: string, value: any}[]>([]);
  disabled = input<boolean>(false);
  icon = input<string | undefined>();
  appearance = input<'fill' | 'outline'>('outline');
  customClass = input<string>('');

  valueChange = output<any>();

  onSelectionChange(newValue: any) {
    this.valueChange.emit(newValue);
  }
}
