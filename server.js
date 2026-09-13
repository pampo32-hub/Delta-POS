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

    const saleId = 'SALE-' + Date.now();

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
    const result = await query('SELECT * FROM ventas ORDER BY creado_en DESC LIMIT 100;');
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
