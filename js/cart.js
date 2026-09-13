/**
 * PROYECTO DELTA POS - Lógica del Carrito y Comanda
 */

import { state } from './state.js';

export class CartController {
  static addItem(product, quantity = 1, notes = '') {
    state.updateActiveOrder(order => {
      const existingItem = order.items.find(item => item.productId === product.id && item.notes === notes);
      
      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        order.items.push({
          id: 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
          productId: product.id,
          name: product.name,
          sku: product.sku,
          price: Number(product.price),
          image: product.image,
          quantity: quantity,
          notes: notes,
          addedAt: new Date().toISOString()
        });
      }
    });
  }

  static updateQuantity(itemId, change) {
    state.updateActiveOrder(order => {
      const itemIndex = order.items.findIndex(i => i.id === itemId);
      if (itemIndex > -1) {
        const item = order.items[itemIndex];
        const newQty = item.quantity + change;
        if (newQty <= 0) {
          order.items.splice(itemIndex, 1);
        } else {
          item.quantity = newQty;
        }
      }
    });
  }

  static removeItem(itemId) {
    state.updateActiveOrder(order => {
      order.items = order.items.filter(i => i.id !== itemId);
    });
  }

  static updateItemNotes(itemId, notes) {
    state.updateActiveOrder(order => {
      const item = order.items.find(i => i.id === itemId);
      if (item) {
        item.notes = notes.trim();
      }
    });
  }

  static setDiscount(amount) {
    state.updateActiveOrder(order => {
      order.discount = Math.max(0, Number(amount) || 0);
    });
  }

  static setCustomerName(name) {
    state.updateActiveOrder(order => {
      order.customerName = name.trim();
    });
  }

  static clearCart() {
    state.updateActiveOrder(order => {
      order.items = [];
      order.discount = 0;
      order.notes = '';
      order.status = 'open';
    });
  }

  static markAsSentToKitchen() {
    state.updateActiveOrder(order => {
      order.status = 'sent_to_kitchen';
      order.sentAt = new Date().toISOString();
    });
  }

  static calculateTotals(order = null) {
    const currentOrder = order || state.getCurrentOrder();
    const items = currentOrder.items || [];
    const taxRate = state.settings.taxRate || 0.16;

    const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const discount = Math.min(subtotal, currentOrder.discount || 0);
    const subtotalAfterDiscount = subtotal - discount;
    const tax = subtotalAfterDiscount * taxRate;
    const total = subtotalAfterDiscount + tax;

    return {
      itemCount: items.reduce((acc, item) => acc + item.quantity, 0),
      subtotal,
      discount,
      subtotalAfterDiscount,
      taxRatePercentage: (taxRate * 100).toFixed(0),
      tax,
      total
    };
  }

  static formatMoney(amount) {
    const symbol = state.settings.currencySymbol || '$';
    return `${symbol}${Number(amount || 0).toFixed(2)}`;
  }
}

