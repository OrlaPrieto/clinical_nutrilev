import { Component, input, output, signal, computed, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../../../../shared/components/atoms/button/button';
import { IconComponent } from '../../../../shared/components/atoms/icon/icon';
import { SMAE_DATABASE, SmaeFood } from '../../../../shared/data/smae-db';

@Component({
  selector: 'app-equivalents-modal',
  standalone: true,
  imports: [CommonModule, ButtonComponent, IconComponent],
  templateUrl: './equivalents-modal.html',
  styleUrl: './equivalents-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EquivalentsModalComponent {
  showModal = input<boolean>(false);
  close = output<void>();

  // State Signals
  searchTerm = signal<string>('');
  selectedCategory = signal<string>('Verduras');
  calculatorFood = signal<SmaeFood | null>(null);
  calculatorQuantity = signal<number>(1);
  shuffledCandidates = signal<SmaeFood[]>([]);

  // Category list configuration
  categories = [
    { id: 'Verduras', label: 'Verduras', emoji: '🥦' },
    { id: 'Frutas', label: 'Frutas', emoji: '🍓' },
    { id: 'Cereales sin grasa', label: 'Cereales s/g', emoji: '🌾' },
    { id: 'Cereales con grasa', label: 'Cereales c/g', emoji: '🍪' },
    { id: 'Leguminosas', label: 'Leguminosas', emoji: '🫘' },
    { id: 'AOA muy bajo en grasa', label: 'Origen Animal MB', emoji: '🍗' },
    { id: 'AOA bajo en grasa', label: 'Origen Animal B', emoji: '🥚' },
    { id: 'AOA moderado en grasa', label: 'Origen Animal M', emoji: '🥩' },
    { id: 'Lácteos', label: 'Lácteos', emoji: '🥛' },
    { id: 'Grasas sin proteína', label: 'Grasas s/p', emoji: '🥑' },
    { id: 'Grasas con proteína', label: 'Grasas c/p', emoji: '🥜' },
    { id: 'Libres de energía', label: 'Libres', emoji: '☕' }
  ];

  // Filtered foods matching category and search text
  filteredFoods = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const catId = this.selectedCategory();

    return SMAE_DATABASE.filter(food => {
      // Search term Match
      const nameMatch = food.name.toLowerCase().includes(term);
      if (!nameMatch) return false;

      // If search term is present, search globally across all categories
      if (term) {
        return true;
      }

      // Category Match (only when no search term is entered)
      if (catId === 'Lácteos') {
        return food.category.startsWith('Lácteos');
      } else if (catId === 'Grasas sin proteína') {
        return food.category === 'Grasas sin proteína';
      } else if (catId === 'Grasas con proteína') {
        return food.category === 'Grasas con proteína';
      } else {
        return food.category === catId;
      }
    });
  });

  // Calculate equivalents dynamically
  calculatedEquivalents = computed(() => {
    const food = this.calculatorFood();
    if (!food) return 0;
    const qty = this.calculatorQuantity();
    const equivalents = qty / food.amountValue;
    // Format to 2 decimal places max
    return Math.round(equivalents * 100) / 100;
  });

  // Suggest replacements from compatible categories, randomized
  suggestedReplacements = computed(() => {
    const currentFood = this.calculatorFood();
    if (!currentFood) return [];

    const equivalents = this.calculatedEquivalents();
    if (equivalents <= 0) return [];

    return this.shuffledCandidates()
      .slice(0, 5)
      .map(food => {
        const scaledAmount = equivalents * food.amountValue;
        const formattedAmount = Math.round(scaledAmount * 10) / 10;
        
        let portionText = '';
        const isCupUnit = food.unit.toLowerCase().includes('taza') || food.unit.toLowerCase() === 'tza' || food.unit.toLowerCase() === 'tzas';
        
        if (isCupUnit) {
          const displayUnit = formattedAmount > 1 ? 'tzas' : 'tza';
          if (food.gramsEquivalent) {
            const scaledGrams = Math.round(equivalents * food.gramsEquivalent);
            portionText = `${formattedAmount} ${displayUnit} (${scaledGrams}g)`;
          } else {
            portionText = `${formattedAmount} ${displayUnit}`;
          }
        } else {
          const suffix = (formattedAmount > 1 && food.unit.endsWith('a')) ? 's' : '';
          portionText = `${formattedAmount} ${food.unit}${suffix}`;
        }

        return {
          ...food,
          scaledPortion: portionText
        };
      });
  });

  closeModal() {
    this.close.emit();
    this.resetState();
  }

  resetState() {
    this.searchTerm.set('');
    this.calculatorFood.set(null);
    this.calculatorQuantity.set(1);
    this.shuffledCandidates.set([]);
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

  openCalculator(food: SmaeFood) {
    this.calculatorFood.set(food);
    this.calculatorQuantity.set(food.amountValue);
    this.loadReplacementCandidates(food);
  }

  closeCalculator() {
    this.calculatorFood.set(null);
    this.calculatorQuantity.set(1);
    this.shuffledCandidates.set([]);
  }

  // Shuffle replacements manually
  shuffleReplacements() {
    const currentFood = this.calculatorFood();
    if (currentFood) {
      this.loadReplacementCandidates(currentFood);
    }
  }

  // Helper to calculate weight in grams dynamically
  getCalculatedGrams(): number {
    const food = this.calculatorFood();
    if (!food || !food.gramsEquivalent) return 0;
    const equivalents = this.calculatedEquivalents();
    return Math.round(equivalents * food.gramsEquivalent);
  }

  // Check if two categories belong to the same compatible group
  private areCategoriesCompatible(cat1: string, cat2: string): boolean {
    if (cat1 === cat2) return true;
    if (cat1.startsWith('Lácteos') && cat2.startsWith('Lácteos')) return true;
    if (cat1.startsWith('AOA') && cat2.startsWith('AOA')) return true;
    if (cat1.startsWith('Cereales') && cat2.startsWith('Cereales')) return true;
    return false;
  }

  // Randomize replacement candidates using Fisher-Yates shuffle
  private shuffleArray(array: SmaeFood[]): SmaeFood[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  private loadReplacementCandidates(currentFood: SmaeFood) {
    const others = SMAE_DATABASE.filter(food => 
      this.areCategoriesCompatible(food.category, currentFood.category) && 
      food.name !== currentFood.name
    );
    this.shuffledCandidates.set(this.shuffleArray(others));
  }

  setCalculatorQuantity(event: Event) {
    const input = event.target as HTMLInputElement;
    const val = Number(input.value);
    if (val > 0) {
      this.calculatorQuantity.set(val);
    }
  }

  getCategoryColor(category: string): string {
    const cat = category.toLowerCase();
    if (cat.includes('verduras')) return '#4caf50'; // Green
    if (cat.includes('frutas')) return '#ff5722'; // Orange
    if (cat.includes('cereales')) return '#ffc107'; // Yellow
    if (cat.includes('leguminosas')) return '#795548'; // Brown
    if (cat.includes('aoa') || cat.includes('animal')) return '#e91e63'; // Pink/Red
    if (cat.includes('lácteos') || cat.includes('lacteos')) return '#00bcd4'; // Cyan
    if (cat.includes('grasas')) return '#9c27b0'; // Purple
    return '#607d8b'; // Gray/Free
  }
}
