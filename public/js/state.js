/**
 * PROYECTO DELTA POS - Gestión de Estado Global (State Management)
 * PROYECTO DELTA POS - Gestión de Estado Global (Sincronizado con API y PostgreSQL)
 */

import { INITIAL_PRODUCTS } from './products.js';

const STORAGE_KEYS = {
  PRODUCTS: 'delta_pos_products',
  ORDERS: 'delta_pos_orders',
  ACTIVE_TABLE: 'delta_pos_active_table',
  TABLES: 'delta_pos_tables',
  SETTINGS: 'delta_pos_settings',
  SALES_HISTORY: 'delta_pos_sales_history',
  TICKET_COUNTER: 'delta_pos_ticket_counter',
  CAJA_ACTIVA: 'delta_pos_caja_activa',
  CAJA_MOVIMIENTOS: 'delta_pos_caja_movimientos',
  CAJA_HISTORIAL: 'delta_pos_caja_historial'
};

const DEFAULT_SETTINGS = {
  currencySymbol: '₡',
  taxRate: 0.13,
  taxName: 'IVA',
  restaurantName: 'Gastro POS Delta',
  address: 'San José, Costa Rica',
  phone: '+506 2222-3344',
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
    this.apiAvailable = true;
    this.loadState();
    this.syncWithBackend();
  }

  loadState() {
    // Cargar productos
    const savedProducts = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    let prods = savedProducts ? JSON.parse(savedProducts) : INITIAL_PRODUCTS;
    // Si los productos guardados tienen precios en dólares (menores a 100), migrar a Colones
    if (prods.some(p => p.price < 100)) {
      prods = INITIAL_PRODUCTS;
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(prods));
    }
    this.products = prods;

    // Cargar ajustes
    const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    let sett = savedSettings ? { ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) } : DEFAULT_SETTINGS;
    if (sett.currencySymbol === '$') {
      sett.currencySymbol = '₡';
      sett.taxRate = 0.13;
      sett.taxName = 'IVA';
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(sett));
    }
    this.settings = sett;

    // Cargar mesas
    const savedTables = localStorage.getItem(STORAGE_KEYS.TABLES);
    this.tables = savedTables ? JSON.parse(savedTables) : DEFAULT_TABLES;

    // Cargar comanda por mesa
    const savedOrders = localStorage.getItem(STORAGE_KEYS.ORDERS);
    this.orders = savedOrders ? JSON.parse(savedOrders) : {};

    // Mesa activa actual
    const savedActiveTable = localStorage.getItem(STORAGE_KEYS.ACTIVE_TABLE);
    this.activeTableId = savedActiveTable || '1';

    // Contador de tickets
    const savedCounter = localStorage.getItem(STORAGE_KEYS.TICKET_COUNTER);
    this.ticketCounter = savedCounter ? parseInt(savedCounter, 10) : 1001;

    // Historial de ventas completadas (con deduplicación por ID / ticket)
    const savedHistory = localStorage.getItem(STORAGE_KEYS.SALES_HISTORY);
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        const seen = new Set();
        this.salesHistory = (Array.isArray(parsed) ? parsed : []).filter(s => {
          const key = s.id || `${s.ticketNumber}_${Math.floor(new Date(s.completedAt).getTime() / 15000)}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      } catch (e) {
        this.salesHistory = [];
      }
    } else {
      this.salesHistory = [];
    }

    // Cargar Caja Activa y Movimientos (Gamma POS Style)
    const savedCaja = localStorage.getItem(STORAGE_KEYS.CAJA_ACTIVA);
    this.cajaActiva = savedCaja ? JSON.parse(savedCaja) : null;

    const savedMovs = localStorage.getItem(STORAGE_KEYS.CAJA_MOVIMIENTOS);
    this.cajaMovimientos = savedMovs ? JSON.parse(savedMovs) : [];

    const savedCajasHist = localStorage.getItem(STORAGE_KEYS.CAJA_HISTORIAL);
    this.cajaHistorial = savedCajasHist ? JSON.parse(savedCajasHist) : [];

    // Filtros de vista activa
    this.selectedCategory = 'todos';
    this.searchQuery = '';
    this.activeView = 'pos'; // 'pos', 'tables', 'stock', 'caja', 'sales'

    // Asegurar que la mesa activa tenga un objeto comanda inicializado
    this.ensureOrderExists(this.activeTableId);
  }

  async syncWithBackend() {
    try {
      // 1. Sincronizar productos
      const prodRes = await fetch('/api/products');
      if (prodRes.ok) {
        const prods = await prodRes.json();
        if (Array.isArray(prods) && prods.length > 0) {
          this.products = prods;
        }
      }

      // 2. Sincronizar mesas
      const tablesRes = await fetch('/api/tables');
      if (tablesRes.ok) {
        const tables = await tablesRes.json();
        if (Array.isArray(tables) && tables.length > 0) {
          this.tables = tables.map(t => ({
            id: t.id,
            name: t.name,
            capacity: t.capacity,
            status: t.status
          }));
          // Cargar comandas activas
          tables.forEach(t => {
            if (t.activeOrder && t.activeOrder.items && t.activeOrder.items.length > 0) {
              this.orders[t.id] = t.activeOrder;
            }
          });
        }
      }

      // 3. Sincronizar historial de ventas (con deduplicación)
      const salesRes = await fetch('/api/sales');
      if (salesRes.ok) {
        const sales = await salesRes.json();
        if (Array.isArray(sales)) {
          const seen = new Set();
          this.salesHistory = sales.filter(s => {
            const key = s.id || `${s.ticketNumber}_${Math.floor(new Date(s.completedAt).getTime() / 15000)}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        }
      }

      // 4. Sincronizar Caja Activa
      const cajaRes = await fetch('/api/caja/activa');
      if (cajaRes.ok) {
        const cajaData = await cajaRes.json();
        if (cajaData && cajaData.caja) {
          this.cajaActiva = cajaData.caja;
          this.cajaMovimientos = cajaData.movimientos || [];
        }
      }

      this.saveState();
      this.notify();
    } catch (e) {
      console.log('Modo local / API no disponible de momento, usando almacenamiento local.');
    }
  }

  saveState() {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(this.products));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(this.settings));
    localStorage.setItem(STORAGE_KEYS.TABLES, JSON.stringify(this.tables));
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(this.orders));
    localStorage.setItem(STORAGE_KEYS.ACTIVE_TABLE, this.activeTableId);
    localStorage.setItem(STORAGE_KEYS.TICKET_COUNTER, this.ticketCounter.toString());
    localStorage.setItem(STORAGE_KEYS.SALES_HISTORY, JSON.stringify(this.salesHistory));
    localStorage.setItem(STORAGE_KEYS.CAJA_ACTIVA, JSON.stringify(this.cajaActiva));
    localStorage.setItem(STORAGE_KEYS.CAJA_MOVIMIENTOS, JSON.stringify(this.cajaMovimientos));
    localStorage.setItem(STORAGE_KEYS.CAJA_HISTORIAL, JSON.stringify(this.cajaHistorial));
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
        status: 'open'
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

    // Sincronizar con servidor de fondo si está conectado
    fetch(`/api/tables/${this.activeTableId}/order`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order, status: table ? table.status : 'busy' })
    }).catch(() => {});
  }

  async completeCurrentSale(paymentData) {
    const order = this.getCurrentOrder();
    if (!order || !order.items || order.items.length === 0) return null;

    // Verificar si ya existe una venta completada reciente para este ticket
    const recentDuplicate = this.salesHistory.find(s => 
      s.ticketNumber === order.ticketNumber && 
      s.tableId === this.activeTableId &&
      Math.abs(Date.now() - new Date(s.completedAt).getTime()) < 15000
    );
    if (recentDuplicate) {
      return recentDuplicate;
    }

    const saleId = 'SALE-' + Date.now();
    const completedSale = {
      ...order,
      id: saleId,
      tableId: this.activeTableId,
      tableName: (this.tables.find(t => t.id === this.activeTableId) || {}).name || this.activeTableId,
      completedAt: new Date().toISOString(),
      cashier: this.settings.cashierName,
      payment: paymentData
    };

    // Reducir stock local
    order.items.forEach(item => {
      const prod = this.products.find(p => p.id === item.productId);
      if (prod && typeof prod.stock === 'number') {
        prod.stock = Math.max(0, prod.stock - item.quantity);
      }
    });

    this.salesHistory.unshift(completedSale);

    // Limpiar comanda de la mesa activa INMEDIATAMENTE para evitar cobros dobles
    delete this.orders[this.activeTableId];
    this.ensureOrderExists(this.activeTableId);

    // Marcar mesa como libre
    const table = this.tables.find(t => t.id === this.activeTableId);
    if (table) table.status = 'free';

    this.saveState();
    this.notify();

    // Enviar a la base de datos PostgreSQL
    try {
      await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: saleId,
          ticketNumber: order.ticketNumber,
          tableId: this.activeTableId,
          tableName: completedSale.tableName,
          customerName: order.customerName,
          cashier: this.settings.cashierName,
          subtotal: paymentData.totals.subtotal,
          discount: paymentData.totals.discount,
          tax: paymentData.totals.tax,
          total: paymentData.totals.total,
          paymentMethod: paymentData.method,
          amountTendered: paymentData.amountTendered,
          change: paymentData.change,
          items: order.items
        })
      });
    } catch (e) {
      console.log('Venta guardada localmente');
    }

    return completedSale;
  }

  // ==========================================================================
  // OPERACIONES CRUD DE PRODUCTOS
  // ==========================================================================
  async addProduct(productData) {
    const newProduct = {
      id: productData.id || 'prod_' + Date.now(),
      sku: productData.sku || 'SKU-' + Date.now().toString().slice(-4),
      name: productData.name.trim(),
      price: Number(productData.price) || 0,
      category: productData.category || 'cafeteria',
      image: productData.image || 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=600&q=80',
      stock: Number(productData.stock) || 50,
      taxRate: Number(productData.taxRate) || 0.13
    };

    this.products.push(newProduct);
    this.saveState();
    this.notify();

    // Sincronizar backend si está disponible
    try {
      await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProduct)
      });
    } catch (e) {}

    return newProduct;
  }

  async updateProduct(productId, productData) {
    const prod = this.products.find(p => p.id === productId);
    if (!prod) return null;

    if (productData.name !== undefined) prod.name = productData.name.trim();
    if (productData.sku !== undefined) prod.sku = productData.sku.trim();
    if (productData.price !== undefined) prod.price = Number(productData.price);
    if (productData.category !== undefined) prod.category = productData.category;
    if (productData.image !== undefined) prod.image = productData.image.trim();
    if (productData.stock !== undefined) prod.stock = Number(productData.stock);
    if (productData.taxRate !== undefined) prod.taxRate = Number(productData.taxRate);

    this.saveState();
    this.notify();

    // Sincronizar backend si está disponible
    try {
      await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prod)
      });
    } catch (e) {}

    return prod;
  }

  async deleteProduct(productId) {
    this.products = this.products.filter(p => p.id !== productId);
    this.saveState();
    this.notify();

    // Sincronizar backend
    try {
      await fetch(`/api/products/${productId}`, { method: 'DELETE' });
    } catch (e) {}

    return true;
  }

  // ==========================================================================
  // OPERACIONES DE CAJA Y TURNOS (GAMMA POS STYLE)
  // ==========================================================================
  async openCaja(initialAmount = 0, cashierName = '') {
    const cashier = cashierName || this.settings.cashierName;
    const nuevaCaja = {
      id: 'CAJA-' + Date.now(),
      cajero: cashier,
      fechaApertura: new Date().toISOString(),
      montoInicial: Number(initialAmount) || 0,
      estado: 'abierta'
    };

    this.cajaActiva = nuevaCaja;
    this.cajaMovimientos = [];
    this.saveState();
    this.notify();

    try {
      await fetch('/api/caja/apertura', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cajero: cashier, montoInicial: initialAmount })
      });
    } catch (e) {}

    return nuevaCaja;
  }

  async addCajaMovement(type, amount, concept, cashierName = '') {
    if (!this.cajaActiva || this.cajaActiva.estado !== 'abierta') {
      throw new Error('No hay una caja abierta actualmente.');
    }

    const mov = {
      id: 'MOV-' + Date.now(),
      cajaId: this.cajaActiva.id,
      tipo: type, // 'entrada' o 'salida'
      monto: Math.abs(Number(amount) || 0),
      concepto: (concept || '').trim(),
      cajero: cashierName || this.cajaActiva.cajero || this.settings.cashierName,
      fechaHora: new Date().toISOString()
    };

    this.cajaMovimientos.unshift(mov);
    this.saveState();
    this.notify();

    try {
      await fetch('/api/caja/movimiento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mov)
      });
    } catch (e) {}

    return mov;
  }

  getCajaStats() {
    if (!this.cajaActiva || this.cajaActiva.estado !== 'abierta') {
      return {
        abierta: false,
        montoInicial: 0,
        ventasEfectivo: 0,
        ventasTarjeta: 0,
        ventasSinpe: 0,
        totalEntradas: 0,
        totalSalidas: 0,
        totalEsperadoEfectivo: 0,
        totalVentasTurno: 0,
        cantidadVentas: 0,
        ventasTurno: [],
        movimientos: []
      };
    }

    const fechaApertura = new Date(this.cajaActiva.fechaApertura);

    // Filtrar ventas realizadas durante el turno activo (deduplicadas)
    const seenTickets = new Set();
    const ventasTurno = (this.salesHistory || []).filter(sale => {
      if (new Date(sale.completedAt) < fechaApertura) return false;
      const key = sale.id || `${sale.ticketNumber}_${Math.floor(new Date(sale.completedAt).getTime() / 15000)}`;
      if (seenTickets.has(key)) return false;
      seenTickets.add(key);
      return true;
    });

    let ventasEfectivo = 0;
    let ventasTarjeta = 0;
    let ventasSinpe = 0;

    ventasTurno.forEach(v => {
      const method = (v.payment?.method || '').toLowerCase();
      const total = Number(v.payment?.totals?.total || 0);
      if (method === 'cash' || method.includes('efectivo')) {
        ventasEfectivo += total;
      } else if (method === 'card' || method.includes('tarjeta')) {
        ventasTarjeta += total;
      } else {
        ventasSinpe += total; // transferencias y Sinpe Móvil
      }
    });

    let totalEntradas = 0;
    let totalSalidas = 0;

    (this.cajaMovimientos || []).forEach(m => {
      if (m.tipo === 'entrada') totalEntradas += Number(m.monto || 0);
      if (m.tipo === 'salida') totalSalidas += Number(m.monto || 0);
    });

    const montoInicial = Number(this.cajaActiva.montoInicial || 0);
    const totalEsperadoEfectivo = Math.round(montoInicial + ventasEfectivo + totalEntradas - totalSalidas);
    const totalVentasTurno = ventasEfectivo + ventasTarjeta + ventasSinpe;

    return {
      abierta: true,
      caja: this.cajaActiva,
      montoInicial,
      ventasEfectivo,
      ventasTarjeta,
      ventasSinpe,
      totalEntradas,
      totalSalidas,
      totalEsperadoEfectivo,
      totalVentasTurno,
      cantidadVentas: ventasTurno.length,
      ventasTurno,
      movimientos: this.cajaMovimientos
    };
  }

  async closeCaja(actualCash = 0, observations = '') {
    if (!this.cajaActiva || this.cajaActiva.estado !== 'abierta') {
      throw new Error('No hay una caja abierta para cerrar.');
    }

    const stats = this.getCajaStats();
    const montoContado = Number(actualCash) || 0;
    const diferencia = montoContado - stats.totalEsperadoEfectivo;

    const cierre = {
      ...this.cajaActiva,
      fechaCierre: new Date().toISOString(),
      montoFinalEfectivo: montoContado,
      totalVentasEfectivo: stats.ventasEfectivo,
      totalVentasTarjeta: stats.ventasTarjeta,
      totalVentasSinpe: stats.ventasSinpe,
      totalEntradas: stats.totalEntradas,
      totalSalidas: stats.totalSalidas,
      totalEsperadoEfectivo: stats.totalEsperadoEfectivo,
      diferencia: diferencia,
      observaciones: (observations || '').trim(),
      estado: 'cerrada',
      movimientos: [...this.cajaMovimientos],
      ventas: [...stats.ventasTurno]
    };

    this.cajaHistorial.unshift(cierre);
    this.cajaActiva = null;
    this.cajaMovimientos = [];

    this.saveState();
    this.notify();

    try {
      await fetch('/api/caja/cierre', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cajaId: cierre.id,
          montoFinalEfectivo: montoContado,
          totalVentasEfectivo: stats.ventasEfectivo,
          totalVentasTarjeta: stats.ventasTarjeta,
          totalVentasSinpe: stats.ventasSinpe,
          totalEntradas: stats.totalEntradas,
          totalSalidas: stats.totalSalidas,
          totalEsperadoEfectivo: stats.totalEsperadoEfectivo,
          diferencia: diferencia,
          observaciones: observations
        })
      });
    } catch (e) {}

    return cierre;
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

