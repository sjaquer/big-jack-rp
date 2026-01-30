/**
 * Datos de demostración para Big Jack Manager
 * Datos realistas para mostrar las funcionalidades del sistema
 */

// ==================== PRODUCTOS ====================
export const DEMO_PRODUCTS = [
  {
    id: 'prod-001',
    name: 'Hamburguesa Clásica',
    description: 'Carne 100% de res, lechuga, tomate, cebolla y salsa especial',
    price: 18.90,
    category: 'Hamburguesas',
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400',
    available: true,
    isCombo: false,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-11-20'),
  },
  {
    id: 'prod-002',
    name: 'Hamburguesa Big Jack',
    description: 'Doble carne, queso cheddar, bacon, lechuga y salsa BBQ',
    price: 28.90,
    category: 'Hamburguesas',
    imageUrl: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=400',
    available: true,
    isCombo: false,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-11-20'),
  },
  {
    id: 'prod-003',
    name: 'Hamburguesa Pollo Crispy',
    description: 'Pechuga de pollo empanizada, lechuga, tomate y mayonesa',
    price: 22.90,
    category: 'Hamburguesas',
    imageUrl: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=400',
    available: true,
    isCombo: false,
    createdAt: new Date('2024-02-10'),
    updatedAt: new Date('2024-11-15'),
  },
  {
    id: 'prod-004',
    name: 'Papas Fritas',
    description: 'Porción de papas fritas crujientes con sal',
    price: 8.90,
    category: 'Acompañamientos',
    imageUrl: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400',
    available: true,
    isCombo: false,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-10-01'),
  },
  {
    id: 'prod-005',
    name: 'Aros de Cebolla',
    description: 'Aros de cebolla empanizados y fritos',
    price: 12.90,
    category: 'Acompañamientos',
    imageUrl: 'https://images.unsplash.com/photo-1639024471283-03518883512d?w=400',
    available: true,
    isCombo: false,
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-09-15'),
  },
  {
    id: 'prod-006',
    name: 'Coca Cola 500ml',
    description: 'Bebida gaseosa Coca Cola',
    price: 5.50,
    category: 'Bebidas',
    imageUrl: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=400',
    available: true,
    isCombo: false,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-08-01'),
  },
  {
    id: 'prod-007',
    name: 'Inca Kola 500ml',
    description: 'Bebida gaseosa Inca Kola',
    price: 5.50,
    category: 'Bebidas',
    imageUrl: 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=400',
    available: true,
    isCombo: false,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-08-01'),
  },
  {
    id: 'prod-008',
    name: 'Milkshake Chocolate',
    description: 'Batido cremoso de chocolate con crema batida',
    price: 14.90,
    category: 'Bebidas',
    imageUrl: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400',
    available: true,
    isCombo: false,
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-11-10'),
  },
  {
    id: 'prod-009',
    name: 'Combo Big Jack',
    description: 'Hamburguesa Big Jack + Papas + Bebida',
    price: 38.90,
    category: 'Combos',
    imageUrl: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=400',
    available: true,
    isCombo: true,
    comboItems: ['prod-002', 'prod-004', 'prod-006'],
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-11-20'),
  },
  {
    id: 'prod-010',
    name: 'Combo Familiar',
    description: '2 Hamburguesas Clásicas + 2 Papas + 4 Bebidas',
    price: 79.90,
    category: 'Combos',
    imageUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=400',
    available: true,
    isCombo: true,
    comboItems: ['prod-001', 'prod-001', 'prod-004', 'prod-004', 'prod-006', 'prod-006', 'prod-007', 'prod-007'],
    createdAt: new Date('2024-02-15'),
    updatedAt: new Date('2024-11-18'),
  },
  {
    id: 'prod-011',
    name: 'Hot Dog Clásico',
    description: 'Salchicha premium con mostaza, ketchup y cebolla crispy',
    price: 12.90,
    category: 'Hot Dogs',
    imageUrl: 'https://images.unsplash.com/photo-1612392062631-94e1e78e45f9?w=400',
    available: true,
    isCombo: false,
    createdAt: new Date('2024-04-01'),
    updatedAt: new Date('2024-10-20'),
  },
  {
    id: 'prod-012',
    name: 'Nuggets x6',
    description: '6 nuggets de pollo con salsa BBQ',
    price: 15.90,
    category: 'Acompañamientos',
    imageUrl: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=400',
    available: true,
    isCombo: false,
    createdAt: new Date('2024-05-10'),
    updatedAt: new Date('2024-11-01'),
  },
];

// ==================== INGREDIENTES ====================
export const DEMO_INGREDIENTS = [
  {
    id: 'ing-001',
    name: 'Carne de Res (150g)',
    unit: 'unidades',
    currentStock: 245,
    minStock: 50,
    costPerUnit: 4.50,
    category: 'Proteínas',
    supplier: 'Carnes Premium SAC',
    lastRestockDate: new Date('2024-11-18'),
  },
  {
    id: 'ing-002',
    name: 'Pan de Hamburguesa',
    unit: 'unidades',
    currentStock: 180,
    minStock: 40,
    costPerUnit: 1.20,
    category: 'Panadería',
    supplier: 'Panadería El Sol',
    lastRestockDate: new Date('2024-11-19'),
  },
  {
    id: 'ing-003',
    name: 'Queso Cheddar (lámina)',
    unit: 'unidades',
    currentStock: 320,
    minStock: 60,
    costPerUnit: 0.80,
    category: 'Lácteos',
    supplier: 'Lácteos Gloria',
    lastRestockDate: new Date('2024-11-17'),
  },
  {
    id: 'ing-004',
    name: 'Lechuga (kg)',
    unit: 'kg',
    currentStock: 8.5,
    minStock: 3,
    costPerUnit: 6.00,
    category: 'Vegetales',
    supplier: 'Mercado Mayorista',
    lastRestockDate: new Date('2024-11-20'),
  },
  {
    id: 'ing-005',
    name: 'Tomate (kg)',
    unit: 'kg',
    currentStock: 12,
    minStock: 4,
    costPerUnit: 4.50,
    category: 'Vegetales',
    supplier: 'Mercado Mayorista',
    lastRestockDate: new Date('2024-11-20'),
  },
  {
    id: 'ing-006',
    name: 'Papas (kg)',
    unit: 'kg',
    currentStock: 45,
    minStock: 15,
    costPerUnit: 3.00,
    category: 'Vegetales',
    supplier: 'Mercado Mayorista',
    lastRestockDate: new Date('2024-11-19'),
  },
  {
    id: 'ing-007',
    name: 'Aceite Vegetal (litro)',
    unit: 'litros',
    currentStock: 25,
    minStock: 8,
    costPerUnit: 8.50,
    category: 'Aceites',
    supplier: 'Distribuidora Central',
    lastRestockDate: new Date('2024-11-15'),
  },
  {
    id: 'ing-008',
    name: 'Bacon (kg)',
    unit: 'kg',
    currentStock: 6.2,
    minStock: 2,
    costPerUnit: 35.00,
    category: 'Proteínas',
    supplier: 'Carnes Premium SAC',
    lastRestockDate: new Date('2024-11-16'),
  },
  {
    id: 'ing-009',
    name: 'Salsa BBQ (litro)',
    unit: 'litros',
    currentStock: 4.5,
    minStock: 2,
    costPerUnit: 18.00,
    category: 'Salsas',
    supplier: 'Distribuidora Central',
    lastRestockDate: new Date('2024-11-14'),
  },
  {
    id: 'ing-010',
    name: 'Coca Cola 500ml',
    unit: 'unidades',
    currentStock: 144,
    minStock: 48,
    costPerUnit: 2.80,
    category: 'Bebidas',
    supplier: 'Arca Continental',
    lastRestockDate: new Date('2024-11-18'),
  },
  {
    id: 'ing-011',
    name: 'Inca Kola 500ml',
    unit: 'unidades',
    currentStock: 120,
    minStock: 48,
    costPerUnit: 2.80,
    category: 'Bebidas',
    supplier: 'Arca Continental',
    lastRestockDate: new Date('2024-11-18'),
  },
  {
    id: 'ing-012',
    name: 'Pechuga de Pollo (kg)',
    unit: 'kg',
    currentStock: 18,
    minStock: 5,
    costPerUnit: 16.00,
    category: 'Proteínas',
    supplier: 'Avícola San Fernando',
    lastRestockDate: new Date('2024-11-17'),
  },
];

// ==================== OTROS ITEMS (INVENTARIO GENERAL) ====================
export const DEMO_OTHER_ITEMS = [
  {
    id: 'item-001',
    name: 'Servilletas (paquete x100)',
    unit: 'paquetes',
    currentStock: 45,
    minStock: 10,
    costPerUnit: 5.00,
    category: 'Desechables',
  },
  {
    id: 'item-002',
    name: 'Vasos de Papel 12oz',
    unit: 'unidades',
    currentStock: 350,
    minStock: 100,
    costPerUnit: 0.35,
    category: 'Desechables',
  },
  {
    id: 'item-003',
    name: 'Bolsas de Papel (para llevar)',
    unit: 'unidades',
    currentStock: 280,
    minStock: 80,
    costPerUnit: 0.50,
    category: 'Desechables',
  },
  {
    id: 'item-004',
    name: 'Guantes Desechables (caja x100)',
    unit: 'cajas',
    currentStock: 8,
    minStock: 3,
    costPerUnit: 25.00,
    category: 'Limpieza',
  },
];

// ==================== CLIENTES ====================
export const DEMO_CUSTOMERS = [
  {
    id: 'cust-001',
    name: 'Juan Pérez García',
    email: 'juan.perez@email.com',
    phone: '987654321',
    documentType: 'DNI',
    documentNumber: '72345678',
    address: 'Av. Larco 450, Miraflores',
    totalOrders: 15,
    totalSpent: 485.50,
    lastOrderDate: new Date('2024-11-19'),
    createdAt: new Date('2024-03-10'),
  },
  {
    id: 'cust-002',
    name: 'María López Sánchez',
    email: 'maria.lopez@email.com',
    phone: '912345678',
    documentType: 'DNI',
    documentNumber: '45678912',
    address: 'Jr. de la Unión 234, Centro de Lima',
    totalOrders: 28,
    totalSpent: 892.30,
    lastOrderDate: new Date('2024-11-20'),
    createdAt: new Date('2024-02-05'),
  },
  {
    id: 'cust-003',
    name: 'Carlos Rodríguez Mendoza',
    email: 'carlos.rodriguez@empresa.com',
    phone: '998877665',
    documentType: 'RUC',
    documentNumber: '20123456789',
    address: 'Calle Las Begonias 400, San Isidro',
    totalOrders: 42,
    totalSpent: 2150.80,
    lastOrderDate: new Date('2024-11-20'),
    createdAt: new Date('2024-01-15'),
  },
  {
    id: 'cust-004',
    name: 'Ana Martínez Torres',
    email: 'ana.martinez@gmail.com',
    phone: '945612378',
    documentType: 'DNI',
    documentNumber: '78945612',
    address: 'Av. Brasil 1200, Jesús María',
    totalOrders: 8,
    totalSpent: 234.60,
    lastOrderDate: new Date('2024-11-15'),
    createdAt: new Date('2024-06-20'),
  },
  {
    id: 'cust-005',
    name: 'Roberto Fernández Díaz',
    email: 'roberto.fernandez@outlook.com',
    phone: '956478123',
    documentType: 'DNI',
    documentNumber: '36985214',
    address: 'Av. Arequipa 3500, San Isidro',
    totalOrders: 19,
    totalSpent: 612.90,
    lastOrderDate: new Date('2024-11-18'),
    createdAt: new Date('2024-04-08'),
  },
];

// ==================== VENTAS/ÓRDENES ====================
function generateSalesData() {
  const sales = [];
  const today = new Date();
  
  // Generar ventas de los últimos 30 días
  for (let daysAgo = 0; daysAgo < 30; daysAgo++) {
    const date = new Date(today);
    date.setDate(date.getDate() - daysAgo);
    
    // Más ventas en fines de semana
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const ordersCount = isWeekend ? Math.floor(Math.random() * 25) + 35 : Math.floor(Math.random() * 20) + 20;
    
    for (let i = 0; i < ordersCount; i++) {
      const hour = Math.floor(Math.random() * 12) + 10; // Entre 10am y 10pm
      const minute = Math.floor(Math.random() * 60);
      const orderDate = new Date(date);
      orderDate.setHours(hour, minute, 0, 0);
      
      // Seleccionar productos aleatorios
      const itemsCount = Math.floor(Math.random() * 4) + 1;
      const items = [];
      let subtotal = 0;
      
      for (let j = 0; j < itemsCount; j++) {
        const product = DEMO_PRODUCTS[Math.floor(Math.random() * DEMO_PRODUCTS.length)];
        const quantity = Math.floor(Math.random() * 3) + 1;
        items.push({
          productId: product.id,
          productName: product.name,
          price: product.price,
          quantity,
          total: product.price * quantity,
        });
        subtotal += product.price * quantity;
      }
      
      const paymentMethods = ['Efectivo', 'Yape', 'Plin', 'Tarjeta', 'Transferencia'];
      const sources = ['local', 'rappi', 'pedidosya', 'whatsapp'];
      const sourceWeights = [0.6, 0.15, 0.15, 0.1]; // 60% local, 15% rappi, etc.
      
      let sourceIndex = 0;
      const sourceRandom = Math.random();
      let cumulative = 0;
      for (let k = 0; k < sourceWeights.length; k++) {
        cumulative += sourceWeights[k];
        if (sourceRandom < cumulative) {
          sourceIndex = k;
          break;
        }
      }
      
      const source = sources[sourceIndex];
      const isDelivery = source !== 'local';
      
      sales.push({
        id: `sale-${daysAgo}-${i}`,
        orderNumber: `ORD-${String(30 - daysAgo).padStart(2, '0')}${String(i + 1).padStart(3, '0')}`,
        items,
        subtotal,
        discount: Math.random() > 0.85 ? Math.floor(subtotal * 0.1) : 0,
        total: subtotal - (Math.random() > 0.85 ? Math.floor(subtotal * 0.1) : 0),
        paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
        status: 'completed',
        source,
        isDelivery,
        customerId: Math.random() > 0.7 ? DEMO_CUSTOMERS[Math.floor(Math.random() * DEMO_CUSTOMERS.length)].id : null,
        createdAt: orderDate,
        completedAt: new Date(orderDate.getTime() + Math.floor(Math.random() * 20 + 10) * 60000),
      });
    }
  }
  
  return sales.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export const DEMO_SALES = generateSalesData();

// ==================== PEDIDOS ONLINE ====================
export const DEMO_ONLINE_ORDERS = [
  {
    id: 'online-001',
    platform: 'Rappi',
    orderNumber: 'RAP-78945',
    customerName: 'Cliente Rappi',
    customerPhone: '999888777',
    items: [
      { productId: 'prod-002', productName: 'Hamburguesa Big Jack', quantity: 2, price: 28.90 },
      { productId: 'prod-004', productName: 'Papas Fritas', quantity: 2, price: 8.90 },
    ],
    total: 75.60,
    status: 'pending',
    deliveryAddress: 'Av. Javier Prado 2456, San Borja',
    estimatedDelivery: new Date(Date.now() + 30 * 60000),
    createdAt: new Date(Date.now() - 5 * 60000),
  },
  {
    id: 'online-002',
    platform: 'PedidosYa',
    orderNumber: 'PYA-45612',
    customerName: 'Cliente PedidosYa',
    customerPhone: '998877665',
    items: [
      { productId: 'prod-009', productName: 'Combo Big Jack', quantity: 1, price: 38.90 },
      { productId: 'prod-008', productName: 'Milkshake Chocolate', quantity: 1, price: 14.90 },
    ],
    total: 53.80,
    status: 'preparing',
    deliveryAddress: 'Calle Los Olivos 123, Surco',
    estimatedDelivery: new Date(Date.now() + 25 * 60000),
    createdAt: new Date(Date.now() - 15 * 60000),
  },
  {
    id: 'online-003',
    platform: 'WhatsApp',
    orderNumber: 'WA-00156',
    customerName: 'María García',
    customerPhone: '912345678',
    items: [
      { productId: 'prod-010', productName: 'Combo Familiar', quantity: 1, price: 79.90 },
    ],
    total: 79.90,
    status: 'ready',
    deliveryAddress: 'Jr. Huancayo 567, La Victoria',
    estimatedDelivery: new Date(Date.now() + 10 * 60000),
    createdAt: new Date(Date.now() - 25 * 60000),
  },
];

// ==================== CAJA / CASH FLOW ====================
export const DEMO_CASH_FLOWS = [
  {
    id: 'cf-001',
    type: 'opening',
    amount: 500.00,
    description: 'Apertura de caja',
    paymentMethod: 'Efectivo',
    userId: 'demo-user-123',
    userName: 'Administrador Demo',
    createdAt: new Date(new Date().setHours(9, 0, 0, 0)),
  },
  {
    id: 'cf-002',
    type: 'income',
    amount: 156.80,
    description: 'Ventas en efectivo - Turno mañana',
    paymentMethod: 'Efectivo',
    orderId: 'sale-0-1',
    userId: 'demo-user-123',
    userName: 'Administrador Demo',
    createdAt: new Date(new Date().setHours(12, 30, 0, 0)),
  },
  {
    id: 'cf-003',
    type: 'expense',
    amount: 45.00,
    description: 'Compra de insumos menores',
    paymentMethod: 'Efectivo',
    userId: 'demo-user-123',
    userName: 'Administrador Demo',
    createdAt: new Date(new Date().setHours(14, 0, 0, 0)),
  },
  {
    id: 'cf-004',
    type: 'income',
    amount: 234.50,
    description: 'Ventas en efectivo - Turno tarde',
    paymentMethod: 'Efectivo',
    userId: 'demo-user-123',
    userName: 'Administrador Demo',
    createdAt: new Date(new Date().setHours(18, 0, 0, 0)),
  },
];

// ==================== ESTADÍSTICAS CALCULADAS ====================
export function getDemoStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todaySales = DEMO_SALES.filter(s => {
    const saleDate = new Date(s.createdAt);
    saleDate.setHours(0, 0, 0, 0);
    return saleDate.getTime() === today.getTime();
  });
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const yesterdaySales = DEMO_SALES.filter(s => {
    const saleDate = new Date(s.createdAt);
    saleDate.setHours(0, 0, 0, 0);
    return saleDate.getTime() === yesterday.getTime();
  });
  
  const todayTotal = todaySales.reduce((sum, s) => sum + s.total, 0);
  const yesterdayTotal = yesterdaySales.reduce((sum, s) => sum + s.total, 0);
  
  const last7Days = DEMO_SALES.filter(s => {
    const saleDate = new Date(s.createdAt);
    const diff = (today.getTime() - saleDate.getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 7;
  });
  
  const last30Days = DEMO_SALES.filter(s => {
    const saleDate = new Date(s.createdAt);
    const diff = (today.getTime() - saleDate.getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 30;
  });
  
  return {
    todayOrders: todaySales.length,
    todayRevenue: todayTotal,
    yesterdayRevenue: yesterdayTotal,
    revenueChange: yesterdayTotal > 0 ? ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100 : 0,
    weeklyRevenue: last7Days.reduce((sum, s) => sum + s.total, 0),
    weeklyOrders: last7Days.length,
    monthlyRevenue: last30Days.reduce((sum, s) => sum + s.total, 0),
    monthlyOrders: last30Days.length,
    avgTicket: todaySales.length > 0 ? todayTotal / todaySales.length : 0,
    topProducts: getTopProducts(),
    salesByHour: getSalesByHour(todaySales),
    salesByCategory: getSalesByCategory(),
    salesByPaymentMethod: getSalesByPaymentMethod(),
    salesBySource: getSalesBySource(),
  };
}

function getTopProducts() {
  const productCounts: Record<string, { name: string; count: number; revenue: number }> = {};
  
  DEMO_SALES.forEach(sale => {
    sale.items.forEach(item => {
      if (!productCounts[item.productId]) {
        productCounts[item.productId] = { name: item.productName, count: 0, revenue: 0 };
      }
      productCounts[item.productId].count += item.quantity;
      productCounts[item.productId].revenue += item.total;
    });
  });
  
  return Object.entries(productCounts)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

function getSalesByHour(sales: typeof DEMO_SALES) {
  const hours: Record<number, number> = {};
  for (let i = 10; i <= 22; i++) hours[i] = 0;
  
  sales.forEach(sale => {
    const hour = new Date(sale.createdAt).getHours();
    if (hours[hour] !== undefined) {
      hours[hour] += sale.total;
    }
  });
  
  return Object.entries(hours).map(([hour, total]) => ({
    hour: parseInt(hour),
    total,
  }));
}

function getSalesByCategory() {
  const categories: Record<string, number> = {};
  
  DEMO_SALES.forEach(sale => {
    sale.items.forEach(item => {
      const product = DEMO_PRODUCTS.find(p => p.id === item.productId);
      if (product) {
        if (!categories[product.category]) {
          categories[product.category] = 0;
        }
        categories[product.category] += item.total;
      }
    });
  });
  
  return Object.entries(categories).map(([category, total]) => ({
    category,
    total,
  }));
}

function getSalesByPaymentMethod() {
  const methods: Record<string, number> = {};
  
  DEMO_SALES.forEach(sale => {
    if (!methods[sale.paymentMethod]) {
      methods[sale.paymentMethod] = 0;
    }
    methods[sale.paymentMethod] += sale.total;
  });
  
  return Object.entries(methods).map(([method, total]) => ({
    method,
    total,
  }));
}

function getSalesBySource() {
  const sources: Record<string, { count: number; total: number }> = {};
  
  DEMO_SALES.forEach(sale => {
    if (!sources[sale.source]) {
      sources[sale.source] = { count: 0, total: 0 };
    }
    sources[sale.source].count++;
    sources[sale.source].total += sale.total;
  });
  
  return Object.entries(sources).map(([source, data]) => ({
    source,
    ...data,
  }));
}

// Función para obtener datos demo según la colección
export function getDemoData(collectionPath: string): any[] {
  const path = collectionPath.toLowerCase();
  
  if (path.includes('product')) return DEMO_PRODUCTS;
  if (path.includes('ingredient')) return DEMO_INGREDIENTS;
  if (path.includes('other') && path.includes('item')) return DEMO_OTHER_ITEMS;
  if (path.includes('customer')) return DEMO_CUSTOMERS;
  if (path.includes('sale') || path.includes('order')) return DEMO_SALES;
  if (path.includes('online')) return DEMO_ONLINE_ORDERS;
  if (path.includes('cash') || path.includes('flow')) return DEMO_CASH_FLOWS;
  
  return [];
}

export function getDemoDocument(collectionPath: string, docId: string): any {
  const data = getDemoData(collectionPath);
  return data.find((item: any) => item.id === docId) || null;
}
