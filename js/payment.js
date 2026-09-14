/**
 * PROYECTO DELTA POS - Módulo de Pago y Cobro
 */

import { state } from './state.js';
import { CartController } from './cart.js';
import { PrintController } from './print.js';

export class PaymentController {
  static init() {
    if (this.initialized) return;
    this.initialized = true;

    this.modalEl = document.getElementById('payment-modal');
    this.amountTenderedInput = document.getElementById('amount-tendered');
    this.changeDisplayEl = document.getElementById('change-display');
    this.quickCashButtons = document.querySelectorAll('.quick-cash-btn');
    this.paymentMethod = 'cash'; // 'cash', 'card', 'transfer'
    this.isProcessing = false;

    this.bindEvents();
  }

  static bindEvents() {
    // Escuchar cambio en el input de monto recibido
    if (this.amountTenderedInput) {
      this.amountTenderedInput.addEventListener('input', () => {
        this.updateChangeCalculation();
      });
    }

    // Botones de montos rápidos (Exacto, ₡2.000, ₡5.000, ₡10.000, ₡20.000)
    if (this.quickCashButtons) {
      this.quickCashButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
          const val = e.currentTarget.dataset.value;
          const totals = CartController.calculateTotals();
          if (val === 'exact') {
            this.amountTenderedInput.value = totals.total;
          } else {
            this.amountTenderedInput.value = parseFloat(val);
          }
          this.updateChangeCalculation();
        });
      });
    }

    // Selector de método de pago (Efectivo, Tarjeta, Transferencia)
    document.querySelectorAll('.payment-method-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        document.querySelectorAll('.payment-method-tab').forEach(t => {
          t.classList.remove('active', 'border-emerald-600', 'bg-emerald-50', 'text-emerald-700');
          t.classList.add('border-slate-200', 'bg-white', 'text-slate-600');
        });

        const selectedTab = e.currentTarget;
        selectedTab.classList.add('active', 'border-emerald-600', 'bg-emerald-50', 'text-emerald-700');
        selectedTab.classList.remove('border-slate-200', 'bg-white', 'text-slate-600');

        this.paymentMethod = selectedTab.dataset.method;
        const cashSection = document.getElementById('cash-details-section');
        if (this.paymentMethod === 'cash') {
          if (cashSection) cashSection.classList.remove('hidden');
          const totals = CartController.calculateTotals();
          this.amountTenderedInput.value = totals.total.toFixed(2);
          this.updateChangeCalculation();
        } else {
          if (cashSection) cashSection.classList.add('hidden');
          if (this.changeDisplayEl) this.changeDisplayEl.textContent = CartController.formatMoney(0);
        }
      });
    });

    // Botón confirmar pago
    const confirmBtn = document.getElementById('confirm-payment-btn');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        this.processPayment();
      });
    }

    // Botón cerrar modal
    const closeBtn = document.getElementById('close-payment-modal-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.closeModal();
      });
    }
  }

  static openModal() {
    const totals = CartController.calculateTotals();
    if (totals.itemCount === 0) {
      alert('La comanda está vacía. Agrega productos para poder cobrar.');
      return;
    }

    const order = state.getCurrentOrder();
    const table = state.tables.find(t => t.id === state.activeTableId);

    // Actualizar datos en el modal
    document.getElementById('modal-total-display').textContent = CartController.formatMoney(totals.total);
    document.getElementById('modal-subtotal-display').textContent = CartController.formatMoney(totals.subtotal);
    document.getElementById('modal-tax-display').textContent = CartController.formatMoney(totals.tax);
    document.getElementById('modal-table-display').textContent = table ? table.name : 'Mesa';
    document.getElementById('modal-ticket-display').textContent = `#${order.ticketNumber}`;

    // Resetear a efectivo por defecto
    this.paymentMethod = 'cash';
    this.amountTenderedInput.value = totals.total;
    this.updateChangeCalculation();

    // Mostrar modal
    this.modalEl.classList.remove('hidden');
    this.modalEl.classList.add('flex');
    this.amountTenderedInput.focus();
    this.amountTenderedInput.select();
  }

  static closeModal() {
    this.modalEl.classList.add('hidden');
    this.modalEl.classList.remove('flex');
  }

  static updateChangeCalculation() {
    const totals = CartController.calculateTotals();
    const tendered = parseFloat(this.amountTenderedInput.value) || 0;
    const change = Math.max(0, tendered - totals.total);
    
    if (this.changeDisplayEl) {
      this.changeDisplayEl.textContent = CartController.formatMoney(change);
      if (tendered < totals.total && this.paymentMethod === 'cash') {
        this.changeDisplayEl.classList.add('text-rose-500');
        this.changeDisplayEl.classList.remove('text-emerald-600');
      } else {
        this.changeDisplayEl.classList.remove('text-rose-500');
        this.changeDisplayEl.classList.add('text-emerald-600');
      }
    }
  }

  static async processPayment() {
    if (this.isProcessing) return;

    const totals = CartController.calculateTotals();
    const tendered = parseFloat(this.amountTenderedInput.value) || 0;

    if (this.paymentMethod === 'cash' && tendered < totals.total) {
      alert(`El monto recibido (${CartController.formatMoney(tendered)}) es menor al total a pagar (${CartController.formatMoney(totals.total)}).`);
      this.amountTenderedInput.focus();
      return;
    }

    const confirmBtn = document.getElementById('confirm-payment-btn');
    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.classList.add('opacity-50', 'pointer-events-none');
    }
    this.isProcessing = true;

    try {
      const change = this.paymentMethod === 'cash' ? Math.max(0, tendered - totals.total) : 0;

      const paymentData = {
        method: this.paymentMethod,
        amountTendered: this.paymentMethod === 'cash' ? tendered : totals.total,
        change: change,
        totals: totals
      };

      const completedSale = await state.completeCurrentSale(paymentData);
      this.closeModal();

      if (completedSale) {
        // Mostrar ticket de éxito
        PrintController.showReceiptModal(completedSale);
      }
    } catch (err) {
      console.error('Error al procesar pago:', err);
      alert('Ocurrió un error al procesar el pago. Por favor intente de nuevo.');
    } finally {
      this.isProcessing = false;
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.classList.remove('opacity-50', 'pointer-events-none');
      }
    }
  }
}

