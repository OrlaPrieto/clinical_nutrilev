import { Component, input, output, signal, computed, effect, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../../../../shared/components/atoms/button/button';
import { IconComponent } from '../../../../shared/components/atoms/icon/icon';
import { Patient, ShoppingCategory, ShoppingItem } from '@shared/models/interfaces';
import { ToastService } from '../../../../shared/services/toast.service';

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
  patient = input<Patient | null>(null);

  private toastService = inject(ToastService);
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

  printShoppingList() {
    const list = this.shoppingList();
    const p = this.patient();
    if (!list || list.length === 0 || !p) return;

    // Generate categories HTML
    const categoriesHTML = list.map(cat => {
      const itemsHTML = cat.items.map((item: any) => `
        <div class="item-card">
          <div class="checkbox"></div>
          <div class="item-content">
            <div class="item-header">
              <span class="item-name">${item.icon} ${item.name}</span>
              ${item.amount ? `<span class="item-amount">${item.amount}</span>` : ''}
            </div>
            ${item.tip ? `<div class="item-tip">${item.tip}</div>` : ''}
          </div>
        </div>
      `).join('');

      return `
        <div class="category-group">
          <div class="category-title">${cat.category}</div>
          <div class="items-list">
            ${itemsHTML}
          </div>
        </div>
      `;
    }).join('');

    const formattedDate = new Date().toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      this.toastService.show('Por favor, permite las ventanas emergentes (popups) para imprimir.', 'error');
      return;
    }

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Lista de Súper - Nutrilev</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
    body {
      font-family: 'Inter', sans-serif;
      color: #334155;
      padding: 40px;
      background-color: #ffffff;
      font-size: 11px;
      line-height: 1.5;
    }
    .header {
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 15px;
      margin-bottom: 25px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .title {
      font-size: 22px;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: -0.025em;
    }
    .subtitle {
      font-size: 9px;
      text-transform: uppercase;
      font-weight: 700;
      color: #d11b60; /* nutri-rose */
      margin-top: 4px;
      letter-spacing: 0.1em;
    }
    .meta-info {
      text-align: right;
      font-size: 10px;
      color: #64748b;
    }
    .meta-info strong {
      color: #0f172a;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 25px 35px;
    }
    .category-group {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .category-title {
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
      color: #0f172a;
      border-bottom: 1.5px solid #cbd5e1;
      padding-bottom: 5px;
      margin-bottom: 10px;
      letter-spacing: 0.05em;
    }
    .items-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .item-card {
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }
    .checkbox {
      width: 12px;
      height: 12px;
      border: 1.5px solid #94a3b8;
      border-radius: 3px;
      margin-top: 2px;
      flex-shrink: 0;
    }
    .item-content {
      flex: 1;
    }
    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 10px;
    }
    .item-name {
      font-weight: 700;
      color: #1e293b;
    }
    .item-amount {
      font-size: 8px;
      font-weight: 900;
      background-color: #f1f5f9;
      color: #475569;
      padding: 1px 5px;
      border-radius: 4px;
      text-transform: uppercase;
      white-space: nowrap;
    }
    .item-tip {
      font-size: 9.5px;
      color: #64748b;
      font-style: italic;
      margin-top: 1px;
    }
    .footer {
      position: fixed;
      bottom: 20px;
      left: 40px;
      right: 40px;
      border-top: 1px solid #e2e8f0;
      padding-top: 10px;
      text-align: center;
      font-size: 8.5px;
      color: #94a3b8;
    }
    @media print {
      body {
        padding: 0;
      }
      .footer {
        position: running(footer);
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">Lista de Súper</div>
      <div class="subtitle">Nutrilev · Nutrición Especializada</div>
    </div>
    <div class="meta-info">
      <div>Paciente: <strong>${p.nombre}</strong></div>
      <div>Fecha: <strong>${formattedDate}</strong></div>
    </div>
  </div>

  <div class="grid">
    ${categoriesHTML}
  </div>

  <div class="footer">
    Plan de Alimentación de Élite · Generado de forma personalizada por IA
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
        window.close();
      }, 300);
    };
  </script>
</body>
</html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }
}
