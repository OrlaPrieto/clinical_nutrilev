import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-icon',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <mat-icon 
      class="material-symbols-rounded"
      [style.fontSize]="size()" 
      [style.width]="size()" 
      [style.height]="size()"
      [class]="customClass()">
      {{ name() }}
    </mat-icon>
  `,
  styles: [`
    :host { 
      display: inline-flex; 
      align-items: center; 
      justify-content: center; 
      vertical-align: middle;
    }
  `]
})
export class IconComponent {
  name = input.required<string>();
  size = input<string>('24px');
  customClass = input<string>('');
}
