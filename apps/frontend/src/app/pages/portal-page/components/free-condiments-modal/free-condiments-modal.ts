import { Component, input, output, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../../../../shared/components/atoms/button/button';
import { IconComponent } from '../../../../shared/components/atoms/icon/icon';
import { FREE_CONDIMENTS_DATABASE, FreeCondiment } from '../../../../shared/data/free-condiments-db';

@Component({
  selector: 'app-free-condiments-modal',
  standalone: true,
  imports: [CommonModule, ButtonComponent, IconComponent],
  templateUrl: './free-condiments-modal.html',
  styleUrl: './free-condiments-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FreeCondimentsModalComponent {
  showModal = input<boolean>(false);
  close = output<void>();

  // State Signals
  searchTerm = signal<string>('');
  selectedCategory = signal<string>('Hierbas de Olor');
  selectedCondiment = signal<FreeCondiment | null>(null);

  // Categories list
  categories = [
    { id: 'Hierbas de Olor', label: 'Hierbas', emoji: '🌿' },
    { id: 'Especias', label: 'Especias', emoji: '🌶️' },
    { id: 'Líquidos y Aderezos', label: 'Líquidos/Aderezos', emoji: '🍋' },
    { id: 'Endulzantes y Bebidas', label: 'Bebidas/Libres', emoji: '☕' }
  ];

  // Filtered condiments based on category and search query
  filteredCondiments = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const catId = this.selectedCategory();

    return FREE_CONDIMENTS_DATABASE.filter(condiment => {
      const nameMatch = condiment.name.toLowerCase().includes(term);
      if (!nameMatch) return false;

      // If there is a search term, match globally (ignore category filtering)
      if (term) {
        return true;
      }

      // Category match
      return condiment.category === catId;
    });
  });

  closeModal() {
    this.close.emit();
    this.resetState();
  }

  resetState() {
    this.searchTerm.set('');
    this.selectedCondiment.set(null);
  }

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }

  clearSearch(inputEl: HTMLInputElement) {
    inputEl.value = '';
    this.searchTerm.set('');
  }

  selectCategory(categoryId: string) {
    this.selectedCategory.set(categoryId);
  }

  selectCondiment(condiment: FreeCondiment) {
    this.selectedCondiment.set(condiment);
  }

  closeDetail() {
    this.selectedCondiment.set(null);
  }

  getCategoryColor(category: string): string {
    const cat = category.toLowerCase();
    if (cat.includes('hierbas')) return '#10b981'; // Emerald
    if (cat.includes('especias')) return '#f59e0b'; // Amber
    if (cat.includes('líquidos') || cat.includes('aderezos')) return '#b91c1c'; // Red
    if (cat.includes('endulzantes') || cat.includes('bebidas')) return '#2563eb'; // Blue
    return '#4b5563'; // Gray
  }
}
