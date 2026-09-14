/**
 * PROYECTO DELTA POS - Controlador Principal de la Interfaz de Usuario
 */

import { CATEGORIES } from './products.js';
import { state } from './state.js';
import { CartController } from './cart.js';
import { PaymentController } from './payment.js';
import { PrintController } from './print.js';
import { CajaController } from './caja.js';
import { AdminController } from './admin.js';

class DeltaPOSApp {
  constructor() {
    this.tableFilter = 'all';
    this.init();
  }

  init() {
    // Inicializar módulos auxiliares
    PaymentController.init();
    PrintController.init();
    CajaController.init();
    AdminController.init();

    // Referencias del DOM
    this.categoriesContainer = document.getElementById('categories-container');
    this.productsGrid = document.getElementById('products-grid');
    this.searchInput = document.getElementById('search-input');
    
    // Panel de la Comanda
    this.comandaItemsContainer = document.getElementById('comanda-items-container');
    this.comandaEmptyState = document.getElementById('comanda-empty-state');
    this.ticketNumberDisplay = document.getElementById('ticket-number-display');
    this.tableSelector = document.getElementById('table-selector');
    this.customerInput = document.getElementById('customer-name-input');
    
    // Totales
    this.subtotalDisplay = document.getElementById('subtotal-display');
    this.taxDisplay = document.getElementById('tax-display');
    this.taxLabel = document.getElementById('tax-label');
    this.discountDisplay = document.getElementById('discount-display');
    this.totalDisplay = document.getElementById('total-display');
    this.itemCountBadge = document.getElementById('comanda-count-badge');

    // Botones de acción de la comanda
    this.payBtn = document.getElementById('pay-action-btn');
    this.sendKitchenBtn = document.getElementById('send-kitchen-btn');
    this.saveOrderBtn = document.getElementById('save-order-btn');
    this.clearCartBtn = document.getElementById('clear-cart-btn');
    this.addDiscountBtn = document.getElementById('add-discount-btn');

    // Barra Lateral de Navegación
    this.navPosBtn = document.getElementById('nav-pos-btn');
    this.navTablesBtn = document.getElementById('nav-tables-btn');
    this.navStockBtn = document.getElementById('nav-stock-btn');
    this.navCajaBtn = document.getElementById('nav-caja-btn');
    this.navReportsBtn = document.getElementById('nav-reports-btn');
    this.navAdminBtn = document.getElementById('nav-admin-btn');

    // Modales Adicionales
    this.tablesModal = document.getElementById('tables-modal');
    this.stockModal = document.getElementById('stock-modal');
    this.reportsModal = document.getElementById('reports-modal');
    this.cajaModal = document.getElementById('caja-modal');
    this.productEditorModal = document.getElementById('product-editor-modal');

    // Modal de notas
    this.noteModal = document.getElementById('note-modal');
    this.noteInput = document.getElementById('item-note-input');
    this.saveNoteBtn = document.getElementById('save-note-btn');
    this.closeNoteBtn = document.getElementById('close-note-btn');
    this.activeNoteItemId = null;

    // Reloj
    this.clockEl = document.getElementById('live-clock');

    // Login & Sesión
    this.loginModal = document.getElementById('login-modal');
    this.loginForm = document.getElementById('login-form');
    this.logoutBtn = document.getElementById('logout-btn');

    this.checkSession();
    this.bindEvents();
    this.bindProductEditorEvents();
    this.renderCategories();
    this.renderTablesSelector();
    this.renderProducts();
    this.renderComanda();
    this.startClock();

    // Suscribirse a cambios en el estado
    state.subscribe(() => {
      this.renderProducts();
      this.renderComanda();
      this.renderTablesSelector();
      if (!this.tablesModal.classList.contains('hidden')) {
        this.renderTablesGrid();
      }
      if (!this.stockModal.classList.contains('hidden')) {
        this.renderStockTable(document.getElementById('stock-search-input')?.value.toLowerCase() || '');
      }
      if (!this.cajaModal.classList.contains('hidden')) {
        CajaController.render();
      }
      CajaController.updateNavBadge();
    });
  }

  checkSession() {
    const user = localStorage.getItem('delta_user');
    if (user && this.loginModal) {
      this.loginModal.style.display = 'none';
      this.loginModal.classList.add('hidden');
      this.loginModal.classList.remove('flex');
    } else if (this.loginModal) {
      this.loginModal.style.display = 'flex';
      this.loginModal.classList.remove('hidden');
      this.loginModal.classList.add('flex');
    }
  }

  bindEvents() {
    // Evento de Login
    // Evento de Login (Submit y Click)
    const doLogin = (e) => {
      if (e) e.preventDefault();
      const usernameInput = document.getElementById('login-username');
      const username = (usernameInput && usernameInput.value ? usernameInput.value : 'admin').trim();
      localStorage.setItem('delta_user', JSON.stringify({ username, loggedAt: new Date().toISOString() }));
      if (this.loginModal) {
        this.loginModal.style.display = 'none';
        this.loginModal.classList.add('hidden');
        this.loginModal.classList.remove('flex');
      }
      this.renderCategories();
      this.renderTablesSelector();
      this.renderProducts();
      this.renderComanda();
    };

    if (this.loginForm) {
      this.loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value.trim();
        localStorage.setItem('delta_user', JSON.stringify({ username, loggedAt: new Date().toISOString() }));
        if (this.loginModal) this.loginModal.classList.add('hidden');
      });
      this.loginForm.addEventListener('submit', doLogin);
    }
    const submitBtn = document.getElementById('login-submit-btn');
    if (submitBtn) {
      submitBtn.addEventListener('click', doLogin);
    }

    // Evento de Logout
    if (this.logoutBtn) {
      this.logoutBtn.addEventListener('click', () => {
        if (confirm('¿Deseas cerrar sesión en Delta POS?')) {
          localStorage.removeItem('delta_user');
          if (this.loginModal) this.loginModal.classList.remove('hidden');
          if (this.loginModal) {
            this.loginModal.style.display = 'flex';
            this.loginModal.classList.remove('hidden');
            this.loginModal.classList.add('flex');
          }
        }
      });
    }
    // ------------------------------------------------------------------------
    // NAVEGACIÓN LATERAL
    // ------------------------------------------------------------------------
    if (this.navPosBtn) {
      this.navPosBtn.addEventListener('click', () => {
        this.setActiveNav('pos');
        this.closeAllModals();
      });
    }

    if (this.navTablesBtn) {
      this.navTablesBtn.addEventListener('click', () => {
        this.setActiveNav('tables');
        this.openTablesModal();
      });
    }

    if (this.navStockBtn) {
      this.navStockBtn.addEventListener('click', () => {
        this.setActiveNav('stock');
        this.openStockModal();
      });
    }

    if (this.navCajaBtn) {
      this.navCajaBtn.addEventListener('click', () => {
        this.setActiveNav('caja');
        this.openCajaModal();
      });
    }

    if (this.navReportsBtn) {
      this.navReportsBtn.addEventListener('click', () => {
        this.setActiveNav('reports');
        this.openReportsModal();
      });
    }

    // ------------------------------------------------------------------------
    // EVENTOS DEL MODAL DE MESAS
    // ------------------------------------------------------------------------
    const closeTablesBtn = document.getElementById('close-tables-modal-btn');
    if (closeTablesBtn) {
      closeTablesBtn.addEventListener('click', () => {
        this.closeTablesModal();
      });
    }

    // Filtros de mesas (Todas, Libres, Ocupadas)
    document.querySelectorAll('.tables-filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tables-filter-btn').forEach(b => {
          b.classList.remove('active', 'bg-white', 'shadow-xs', 'text-slate-900');
          b.classList.add('text-slate-600');
        });
        const activeBtn = e.currentTarget;
        activeBtn.classList.add('active', 'bg-white', 'shadow-xs', 'text-slate-900');
        activeBtn.classList.remove('text-slate-600');
        
        this.tableFilter = activeBtn.dataset.filter;
        this.renderTablesGrid();
      });
    });

    // Botón agregar nueva mesa
    const addTableBtn = document.getElementById('add-new-table-btn');
    if (addTableBtn) {
      addTableBtn.addEventListener('click', () => {
        const nextNum = state.tables.length + 1;
        const tableName = prompt('Nombre de la nueva mesa o zona:', `Mesa 0${nextNum}`);
        if (tableName && tableName.trim()) {
          const newId = 'table_' + Date.now();
          state.tables.push({
            id: newId,
            name: tableName.trim(),
            capacity: 4,
            status: 'free'
          });
          state.saveState();
          this.renderTablesSelector();
          this.renderTablesGrid();
        }
      });
    }

    // ------------------------------------------------------------------------
    // EVENTOS DEL MODAL DE STOCK
    // ------------------------------------------------------------------------
    const closeStockBtn = document.getElementById('close-stock-modal-btn');
    if (closeStockBtn) {
      closeStockBtn.addEventListener('click', () => {
        this.stockModal.classList.add('hidden');
        this.stockModal.classList.remove('flex');
        this.setActiveNav('pos');
      });
    }

    const stockSearch = document.getElementById('stock-search-input');
    if (stockSearch) {
      stockSearch.addEventListener('input', (e) => {
        this.renderStockTable(e.target.value.toLowerCase());
      });
    }

    // ------------------------------------------------------------------------
    // EVENTOS DEL MODAL DE REPORTES
    // ------------------------------------------------------------------------
    const closeReportsBtn = document.getElementById('close-reports-modal-btn');
    if (closeReportsBtn) {
      closeReportsBtn.addEventListener('click', () => {
        this.reportsModal.classList.add('hidden');
        this.reportsModal.classList.remove('flex');
        this.setActiveNav('pos');
      });
    }

    // ------------------------------------------------------------------------
    // BÚSQUEDA Y COMANDA
    // ------------------------------------------------------------------------
    if (this.searchInput) {
      this.searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.toLowerCase();
        this.renderProducts();
      });
    }

    if (this.customerInput) {
      this.customerInput.addEventListener('input', (e) => {
        CartController.setCustomerName(e.target.value);
      });
    }

    if (this.tableSelector) {
      this.tableSelector.addEventListener('change', (e) => {
        state.setActiveTable(e.target.value);
      });
    }

    if (this.payBtn) {
      this.payBtn.addEventListener('click', () => {
        PaymentController.openModal();
      });
    }

    if (this.sendKitchenBtn) {
      this.sendKitchenBtn.addEventListener('click', () => {
        PrintController.printKitchenOrder();
      });
    }

    if (this.saveOrderBtn) {
      this.saveOrderBtn.addEventListener('click', () => {
        const order = state.getCurrentOrder();
        if (!order || order.items.length === 0) {
          alert('No hay productos en la comanda para guardar.');
          return;
        }
        alert('Mesa y comanda guardadas correctamente.');
      });
    }

    if (this.clearCartBtn) {
      this.clearCartBtn.addEventListener('click', () => {
        const order = state.getCurrentOrder();
        if (order.items.length > 0 && confirm('¿Deseas vaciar todos los productos de esta comanda?')) {
          CartController.clearCart();
        }
      });
    }

    if (this.addDiscountBtn) {
      this.addDiscountBtn.addEventListener('click', () => {
        const currentDiscount = state.getCurrentOrder().discount || 0;
        const discountInput = prompt('Ingresa el monto de descuento en Colones (₡):', currentDiscount > 0 ? currentDiscount : '');
        if (discountInput !== null) {
          const discountVal = parseFloat(discountInput) || 0;
          CartController.setDiscount(discountVal);
        }
      });
    }

    // Eventos de Notas de ítem
    if (this.saveNoteBtn) {
      this.saveNoteBtn.addEventListener('click', () => {
        if (this.activeNoteItemId) {
          CartController.updateItemNotes(this.activeNoteItemId, this.noteInput.value);
          this.closeNoteModal();
        }
      });
    }

    if (this.closeNoteBtn) {
      this.closeNoteBtn.addEventListener('click', () => {
        this.closeNoteModal();
      });
    }

    // Atajos de teclado rápidos
    window.addEventListener('keydown', (e) => {
      if (e.key === 'F2') {
        e.preventDefault();
        PaymentController.openModal();
      }
      if (e.key === 'Escape') {
        this.closeAllModals();
      }
    });
  }

  setActiveNav(tab) {
    const navButtons = [this.navPosBtn, this.navTablesBtn, this.navStockBtn, this.navCajaBtn, this.navReportsBtn];
    navButtons.forEach(btn => {
      if (!btn) return;
      btn.classList.remove('text-slate-900', 'bg-slate-100', 'active');
      btn.classList.add('text-slate-400');
    });

    const targetMap = {
      pos: this.navPosBtn,
      tables: this.navTablesBtn,
      stock: this.navStockBtn,
      caja: this.navCajaBtn,
      reports: this.navReportsBtn
    };

    if (targetMap[tab]) {
      targetMap[tab].classList.add('text-slate-900', 'bg-slate-100', 'active');
      targetMap[tab].classList.remove('text-slate-400');
    }
  }

  closeAllModals() {
    if (this.tablesModal) {
      this.tablesModal.classList.add('hidden');
      this.tablesModal.classList.remove('flex');
    }
    if (this.stockModal) {
      this.stockModal.classList.add('hidden');
      this.stockModal.classList.remove('flex');
    }
    if (this.cajaModal) {
      this.cajaModal.classList.add('hidden');
      this.cajaModal.classList.remove('flex');
    }
    if (this.productEditorModal) {
      this.productEditorModal.classList.add('hidden');
      this.productEditorModal.classList.remove('flex');
    }
    if (this.reportsModal) {
      this.reportsModal.classList.add('hidden');
      this.reportsModal.classList.remove('flex');
    }
    PaymentController.closeModal();
    this.closeNoteModal();
  }

  openCajaModal() {
    this.closeAllModals();
    this.setActiveNav('caja');
    CajaController.openModal();
  }

  bindProductEditorEvents() {
    const btnNuevo = document.getElementById('btn-nuevo-producto');
    const closeBtn = document.getElementById('close-product-editor-btn');
    const cancelBtn = document.getElementById('cancel-product-editor-btn');
    const form = document.getElementById('product-editor-form');
    const imageInput = document.getElementById('prod-edit-image');
    const previewImg = document.getElementById('prod-edit-preview');

    if (btnNuevo) {
      btnNuevo.addEventListener('click', () => {
        this.openProductEditor(null);
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.closeProductEditor();
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.closeProductEditor();
      });
    }

    if (imageInput && previewImg) {
      imageInput.addEventListener('input', () => {
        const val = imageInput.value.trim();
        if (val) previewImg.src = val;
      });
    }

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('prod-edit-id')?.value;
        const name = document.getElementById('prod-edit-name')?.value;
        const price = parseFloat(document.getElementById('prod-edit-price')?.value) || 0;
        const sku = document.getElementById('prod-edit-sku')?.value;
        const category = document.getElementById('prod-edit-category')?.value;
        const stock = parseInt(document.getElementById('prod-edit-stock')?.value, 10) || 0;
        const image = document.getElementById('prod-edit-image')?.value;

        if (!name || price < 0) {
          alert('Por favor completa todos los campos requeridos con valores válidos.');
          return;
        }

        const data = { name, price, sku, category, stock, image, taxRate: 0.13 };

        if (id) {
          await state.updateProduct(id, data);
        } else {
          await state.addProduct(data);
        }

        this.closeProductEditor();
        this.renderStockTable(document.getElementById('stock-search-input')?.value.toLowerCase() || '');
        this.renderProducts();
      });
    }
  }

  openProductEditor(product = null) {
    const titleEl = document.getElementById('product-editor-title');
    const idInput = document.getElementById('prod-edit-id');
    const nameInput = document.getElementById('prod-edit-name');
    const priceInput = document.getElementById('prod-edit-price');
    const skuInput = document.getElementById('prod-edit-sku');
    const catInput = document.getElementById('prod-edit-category');
    const stockInput = document.getElementById('prod-edit-stock');
    const imgInput = document.getElementById('prod-edit-image');
    const previewImg = document.getElementById('prod-edit-preview');

    if (product) {
      if (titleEl) titleEl.textContent = 'Editar Producto';
      if (idInput) idInput.value = product.id;
      if (nameInput) nameInput.value = product.name;
      if (priceInput) priceInput.value = product.price;
      if (skuInput) skuInput.value = product.sku;
      if (catInput) catInput.value = product.category;
      if (stockInput) stockInput.value = product.stock;
      if (imgInput) imgInput.value = product.image;
      if (previewImg) previewImg.src = product.image;
    } else {
      const nextId = 'prod_' + Date.now();
      const nextSku = 'SKU-' + (state.products.length + 1).toString().padStart(3, '0');
      const defaultImg = 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=600&q=80';

      if (titleEl) titleEl.textContent = 'Crear Nuevo Producto';
      if (idInput) idInput.value = '';
      if (nameInput) nameInput.value = '';
      if (priceInput) priceInput.value = '2500';
      if (skuInput) skuInput.value = nextSku;
      if (catInput) catInput.value = 'cafeteria';
      if (stockInput) stockInput.value = '50';
      if (imgInput) imgInput.value = defaultImg;
      if (previewImg) previewImg.src = defaultImg;
    }

    if (this.productEditorModal) {
      this.productEditorModal.classList.remove('hidden');
      this.productEditorModal.classList.add('flex');
      nameInput?.focus();
    }
  }

  closeProductEditor() {
    if (this.productEditorModal) {
      this.productEditorModal.classList.add('hidden');
      this.productEditorModal.classList.remove('flex');
    }
  }

  // --------------------------------------------------------------------------
  // RENDERIZADO DEL MAPA DE MESAS
  // --------------------------------------------------------------------------
  openTablesModal() {
    this.renderTablesGrid();
    this.tablesModal.classList.remove('hidden');
    this.tablesModal.classList.add('flex');
  }

  closeTablesModal() {
    this.tablesModal.classList.add('hidden');
    this.tablesModal.classList.remove('flex');
    this.setActiveNav('pos');
  }

  renderTablesGrid() {
    const container = document.getElementById('tables-grid-container');
    if (!container) return;
    container.innerHTML = '';

    const filteredTables = state.tables.filter(table => {
      const order = state.orders[table.id];
      const isOccupied = order && order.items && order.items.length > 0;
      if (this.tableFilter === 'free') return !isOccupied;
      if (this.tableFilter === 'busy') return isOccupied;
      return true;
    });

    filteredTables.forEach(table => {
      const order = state.orders[table.id];
      const hasItems = order && order.items && order.items.length > 0;
      const isCurrentActive = table.id === state.activeTableId;
      const totals = hasItems ? CartController.calculateTotals(order) : null;
      const isKitchenSent = order && order.status === 'sent_to_kitchen';

      let statusBadge = '';
      let borderClass = 'border-slate-200';
      let bgClass = 'bg-white';

      if (isKitchenSent) {
        statusBadge = '<span class="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold text-[10px]">Cocina</span>';
        borderClass = 'border-blue-300 ring-2 ring-blue-500/20';
        bgClass = 'bg-blue-50/30';
      } else if (hasItems) {
        statusBadge = '<span class="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-[10px]">Ocupada</span>';
        borderClass = 'border-amber-300 ring-2 ring-amber-500/20';
        bgClass = 'bg-amber-50/20';
      } else {
        statusBadge = '<span class="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px]">Libre</span>';
      }

      const card = document.createElement('div');
      card.className = `p-4 rounded-2xl border ${borderClass} ${bgClass} shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between relative group ${
        isCurrentActive ? 'ring-2 ring-slate-900 ring-offset-2' : ''
      }`;

      card.innerHTML = `
        <div>
          <div class="flex justify-between items-start mb-2">
            <div>
              <h4 class="text-sm font-extrabold text-slate-800">${table.name}</h4>
              <p class="text-[11px] text-slate-400">Cap: ${table.capacity} personas</p>
            </div>
            ${statusBadge}
          </div>

          ${hasItems ? `
            <div class="my-3 p-2.5 bg-white rounded-xl border border-slate-100 shadow-xs">
              <div class="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                <span>${totals.itemCount} productos</span>
                <span class="font-black text-slate-900">${CartController.formatMoney(totals.total)}</span>
              </div>
              <p class="text-[10px] text-slate-400 truncate">Ticket #${order.ticketNumber} ${order.customerName ? `• ${order.customerName}` : ''}</p>
            </div>
          ` : `
            <div class="my-3 py-3 text-center text-[11px] text-slate-400 border border-dashed border-slate-200 rounded-xl">
              Disponible para clientes
            </div>
          `}
        </div>

        <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
          <span class="text-[11px] font-bold text-slate-500 group-hover:text-slate-900 transition-colors">
            ${isCurrentActive ? '👉 Seleccionada' : 'Abrir Comanda →'}
          </span>
          ${hasItems ? `
            <button class="free-table-btn text-[10px] text-rose-500 hover:text-rose-700 font-bold" data-id="${table.id}">
              Liberar
            </button>
          ` : ''}
        </div>
      `;

      card.addEventListener('click', (e) => {
        if (e.target.classList.contains('free-table-btn')) {
          e.stopPropagation();
          if (confirm(`¿Deseas liberar ${table.name} y vaciar su comanda?`)) {
            delete state.orders[table.id];
            state.ensureOrderExists(table.id);
            table.status = 'free';
            state.saveState();
            state.notify();
            this.renderTablesGrid();
          }
          return;
        }

        state.setActiveTable(table.id);
        this.closeTablesModal();
      });

      container.appendChild(card);
    });
  }

  // --------------------------------------------------------------------------
  // RENDERIZADO DEL STOCK / INVENTARIO
  // --------------------------------------------------------------------------
  openStockModal() {
    this.renderStockTable();
    this.stockModal.classList.remove('hidden');
    this.stockModal.classList.add('flex');
  }

  renderStockTable(query = '') {
    const tbody = document.getElementById('stock-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    const filtered = state.products.filter(p => {
      if (!query) return true;
      return p.name.toLowerCase().includes(query) || p.sku.toLowerCase().includes(query);
    });

    filtered.forEach(p => {
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-slate-50 transition-colors';
      tr.innerHTML = `
        <td class="p-3 font-semibold text-slate-800 flex items-center gap-2">
          <img src="${p.image}" alt="${p.name}" class="w-8 h-8 rounded-lg object-cover border border-slate-200">
          <span class="truncate max-w-[180px] font-bold" title="${p.name}">${p.name}</span>
        </td>
        <td class="p-3 text-slate-500 font-mono text-[11px]">${p.sku}</td>
        <td class="p-3 text-slate-600 uppercase text-[10px] font-extrabold">
          <span class="px-2 py-0.5 rounded-md bg-slate-100">${p.category}</span>
        </td>
        <td class="p-3 font-black text-slate-900">${CartController.formatMoney(p.price)}</td>
        <td class="p-3 text-center">
          <span class="px-2.5 py-1 rounded-full font-bold text-xs ${
            p.stock <= 5 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'
          }">
            ${p.stock} un.
          </span>
        </td>
        <td class="p-3 text-center">
          <div class="inline-flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
            <button class="stock-minus-btn w-6 h-6 rounded bg-white hover:bg-slate-200 text-xs font-bold shadow-xs cursor-pointer" data-id="${p.id}">-</button>
            <button class="stock-plus-btn w-6 h-6 rounded bg-white hover:bg-slate-200 text-xs font-bold shadow-xs cursor-pointer" data-id="${p.id}">+</button>
          </div>
        </td>
        <td class="p-3 text-right">
          <div class="inline-flex items-center gap-1.5">
            <button class="edit-product-btn px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-700 text-xs font-bold transition-colors cursor-pointer" data-id="${p.id}">
              ✏️ Editar
            </button>
            <button class="delete-product-btn p-1 rounded-lg bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-600 text-xs font-bold transition-colors cursor-pointer" title="Eliminar producto" data-id="${p.id}">
              🗑️
            </button>
          </div>
        </td>
      `;

      tr.querySelector('.stock-minus-btn').addEventListener('click', () => {
        p.stock = Math.max(0, p.stock - 1);
        state.saveState();
        this.renderStockTable(query);
        this.renderProducts();
      });

      tr.querySelector('.stock-plus-btn').addEventListener('click', () => {
        p.stock += 1;
        state.saveState();
        this.renderStockTable(query);
        this.renderProducts();
      });

      tr.querySelector('.edit-product-btn').addEventListener('click', () => {
        this.openProductEditor(p);
      });

      tr.querySelector('.delete-product-btn').addEventListener('click', async () => {
        if (confirm(`¿Deseas eliminar el producto "${p.name}" del catálogo?`)) {
          await state.deleteProduct(p.id);
          this.renderStockTable(query);
          this.renderProducts();
        }
      });

      tbody.appendChild(tr);
    });
  }

  // --------------------------------------------------------------------------
  // RENDERIZADO DEL CORTE DE CAJA / REPORTES
  // --------------------------------------------------------------------------
  openReportsModal() {
    const seen = new Set();
    const history = (state.salesHistory || []).filter(s => {
      const key = s.ticketNumber ? `ticket_${s.ticketNumber}` : (s.id || JSON.stringify(s));
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const totalSales = history.reduce((acc, sale) => acc + (sale.payment?.totals?.total || 0), 0);
    const countSales = history.length;
    const avgSale = countSales > 0 ? totalSales / countSales : 0;
    const cashSales = history
      .filter(s => (s.payment?.method || '').toLowerCase() === 'cash' || (s.payment?.method || '').toLowerCase().includes('efectivo'))
      .reduce((acc, s) => acc + (s.payment?.totals?.total || 0), 0);

    document.getElementById('metric-total-sales').textContent = CartController.formatMoney(totalSales);
    document.getElementById('metric-count-sales').textContent = countSales;
    document.getElementById('metric-avg-sales').textContent = CartController.formatMoney(avgSale);
    document.getElementById('metric-cash-sales').textContent = CartController.formatMoney(cashSales);

    const tbody = document.getElementById('reports-table-body');
    if (tbody) {
      tbody.innerHTML = '';
      if (history.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-slate-400">No hay ventas registradas en este turno aún.</td></tr>`;
      } else {
        history.forEach(sale => {
          const tr = document.createElement('tr');
          tr.className = 'hover:bg-slate-50';
          const timeFormatted = new Date(sale.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          tr.innerHTML = `
            <td class="p-3 font-mono font-bold text-slate-900">#${sale.ticketNumber}</td>
            <td class="p-3 font-semibold text-slate-700">${sale.tableName}</td>
            <td class="p-3 text-slate-500">${sale.customerName || 'Consumidor Final'}</td>
            <td class="p-3 text-slate-400">${timeFormatted}</td>
            <td class="p-3"><span class="px-2 py-0.5 rounded uppercase font-bold text-[10px] bg-slate-100 text-slate-700">${sale.payment.method}</span></td>
            <td class="p-3 text-right font-black text-slate-900">${CartController.formatMoney(sale.payment.totals.total)}</td>
            <td class="p-3 text-center">
              <button class="reprint-btn text-xs font-bold text-blue-600 hover:underline" data-id="${sale.id}">
                Reimprimir
              </button>
            </td>
          `;

          tr.querySelector('.reprint-btn').addEventListener('click', () => {
            PrintController.showReceiptModal(sale);
          });

          tbody.appendChild(tr);
        });
      }
    }

    this.reportsModal.classList.remove('hidden');
    this.reportsModal.classList.add('flex');
  }

  // --------------------------------------------------------------------------
  // FUNCIONES BASE DE LA INTERFAZ
  // --------------------------------------------------------------------------
  renderCategories() {
    if (!this.categoriesContainer) return;
    this.categoriesContainer.innerHTML = '';

    CATEGORIES.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = `category-pill px-4 py-2 rounded-xl text-xs font-semibold tracking-wide border transition-all ${
        state.selectedCategory === cat.id
          ? 'bg-slate-900 text-white border-slate-900 shadow-md'
          : 'bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50 hover:border-slate-300'
      }`;
      btn.textContent = cat.name;
      btn.addEventListener('click', () => {
        state.selectedCategory = cat.id;
        this.renderCategories();
        this.renderProducts();
      });
      this.categoriesContainer.appendChild(btn);
    });
  }

  renderTablesSelector() {
    if (!this.tableSelector) return;
    this.tableSelector.innerHTML = '';

    state.tables.forEach(table => {
      const option = document.createElement('option');
      option.value = table.id;
      
      const hasOrder = state.orders[table.id] && state.orders[table.id].items.length > 0;
      const statusIcon = hasOrder ? '● (Ocupada)' : '○ (Libre)';
      option.textContent = `${table.name} ${statusIcon}`;
      
      if (table.id === state.activeTableId) {
        option.selected = true;
      }
      this.tableSelector.appendChild(option);
    });
  }

  renderProducts() {
    if (!this.productsGrid) return;
    this.productsGrid.innerHTML = '';

    const filtered = state.products.filter(p => {
      const matchesCategory = state.selectedCategory === 'todos' || p.category === state.selectedCategory;
      const matchesSearch = !state.searchQuery || 
        p.name.toLowerCase().includes(state.searchQuery) || 
        p.sku.toLowerCase().includes(state.searchQuery);
      return matchesCategory && matchesSearch;
    });

    if (filtered.length === 0) {
      this.productsGrid.innerHTML = `
        <div class="col-span-full py-16 text-center text-slate-400">
          <svg class="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
          <p class="text-sm font-medium">No se encontraron productos coincidentes</p>
        </div>
      `;
      return;
    }

    filtered.forEach(product => {
      const card = document.createElement('div');
      card.className = 'product-card bg-white rounded-2xl p-3 border border-slate-200/80 shadow-sm flex flex-col justify-between relative overflow-hidden group';
      
      card.innerHTML = `
        <div class="relative w-full h-32 rounded-xl overflow-hidden bg-slate-100 mb-2.5">
          <img 
            src="${product.image}" 
            alt="${product.name}" 
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          <div class="absolute top-2 right-2 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-lg text-xs font-bold text-slate-900 shadow-sm">
            ${CartController.formatMoney(product.price)}
          </div>
          ${product.stock <= 5 ? `
            <div class="absolute bottom-2 left-2 bg-amber-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
              Quedan ${product.stock}
            </div>
          ` : ''}
        </div>
        
        <div class="flex-1 flex flex-col justify-between">
          <h3 class="text-xs font-bold text-slate-800 line-clamp-2 leading-tight mb-1" title="${product.name}">
            ${product.name}
          </h3>
          <div class="flex items-center justify-between text-[11px] text-slate-400 mt-1">
            <span>${product.sku}</span>
            <span class="text-emerald-600 font-semibold group-hover:translate-x-0.5 transition-transform">+ Agregar</span>
          </div>
        </div>
      `;

      card.addEventListener('click', () => {
        CartController.addItem(product, 1);
        card.classList.add('ring-2', 'ring-emerald-500', 'ring-offset-1');
        setTimeout(() => card.classList.remove('ring-2', 'ring-emerald-500', 'ring-offset-1'), 200);
      });

      this.productsGrid.appendChild(card);
    });
  }

  renderComanda() {
    const order = state.getCurrentOrder();
    const totals = CartController.calculateTotals(order);

    // Actualizar encabezados
    if (this.ticketNumberDisplay) {
      this.ticketNumberDisplay.textContent = `#${order.ticketNumber}`;
    }
    if (this.customerInput) {
      this.customerInput.value = order.customerName || '';
    }
    if (this.itemCountBadge) {
      this.itemCountBadge.textContent = `${totals.itemCount} ${totals.itemCount === 1 ? 'ítem' : 'ítems'}`;
    }

    // Renderizar lista de ítems
    if (!this.comandaItemsContainer) return;
    this.comandaItemsContainer.innerHTML = '';

    if (!order.items || order.items.length === 0) {
      if (this.comandaEmptyState) {
        this.comandaEmptyState.classList.remove('hidden');
        this.comandaEmptyState.classList.add('flex');
        this.comandaEmptyState.style.display = 'flex';
      }
    } else {
      if (this.comandaEmptyState) {
        this.comandaEmptyState.classList.add('hidden');
        this.comandaEmptyState.classList.remove('flex');
        this.comandaEmptyState.style.display = 'none';
      }

      order.items.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'comanda-item p-3 rounded-xl border border-slate-200/80 bg-white shadow-xs flex items-start gap-3 relative group transition-all hover:border-slate-300';
        
        itemEl.innerHTML = `
          <div class="w-11 h-11 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0 mt-0.5 border border-slate-100">
            <img src="${item.image}" alt="${item.name}" class="w-full h-full object-cover">
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex justify-between items-start">
              <h4 class="text-xs font-bold text-slate-800 truncate pr-2" title="${item.name}">${item.name}</h4>
              <span class="text-xs font-black text-slate-900">${CartController.formatMoney(item.price * item.quantity)}</span>
            </div>

            <div class="text-[11px] text-slate-400 mt-0.5">
              ${CartController.formatMoney(item.price)} c/u
            </div>

            ${item.notes ? `
              <div class="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded mt-1.5 flex items-center gap-1 border border-amber-200/60">
                <span>📝 ${item.notes}</span>
              </div>
            ` : ''}

            <div class="flex items-center justify-between mt-2 pt-1 border-t border-slate-100">
              <button class="add-note-btn text-[10px] font-semibold text-slate-500 hover:text-slate-800 hover:underline flex items-center gap-1 cursor-pointer" data-id="${item.id}">
                ${item.notes ? '✏️ Nota' : '+ Nota'}
              </button>

              <div class="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                <button class="qty-btn-minus w-6 h-6 flex items-center justify-center rounded-md bg-white hover:bg-slate-200 text-slate-700 font-bold text-xs shadow-xs transition-all cursor-pointer" data-id="${item.id}">
                  -
                </button>
                <span class="text-xs font-bold text-slate-800 px-1.5 min-w-[20px] text-center">${item.quantity}</span>
                <button class="qty-btn-plus w-6 h-6 flex items-center justify-center rounded-md bg-white hover:bg-slate-200 text-slate-700 font-bold text-xs shadow-xs transition-all cursor-pointer" data-id="${item.id}">
                  +
                </button>
                <button class="remove-item-btn w-6 h-6 flex items-center justify-center rounded-md bg-white hover:bg-rose-50 text-rose-500 hover:text-rose-700 font-bold text-xs shadow-xs transition-all cursor-pointer ml-0.5" title="Eliminar ítem" data-id="${item.id}">
                  ✕
                </button>
              </div>
            </div>
          </div>
        `;

        // Eventos de cantidad
        itemEl.querySelector('.qty-btn-minus').addEventListener('click', (e) => {
          e.stopPropagation();
          CartController.updateQuantity(item.id, -1);
        });
        itemEl.querySelector('.qty-btn-plus').addEventListener('click', (e) => {
          e.stopPropagation();
          CartController.updateQuantity(item.id, 1);
        });
        itemEl.querySelector('.remove-item-btn').addEventListener('click', (e) => {
          e.stopPropagation();
          CartController.removeItem(item.id);
        });

        // Evento de notas
        itemEl.querySelector('.add-note-btn').addEventListener('click', (e) => {
          e.stopPropagation();
          this.openNoteModal(item.id, item.notes || '');
        });

        this.comandaItemsContainer.appendChild(itemEl);
      });
    }

    // Actualizar Totales
    if (this.subtotalDisplay) this.subtotalDisplay.textContent = CartController.formatMoney(totals.subtotal);
    if (this.taxDisplay) this.taxDisplay.textContent = CartController.formatMoney(totals.tax);
    if (this.taxLabel) this.taxLabel.textContent = `${state.settings.taxName} (${totals.taxRatePercentage}%):`;
    if (this.discountDisplay) this.discountDisplay.textContent = totals.discount > 0 ? `-${CartController.formatMoney(totals.discount)}` : CartController.formatMoney(0);
    if (this.totalDisplay) this.totalDisplay.textContent = CartController.formatMoney(totals.total);
  }

  openNoteModal(itemId, currentNotes) {
    this.activeNoteItemId = itemId;
    if (this.noteInput) {
      this.noteInput.value = currentNotes;
      this.noteModal.classList.remove('hidden');
      this.noteModal.classList.add('flex');
      this.noteInput.focus();
    }
  }

  closeNoteModal() {
    this.activeNoteItemId = null;
    if (this.noteModal) {
      this.noteModal.classList.add('hidden');
      this.noteModal.classList.remove('flex');
    }
  }

  startClock() {
    const updateTime = () => {
      if (this.clockEl) {
        const now = new Date();
        this.clockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
    };
    updateTime();
    setInterval(updateTime, 1000);
  }
}

// Inicializar la aplicación de forma robusta como Singleton
function bootstrap() {
  if (!window.posApp) {
    window.posApp = new DeltaPOSApp();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
} else {
  bootstrap();
}
