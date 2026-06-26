import { Component, input, output, signal, computed, effect, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../../../../shared/components/atoms/button/button';
import { IconComponent } from '../../../../shared/components/atoms/icon/icon';
import { ShoppingCategory, ShoppingItem } from '@shared/models/interfaces';

@Component({
  selector: 'app-shopping-list-modal',
  standalone: true,
  imports: [CommonModule, ButtonComponent, IconComponent],
  templateUrl: './shopping-list-modal.html',
  styleUrl: './shopping-list-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ShoppingListModalComponent {
  showShoppingModal = input<boolean>(false);
  loadingShoppingList = input<boolean>(false);
  shoppingList = input<ShoppingCategory[]>([]);
  shoppingListLoadingMessage = input<string>('');
  shoppingListProgress = input<number>(0);

  // Local state signals
  collapsedCategories = signal<Record<string, boolean>>({});

  isAllCategoriesCollapsed = computed(() => {
    const list = this.shoppingList();
    if (list.length === 0) return true;
    const collapsedMap = this.collapsedCategories();
    return list.every(cat => collapsedMap[cat.category] === true);
  });

  hasShoppingError = computed(() => {
    return this.shoppingList().some(cat => cat.category.includes('ERROR'));
  });

  close = output<void>();
  retry = output<void>();
  toggleItem = output<{ category: string; item: ShoppingItem }>();

  constructor() {
    // Automatically initialize/update collapsed categories when list changes
    effect(() => {
      const list = this.shoppingList();
      this.collapsedCategories.update(prev => {
        const next = { ...prev };
        list.forEach(cat => {
          if (next[cat.category] === undefined) {
            next[cat.category] = true; // default to collapsed
          }
          // Auto-collapse if category becomes completed
          if (this.isCategoryCompleted(cat)) {
            next[cat.category] = true;
          }
        });
        return next;
      });
    });
  }

  closeShoppingModal() {
    this.close.emit();
  }

  retryShoppingList() {
    this.retry.emit();
  }

  toggleAllCategoriesAction() {
    const list = this.shoppingList();
    const currentAllCollapsed = this.isAllCategoriesCollapsed();
    const newCollapsed: Record<string, boolean> = {};
    list.forEach(cat => {
      newCollapsed[cat.category] = !currentAllCollapsed;
    });
    this.collapsedCategories.set(newCollapsed);
  }

  toggleCategoryAction(categoryName: string) {
    this.collapsedCategories.update(prev => ({
      ...prev,
      [categoryName]: !prev[categoryName]
    }));
  }

  toggleShoppingItem(category: string, item: ShoppingItem) {
    this.toggleItem.emit({ category, item });
  }

  isCategoryCompleted(cat: ShoppingCategory): boolean {
    return cat.items.length > 0 && cat.items.every(i => i.checked);
  }

  getCategoryProgress(cat: ShoppingCategory): string {
    const total = cat.items.length;
    const checked = cat.items.filter(i => i.checked).length;
    return `${checked}/${total}`;
  }

  getCategoryEmoji(catName: string): string {
    const parts = catName.trim().split(/\s+/);
    if (parts.length > 1 && parts[0].length <= 4) {
      return parts[0];
    }
    return '🛒';
  }

  getCategoryTitle(catName: string): string {
    const parts = catName.trim().split(/\s+/);
    if (parts.length > 1 && parts[0].length <= 4) {
      return parts.slice(1).join(' ');
    }
    return catName;
  }
}
