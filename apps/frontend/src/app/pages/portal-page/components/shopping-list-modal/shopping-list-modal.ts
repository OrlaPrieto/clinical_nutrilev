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

    // Create a print container in the main document
    let printContainer = document.getElementById('shopping-list-print-container');
    if (!printContainer) {
      printContainer = document.createElement('div');
      printContainer.id = 'shopping-list-print-container';
      document.body.appendChild(printContainer);
    }

    const htmlContent = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
        #shopping-list-print-container {
          display: none;
          font-family: 'Inter', sans-serif;
          color: #334155;
          padding: 20px 40px;
          background-color: #ffffff;
          font-size: 11px;
          line-height: 1.5;
        }
        #shopping-list-print-container .header {
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 15px;
          margin-bottom: 25px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        #shopping-list-print-container .title {
          font-size: 22px;
          font-weight: 900;
          color: #0f172a;
          letter-spacing: -0.025em;
        }
        #shopping-list-print-container .subtitle {
          font-size: 9px;
          text-transform: uppercase;
          font-weight: 700;
          color: #d11b60; /* nutri-rose */
          margin-top: 4px;
          letter-spacing: 0.1em;
        }
        #shopping-list-print-container .meta-info {
          text-align: right;
          font-size: 10px;
          color: #64748b;
        }
        #shopping-list-print-container .meta-info strong {
          color: #0f172a;
        }
        #shopping-list-print-container .grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 25px 35px;
        }
        #shopping-list-print-container .category-group {
          page-break-inside: avoid;
          break-inside: avoid;
        }
        #shopping-list-print-container .category-title {
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
          color: #0f172a;
          border-bottom: 1.5px solid #cbd5e1;
          padding-bottom: 5px;
          margin-bottom: 10px;
          letter-spacing: 0.05em;
        }
        #shopping-list-print-container .items-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        #shopping-list-print-container .item-card {
          display: flex;
          align-items: flex-start;
          gap: 8px;
        }
        #shopping-list-print-container .checkbox {
          width: 12px;
          height: 12px;
          border: 1.5px solid #94a3b8;
          border-radius: 3px;
          margin-top: 2px;
          flex-shrink: 0;
        }
        #shopping-list-print-container .item-content {
          flex: 1;
        }
        #shopping-list-print-container .item-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 10px;
        }
        #shopping-list-print-container .item-name {
          font-weight: 700;
          color: #1e293b;
        }
        #shopping-list-print-container .item-amount {
          font-size: 8px;
          font-weight: 900;
          background-color: #f1f5f9;
          color: #475569;
          padding: 1px 5px;
          border-radius: 4px;
          text-transform: uppercase;
          white-space: nowrap;
        }
        #shopping-list-print-container .item-tip {
          font-size: 9.5px;
          color: #64748b;
          font-style: italic;
          margin-top: 1px;
        }
        #shopping-list-print-container .footer {
          border-top: 1px solid #e2e8f0;
          padding-top: 10px;
          margin-top: 30px;
          text-align: center;
          font-size: 8.5px;
          color: #94a3b8;
        }

        @media print {
          body.printing-shopping-list > * {
            display: none !important;
          }
          body.printing-shopping-list #shopping-list-print-container {
            display: block !important;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: auto;
            background: white !important;
          }
        }
      </style>

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
    `;

    printContainer.innerHTML = htmlContent;

    // Add printing class to body
    document.body.classList.add('printing-shopping-list');

    // Trigger printing
    setTimeout(() => {
      window.print();
      // Remove class and container after print dialog closes
      document.body.classList.remove('printing-shopping-list');
      printContainer?.remove();
    }, 150);
  }

  shareShoppingList() {
    const list = this.shoppingList();
    if (!list || list.length === 0) return;

    // Emojis represented as escape sequences to prevent any file encoding or compilation corruption
    const shoppingCart = '\u{1F6D2}';
    const greenApple = '\u{1F34F}';
    const checkedBox = '\u{2705}';
    const emptyBox = '\u{2B1C}';
    const salad = '\u{1F957}';

    let text = `${shoppingCart} *MI LISTA DE COMPRAS - NUTRILEV* ${greenApple}\n`;
    text += `====================================\n\n`;

    list.forEach(cat => {
      text += `*${cat.category.toUpperCase()}*\n`;
      cat.items.forEach(item => {
        const checkbox = item.checked ? checkedBox : emptyBox;
        const amount = item.amount ? ` (${item.amount})` : '';
        text += `${checkbox} ${item.icon || ''} ${item.name}${amount}\n`;
        if (item.tip) {
          text += `   _Nota: ${item.tip}_\n`;
        }
      });
      text += `\n`;
    });

    text += `====================================\n`;
    text += `${salad} _Plan alimenticio personalizado de Nutrilev_`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({
        title: 'Mi Lista de Compras - Nutrilev',
        text: text
      }).catch(err => {
        console.log('Error sharing via Web Share API:', err);
      });
    } else {
      // Fallback a WhatsApp
      const encodedText = encodeURIComponent(text);
      const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
      window.open(whatsappUrl, '_blank', 'noopener');
    }
  }
}
