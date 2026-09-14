/**
 * PROYECTO DELTA POS - Controlador de Caja y Turnos (Estilo Gamma POS)
 */

import { state } from './state.js';
import { CartController } from './cart.js';

export class CajaController {
  static init() {
    if (this.initialized) return;
    this.initialized = true;

    // Referencias del Modal Principal de Caja
    this.cajaModal = document.getElementById('caja-modal');
    this.cajaStatusBadge = document.getElementById('caja-status-badge');
    this.cajaNavStatus = document.getElementById('caja-nav-status');

    // Paneles condicionales (Caja Cerrada vs Caja Abierta)
    this.panelCajaCerrada = document.getElementById('panel-caja-cerrada');
    this.panelCajaAbierta = document.getElementById('panel-caja-abierta');

    // Formulario de Apertura
    this.inputFondoInicial = document.getElementById('input-fondo-inicial');
    this.inputCajeroNombre = document.getElementById('input-cajero-nombre');
    this.btnAbrirCaja = document.getElementById('btn-abrir-caja');

    // Botones de Acción de Caja Abierta
    this.btnNuevaEntrada = document.getElementById('btn-caja-entrada');
    this.btnNuevaSalida = document.getElementById('btn-caja-salida');
    this.btnCerrarTurno = document.getElementById('btn-caja-cierre-action');
    this.btnCloseCajaModal = document.getElementById('close-caja-modal-btn');

    // Modal de Movimientos (Entrada / Salida)
    this.modalMovimiento = document.getElementById('caja-movimiento-modal');
    this.txtMovTipo = document.getElementById('caja-mov-tipo');
    this.txtMovMonto = document.getElementById('caja-mov-monto');
    this.txtMovConcepto = document.getElementById('caja-mov-concepto');
    this.btnGuardarMov = document.getElementById('btn-guardar-movimiento');
    this.btnCloseMov = document.getElementById('close-movimiento-modal-btn');

    // Modal de Cierre de Caja / Arqueo
    this.modalCierre = document.getElementById('caja-cierre-modal');
    this.inputMontoContado = document.getElementById('caja-cierre-contado');
    this.txtDiferenciaDisplay = document.getElementById('caja-cierre-diferencia');
    this.txtCierreObservaciones = document.getElementById('caja-cierre-observaciones');
    this.btnConfirmarCierre = document.getElementById('btn-confirmar-cierre-caja');
    this.btnCloseCierre = document.getElementById('close-cierre-modal-btn');

    // Modal de Comprobante / Ticket de Cierre
    this.modalTicketCierre = document.getElementById('cierre-receipt-modal');
    this.ticketCierreContent = document.getElementById('cierre-receipt-content');
    this.btnPrintCierreTicket = document.getElementById('btn-print-cierre-ticket');
    this.btnCloseTicketCierre = document.getElementById('close-cierre-receipt-btn');

    this.bindEvents();
    this.updateNavBadge();
  }

  static bindEvents() {
    // 1. Apertura de caja
    if (this.btnAbrirCaja) {
      this.btnAbrirCaja.addEventListener('click', async () => {
        const monto = parseFloat(this.inputFondoInicial?.value) || 0;
        const cajero = (this.inputCajeroNombre?.value || state.settings.cashierName).trim();
        await state.openCaja(monto, cajero);
        this.render();
      });
    }

    // 2. Cerrar modal de caja
    if (this.btnCloseCajaModal) {
      this.btnCloseCajaModal.addEventListener('click', () => {
        this.closeModal();
      });
    }

    // 3. Abrir modal de Entrada de efectivo
    if (this.btnNuevaEntrada) {
      this.btnNuevaEntrada.addEventListener('click', () => {
        this.openMovimientoModal('entrada');
      });
    }

    // 4. Abrir modal de Salida de efectivo
    if (this.btnNuevaSalida) {
      this.btnNuevaSalida.addEventListener('click', () => {
        this.openMovimientoModal('salida');
      });
    }

    // 5. Guardar movimiento de caja
    if (this.btnGuardarMov) {
      this.btnGuardarMov.addEventListener('click', async () => {
        const tipo = this.txtMovTipo.value;
        const monto = parseFloat(this.txtMovMonto.value) || 0;
        const concepto = this.txtMovConcepto.value.trim();

        if (monto <= 0) {
          alert('Por favor ingresa un monto válido mayor a 0.');
          this.txtMovMonto.focus();
          return;
        }

        if (!concepto) {
          alert('Por favor ingresa el motivo o justificación del movimiento.');
          this.txtMovConcepto.focus();
          return;
        }

        try {
          await state.addCajaMovement(tipo, monto, concepto);
          this.closeMovimientoModal();
          this.render();
        } catch (err) {
          alert(err.message);
        }
      });
    }

    if (this.btnCloseMov) {
      this.btnCloseMov.addEventListener('click', () => {
        this.closeMovimientoModal();
      });
    }

    // Botones rápidos de monto en movimiento
    document.querySelectorAll('.quick-mov-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const val = e.currentTarget.dataset.value;
        if (this.txtMovMonto) {
          this.txtMovMonto.value = val;
        }
      });
    });

    // 6. Abrir modal de Arqueo y Cierre de caja
    if (this.btnCerrarTurno) {
      this.btnCerrarTurno.addEventListener('click', () => {
        this.openCierreModal();
      });
    }

    // 7. Cálculo dinámico de diferencia al ingresar monto contado
    if (this.inputMontoContado) {
      this.inputMontoContado.addEventListener('input', () => {
        this.updateCierreDiferencia();
      });
    }

    // 8. Confirmar Cierre de Caja
    if (this.btnConfirmarCierre) {
      this.btnConfirmarCierre.addEventListener('click', async () => {
        const stats = state.getCajaStats();
        const contado = parseFloat(this.inputMontoContado.value) || 0;
        const obs = this.txtCierreObservaciones?.value || '';

        if (confirm(`¿Estás seguro de cerrar el turno de caja de ${stats.caja?.cajero}?\n\nEfectivo Esperado: ${CartController.formatMoney(stats.totalEsperadoEfectivo)}\nEfectivo Contado: ${CartController.formatMoney(contado)}`)) {
          try {
            const cierreData = await state.closeCaja(contado, obs);
            this.closeCierreModal();
            this.closeModal();
            this.showTicketCierre(cierreData);
          } catch (e) {
            alert(e.message);
          }
        }
      });
    }

    if (this.btnCloseCierre) {
      this.btnCloseCierre.addEventListener('click', () => {
        this.closeCierreModal();
      });
    }

    // 9. Modal ticket de cierre
    if (this.btnCloseTicketCierre) {
      this.btnCloseTicketCierre.addEventListener('click', () => {
        this.modalTicketCierre?.classList.add('hidden');
        this.modalTicketCierre?.classList.remove('flex');
      });
    }

    if (this.btnPrintCierreTicket) {
      this.btnPrintCierreTicket.addEventListener('click', () => {
        window.print();
      });
    }
  }

  static openModal() {
    this.render();
    if (this.cajaModal) {
      this.cajaModal.classList.remove('hidden');
      this.cajaModal.classList.add('flex');
    }
  }

  static closeModal() {
    if (this.cajaModal) {
      this.cajaModal.classList.add('hidden');
      this.cajaModal.classList.remove('flex');
    }
  }

  static updateNavBadge() {
    const isAbierta = state.cajaActiva && state.cajaActiva.estado === 'abierta';
    if (this.cajaNavStatus) {
      if (isAbierta) {
        this.cajaNavStatus.className = 'w-2 h-2 rounded-full bg-emerald-500 absolute top-2 right-2';
        this.cajaNavStatus.title = 'Caja Abierta';
      } else {
        this.cajaNavStatus.className = 'w-2 h-2 rounded-full bg-slate-300 absolute top-2 right-2';
        this.cajaNavStatus.title = 'Caja Cerrada';
      }
    }
  }

  static render() {
    this.updateNavBadge();
    const stats = state.getCajaStats();

    if (!stats.abierta) {
      // CAJA CERRADA
      if (this.panelCajaCerrada) {
        this.panelCajaCerrada.classList.remove('hidden');
        this.panelCajaCerrada.classList.add('flex');
      }
      if (this.panelCajaAbierta) {
        this.panelCajaAbierta.classList.add('hidden');
        this.panelCajaAbierta.classList.remove('flex');
      }
      if (this.cajaStatusBadge) {
        this.cajaStatusBadge.innerHTML = `<span class="px-2.5 py-1 rounded-full bg-slate-200 text-slate-700 text-xs font-bold">🔒 Caja Cerrada</span>`;
      }
      if (this.inputCajeroNombre) {
        this.inputCajeroNombre.value = state.settings.cashierName || 'Juan (Caja 01)';
      }
      return;
    }

    // CAJA ABIERTA
    if (this.panelCajaCerrada) {
      this.panelCajaCerrada.classList.add('hidden');
      this.panelCajaCerrada.classList.remove('flex');
    }
    if (this.panelCajaAbierta) {
      this.panelCajaAbierta.classList.remove('hidden');
      this.panelCajaAbierta.classList.add('flex');
    }

    const c = stats.caja;
    const horaApertura = new Date(c.fechaApertura).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const fechaApertura = new Date(c.fechaApertura).toLocaleDateString();

    if (this.cajaStatusBadge) {
      this.cajaStatusBadge.innerHTML = `
        <span class="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold flex items-center gap-1.5 border border-emerald-200">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Turno Abierto • ${c.cajero} (${horaApertura})
        </span>
      `;
    }

    // Actualizar Tarjetas Métricas
    document.getElementById('caja-val-fondo').textContent = CartController.formatMoney(stats.montoInicial);
    document.getElementById('caja-val-ventas-efectivo').textContent = CartController.formatMoney(stats.ventasEfectivo);
    document.getElementById('caja-val-ventas-tarjeta').textContent = CartController.formatMoney(stats.ventasTarjeta);
    document.getElementById('caja-val-ventas-sinpe').textContent = CartController.formatMoney(stats.ventasSinpe);
    document.getElementById('caja-val-entradas').textContent = `+${CartController.formatMoney(stats.totalEntradas)}`;
    document.getElementById('caja-val-salidas').textContent = `-${CartController.formatMoney(stats.totalSalidas)}`;
    document.getElementById('caja-val-esperado').textContent = CartController.formatMoney(stats.totalEsperadoEfectivo);
    document.getElementById('caja-val-total-ventas').textContent = CartController.formatMoney(stats.totalVentasTurno);

    // Renderizar Tabla de Movimientos
    const tbodyMovs = document.getElementById('caja-movimientos-table-body');
    if (tbodyMovs) {
      tbodyMovs.innerHTML = '';
      if (!stats.movimientos || stats.movimientos.length === 0) {
        tbodyMovs.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-slate-400 text-xs">No hay entradas ni salidas registradas en este turno.</td></tr>`;
      } else {
        stats.movimientos.forEach(m => {
          const tr = document.createElement('tr');
          tr.className = 'hover:bg-slate-50 text-xs border-b border-slate-100';
          const isEntrada = m.tipo === 'entrada';
          const hora = new Date(m.fechaHora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          tr.innerHTML = `
            <td class="p-3">
              <span class="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                isEntrada ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }">
                ${isEntrada ? '⬆ Entrada' : '⬇ Salida'}
              </span>
            </td>
            <td class="p-3 font-black ${isEntrada ? 'text-emerald-700' : 'text-rose-700'}">
              ${isEntrada ? '+' : '-'}${CartController.formatMoney(m.monto)}
            </td>
            <td class="p-3 font-medium text-slate-700">${m.concepto}</td>
            <td class="p-3 text-slate-400">${hora}</td>
            <td class="p-3 text-slate-500">${m.cajero || c.cajero}</td>
          `;
          tbodyMovs.appendChild(tr);
        });
      }
    }

    // Renderizar Historial de Ventas del Turno
    const tbodyVentas = document.getElementById('caja-ventas-table-body');
    if (tbodyVentas) {
      tbodyVentas.innerHTML = '';
      if (!stats.ventasTurno || stats.ventasTurno.length === 0) {
        tbodyVentas.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-slate-400 text-xs">No se han registrado ventas cobradas durante este turno aún.</td></tr>`;
      } else {
        stats.ventasTurno.forEach(v => {
          const tr = document.createElement('tr');
          tr.className = 'hover:bg-slate-50 text-xs border-b border-slate-100';
          const hora = new Date(v.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          tr.innerHTML = `
            <td class="p-3 font-mono font-bold text-slate-800">#${v.ticketNumber}</td>
            <td class="p-3 font-semibold text-slate-700">${v.tableName}</td>
            <td class="p-3"><span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">${v.payment?.method}</span></td>
            <td class="p-3 text-slate-400">${hora}</td>
            <td class="p-3 text-right font-black text-slate-900">${CartController.formatMoney(v.payment?.totals?.total)}</td>
          `;
          tbodyVentas.appendChild(tr);
        });
      }
    }
  }

  // --------------------------------------------------------------------------
  // MODAL DE ENTRADA / SALIDA
  // --------------------------------------------------------------------------
  static openMovimientoModal(tipo = 'entrada') {
    if (this.txtMovTipo) this.txtMovTipo.value = tipo;
    if (this.txtMovMonto) this.txtMovMonto.value = '';
    if (this.txtMovConcepto) this.txtMovConcepto.value = '';

    const titleEl = document.getElementById('caja-mov-modal-title');
    const badgeEl = document.getElementById('caja-mov-modal-badge');

    if (tipo === 'entrada') {
      if (titleEl) titleEl.textContent = 'Registrar Entrada de Efectivo';
      if (badgeEl) {
        badgeEl.textContent = '+ Entrada a Caja';
        badgeEl.className = 'px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs';
      }
    } else {
      if (titleEl) titleEl.textContent = 'Registrar Salida / Retiro de Dinero';
      if (badgeEl) {
        badgeEl.textContent = '- Salida / Gasto';
        badgeEl.className = 'px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-xs';
      }
    }

    if (this.modalMovimiento) {
      this.modalMovimiento.classList.remove('hidden');
      this.modalMovimiento.classList.add('flex');
      this.txtMovMonto?.focus();
    }
  }

  static closeMovimientoModal() {
    if (this.modalMovimiento) {
      this.modalMovimiento.classList.add('hidden');
      this.modalMovimiento.classList.remove('flex');
    }
  }

  // --------------------------------------------------------------------------
  // MODAL DE ARQUEO Y CIERRE DE CAJA
  // --------------------------------------------------------------------------
  static openCierreModal() {
    const stats = state.getCajaStats();
    if (!stats.abierta) return;

    document.getElementById('cierre-modal-cajero').textContent = stats.caja.cajero;
    document.getElementById('cierre-modal-hora').textContent = new Date(stats.caja.fechaApertura).toLocaleString();
    document.getElementById('cierre-modal-fondo').textContent = CartController.formatMoney(stats.montoInicial);
    document.getElementById('cierre-modal-ventas-efectivo').textContent = CartController.formatMoney(stats.ventasEfectivo);
    document.getElementById('cierre-modal-entradas').textContent = `+${CartController.formatMoney(stats.totalEntradas)}`;
    document.getElementById('cierre-modal-salidas').textContent = `-${CartController.formatMoney(stats.totalSalidas)}`;
    document.getElementById('cierre-modal-esperado').textContent = CartController.formatMoney(stats.totalEsperadoEfectivo);
    document.getElementById('cierre-modal-tarjeta').textContent = CartController.formatMoney(stats.ventasTarjeta);
    document.getElementById('cierre-modal-sinpe').textContent = CartController.formatMoney(stats.ventasSinpe);
    document.getElementById('cierre-modal-total-ventas').textContent = CartController.formatMoney(stats.totalVentasTurno);

    if (this.inputMontoContado) {
      this.inputMontoContado.value = stats.totalEsperadoEfectivo;
    }
    if (this.txtCierreObservaciones) {
      this.txtCierreObservaciones.value = '';
    }

    this.updateCierreDiferencia();

    if (this.modalCierre) {
      this.modalCierre.classList.remove('hidden');
      this.modalCierre.classList.add('flex');
      this.inputMontoContado?.focus();
      this.inputMontoContado?.select();
    }
  }

  static closeCierreModal() {
    if (this.modalCierre) {
      this.modalCierre.classList.add('hidden');
      this.modalCierre.classList.remove('flex');
    }
  }

  static updateCierreDiferencia() {
    const stats = state.getCajaStats();
    const contado = parseFloat(this.inputMontoContado?.value) || 0;
    const esperado = stats.totalEsperadoEfectivo;
    const dif = contado - esperado;

    if (this.txtDiferenciaDisplay) {
      if (dif === 0) {
        this.txtDiferenciaDisplay.innerHTML = `<span class="text-emerald-700 font-extrabold">✓ Cuadre Exacto (₡0)</span>`;
      } else if (dif > 0) {
        this.txtDiferenciaDisplay.innerHTML = `<span class="text-blue-700 font-extrabold">▲ Sobrante: +${CartController.formatMoney(dif)}</span>`;
      } else {
        this.txtDiferenciaDisplay.innerHTML = `<span class="text-rose-700 font-extrabold">▼ Faltante: -${CartController.formatMoney(Math.abs(dif))}</span>`;
      }
    }
  }

  // --------------------------------------------------------------------------
  // COMPROBANTE DE CIERRE / TICKET TÉRMICO Z
  // --------------------------------------------------------------------------
  static showTicketCierre(cierre) {
    const s = state.settings;
    const fApertura = new Date(cierre.fechaApertura).toLocaleString();
    const fCierre = new Date(cierre.fechaCierre).toLocaleString();

    let movsHtml = '';
    if (cierre.movimientos && cierre.movimientos.length > 0) {
      movsHtml = `
        <div class="py-2 border-t border-b border-dashed border-slate-300 my-2">
          <p class="font-bold text-[11px] uppercase mb-1">Movimientos del Turno:</p>
          ${cierre.movimientos.map(m => `
            <div class="flex justify-between text-[11px]">
              <span>${m.tipo === 'entrada' ? '[+]' : '[-]'} ${m.concepto}</span>
              <span class="font-bold">${CartController.formatMoney(m.monto)}</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    let difTexto = '';
    if (cierre.diferencia === 0) {
      difTexto = 'CUADRE EXACTO (₡0)';
    } else if (cierre.diferencia > 0) {
      difTexto = `SOBRANTE: +${CartController.formatMoney(cierre.diferencia)}`;
    } else {
      difTexto = `FALTANTE: -${CartController.formatMoney(Math.abs(cierre.diferencia))}`;
    }

    const html = `
      <div class="text-center pb-3 border-b border-dashed border-slate-300">
        <h2 class="text-base font-black uppercase text-slate-900">${s.restaurantName}</h2>
        <p class="text-[11px] text-slate-500">${s.address}</p>
        <p class="text-[11px] text-slate-500">Tel: ${s.phone}</p>
        <div class="mt-2 text-xs font-black bg-slate-900 text-white py-1 rounded">
          CORTE Z / CIERRE DE CAJA
        </div>
        <p class="text-[11px] font-bold text-slate-800 mt-2">Cajero: ${cierre.cajero}</p>
        <p class="text-[10px] text-slate-500">Apertura: ${fApertura}</p>
        <p class="text-[10px] text-slate-500">Cierre: ${fCierre}</p>
      </div>

      <div class="py-3 text-xs space-y-1.5">
        <div class="flex justify-between font-bold">
          <span>Fondo Inicial:</span>
          <span>${CartController.formatMoney(cierre.montoInicial)}</span>
        </div>
        <div class="flex justify-between text-slate-600">
          <span>(+) Ventas en Efectivo:</span>
          <span class="font-bold text-slate-900">${CartController.formatMoney(cierre.totalVentasEfectivo)}</span>
        </div>
        <div class="flex justify-between text-slate-600">
          <span>(+) Entradas de Dinero:</span>
          <span class="font-bold text-emerald-700">+${CartController.formatMoney(cierre.totalEntradas)}</span>
        </div>
        <div class="flex justify-between text-slate-600">
          <span>(-) Salidas / Gastos:</span>
          <span class="font-bold text-rose-700">-${CartController.formatMoney(cierre.totalSalidas)}</span>
        </div>
        <div class="flex justify-between font-black text-slate-900 pt-1 border-t border-dashed border-slate-200">
          <span>EFECTIVO ESPERADO:</span>
          <span>${CartController.formatMoney(cierre.totalEsperadoEfectivo)}</span>
        </div>
        <div class="flex justify-between font-black text-slate-900">
          <span>EFECTIVO CONTADO:</span>
          <span>${CartController.formatMoney(cierre.montoFinalEfectivo)}</span>
        </div>
        <div class="flex justify-between font-black py-1 px-2 rounded bg-slate-100 text-xs">
          <span>DIFERENCIA:</span>
          <span>${difTexto}</span>
        </div>

        ${movsHtml}

        <div class="pt-2 text-xs space-y-1">
          <p class="font-bold text-[11px] uppercase text-slate-400">Otros Medios de Pago:</p>
          <div class="flex justify-between text-slate-600">
            <span>Ventas con Tarjeta:</span>
            <span class="font-bold">${CartController.formatMoney(cierre.totalVentasTarjeta)}</span>
          </div>
          <div class="flex justify-between text-slate-600">
            <span>Ventas Sinpe Móvil / Transfer:</span>
            <span class="font-bold">${CartController.formatMoney(cierre.totalVentasSinpe)}</span>
          </div>
          <div class="flex justify-between font-black text-sm text-slate-900 pt-1 border-t border-slate-300">
            <span>TOTAL VENTAS DEL TURNO:</span>
            <span>${CartController.formatMoney(cierre.totalVentasEfectivo + cierre.totalVentasTarjeta + cierre.totalVentasSinpe)}</span>
          </div>
        </div>

        ${cierre.observaciones ? `
          <div class="pt-2 text-[11px] text-slate-600 italic">
            <b>Notas:</b> ${cierre.observaciones}
          </div>
        ` : ''}
      </div>

      <div class="mt-4 pt-3 border-t border-dashed border-slate-300 text-center text-[10px] text-slate-400">
        <p>Documento de Control Interno</p>
        <p>Delta POS v2.0 - San José, Costa Rica</p>
      </div>
    `;

    if (this.ticketCierreContent) {
      this.ticketCierreContent.innerHTML = html;
    }

    if (this.modalTicketCierre) {
      this.modalTicketCierre.classList.remove('hidden');
      this.modalTicketCierre.classList.add('flex');
    }
  }
}

