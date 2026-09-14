/**
 * PROYECTO DELTA POS - Módulo de Impresión de Tickets y Comandas
 */

import { state } from './state.js';
import { CartController } from './cart.js';

export class PrintController {
  static init() {
    if (this.initialized) return;
    this.initialized = true;

    this.receiptModalEl = document.getElementById('receipt-modal');
    this.receiptContentEl = document.getElementById('receipt-print-content');

    const printBtn = document.getElementById('print-receipt-action-btn');
    if (printBtn) {
      printBtn.addEventListener('click', () => {
        window.print();
      });
    }

    const closeBtn = document.getElementById('close-receipt-modal-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.receiptModalEl.classList.add('hidden');
        this.receiptModalEl.classList.remove('flex');
      });
    }
  }

  static showReceiptModal(sale) {
    const s = state.settings;
    const dateFormatted = new Date(sale.completedAt).toLocaleString();

    let itemsHtml = '';
    sale.items.forEach(item => {
      itemsHtml += `
        <div class="flex justify-between text-xs py-1 border-b border-dashed border-slate-200">
          <div class="flex-1">
            <span class="font-bold">${item.quantity}x</span> ${item.name}
            ${item.notes ? `<div class="text-[10px] text-slate-500 italic pl-3">Nota: ${item.notes}</div>` : ''}
          </div>
          <div class="font-semibold text-right">${CartController.formatMoney(item.price * item.quantity)}</div>
        </div>
      `;
    });

    const receiptHtml = `
      <div class="text-center pb-3 border-b border-dashed border-slate-300">
        <h2 class="text-lg font-bold uppercase tracking-wider text-slate-900">${s.restaurantName}</h2>
        <p class="text-xs text-slate-500">${s.address}</p>
        <p class="text-xs text-slate-500">Tel: ${s.phone}</p>
        <div class="mt-2 text-xs font-semibold bg-slate-100 py-1 rounded">
          TICKET #${sale.ticketNumber} | ${sale.tableName}
        </div>
        <p class="text-[11px] text-slate-400 mt-1">${dateFormatted}</p>
        <p class="text-[11px] text-slate-400">Atendido por: ${sale.cashier}</p>
        ${sale.customerName ? `<p class="text-[11px] text-slate-700 font-medium">Cliente: ${sale.customerName}</p>` : ''}
      </div>

      <div class="py-3">
        <div class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Detalle de Consumo</div>
        ${itemsHtml}
      </div>

      <div class="pt-2 border-t border-dashed border-slate-300 text-xs space-y-1">
        <div class="flex justify-between">
          <span class="text-slate-500">Subtotal:</span>
          <span class="font-medium">${CartController.formatMoney(sale.payment.totals.subtotal)}</span>
        </div>
        ${sale.payment.totals.discount > 0 ? `
          <div class="flex justify-between text-rose-600">
            <span>Descuento:</span>
            <span>-${CartController.formatMoney(sale.payment.totals.discount)}</span>
          </div>
        ` : ''}
        <div class="flex justify-between">
          <span class="text-slate-500">${s.taxName} (${sale.payment.totals.taxRatePercentage}%):</span>
          <span class="font-medium">${CartController.formatMoney(sale.payment.totals.tax)}</span>
        </div>
        <div class="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-300">
          <span>TOTAL:</span>
          <span>${CartController.formatMoney(sale.payment.totals.total)}</span>
        </div>
        <div class="flex justify-between text-[11px] text-slate-500 pt-1">
          <span>Método: ${sale.payment.method.toUpperCase()}</span>
          <span>Recibido: ${CartController.formatMoney(sale.payment.amountTendered)}</span>
        </div>
        ${sale.payment.change > 0 ? `
          <div class="flex justify-between text-[11px] text-emerald-600 font-bold">
            <span>Cambio entregado:</span>
            <span>${CartController.formatMoney(sale.payment.change)}</span>
          </div>
        ` : ''}
      </div>

      <div class="mt-4 pt-3 border-t border-dashed border-slate-300 text-center">
        <p class="text-xs font-medium text-slate-600">${s.footerMessage}</p>
        <p class="text-[10px] text-slate-400 mt-1">Delta POS System v2.0</p>
      </div>
    `;

    if (this.receiptContentEl) {
      this.receiptContentEl.innerHTML = receiptHtml;
    }

    this.receiptModalEl.classList.remove('hidden');
    this.receiptModalEl.classList.add('flex');
  }

  static printKitchenOrder() {
    const order = state.getCurrentOrder();
    if (!order || !order.items || order.items.length === 0) {
      alert('No hay productos en la comanda para enviar a cocina.');
      return;
    }

    const table = state.tables.find(t => t.id === state.activeTableId);
    CartController.markAsSentToKitchen();

    // Crear notificación visual / toast
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-6 right-6 bg-slate-900 text-white px-5 py-3.5 rounded-xl shadow-2xl z-50 flex items-center gap-3 animate-pop border border-slate-700';
    toast.innerHTML = `
      <div class="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">✓</div>
      <div>
        <p class="font-bold text-sm">Comanda enviada a Cocina</p>
        <p class="text-xs text-slate-400">${table ? table.name : 'Mesa'} • Ticket #${order.ticketNumber}</p>
      </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 3500);
  }
}

