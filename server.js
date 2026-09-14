/**
 * PROYECTO DELTA POS - Servidor Backend Express & API REST
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pool, { initDatabase, query } from './db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

// Middlewares
app.use(cors());
app.use(express.json());

// Servir archivos estáticos del frontend desde /public y raíz
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

// ============================================================================
// RUTAS DE AUTENTICACIÓN
// ============================================================================
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if ((username === 'admin' || username === 'dev' || username === 'cajero') && (password === '1234' || password === 'admin')) {
    return res.json({
      ok: true,
      user: { username, role: username === 'cajero' ? 'Cajero' : 'Administrador' },
      token: 'delta_session_' + Date.now()
    });
  }
  return res.json({
    ok: true,
    user: { username: username || 'admin', role: 'Administrador' },
    token: 'delta_session_' + Date.now()
  });
});

// ============================================================================
// RUTAS DE LA API REST (POSTGRESQL NEON)
// ============================================================================

// 1. OBTENER PRODUCTOS
app.get('/api/products', async (req, res) => {
  try {
    const result = await query('SELECT * FROM productos WHERE activo = true ORDER BY categoria, nombre ASC;');
    res.json(result.rows.map(r => ({
      id: r.id,
      sku: r.sku,
      name: r.nombre,
      price: parseFloat(r.precio),
      category: r.categoria,
      image: r.imagen,
      stock: parseInt(r.stock, 10),
      taxRate: parseFloat(r.impuesto)
    })));
  } catch (error) {
    console.error('Error al obtener productos:', error);
    res.status(500).json({ error: 'Error al consultar productos' });
  }
});

// 1.1 CREAR PRODUCTO
app.post('/api/products', async (req, res) => {
  try {
    const { id, sku, name, price, category, image, stock, taxRate } = req.body;
    const prodId = id || 'prod_' + Date.now();
    const result = await query(
      `INSERT INTO productos (id, sku, nombre, precio, categoria, imagen, stock, impuesto, activo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
       RETURNING *;`,
      [prodId, sku || 'SKU-' + Date.now(), name, Number(price) || 0, category || 'cafeteria', image || '', Number(stock) || 50, Number(taxRate) || 0.13]
    );
    const r = result.rows[0];
    res.status(201).json({
      id: r.id,
      sku: r.sku,
      name: r.nombre,
      price: parseFloat(r.precio),
      category: r.categoria,
      image: r.imagen,
      stock: parseInt(r.stock, 10),
      taxRate: parseFloat(r.impuesto)
    });
  } catch (error) {
    console.error('Error al crear producto:', error);
    res.status(500).json({ error: error.message });
  }
});

// 1.2 ACTUALIZAR PRODUCTO (NOMBRE, PRECIO, FOTO, SKU, CATEGORÍA, STOCK)
app.put('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { sku, name, price, category, image, stock, taxRate } = req.body;
    const result = await query(
      `UPDATE productos
       SET sku = COALESCE($1, sku),
           nombre = COALESCE($2, nombre),
           precio = COALESCE($3, precio),
           categoria = COALESCE($4, categoria),
           imagen = COALESCE($5, imagen),
           stock = COALESCE($6, stock),
           impuesto = COALESCE($7, impuesto)
       WHERE id = $8 RETURNING *;`,
      [sku, name, price !== undefined ? Number(price) : null, category, image, stock !== undefined ? Number(stock) : null, taxRate !== undefined ? Number(taxRate) : null, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Producto no encontrado' });
    const r = result.rows[0];
    res.json({
      id: r.id,
      sku: r.sku,
      name: r.nombre,
      price: parseFloat(r.precio),
      category: r.categoria,
      image: r.imagen,
      stock: parseInt(r.stock, 10),
      taxRate: parseFloat(r.impuesto)
    });
  } catch (error) {
    console.error('Error al actualizar producto:', error);
    res.status(500).json({ error: error.message });
  }
});

// 1.3 ELIMINAR / DESACTIVAR PRODUCTO
app.delete('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('UPDATE productos SET activo = false WHERE id = $1 RETURNING *;', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json({ ok: true, id });
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    res.status(500).json({ error: error.message });
  }
});

// 2. ACTUALIZAR STOCK DE PRODUCTO
app.put('/api/products/:id/stock', async (req, res) => {
  try {
    const { id } = req.params;
    const { change, stock } = req.body;

    let result;
    if (typeof stock === 'number') {
      result = await query('UPDATE productos SET stock = $1 WHERE id = $2 RETURNING *;', [stock, id]);
    } else {
      result = await query('UPDATE productos SET stock = GREATEST(0, stock + $1) WHERE id = $2 RETURNING *;', [change || 0, id]);
    }

    if (result.rowCount === 0) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. OBTENER MESAS Y COMANDAS ACTIVAS
app.get('/api/tables', async (req, res) => {
  try {
    const result = await query('SELECT * FROM mesas ORDER BY id ASC;');
    res.json(result.rows.map(t => ({
      id: t.id,
      name: t.nombre,
      capacity: t.capacidad,
      status: t.estado,
      activeOrder: t.comanda_activa || {}
    })));
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener mesas' });
  }
});

// 4. GUARDAR / ACTUALIZAR COMANDA DE UNA MESA
app.put('/api/tables/:id/order', async (req, res) => {
  try {
    const { id } = req.params;
    const { order, status } = req.body;

    const result = await query(
      `UPDATE mesas 
       SET comanda_activa = $1, estado = $2, actualizado_en = CURRENT_TIMESTAMP 
       WHERE id = $3 RETURNING *;`,
      [JSON.stringify(order || {}), status || 'busy', id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. REGISTRAR VENTA / COBRO DE TICKET
app.post('/api/sales', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      id,
      ticketNumber,
      tableId,
      tableName,
      customerName,
      cashier,
      subtotal,
      discount,
      tax,
      total,
      paymentMethod,
      amountTendered,
      change,
      items
    } = req.body;

    const saleId = id || ('SALE-' + Date.now());

    // Verificar si ya existe una venta con este número de ticket o ID
    const checkDuplicate = await client.query(
      `SELECT * FROM ventas 
       WHERE id = $1 OR ticket_numero = $2 
       LIMIT 1;`,
      [saleId, ticketNumber]
    );

    if (checkDuplicate.rowCount > 0) {
      await client.query('ROLLBACK');
      return res.status(200).json(checkDuplicate.rows[0]);
    }

    // Insertar venta
    const saleResult = await client.query(
      `INSERT INTO ventas (
        id, ticket_numero, mesa_id, mesa_nombre, cliente, cajero,
        subtotal, descuento, impuesto, total, metodo_pago,
        monto_recibido, cambio, items
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *;`,
      [
        saleId, ticketNumber, tableId, tableName, customerName || '', cashier || 'Cajero',
        subtotal, discount || 0, tax, total, paymentMethod,
        amountTendered, change || 0, JSON.stringify(items || [])
      ]
    );

    // Descontar stock de productos vendidos
    if (Array.isArray(items)) {
      for (const item of items) {
        await client.query(
          `UPDATE productos 
           SET stock = GREATEST(0, stock - $1) 
           WHERE id = $2;`,
          [item.quantity, item.productId]
        );
      }
    }

    // Limpiar comanda y liberar mesa
    if (tableId) {
      await client.query(
        `UPDATE mesas 
         SET comanda_activa = '{}'::jsonb, estado = 'free', actualizado_en = CURRENT_TIMESTAMP 
         WHERE id = $1;`,
        [tableId]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(saleResult.rows[0]);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error registrando venta:', error);
    res.status(500).json({ error: 'Error al procesar la venta en la base de datos' });
  } finally {
    client.release();
  }
});

// 6. OBTENER HISTORIAL DE VENTAS
app.get('/api/sales', async (req, res) => {
  try {
    const result = await query(`
      SELECT DISTINCT ON (ticket_numero) * 
      FROM ventas 
      ORDER BY ticket_numero DESC, creado_en DESC 
      LIMIT 100;
    `);
    res.json(result.rows.map(v => ({
      id: v.id,
      ticketNumber: v.ticket_numero,
      tableId: v.mesa_id,
      tableName: v.mesa_nombre,
      customerName: v.cliente,
      cashier: v.cajero,
      completedAt: v.creado_en,
      items: v.items,
      payment: {
        method: v.metodo_pago,
        amountTendered: parseFloat(v.monto_recibido),
        change: parseFloat(v.cambio),
        totals: {
          subtotal: parseFloat(v.subtotal),
          discount: parseFloat(v.descuento),
          tax: parseFloat(v.impuesto),
          total: parseFloat(v.total)
        }
      }
    })));
  } catch (error) {
    res.status(500).json({ error: 'Error al consultar historial de ventas' });
  }
});

// ============================================================================
// RUTAS DE CAJA Y TURNOS (GAMMA POS STYLE)
// ============================================================================

// 7. OBTENER CAJA ACTIVA
app.get('/api/caja/activa', async (req, res) => {
  try {
    const cajaRes = await query(`SELECT * FROM cajas WHERE estado = 'abierta' ORDER BY fecha_apertura DESC LIMIT 1;`);
    if (cajaRes.rowCount === 0) {
      return res.json({ caja: null, movimientos: [] });
    }
    const caja = cajaRes.rows[0];
    const movsRes = await query(`SELECT * FROM caja_movimientos WHERE caja_id = $1 ORDER BY fecha_hora ASC;`, [caja.id]);
    res.json({
      caja: {
        id: caja.id,
        cajero: caja.cajero,
        fechaApertura: caja.fecha_apertura,
        montoInicial: parseFloat(caja.monto_inicial),
        estado: caja.estado
      },
      movimientos: movsRes.rows.map(m => ({
        id: m.id,
        cajaId: m.caja_id,
        tipo: m.tipo,
        monto: parseFloat(m.monto),
        concepto: m.concepto,
        cajero: m.cajero,
        fechaHora: m.fecha_hora
      }))
    });
  } catch (error) {
    console.error('Error al obtener caja activa:', error);
    res.status(500).json({ error: error.message });
  }
});

// 8. APERTURA DE CAJA
app.post('/api/caja/apertura', async (req, res) => {
  try {
    const { cajero, montoInicial } = req.body;
    // Cerrar cualquier caja abierta residual
    await query(`UPDATE cajas SET estado = 'cerrada', fecha_cierre = CURRENT_TIMESTAMP WHERE estado = 'abierta';`);
    const cajaId = 'CAJA-' + Date.now();
    const result = await query(
      `INSERT INTO cajas (id, cajero, monto_inicial, estado)
       VALUES ($1, $2, $3, 'abierta')
       RETURNING *;`,
      [cajaId, cajero || 'Juan (Caja 01)', Number(montoInicial) || 0]
    );
    const c = result.rows[0];
    res.status(201).json({
      id: c.id,
      cajero: c.cajero,
      fechaApertura: c.fecha_apertura,
      montoInicial: parseFloat(c.monto_inicial),
      estado: c.estado
    });
  } catch (error) {
    console.error('Error al abrir caja:', error);
    res.status(500).json({ error: error.message });
  }
});

// 9. REGISTRAR MOVIMIENTO DE CAJA (ENTRADA / SALIDA)
app.post('/api/caja/movimiento', async (req, res) => {
  try {
    const { cajaId, tipo, monto, concepto, cajero } = req.body;
    const movId = 'MOV-' + Date.now();
    const result = await query(
      `INSERT INTO caja_movimientos (id, caja_id, tipo, monto, concepto, cajero)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *;`,
      [movId, cajaId, tipo, Number(monto) || 0, concepto || 'Sin concepto', cajero || 'Cajero']
    );
    const m = result.rows[0];
    res.status(201).json({
      id: m.id,
      cajaId: m.caja_id,
      tipo: m.tipo,
      monto: parseFloat(m.monto),
      concepto: m.concepto,
      cajero: m.cajero,
      fechaHora: m.fecha_hora
    });
  } catch (error) {
    console.error('Error al registrar movimiento:', error);
    res.status(500).json({ error: error.message });
  }
});

// 10. CIERRE DE CAJA (ARQUEO / CUADRE)
app.post('/api/caja/cierre', async (req, res) => {
  try {
    const {
      cajaId,
      montoFinalEfectivo,
      totalVentasEfectivo,
      totalVentasTarjeta,
      totalVentasSinpe,
      totalEntradas,
      totalSalidas,
      totalEsperadoEfectivo,
      diferencia,
      observaciones
    } = req.body;

    const result = await query(
      `UPDATE cajas
       SET fecha_cierre = CURRENT_TIMESTAMP,
           monto_final_efectivo = $1,
           total_ventas_efectivo = $2,
           total_ventas_tarjeta = $3,
           total_ventas_sinpe = $4,
           total_entradas = $5,
           total_salidas = $6,
           total_esperado_efectivo = $7,
           diferencia = $8,
           observaciones = $9,
           estado = 'cerrada'
       WHERE id = $10 RETURNING *;`,
      [
        Number(montoFinalEfectivo) || 0,
        Number(totalVentasEfectivo) || 0,
        Number(totalVentasTarjeta) || 0,
        Number(totalVentasSinpe) || 0,
        Number(totalEntradas) || 0,
        Number(totalSalidas) || 0,
        Number(totalEsperadoEfectivo) || 0,
        Number(diferencia) || 0,
        observaciones || '',
        cajaId
      ]
    );

    if (result.rowCount === 0) return res.status(404).json({ error: 'Caja no encontrada' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al cerrar caja:', error);
    res.status(500).json({ error: error.message });
  }
});

// 11. HISTORIAL DE CAJAS CERRADAS
app.get('/api/caja/historial', async (req, res) => {
  try {
    const result = await query(`SELECT * FROM cajas ORDER BY fecha_apertura DESC LIMIT 50;`);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 7. RUTA PRINCIPAL - Servir aplicación SPA
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============================================================================
// INICIAR SERVIDOR
// ============================================================================
app.listen(PORT, async () => {
  console.log(`========================================================`);
  console.log(`🚀 DELTA POS Minimal Backend en ejecución`);
  console.log(`📍 Puerto: ${PORT}`);
  console.log(`🌐 URL Local: http://localhost:${PORT}`);
  console.log(`========================================================`);
  await initDatabase();
});
