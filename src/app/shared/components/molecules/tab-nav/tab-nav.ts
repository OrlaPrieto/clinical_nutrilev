import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tab-nav',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tab-nav.html',
  styleUrl: './tab-nav.css'
})
export class TabNavComponent {
  tabs = input.required<string[]>();
  activeTab = input<number>(0);
  tabChange = output<number>();

  onTabClick(index: number) {
    this.tabChange.emit(index);
  }
}
