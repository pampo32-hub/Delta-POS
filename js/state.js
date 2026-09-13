/**
 * PROYECTO DELTA POS - Gestión de Estado Global (State Management)
 */

import { INITIAL_PRODUCTS } from './products.js';

const STORAGE_KEYS = {
  PRODUCTS: 'delta_pos_products',
  ORDERS: 'delta_pos_orders',
  ACTIVE_TABLE: 'delta_pos_active_table',
  TABLES: 'delta_pos_tables',
  SETTINGS: 'delta_pos_settings',
  SALES_HISTORY: 'delta_pos_sales_history',
  TICKET_COUNTER: 'delta_pos_ticket_counter'
};

const DEFAULT_SETTINGS = {
  currencySymbol: '$',
  taxRate: 0.16,
  taxName: 'IVA',
  restaurantName: 'Gastro POS Delta',
  address: 'Av. Principal #104, Zona Centro',
  phone: '+1 (555) 019-2834',
  footerMessage: '¡Gracias por su preferencia!',
  cashierName: 'Juan (Caja 01)'
};

const DEFAULT_TABLES = [
  { id: '1', name: 'Mesa 01', capacity: 4, status: 'free' },
  { id: '2', name: 'Mesa 02', capacity: 2, status: 'free' },
  { id: '3', name: 'Mesa 03', capacity: 4, status: 'free' },
  { id: '4', name: 'Mesa 04', capacity: 6, status: 'free' },
  { id: '5', name: 'Mesa 05', capacity: 4, status: 'free' },
  { id: '6', name: 'Mesa 06', capacity: 2, status: 'free' },
  { id: '7', name: 'Mesa 07', capacity: 8, status: 'free' },
  { id: '8', name: 'Mesa 08', capacity: 4, status: 'free' },
  { id: 'barra', name: 'Barra Principal', capacity: 10, status: 'free' },
  { id: 'llevar', name: 'Para Llevar / Delivery', capacity: 0, status: 'free' }
];

class StateManager {
  constructor() {
    this.listeners = [];
    this.loadState();
  }

  loadState() {
    // Cargar productos
    const savedProducts = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    this.products = savedProducts ? JSON.parse(savedProducts) : INITIAL_PRODUCTS;

    // Cargar ajustes
    const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    this.settings = savedSettings ? { ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) } : DEFAULT_SETTINGS;

    // Cargar mesas
    const savedTables = localStorage.getItem(STORAGE_KEYS.TABLES);
    this.tables = savedTables ? JSON.parse(savedTables) : DEFAULT_TABLES;

    // Cargar comanda por mesa (objeto { tableId: { items: [], customer: '', notes: '', ticketId: '' } })
    const savedOrders = localStorage.getItem(STORAGE_KEYS.ORDERS);
    this.orders = savedOrders ? JSON.parse(savedOrders) : {};

    // Mesa activa actual
    const savedActiveTable = localStorage.getItem(STORAGE_KEYS.ACTIVE_TABLE);
    this.activeTableId = savedActiveTable || '1';

    // Contador de tickets
    const savedCounter = localStorage.getItem(STORAGE_KEYS.TICKET_COUNTER);
    this.ticketCounter = savedCounter ? parseInt(savedCounter, 10) : 1001;

    // Historial de ventas completadas
    const savedHistory = localStorage.getItem(STORAGE_KEYS.SALES_HISTORY);
    this.salesHistory = savedHistory ? JSON.parse(savedHistory) : [];

    // Filtros de vista activa
    this.selectedCategory = 'todos';
    this.searchQuery = '';
    this.activeView = 'pos'; // 'pos', 'tables', 'sales', 'settings'

    // Asegurar que la mesa activa tenga un objeto comanda inicializado
    this.ensureOrderExists(this.activeTableId);
  }

  saveState() {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(this.products));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(this.settings));
    localStorage.setItem(STORAGE_KEYS.TABLES, JSON.stringify(this.tables));
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(this.orders));
    localStorage.setItem(STORAGE_KEYS.ACTIVE_TABLE, this.activeTableId);
    localStorage.setItem(STORAGE_KEYS.TICKET_COUNTER, this.ticketCounter.toString());
    localStorage.setItem(STORAGE_KEYS.SALES_HISTORY, JSON.stringify(this.salesHistory));
  }

  ensureOrderExists(tableId) {
    if (!this.orders[tableId]) {
      this.orders[tableId] = {
        ticketNumber: this.ticketCounter++,
        customerName: '',
        items: [],
        discount: 0,
        notes: '',
        createdAt: new Date().toISOString(),
        status: 'open' // 'open', 'sent_to_kitchen', 'billed'
      };
      this.saveState();
    }
  }

  getCurrentOrder() {
    this.ensureOrderExists(this.activeTableId);
    return this.orders[this.activeTableId];
  }

  setActiveTable(tableId) {
    this.activeTableId = tableId;
    this.ensureOrderExists(tableId);
    this.saveState();
    this.notify();
  }

  updateActiveOrder(updaterFn) {
    const order = this.getCurrentOrder();
    updaterFn(order);

    // Actualizar estado de la mesa (si tiene items está ocupada, si no, libre)
    const table = this.tables.find(t => t.id === this.activeTableId);
    if (table) {
      if (order.items && order.items.length > 0) {
        table.status = order.status === 'sent_to_kitchen' ? 'sent' : 'busy';
      } else {
        table.status = 'free';
      }
    }

    this.saveState();
    this.notify();
  }

  completeCurrentSale(paymentData) {
    const order = this.getCurrentOrder();
    if (!order || !order.items || order.items.length === 0) return null;

    const completedSale = {
      ...order,
      id: 'SALE-' + Date.now(),
      tableId: this.activeTableId,
      tableName: (this.tables.find(t => t.id === this.activeTableId) || {}).name || this.activeTableId,
      completedAt: new Date().toISOString(),
      cashier: this.settings.cashierName,
      payment: paymentData
    };

    // Reducir stock
    order.items.forEach(item => {
      const prod = this.products.find(p => p.id === item.productId);
      if (prod && typeof prod.stock === 'number') {
        prod.stock = Math.max(0, prod.stock - item.quantity);
      }
    });

    this.salesHistory.unshift(completedSale);

    // Limpiar comanda de la mesa activa
    delete this.orders[this.activeTableId];
    this.ensureOrderExists(this.activeTableId);

    // Marcar mesa como libre
    const table = this.tables.find(t => t.id === this.activeTableId);
    if (table) table.status = 'free';

    this.saveState();
    this.notify();

    return completedSale;
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(fn => fn(this));
  }
}

export const state = new StateManager();

