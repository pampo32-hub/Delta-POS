/**
 * PROYECTO DELTA POS - Conexión y Esquema de Base de Datos PostgreSQL
 */

import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

// Configuración de la conexión PostgreSQL con soporte SSL para Render
// Configuración de la conexión PostgreSQL con soporte SSL para Neon y Render
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('ssl=true') 
  ssl: process.env.DATABASE_URL && (process.env.DATABASE_URL.includes('ssl') || process.env.DATABASE_URL.includes('neon.tech'))
    ? { rejectUnauthorized: false } 
    : false
});

export async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  // console.log('Ejecutada consulta:', { text, duration, rows: res.rowCount });
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
        impuesto NUMERIC(4, 2) DEFAULT 0.16,
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
        estado VARCHAR(30) DEFAULT 'free', -- 'free', 'busy', 'sent'
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

    // 4. Tabla de Ajustes / Configuración
    await pool.query(`
      CREATE TABLE IF NOT EXISTS configuracion (
        clave VARCHAR(50) PRIMARY KEY,
        valor JSONB NOT NULL
      );
    `);

    console.log('✅ Esquema de base de datos PostgreSQL verificado y listo.');
    await seedInitialData();

  } catch (error) {
    console.error('⚠️ Error inicializando base de datos PostgreSQL:', error.message);
  }
}

async function seedInitialData() {
  try {
    // Comprobar si ya existen productos
    const prodRes = await pool.query('SELECT COUNT(*) FROM productos;');
    if (parseInt(prodRes.rows[0].count, 10) === 0) {
      console.log('🌱 Poblando catálogo inicial de productos...');
      
      const initialItems = [
        ['p1', 'CAF-001', 'Café Latte Art', 4.50, 'cafeteria', 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=600&q=80', 45],
        ['p2', 'CAF-002', 'Croissant Butter Mantequilla', 3.80, 'cafeteria', 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80', 22],
        ['p3', 'CAF-003', 'Iced Mocha Frappé', 5.50, 'cafeteria', 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=600&q=80', 30],
        ['p4', 'CAF-004', 'Té Verde Matcha Orgánico', 4.20, 'cafeteria', 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80', 50],
        ['p5', 'HAM-001', 'Cheeseburger Deluxe Black Angus', 14.90, 'hamburguesas', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80', 18],
        ['p6', 'HAM-002', 'Bacon Crispy BBQ Burger', 15.50, 'hamburguesas', 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=600&q=80', 14],
        ['p7', 'GRL-001', 'Filete Mignon Corte Fino', 28.50, 'platos', 'https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=600&q=80', 10],
        ['p8', 'GRL-002', 'Salmón Grillé a las Finas Hierbas', 24.00, 'platos', 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=600&q=80', 12],
        ['p9', 'PAS-001', 'Pasta Carbonara Auténtica', 16.50, 'pastas', 'https://images.unsplash.com/photo-1612874742237-6526221588e3?auto=format&fit=crop&w=600&q=80', 25],
        ['p10', 'PAS-002', 'Risotto de Setas & Trufa', 19.00, 'pastas', 'https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?auto=format&fit=crop&w=600&q=80', 15],
        ['p11', 'PAS-003', 'Pizza Margherita Clásica', 13.50, 'pastas', 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=600&q=80', 20],
        ['p12', 'ENT-001', 'Ensalada César con Pollo Grill', 12.00, 'entradas', 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?auto=format&fit=crop&w=600&q=80', 30],
        ['p13', 'ENT-002', 'Tacos al Pastor Gourmet (x3)', 14.00, 'entradas', 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?auto=format&fit=crop&w=600&q=80', 20],
        ['p14', 'ENT-003', 'Bruschetta de Tomate & Albahaca', 8.50, 'entradas', 'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?auto=format&fit=crop&w=600&q=80', 25],
        ['p15', 'BEB-001', 'Cerveza Artesanal IPA 355ml', 6.00, 'bebidas', 'https://images.unsplash.com/photo-1608270586620-248524c67de9?auto=format&fit=crop&w=600&q=80', 48],
        ['p16', 'BEB-002', 'Copa de Vino Tinto Rioja Reserva', 8.00, 'bebidas', 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=600&q=80', 36],
        ['p17', 'BEB-003', 'Agua Mineral de Manantial 500ml', 3.00, 'bebidas', 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=600&q=80', 60],
        ['p18', 'POS-001', 'Tarta de Queso con Frutos Rojos', 7.50, 'postres', 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=600&q=80', 14],
        ['p19', 'POS-002', 'Pastel Supreme de Chocolate Belga', 7.00, 'postres', 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80', 16]
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

    // Comprobar mesas
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

  } catch (error) {
    console.error('Error poblando datos iniciales:', error.message);
  }
}

export default pool;

