/**
 * PROYECTO DELTA POS - Catálogo de Productos y Categorías
 */

export const CATEGORIES = [
  { id: 'todos', name: 'Todos los productos', icon: 'grid' },
  { id: 'cafeteria', name: 'Cafetería & Panadería', icon: 'coffee' },
  { id: 'entradas', name: 'Entradas & Snacks', icon: 'sparkles' },
  { id: 'platos', name: 'Platos Fuertes', icon: 'utensils' },
  { id: 'hamburguesas', name: 'Hamburguesas & Grill', icon: 'flame' },
  { id: 'pastas', name: 'Pastas & Especialidades', icon: 'disc' },
  { id: 'bebidas', name: 'Bebidas & Coctelería', icon: 'wine' },
  { id: 'postres', name: 'Postres & Dulces', icon: 'cake' }
];

export const INITIAL_PRODUCTS = [
  // Cafetería
  {
    id: 'p1',
    sku: 'CAF-001',
    name: 'Café Latte Art',
    price: 4.50,
    category: 'cafeteria',
    image: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=600&q=80',
    stock: 45,
    taxRate: 0.16
  },
  {
    id: 'p2',
    sku: 'CAF-002',
    name: 'Croissant Butter Mantequilla',
    price: 3.80,
    category: 'cafeteria',
    image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80',
    stock: 22,
    taxRate: 0.16
  },
  {
    id: 'p3',
    sku: 'CAF-003',
    name: 'Iced Mocha Frappé',
    price: 5.50,
    category: 'cafeteria',
    image: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=600&q=80',
    stock: 30,
    taxRate: 0.16
  },
  {
    id: 'p4',
    sku: 'CAF-004',
    name: 'Té Verde Matcha Orgánico',
    price: 4.20,
    category: 'cafeteria',
    image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80',
    stock: 50,
    taxRate: 0.16
  },

  // Hamburguesas & Grill
  {
    id: 'p5',
    sku: 'HAM-001',
    name: 'Cheeseburger Deluxe Black Angus',
    price: 14.90,
    category: 'hamburguesas',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
    stock: 18,
    taxRate: 0.16
  },
  {
    id: 'p6',
    sku: 'HAM-002',
    name: 'Bacon Crispy BBQ Burger',
    price: 15.50,
    category: 'hamburguesas',
    image: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=600&q=80',
    stock: 14,
    taxRate: 0.16
  },
  {
    id: 'p7',
    sku: 'GRL-001',
    name: 'Filete Mignon Corte Fino',
    price: 28.50,
    category: 'platos',
    image: 'https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=600&q=80',
    stock: 10,
    taxRate: 0.16
  },
  {
    id: 'p8',
    sku: 'GRL-002',
    name: 'Salmón Grillé a las Finas Hierbas',
    price: 24.00,
    category: 'platos',
    image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=600&q=80',
    stock: 12,
    taxRate: 0.16
  },

  // Pastas
  {
    id: 'p9',
    sku: 'PAS-001',
    name: 'Pasta Carbonara Auténtica',
    price: 16.50,
    category: 'pastas',
    image: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?auto=format&fit=crop&w=600&q=80',
    stock: 25,
    taxRate: 0.16
  },
  {
    id: 'p10',
    sku: 'PAS-002',
    name: 'Risotto de Setas & Trufa',
    price: 19.00,
    category: 'pastas',
    image: 'https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?auto=format&fit=crop&w=600&q=80',
    stock: 15,
    taxRate: 0.16
  },
  {
    id: 'p11',
    sku: 'PAS-003',
    name: 'Pizza Margherita Clásica',
    price: 13.50,
    category: 'pastas',
    image: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=600&q=80',
    stock: 20,
    taxRate: 0.16
  },

  // Entradas
  {
    id: 'p12',
    sku: 'ENT-001',
    name: 'Ensalada César con Pollo Grill',
    price: 12.00,
    category: 'entradas',
    image: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?auto=format&fit=crop&w=600&q=80',
    stock: 30,
    taxRate: 0.16
  },
  {
    id: 'p13',
    sku: 'ENT-002',
    name: 'Tacos al Pastor Gourmet (x3)',
    price: 14.00,
    category: 'entradas',
    image: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?auto=format&fit=crop&w=600&q=80',
    stock: 20,
    taxRate: 0.16
  },
  {
    id: 'p14',
    sku: 'ENT-003',
    name: 'Bruschetta de Tomate & Albahaca',
    price: 8.50,
    category: 'entradas',
    image: 'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?auto=format&fit=crop&w=600&q=80',
    stock: 25,
    taxRate: 0.16
  },

  // Bebidas
  {
    id: 'p15',
    sku: 'BEB-001',
    name: 'Cerveza Artesanal IPA 355ml',
    price: 6.00,
    category: 'bebidas',
    image: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?auto=format&fit=crop&w=600&q=80',
    stock: 48,
    taxRate: 0.16
  },
  {
    id: 'p16',
    sku: 'BEB-002',
    name: 'Copa de Vino Tinto Rioja Reserva',
    price: 8.00,
    category: 'bebidas',
    image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=600&q=80',
    stock: 36,
    taxRate: 0.16
  },
  {
    id: 'p17',
    sku: 'BEB-003',
    name: 'Agua Mineral de Manantial 500ml',
    price: 3.00,
    category: 'bebidas',
    image: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=600&q=80',
    stock: 60,
    taxRate: 0.16
  },

  // Postres
  {
    id: 'p18',
    sku: 'POS-001',
    name: 'Tarta de Queso con Frutos Rojos',
    price: 7.50,
    category: 'postres',
    image: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=600&q=80',
    stock: 14,
    taxRate: 0.16
  },
  {
    id: 'p19',
    sku: 'POS-002',
    name: 'Pastel Supreme de Chocolate Belga',
    price: 7.00,
    category: 'postres',
    image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80',
    stock: 16,
    taxRate: 0.16
  }
];

