/**
 * PROYECTO DELTA POS - Controlador del Panel de Administración (Gamma POS Style)
 */

import { state } from './state.js';
import { CartController } from './cart.js';
import { PrintController } from './print.js';

export class AdminController {
  static init() {
    if (this.initialized) return;
    this.initialized = true;

    this.isAdminAuthorized = false;

    // Referencias a Modales
    this.modalPanelAdmin = document.getElementById('modal-panel-admin');
    this.modalPin = document.getElementById('modal-admin-pin');
    this.modalDashboard = document.getElementById('modal-admin-dashboard');
    this.modalPersonal = document.getElementById('modal-admin-personal');
    this.modalUserEdit = document.getElementById('modal-admin-user-edit');
    this.modalKardex = document.getElementById('modal-admin-kardex');
    this.modalInsumoEdit = document.getElementById('modal-admin-insumo-edit');
    this.modalKardexMov = document.getElementById('modal-admin-kardex-mov');
    this.modalRecetas = document.getElementById('modal-admin-recetas');
    this.modalHappyHour = document.getElementById('modal-admin-happyhour');
    this.modalFlags = document.getElementById('modal-admin-flags');
    this.modalImpresoras = document.getElementById('modal-admin-impresoras');
    this.modalBackup = document.getElementById('modal-admin-backup');

    this.bindEvents();
    this.checkHappyHourAuto();
    setInterval(() => this.checkHappyHourAuto(), 60000);
  }

  static bindEvents() {
    // Botón de navegación lateral
    const btnNavAdmin = document.getElementById('nav-admin-btn');
    if (btnNavAdmin) {
      btnNavAdmin.addEventListener('click', () => {
        this.openAdminPanel();
      });
    }

    // Botón cerrar modal panel admin
    const btnClosePanel = document.getElementById('close-admin-panel-btn');
    if (btnClosePanel) {
      btnClosePanel.addEventListener('click', () => {
        this.closeModal(this.modalPanelAdmin);
      });
    }

    // 1. PIN de Seguridad
    const btnSubmitPin = document.getElementById('admin-pin-submit-btn');
    const inputPin = document.getElementById('admin-pin-input');
    const btnClosePin = document.getElementById('close-admin-pin-btn');

    if (btnSubmitPin && inputPin) {
      btnSubmitPin.addEventListener('click', async () => {
        const pin = inputPin.value.trim();
        const res = await state.verifyAdminPin(pin);
        if (res.ok) {
          this.isAdminAuthorized = true;
          this.closeModal(this.modalPin);
          inputPin.value = '';
          this.showPanelGrid();
        } else {
          alert('❌ PIN Incorrecto. El PIN maestro por defecto es: 1234');
          inputPin.value = '';
          inputPin.focus();
        }
      });

      inputPin.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') btnSubmitPin.click();
      });
    }

    if (btnClosePin) {
      btnClosePin.addEventListener('click', () => this.closeModal(this.modalPin));
    }

    // Botones de las Tarjetas del Panel Admin
    document.querySelectorAll('.admin-nav-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const target = e.currentTarget.dataset.action;
        this.handleCardAction(target);
      });
    });

    // 2. Personal / Empleados
    const btnNuevoUsuario = document.getElementById('btn-nuevo-usuario-admin');
    if (btnNuevoUsuario) {
      btnNuevoUsuario.addEventListener('click', () => this.openUserEditModal(null));
    }

    const formUser = document.getElementById('form-user-edit');
    if (formUser) {
      formUser.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('user-edit-id')?.value;
        const nombre = document.getElementById('user-edit-nombre')?.value;
        const usuario = document.getElementById('user-edit-usuario')?.value;
        const rol = document.getElementById('user-edit-rol')?.value;
        const pin = document.getElementById('user-edit-pin')?.value;
        const password = document.getElementById('user-edit-password')?.value;

        if (!nombre || !usuario || !pin) {
          alert('Por favor completa los campos requeridos');
          return;
        }

        const data = { nombre, usuario, rol, pin, password };
        if (id) {
          await state.updateUser(id, data);
        } else {
          await state.addUser(data);
        }

        this.closeModal(this.modalUserEdit);
        this.renderUsers();
      });
    }

    // 3. Inventario & Kárdex
    const btnNuevoInsumo = document.getElementById('btn-nuevo-insumo-admin');
    if (btnNuevoInsumo) {
      btnNuevoInsumo.addEventListener('click', () => this.openInsumoEditModal());
    }

    const formInsumo = document.getElementById('form-insumo-edit');
    if (formInsumo) {
      formInsumo.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nombre = document.getElementById('insumo-edit-nombre')?.value;
        const categoria = document.getElementById('insumo-edit-categoria')?.value;
        const unidad = document.getElementById('insumo-edit-unidad')?.value;
        const stockActual = parseFloat(document.getElementById('insumo-edit-stock')?.value) || 0;
        const stockMinimo = parseFloat(document.getElementById('insumo-edit-minimo')?.value) || 5;
        const costoUnitario = parseFloat(document.getElementById('insumo-edit-costo')?.value) || 0;

        await state.addInsumo({ nombre, categoria, unidad, stockActual, stockMinimo, costoUnitario });
        this.closeModal(this.modalInsumoEdit);
        this.renderKardex();
      });
    }

    const btnRegistrarKardex = document.getElementById('btn-registrar-mov-kardex');
    if (btnRegistrarKardex) {
      btnRegistrarKardex.addEventListener('click', () => this.openKardexMovModal());
    }

    const formKardexMov = document.getElementById('form-kardex-mov');
    if (formKardexMov) {
      formKardexMov.addEventListener('submit', async (e) => {
        e.preventDefault();
        const insumoId = document.getElementById('kardex-mov-insumo')?.value;
        const tipo = document.getElementById('kardex-mov-tipo')?.value;
        const cantidad = parseFloat(document.getElementById('kardex-mov-cantidad')?.value) || 0;
        const motivo = document.getElementById('kardex-mov-motivo')?.value;

        if (!insumoId || cantidad <= 0) {
          alert('Por favor selecciona un insumo y una cantidad válida');
          return;
        }

        await state.addKardexMovement(insumoId, tipo, cantidad, motivo, state.settings.cashierName || 'Admin');
        this.closeModal(this.modalKardexMov);
        this.renderKardex();
      });
    }

    // 4. Happy Hour Form
    const formHappyHour = document.getElementById('form-admin-happyhour');
    if (formHappyHour) {
      formHappyHour.addEventListener('submit', async (e) => {
        e.preventDefault();
        const activo = document.getElementById('hh-switch-activo')?.checked || false;
        const titulo = document.getElementById('hh-input-titulo')?.value || 'HAPPY HOUR 2x1';
        const modo = document.getElementById('hh-select-modo')?.value || '2x1';
        const horaInicio = document.getElementById('hh-input-inicio')?.value || '16:00';
        const horaFin = document.getElementById('hh-input-fin')?.value || '19:00';

        const diasChecked = [];
        document.querySelectorAll('.hh-day-check:checked').forEach(chk => {
          diasChecked.push(chk.value);
        });

        const newHh = { activo, titulo, modo, horaInicio, horaFin, dias: diasChecked };
        await state.saveAdminSettings('happyHour', newHh);
        this.closeModal(this.modalHappyHour);
        this.checkHappyHourAuto();
        alert('✅ Configuración de Happy Hour actualizada.');
      });
    }

    // 5. Feature Flags Form
    const formFlags = document.getElementById('form-admin-flags');
    if (formFlags) {
      formFlags.addEventListener('submit', async (e) => {
        e.preventDefault();
        const servicioMesa10 = document.getElementById('flag-servicio-10')?.checked || false;
        const bimonedaUsd = document.getElementById('flag-bimoneda-usd')?.checked || false;
        const tipoCambioUsd = parseFloat(document.getElementById('flag-tipo-cambio')?.value) || 520;
        const cierreCiegoX = document.getElementById('flag-cierre-ciego')?.checked || false;
        const autoImprimirTicket = document.getElementById('flag-auto-print')?.checked || false;

        const newFlags = { servicioMesa10, bimonedaUsd, tipoCambioUsd, cierreCiegoX, autoImprimirTicket };
        await state.saveAdminSettings('flags', newFlags);
        this.closeModal(this.modalFlags);
        alert('✅ Características y Feature Flags actualizadas correctamente.');
      });
    }

    // 6. Impresoras Térmicas Form
    const formImpresoras = document.getElementById('form-admin-impresoras');
    if (formImpresoras) {
      formImpresoras.addEventListener('submit', async (e) => {
        e.preventDefault();
        const anchoPapel = document.getElementById('printer-paper-width')?.value || '80mm';
        const autoCorte = document.getElementById('printer-auto-cut')?.checked || false;
        const copias = parseInt(document.getElementById('printer-copies')?.value, 10) || 1;
        const encabezado = document.getElementById('printer-header')?.value || '';
        const piePagina = document.getElementById('printer-footer')?.value || '';

        const newPrinters = { anchoPapel, autoCorte, copias, encabezado, piePagina };
        await state.saveAdminSettings('impresoras', newPrinters);
        this.closeModal(this.modalImpresoras);
        alert('✅ Ajustes de Impresoras Térmicas guardados.');
      });
    }

    // 7. Backup & Purga
    const btnExportarJson = document.getElementById('btn-exportar-backup-json');
    if (btnExportarJson) {
      btnExportarJson.addEventListener('click', () => {
        const backupData = {
          exportadoEn: new Date().toISOString(),
          sistema: 'Delta POS v2.0',
          datos: {
            productos: state.products,
            mesas: state.tables,
            ventas: state.salesHistory,
            usuarios: state.users,
            insumos: state.insumos,
            kardex: state.kardex,
            cajaHistorial: state.cajaHistorial,
            adminSettings: state.adminSettings
          }
        };

        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
        const dlAnchor = document.createElement('a');
        dlAnchor.setAttribute('href', dataStr);
        dlAnchor.setAttribute('download', `Delta_POS_Backup_${new Date().toISOString().slice(0,10)}.json`);
        document.body.appendChild(dlAnchor);
        dlAnchor.click();
        dlAnchor.remove();
      });
    }

    const btnPurgarVentas = document.getElementById('btn-purgar-ventas-prueba');
    if (btnPurgarVentas) {
      btnPurgarVentas.addEventListener('click', async () => {
        const confirmacion = prompt('⚠️ ATENCIÓN: Esta acción borrará todas las ventas, comandas e historial de turnos de prueba.\n\nEscribe "BORRAR" en mayúsculas para confirmar:');
        if (confirmacion === 'BORRAR') {
          await state.purgeSalesData();
          alert('🧹 Se han purgado todas las ventas y comandas de prueba. El sistema quedó en blanco listo para operar.');
          this.closeModal(this.modalBackup);
        }
      });
    }

    // Botones de cierre de sub-modales
    document.querySelectorAll('.close-admin-submodal-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modalId = e.currentTarget.dataset.modal;
        if (modalId) {
          const el = document.getElementById(modalId);
          if (el) this.closeModal(el);
        }
      });
    });
  }

  // --------------------------------------------------------------------------
  // FLUJO DE APERTURA DEL PANEL
  // --------------------------------------------------------------------------
  static openAdminPanel() {
    if (this.isAdminAuthorized) {
      this.showPanelGrid();
    } else {
      this.openModal(this.modalPin);
      const input = document.getElementById('admin-pin-input');
      if (input) {
        input.value = '';
        setTimeout(() => input.focus(), 150);
      }
    }
  }

  static showPanelGrid() {
    this.openModal(this.modalPanelAdmin);
  }

  static handleCardAction(action) {
    this.closeModal(this.modalPanelAdmin);
    switch (action) {
      case 'dashboard':
        this.openDashboardModal();
        break;
      case 'personal':
        this.openPersonalModal();
        break;
      case 'kardex':
        this.openKardexModal();
        break;
      case 'recetas':
        this.openRecetasModal();
        break;
      case 'happyhour':
        this.openHappyHourModal();
        break;
      case 'flags':
        this.openFlagsModal();
        break;
      case 'impresoras':
        this.openImpresorasModal();
        break;
      case 'backup':
        this.openBackupModal();
        break;
      default:
        break;
    }
  }

  // --------------------------------------------------------------------------
  // 1. DASHBOARD & MÉTRICAS
  // --------------------------------------------------------------------------
  static async openDashboardModal() {
    this.openModal(this.modalDashboard);
    this.renderDashboard();
  }

  static async renderDashboard() {
    const today = new Date().toDateString();
    const ventasHoy = (state.salesHistory || []).filter(v => new Date(v.completedAt).toDateString() === today);
    const totalHoy = ventasHoy.reduce((acc, v) => acc + (v.payment?.totals?.total || 0), 0);
    const countHoy = ventasHoy.length;
    const ticketProm = countHoy > 0 ? Math.round(totalHoy / countHoy) : 0;

    document.getElementById('dash-kpi-total-hoy').textContent = CartController.formatMoney(totalHoy);
    document.getElementById('dash-kpi-cuentas-hoy').textContent = countHoy;
    document.getElementById('dash-kpi-ticket-prom').textContent = CartController.formatMoney(ticketProm);

    // Top 5 Platillos
    const itemMap = {};
    ventasHoy.forEach(v => {
      const items = Array.isArray(v.items) ? v.items : [];
      items.forEach(it => {
        if (!itemMap[it.name]) {
          itemMap[it.name] = { name: it.name, quantity: 0, revenue: 0, image: it.image };
        }
        itemMap[it.name].quantity += Number(it.quantity || 1);
        itemMap[it.name].revenue += (Number(it.price || 0) * Number(it.quantity || 1));
      });
    });

    const topList = Object.values(itemMap).sort((a, b) => b.quantity - a.quantity).slice(0, 5);
    const topContainer = document.getElementById('dash-top-products-list');
    if (topContainer) {
      topContainer.innerHTML = '';
      if (topList.length === 0) {
        topContainer.innerHTML = `<p class="text-xs text-slate-400 py-4 text-center">No hay productos vendidos hoy aún.</p>`;
      } else {
        topList.forEach((prod, idx) => {
          const div = document.createElement('div');
          div.className = 'flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs';
          div.innerHTML = `
            <div class="flex items-center gap-3">
              <span class="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[10px]">${idx + 1}</span>
              <img src="${prod.image || 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=600&q=80'}" class="w-8 h-8 rounded-lg object-cover">
              <div>
                <strong class="text-slate-800 font-bold block">${prod.name}</strong>
                <span class="text-[11px] text-slate-400">${prod.quantity} unidades vendidas</span>
              </div>
            </div>
            <span class="font-black text-slate-900 font-mono">${CartController.formatMoney(prod.revenue)}</span>
          `;
          topContainer.appendChild(div);
        });
      }
    }

    // Gráfico de Ventas por Hora (Distribución en Barras)
    const hoursContainer = document.getElementById('dash-hourly-chart');
    if (hoursContainer) {
      hoursContainer.innerHTML = '';
      const hours = [8, 10, 12, 14, 16, 18, 20, 22];
      const maxCount = Math.max(1, ...hours.map(h => ventasHoy.filter(v => new Date(v.completedAt).getHours() === h).length));

      hours.forEach(h => {
        const count = ventasHoy.filter(v => new Date(v.completedAt).getHours() === h).length;
        const pct = Math.round((count / maxCount) * 100);
        const col = document.createElement('div');
        col.className = 'flex-1 flex flex-col items-center gap-1.5 h-28 justify-end';
        col.innerHTML = `
          <span class="text-[10px] font-bold text-slate-600 font-mono">${count}</span>
          <div class="w-full bg-indigo-500 rounded-t-lg transition-all duration-500 min-h-[4px]" style="height: ${Math.max(4, pct)}%;"></div>
          <span class="text-[10px] font-semibold text-slate-400">${h}:00</span>
        `;
        hoursContainer.appendChild(col);
      });
    }
  }

  // --------------------------------------------------------------------------
  // 2. GESTIÓN DE PERSONAL
  // --------------------------------------------------------------------------
  static openPersonalModal() {
    this.openModal(this.modalPersonal);
    this.renderUsers();
  }

  static renderUsers() {
    const tbody = document.getElementById('admin-users-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    (state.users || []).forEach(u => {
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-slate-50 text-xs border-b border-slate-100';

      const roleBadges = {
        admin: 'bg-purple-100 text-purple-800',
        cajero: 'bg-emerald-100 text-emerald-800',
        salonero: 'bg-blue-100 text-blue-800',
        salonera: 'bg-pink-100 text-pink-800'
      };

      tr.innerHTML = `
        <td class="p-3 font-bold text-slate-900">${u.nombre}</td>
        <td class="p-3 font-mono text-slate-600">${u.usuario}</td>
        <td class="p-3">
          <span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${roleBadges[u.rol] || 'bg-slate-100 text-slate-700'}">
            ${u.rol}
          </span>
        </td>
        <td class="p-3 font-mono font-bold text-slate-700">••••</td>
        <td class="p-3 text-right">
          <button class="edit-user-btn text-blue-600 hover:underline font-bold mr-2" data-id="${u.id}">Editar</button>
          ${u.usuario !== 'admin' ? `<button class="delete-user-btn text-rose-600 hover:underline font-bold" data-id="${u.id}">Eliminar</button>` : ''}
        </td>
      `;

      tr.querySelector('.edit-user-btn')?.addEventListener('click', () => {
        this.openUserEditModal(u);
      });

      tr.querySelector('.delete-user-btn')?.addEventListener('click', async () => {
        if (confirm(`¿Deseas eliminar al usuario ${u.nombre}?`)) {
          await state.deleteUser(u.id);
          this.renderUsers();
        }
      });

      tbody.appendChild(tr);
    });
  }

  static openUserEditModal(user = null) {
    const title = document.getElementById('modal-user-edit-title');
    const idInput = document.getElementById('user-edit-id');
    const nombreInput = document.getElementById('user-edit-nombre');
    const usuarioInput = document.getElementById('user-edit-usuario');
    const rolInput = document.getElementById('user-edit-rol');
    const pinInput = document.getElementById('user-edit-pin');
    const passwordInput = document.getElementById('user-edit-password');

    if (user) {
      if (title) title.textContent = 'Editar Empleado';
      if (idInput) idInput.value = user.id;
      if (nombreInput) nombreInput.value = user.nombre;
      if (usuarioInput) usuarioInput.value = user.usuario;
      if (rolInput) rolInput.value = user.rol;
      if (pinInput) pinInput.value = user.pin;
      if (passwordInput) passwordInput.value = '';
    } else {
      if (title) title.textContent = 'Registrar Nuevo Empleado';
      if (idInput) idInput.value = '';
      if (nombreInput) nombreInput.value = '';
      if (usuarioInput) usuarioInput.value = '';
      if (rolInput) rolInput.value = 'salonero';
      if (pinInput) pinInput.value = '1234';
      if (passwordInput) passwordInput.value = '123456';
    }

    this.openModal(this.modalUserEdit);
  }

  // --------------------------------------------------------------------------
  // 3. INVENTARIO & KÁRDEX
  // --------------------------------------------------------------------------
  static openKardexModal() {
    this.openModal(this.modalKardex);
    this.renderKardex();
  }

  static renderKardex() {
    // Tabla de Insumos
    const tbodyInsumos = document.getElementById('admin-insumos-table-body');
    if (tbodyInsumos) {
      tbodyInsumos.innerHTML = '';
      (state.insumos || []).forEach(ins => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 text-xs border-b border-slate-100';
        const isBajo = Number(ins.stock_actual) <= Number(ins.stock_minimo);

        tr.innerHTML = `
          <td class="p-3 font-bold text-slate-800">${ins.nombre}</td>
          <td class="p-3 text-slate-500">${ins.categoria}</td>
          <td class="p-3">
            <span class="px-2 py-0.5 rounded-full font-black text-xs ${isBajo ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-800'}">
              ${ins.stock_actual} ${ins.unidad}
            </span>
          </td>
          <td class="p-3 text-slate-500">${ins.stock_minimo} ${ins.unidad}</td>
          <td class="p-3 font-mono font-bold text-slate-800">${CartController.formatMoney(ins.costo_unitario)}</td>
        `;
        tbodyInsumos.appendChild(tr);
      });
    }

    // Tabla de Movimientos Kárdex
    const tbodyKardex = document.getElementById('admin-kardex-table-body');
    if (tbodyKardex) {
      tbodyKardex.innerHTML = '';
      if (!state.kardex || state.kardex.length === 0) {
        tbodyKardex.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-slate-400 text-xs">No hay movimientos registrados en el Kárdex aún.</td></tr>`;
      } else {
        state.kardex.forEach(k => {
          const tr = document.createElement('tr');
          tr.className = 'hover:bg-slate-50 text-xs border-b border-slate-100';
          const isEntrada = k.tipo === 'entrada';
          const hora = new Date(k.fecha_hora).toLocaleString();

          tr.innerHTML = `
            <td class="p-3 text-slate-500 font-mono text-[11px]">${hora}</td>
            <td class="p-3 font-bold text-slate-800">${k.insumo_nombre || k.insumo_id}</td>
            <td class="p-3">
              <span class="px-2 py-0.5 rounded text-[10px] font-black uppercase ${isEntrada ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">
                ${isEntrada ? '⬆ Entrada' : '⬇ Salida'}
              </span>
            </td>
            <td class="p-3 font-bold ${isEntrada ? 'text-emerald-700' : 'text-rose-700'}">${isEntrada ? '+' : '-'}${k.cantidad}</td>
            <td class="p-3 text-slate-600">${k.motivo}</td>
            <td class="p-3 text-slate-400">${k.usuario || 'Admin'}</td>
          `;
          tbodyKardex.appendChild(tr);
        });
      }
    }
  }

  static openInsumoEditModal() {
    this.openModal(this.modalInsumoEdit);
  }

  static openKardexMovModal() {
    const select = document.getElementById('kardex-mov-insumo');
    if (select) {
      select.innerHTML = '';
      (state.insumos || []).forEach(ins => {
        const opt = document.createElement('option');
        opt.value = ins.id;
        opt.textContent = `${ins.nombre} (${ins.stock_actual} ${ins.unidad} disponibles)`;
        select.appendChild(opt);
      });
    }
    this.openModal(this.modalKardexMov);
  }

  // --------------------------------------------------------------------------
  // 4. RECETAS & ESCANDALLOS
  // --------------------------------------------------------------------------
  static openRecetasModal() {
    this.openModal(this.modalRecetas);
    this.renderRecetas();
  }

  static renderRecetas() {
    const container = document.getElementById('admin-recetas-list');
    if (!container) return;
    container.innerHTML = '';

    (state.products || []).forEach(p => {
      const costoEstimado = Math.round(p.price * 0.35); // Estimado 35% food cost
      const margen = p.price - costoEstimado;
      const card = document.createElement('div');
      card.className = 'p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between text-xs';
      card.innerHTML = `
        <div class="flex items-start gap-3 mb-2">
          <img src="${p.image}" class="w-12 h-12 rounded-xl object-cover border border-slate-200">
          <div>
            <strong class="text-sm font-black text-slate-900 block">${p.name}</strong>
            <span class="text-[11px] text-slate-500">${p.category} • SKU: ${p.sku}</span>
          </div>
        </div>
        <div class="grid grid-cols-3 gap-2 p-2 bg-white rounded-xl border border-slate-100 text-center font-mono my-2">
          <div>
            <span class="text-[9px] font-bold text-slate-400 block uppercase">Precio Venta</span>
            <strong class="text-slate-900 text-xs font-black">${CartController.formatMoney(p.price)}</strong>
          </div>
          <div>
            <span class="text-[9px] font-bold text-rose-500 block uppercase">Costo Insumos</span>
            <strong class="text-rose-600 text-xs font-black">${CartController.formatMoney(costoEstimado)}</strong>
          </div>
          <div>
            <span class="text-[9px] font-bold text-emerald-600 block uppercase">Margen Bruto</span>
            <strong class="text-emerald-700 text-xs font-black">${CartController.formatMoney(margen)}</strong>
          </div>
        </div>
      `;
      container.appendChild(card);
    });
  }

  // --------------------------------------------------------------------------
  // 5. HAPPY HOUR
  // --------------------------------------------------------------------------
  static openHappyHourModal() {
    const hh = state.adminSettings.happyHour || {};
    const switchActivo = document.getElementById('hh-switch-activo');
    const inputTitulo = document.getElementById('hh-input-titulo');
    const selectModo = document.getElementById('hh-select-modo');
    const inputInicio = document.getElementById('hh-input-inicio');
    const inputFin = document.getElementById('hh-input-fin');

    if (switchActivo) switchActivo.checked = !!hh.activo;
    if (inputTitulo) inputTitulo.value = hh.titulo || 'HAPPY HOUR 2x1';
    if (selectModo) selectModo.value = hh.modo || '2x1';
    if (inputInicio) inputInicio.value = hh.horaInicio || '16:00';
    if (inputFin) inputFin.value = hh.horaFin || '19:00';

    const dias = hh.dias || [];
    document.querySelectorAll('.hh-day-check').forEach(chk => {
      chk.checked = dias.includes(chk.value);
    });

    this.openModal(this.modalHappyHour);
  }

  static checkHappyHourAuto() {
    const hh = state.adminSettings?.happyHour;
    const badge = document.getElementById('happy-hour-active-badge');
    if (!hh || !hh.activo) {
      if (badge) badge.classList.add('hidden');
      return;
    }

    const now = new Date();
    const days = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const currentDay = days[now.getDay()];

    if (!hh.dias?.includes(currentDay)) {
      if (badge) badge.classList.add('hidden');
      return;
    }

    const [startH, startM] = (hh.horaInicio || '16:00').split(':').map(Number);
    const [endH, endM] = (hh.horaFin || '19:00').split(':').map(Number);

    const startTime = new Date();
    startTime.setHours(startH, startM, 0);

    const endTime = new Date();
    endTime.setHours(endH, endM, 0);

    if (now >= startTime && now <= endTime) {
      if (badge) {
        badge.classList.remove('hidden');
        badge.textContent = `🍸 ${hh.titulo || 'HAPPY HOUR 2x1'}`;
      }
    } else {
      if (badge) badge.classList.add('hidden');
    }
  }

  // --------------------------------------------------------------------------
  // 6. CARACTERÍSTICAS / FEATURE FLAGS
  // --------------------------------------------------------------------------
  static openFlagsModal() {
    const flags = state.adminSettings.flags || {};
    const chkServicio = document.getElementById('flag-servicio-10');
    const chkBimoneda = document.getElementById('flag-bimoneda-usd');
    const inputTipoCambio = document.getElementById('flag-tipo-cambio');
    const chkCierre = document.getElementById('flag-cierre-ciego');
    const chkAutoPrint = document.getElementById('flag-auto-print');

    if (chkServicio) chkServicio.checked = !!flags.servicioMesa10;
    if (chkBimoneda) chkBimoneda.checked = !!flags.bimonedaUsd;
    if (inputTipoCambio) inputTipoCambio.value = flags.tipoCambioUsd || 520;
    if (chkCierre) chkCierre.checked = !!flags.cierreCiegoX;
    if (chkAutoPrint) chkAutoPrint.checked = !!flags.autoImprimirTicket;

    this.openModal(this.modalFlags);
  }

  // --------------------------------------------------------------------------
  // 7. IMPRESORAS TÉRMICAS
  // --------------------------------------------------------------------------
  static openImpresorasModal() {
    const imp = state.adminSettings.impresoras || {};
    const selectAncho = document.getElementById('printer-paper-width');
    const chkCorte = document.getElementById('printer-auto-cut');
    const inputCopias = document.getElementById('printer-copies');
    const txtHeader = document.getElementById('printer-header');
    const txtFooter = document.getElementById('printer-footer');

    if (selectAncho) selectAncho.value = imp.anchoPapel || '80mm';
    if (chkCorte) chkCorte.checked = !!imp.autoCorte;
    if (inputCopias) inputCopias.value = imp.copias || 1;
    if (txtHeader) txtHeader.value = imp.encabezado || '';
    if (txtFooter) txtFooter.value = imp.piePagina || '';

    this.openModal(this.modalImpresoras);
  }

  // --------------------------------------------------------------------------
  // 8. BACKUP & MANTENIMIENTO
  // --------------------------------------------------------------------------
  static openBackupModal() {
    this.openModal(this.modalBackup);
  }

  // --------------------------------------------------------------------------
  // HELPERS MODALES
  // --------------------------------------------------------------------------
  static openModal(el) {
    if (el) {
      el.classList.remove('hidden');
      el.classList.add('flex');
    }
  }

  static closeModal(el) {
    if (el) {
      el.classList.add('hidden');
      el.classList.remove('flex');
    }
  }
}
