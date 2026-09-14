/**
 * PROYECTO DELTA POS - Conexión y Esquema de Base de Datos PostgreSQL Neon
 */

import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

// Configuración de la conexión PostgreSQL con soporte SSL para Neon y Render
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && (process.env.DATABASE_URL.includes('ssl') || process.env.DATABASE_URL.includes('neon.tech'))
    ? { rejectUnauthorized: false } 
    : false
});

export async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  return res;
}

export async function initDatabase() {
  try {
    console.log('🔄 Conectando e inicializando tablas en PostgreSQL...');

    // 1. Tabla de Productos
    await pool.query(`
      CREATE TABLE IF NOT EXISTS productos (
        id VARCHAR(50) PRIMARY KEY,
        sku VARCHAR(50) UNIQUE,
        nombre VARCHAR(150) NOT NULL,
        precio NUMERIC(10, 2) NOT NULL,
        categoria VARCHAR(50) NOT NULL,
        imagen TEXT,
        stock INT DEFAULT 50,
        impuesto NUMERIC(4, 2) DEFAULT 0.13,
        activo BOOLEAN DEFAULT true,
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Tabla de Mesas y Estado de Comanda
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mesas (
        id VARCHAR(50) PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        capacidad INT DEFAULT 4,
        estado VARCHAR(30) DEFAULT 'free',
        comanda_activa JSONB DEFAULT '{}'::jsonb,
        actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Tabla de Ventas / Tickets
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ventas (
        id VARCHAR(100) PRIMARY KEY,
        ticket_numero INT NOT NULL,
        mesa_id VARCHAR(50),
        mesa_nombre VARCHAR(100),
        cliente VARCHAR(150),
        cajero VARCHAR(100),
        subtotal NUMERIC(10, 2) NOT NULL,
        descuento NUMERIC(10, 2) DEFAULT 0,
        impuesto NUMERIC(10, 2) NOT NULL,
        total NUMERIC(10, 2) NOT NULL,
        metodo_pago VARCHAR(50) NOT NULL,
        monto_recibido NUMERIC(10, 2) NOT NULL,
        cambio NUMERIC(10, 2) DEFAULT 0,
        items JSONB NOT NULL,
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Tabla de Cajas / Turnos
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cajas (
        id VARCHAR(50) PRIMARY KEY,
        cajero VARCHAR(100) NOT NULL,
        fecha_apertura TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        monto_inicial NUMERIC(12, 2) DEFAULT 0,
        fecha_cierre TIMESTAMP,
        monto_final_efectivo NUMERIC(12, 2) DEFAULT 0,
        total_ventas_efectivo NUMERIC(12, 2) DEFAULT 0,
        total_ventas_tarjeta NUMERIC(12, 2) DEFAULT 0,
        total_ventas_sinpe NUMERIC(12, 2) DEFAULT 0,
        total_entradas NUMERIC(12, 2) DEFAULT 0,
        total_salidas NUMERIC(12, 2) DEFAULT 0,
        total_esperado_efectivo NUMERIC(12, 2) DEFAULT 0,
        diferencia NUMERIC(12, 2) DEFAULT 0,
        observaciones TEXT,
        estado VARCHAR(30) DEFAULT 'abierta'
      );
    `);

    // 5. Tabla de Movimientos de Caja (Entradas / Salidas)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS caja_movimientos (
        id VARCHAR(50) PRIMARY KEY,
        caja_id VARCHAR(50),
        tipo VARCHAR(20) NOT NULL,
        monto NUMERIC(12, 2) NOT NULL,
        concepto TEXT NOT NULL,
        cajero VARCHAR(100),
        fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 6. Tabla de Ajustes / Configuración
    // 6. Tabla de Ajustes / Configuración General
    await pool.query(`
      CREATE TABLE IF NOT EXISTS configuracion (
        clave VARCHAR(50) PRIMARY KEY,
        valor JSONB NOT NULL
      );
    `);

    // 7. Tabla de Personal y Usuarios del Sistema (Admin, Cajero, Salonero)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id VARCHAR(50) PRIMARY KEY,
        nombre VARCHAR(120) NOT NULL,
        usuario VARCHAR(60) UNIQUE NOT NULL,
        password VARCHAR(100) NOT NULL,
        rol VARCHAR(30) NOT NULL DEFAULT 'salonero',
        pin VARCHAR(10) NOT NULL DEFAULT '1234',
        activo BOOLEAN DEFAULT true,
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 8. Tabla de Insumos y Materia Prima (Bodega / Kardex)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS insumos (
        id VARCHAR(50) PRIMARY KEY,
        nombre VARCHAR(120) NOT NULL,
        categoria VARCHAR(50) NOT NULL DEFAULT 'general',
        unidad VARCHAR(30) NOT NULL DEFAULT 'unidades',
        stock_actual NUMERIC(12, 2) NOT NULL DEFAULT 0,
        stock_minimo NUMERIC(12, 2) NOT NULL DEFAULT 5,
        costo_unitario NUMERIC(10, 2) NOT NULL DEFAULT 0,
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 9. Tabla de Movimientos de Kardex (Trazabilidad de Inventario)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS kardex (
        id VARCHAR(50) PRIMARY KEY,
        insumo_id VARCHAR(50) REFERENCES insumos(id) ON DELETE CASCADE,
        tipo VARCHAR(30) NOT NULL,
        cantidad NUMERIC(12, 2) NOT NULL,
        stock_anterior NUMERIC(12, 2) NOT NULL,
        stock_nuevo NUMERIC(12, 2) NOT NULL,
        motivo TEXT NOT NULL,
        usuario VARCHAR(100),
        fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 10. Tabla de Recetas y Escandallos (Fichas Técnicas)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS recetas (
        id VARCHAR(50) PRIMARY KEY,
        producto_id VARCHAR(50) REFERENCES productos(id) ON DELETE CASCADE,
        ingredientes JSONB NOT NULL,
        costo_estimado NUMERIC(10, 2) DEFAULT 0,
        actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Limpiar posibles registros duplicados existentes en ventas
    await pool.query(`
      DELETE FROM ventas v1
      USING ventas v2
      WHERE v1.ctid < v2.ctid
        AND v1.ticket_numero = v2.ticket_numero
        AND v1.mesa_id = v2.mesa_id
        AND v1.total = v2.total
        AND ABS(EXTRACT(EPOCH FROM (v1.creado_en - v2.creado_en))) < 60;
        AND v1.ticket_numero = v2.ticket_numero;
    `).catch(() => {});

    console.log('✅ Esquema de base de datos PostgreSQL verificado y listo.');
    await seedInitialData();

  } catch (error) {
    console.error('⚠️ Error inicializando base de datos PostgreSQL:', error.message);
  }
}

async function seedInitialData() {
  try {
    const prodRes = await pool.query('SELECT COUNT(*) FROM productos;');
    if (parseInt(prodRes.rows[0].count, 10) === 0) {
      console.log('🌱 Poblando catálogo inicial de productos...');
      
      const initialItems = [
        ['p1', 'CAF-001', 'Café Latte Art', 2500, 'cafeteria', 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=600&q=80', 45],
        ['p2', 'CAF-002', 'Croissant Butter Mantequilla', 2000, 'cafeteria', 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80', 22],
        ['p3', 'CAF-003', 'Iced Mocha Frappé', 3200, 'cafeteria', 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=600&q=80', 30],
        ['p4', 'CAF-004', 'Té Verde Matcha Orgánico', 2800, 'cafeteria', 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80', 50],
        ['p5', 'HAM-001', 'Cheeseburger Deluxe Black Angus', 6500, 'hamburguesas', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80', 18],
        ['p6', 'HAM-002', 'Bacon Crispy BBQ Burger', 7200, 'hamburguesas', 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=600&q=80', 14],
        ['p7', 'GRL-001', 'Filete Mignon Corte Fino', 14500, 'platos', 'https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=600&q=80', 10],
        ['p8', 'GRL-002', 'Salmón Grillé a las Finas Hierbas', 12800, 'platos', 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=600&q=80', 12],
        ['p9', 'PAS-001', 'Pasta Carbonara Auténtica', 7500, 'pastas', 'https://images.unsplash.com/photo-1612874742237-6526221588e3?auto=format&fit=crop&w=600&q=80', 25],
        ['p10', 'PAS-002', 'Risotto de Setas & Trufa', 8900, 'pastas', 'https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?auto=format&fit=crop&w=600&q=80', 15],
        ['p11', 'PAS-003', 'Pizza Margherita Clásica', 6500, 'pastas', 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=600&q=80', 20],
        ['p12', 'ENT-001', 'Ensalada César con Pollo Grill', 5500, 'entradas', 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?auto=format&fit=crop&w=600&q=80', 30],
        ['p13', 'ENT-002', 'Tacos al Pastor Gourmet (x3)', 6000, 'entradas', 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?auto=format&fit=crop&w=600&q=80', 20],
        ['p14', 'ENT-003', 'Bruschetta de Tomate & Albahaca', 4200, 'entradas', 'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?auto=format&fit=crop&w=600&q=80', 25],
        ['p15', 'BEB-001', 'Cerveza Artesanal IPA 355ml', 3500, 'bebidas', 'https://images.unsplash.com/photo-1608270586620-248524c67de9?auto=format&fit=crop&w=600&q=80', 48],
        ['p16', 'BEB-002', 'Copa de Vino Tinto Rioja Reserva', 4500, 'bebidas', 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=600&q=80', 36],
        ['p17', 'BEB-003', 'Agua Mineral de Manantial 500ml', 1500, 'bebidas', 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=600&q=80', 60],
        ['p18', 'POS-001', 'Tarta de Queso con Frutos Rojos', 3800, 'postres', 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=600&q=80', 14],
        ['p19', 'POS-002', 'Pastel Supreme de Chocolate Belga', 3500, 'postres', 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80', 16]
      ];

      for (const item of initialItems) {
        await pool.query(
          `INSERT INTO productos (id, sku, nombre, precio, categoria, imagen, stock)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO NOTHING;`,
          item
        );
      }
    }

    const tableRes = await pool.query('SELECT COUNT(*) FROM mesas;');
    if (parseInt(tableRes.rows[0].count, 10) === 0) {
      console.log('🌱 Creando mesas iniciales...');
      const defaultTables = [
        ['1', 'Mesa 01', 4, 'free'],
        ['2', 'Mesa 02', 2, 'free'],
        ['3', 'Mesa 03', 4, 'free'],
        ['4', 'Mesa 04', 6, 'free'],
        ['5', 'Mesa 05', 4, 'free'],
        ['6', 'Mesa 06', 2, 'free'],
        ['7', 'Mesa 07', 8, 'free'],
        ['8', 'Mesa 08', 4, 'free'],
        ['barra', 'Barra Principal', 10, 'free'],
        ['llevar', 'Para Llevar / Delivery', 0, 'free']
      ];

      for (const t of defaultTables) {
        await pool.query(
          `INSERT INTO mesas (id, nombre, capacidad, estado)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (id) DO NOTHING;`,
          t
        );
      }
    }

    // Poblar Usuarios Iniciales
    const userRes = await pool.query('SELECT COUNT(*) FROM usuarios;');
    if (parseInt(userRes.rows[0].count, 10) === 0) {
      console.log('🌱 Creando usuarios y personal inicial...');
      const defaultUsers = [
        ['u_admin', 'Administrador Principal', 'admin', 'admin123', 'admin', '1234', true],
        ['u_cajero', 'Roberto Caja', 'cajero', 'caja123', 'cajero', '5555', true],
        ['u_carlos', 'Carlos Solano', 'carlos', 'mesero123', 'salonero', '1111', true],
        ['u_sofia', 'Sofía Morales', 'sofia', 'mesero123', 'salonera', '2222', true]
      ];
      for (const u of defaultUsers) {
        await pool.query(
          `INSERT INTO usuarios (id, nombre, usuario, password, rol, pin, activo)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO NOTHING;`,
          u
        );
      }
    }

    // Poblar Insumos Iniciales
    const insumoRes = await pool.query('SELECT COUNT(*) FROM insumos;');
    if (parseInt(insumoRes.rows[0].count, 10) === 0) {
      console.log('🌱 Creando insumos y bodega inicial...');
      const defaultInsumos = [
        ['ins_1', 'Carne Molida Black Angus', 'Carnes', 'kg', 18.5, 5.0, 4200],
        ['ins_2', 'Pan Brioche Artesanal', 'Panadería', 'unidades', 60, 15, 450],
        ['ins_3', 'Queso Cheddar Madurado', 'Lácteos', 'kg', 8.2, 2.0, 5800],
        ['ins_4', 'Café en Grano Premium Tarrazú', 'Cafetería', 'kg', 12.0, 3.0, 6500],
        ['ins_5', 'Leche Entera / Descremada', 'Lácteos', 'litros', 24, 6, 950],
        ['ins_6', 'Cerveza Barril Artesanal', 'Licores', 'litros', 45, 10, 2200],
        ['ins_7', 'Salsa BBQ Ahumada Especial', 'Salsas', 'litros', 6.5, 2.0, 3100]
      ];
      for (const ins of defaultInsumos) {
        await pool.query(
          `INSERT INTO insumos (id, nombre, categoria, unidad, stock_actual, stock_minimo, costo_unitario)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO NOTHING;`,
          ins
        );
      }
    }

  } catch (error) {
    console.error('Error poblando datos iniciales:', error.message);
  }
}

export default pool;
