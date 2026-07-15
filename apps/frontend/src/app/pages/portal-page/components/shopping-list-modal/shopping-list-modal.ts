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

  async printShoppingList() {
    const list = this.shoppingList();
    const p = this.patient();
    if (!list || list.length === 0 || !p) return;

    this.toastService.show('Generando PDF de la lista...', 'info');

    const formattedDate = new Date().toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    // Create parent wrapper to clip child off-screen but keep it paintable
    const wrapper = document.createElement('div');
    wrapper.style.position = 'fixed';
    wrapper.style.left = '0';
    wrapper.style.top = '0';
    wrapper.style.width = '0';
    wrapper.style.height = '0';
    wrapper.style.overflow = 'hidden';
    wrapper.style.zIndex = '-9999';
    wrapper.style.pointerEvents = 'none';
    document.body.appendChild(wrapper);

    // CSS styles shared by all elements
    const sharedStyles = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
        .pdf-box {
          font-family: 'Inter', sans-serif;
          color: #334155;
          padding: 20px 40px;
          background-color: #ffffff;
          font-size: 13px;
          line-height: 1.5;
          width: 800px;
          box-sizing: border-box;
        }
        .header {
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 15px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .title {
          font-size: 24px;
          font-weight: 900;
          color: #0f172a;
          letter-spacing: -0.025em;
        }
        .subtitle {
          font-size: 10px;
          text-transform: uppercase;
          font-weight: 700;
          color: #d11b60; /* nutri-rose */
          margin-top: 4px;
          letter-spacing: 0.1em;
        }
        .meta-info {
          text-align: right;
          font-size: 11px;
          color: #64748b;
        }
        .meta-info strong {
          color: #0f172a;
        }
        .category-group {
          margin-top: 15px;
          width: 100%;
        }
        .category-title {
          font-size: 13px;
          font-weight: 900;
          text-transform: uppercase;
          color: #0f172a;
          border-bottom: 1.5px solid #cbd5e1;
          padding-bottom: 5px;
          margin-bottom: 10px;
          letter-spacing: 0.05em;
        }
        .items-list {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px 25px;
        }
        .item-card {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        .checkbox {
          width: 13px;
          height: 13px;
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
          font-size: 9px;
          font-weight: 900;
          background-color: #f1f5f9;
          color: #475569;
          padding: 1px 5px;
          border-radius: 4px;
          text-transform: uppercase;
          white-space: nowrap;
        }
        .item-tip {
          font-size: 10.5px;
          color: #64748b;
          font-style: italic;
          margin-top: 1px;
        }
      </style>
    `;

    try {
      const { toPng } = await import('html-to-image');

      // Helper function to capture an HTML block
      const captureBlock = async (html: string): Promise<{ dataUrl: string, heightMm: number }> => {
        const container = document.createElement('div');
        container.className = 'pdf-box';
        container.innerHTML = sharedStyles + html;
        wrapper.appendChild(container);
        
        // Wait for rendering
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const dataUrl = await toPng(container, {
          backgroundColor: '#ffffff',
          style: {
            transform: 'scale(1)',
            transformOrigin: 'top left',
            width: '800px'
          }
        });
        
        const heightPx = container.offsetHeight || 100;
        const heightMm = (heightPx * 210) / 800;
        
        container.remove();
        return { dataUrl, heightMm };
      };

      // 1. Capture Header
      const headerHtml = `
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
      `;
      const header = await captureBlock(headerHtml);

      // 2. Capture each Category separately
      const categories: { dataUrl: string, heightMm: number }[] = [];
      for (const cat of list) {
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

        const categoryHtml = `
          <div class="category-group">
            <div class="category-title">${cat.category}</div>
            <div class="items-list">
              ${itemsHTML}
            </div>
          </div>
        `;
        const capturedCat = await captureBlock(categoryHtml);
        categories.push(capturedCat);
      }

      // 3. Compile PDF with jsPDF
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const margin = 15;
      const maxContentHeight = 265; // Leave space for footer
      
      let y = margin;
      let pageNumber = 1;

      // Draw footer helper
      const drawFooter = (pageNum: number) => {
        pdf.setFont('Helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(148, 163, 184); // slate-400
        pdf.text('Plan de Alimentación de Élite · Generado de forma personalizada por IA', 105, 287, { align: 'center' });
        pdf.text(`Página ${pageNum}`, 195, 287, { align: 'right' });
      };

      // Draw running header on page 2+
      const drawRunningHeader = () => {
        pdf.setFont('Helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.setTextColor(209, 27, 96); // nutri-rose
        pdf.text('NUTRILEV · LISTA DE SÚPER', 15, 12);
        pdf.setDrawColor(226, 232, 240); // slate-200
        pdf.setLineWidth(0.5);
        pdf.line(15, 14, 195, 14);
      };

      // Place main header on page 1
      pdf.addImage(header.dataUrl, 'PNG', 0, y, 210, header.heightMm, undefined, 'FAST');
      y += header.heightMm + 5; // Add spacing

      // Place categories
      for (let i = 0; i < categories.length; i++) {
        const cat = categories[i];
        
        // Check if category fits on current page
        // If it doesn't fit, start a new page
        if (y + cat.heightMm > maxContentHeight) {
          drawFooter(pageNumber);
          pdf.addPage();
          pageNumber++;
          y = margin + 5; // Spacing after running header
          drawRunningHeader();
        }
        
        pdf.addImage(cat.dataUrl, 'PNG', 0, y, 210, cat.heightMm, undefined, 'FAST');
        y += cat.heightMm + 5; // Spacing between categories
      }

      // Draw footer on the last page
      drawFooter(pageNumber);

      pdf.save(`Lista_Super_Nutrilev_${p.nombre.replace(/\s+/g, '_')}.pdf`);
      this.toastService.show('¡PDF descargado con éxito!', 'success');

    } catch (error) {
      console.error('Error generating PDF:', error);
      this.toastService.show('Error al generar el PDF de la lista', 'error');
    } finally {
      wrapper.remove();
    }
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
