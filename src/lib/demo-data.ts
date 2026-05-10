/**
 * Datos de demostración para Big Jack Manager
 * Datos realistas y completos para mostrar todas las funcionalidades del ERP.
 * Basado en una hamburguesería real en Perú con operaciones de 90 días.
 */

// ==================== HELPERS ====================

/** Crea un Timestamp falso compatible con la API de Firestore */
function createTimestamp(date: Date) {
  return {
    toDate: () => date,
    seconds: Math.floor(date.getTime() / 1000),
    nanoseconds: (date.getTime() % 1000) * 1000000,
    toMillis: () => date.getTime(),
    isEqual: (other: any) => other?.seconds === Math.floor(date.getTime() / 1000),
  };
}

/** Genera un número aleatorio entero entre min y max (inclusivos) */
function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ==================== PROVEEDORES ====================
export const DEMO_SUPPLIERS = [
  { id: 'sup-001', name: 'Carnes Premium SAC' },
  { id: 'sup-002', name: 'Panadería El Sol' },
  { id: 'sup-003', name: 'Lácteos Gloria S.A.' },
  { id: 'sup-004', name: 'Mercado Mayorista Santa Anita' },
  { id: 'sup-005', name: 'Arca Continental (Coca-Cola)' },
  { id: 'sup-006', name: 'Distribuidora Central Lima' },
  { id: 'sup-007', name: 'Avícola San Fernando' },
  { id: 'sup-008', name: 'Makro Supermayorista' },
];

// ==================== PRODUCTOS (28 productos) ====================
export const DEMO_PRODUCTS = [
  // --- HAMBURGUESAS ---
  {
    id: 'prod-001',
    name: 'Hamburguesa Clásica',
    sku: 'BURG-001',
    category: 'hamburguesas' as const,
    price: 18.90,
    salePrice: 18.90,
    supplierId: 'sup-001',
    purchaseDate: '2024-01-15',
    quantity: 50,
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400',
    ingredients: [
      { ingredientId: 'ing-001', quantity: 1, unit: 'unidades' },
      { ingredientId: 'ing-002', quantity: 1, unit: 'unidades' },
      { ingredientId: 'ing-004', quantity: 0.05, unit: 'kg' },
      { ingredientId: 'ing-005', quantity: 0.03, unit: 'kg' },
    ],
  },
  {
    id: 'prod-002',
    name: 'Hamburguesa Big Jack',
    sku: 'BURG-002',
    category: 'hamburguesas' as const,
    price: 28.90,
    salePrice: 28.90,
    supplierId: 'sup-001',
    purchaseDate: '2024-01-15',
    quantity: 35,
    imageUrl: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=400',
    ingredients: [
      { ingredientId: 'ing-001', quantity: 2, unit: 'unidades' },
      { ingredientId: 'ing-002', quantity: 1, unit: 'unidades' },
      { ingredientId: 'ing-003', quantity: 2, unit: 'unidades' },
      { ingredientId: 'ing-008', quantity: 0.05, unit: 'kg' },
      { ingredientId: 'ing-009', quantity: 0.03, unit: 'litros' },
    ],
  },
  {
    id: 'prod-003',
    name: 'Hamburguesa Doble Queso',
    sku: 'BURG-003',
    category: 'hamburguesas' as const,
    price: 24.90,
    salePrice: 22.90,
    supplierId: 'sup-001',
    purchaseDate: '2024-02-10',
    quantity: 40,
    imageUrl: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=400',
    ingredients: [
      { ingredientId: 'ing-001', quantity: 2, unit: 'unidades' },
      { ingredientId: 'ing-002', quantity: 1, unit: 'unidades' },
      { ingredientId: 'ing-003', quantity: 3, unit: 'unidades' },
    ],
  },
  {
    id: 'prod-004',
    name: 'Hamburguesa Crispy Chicken',
    sku: 'BURG-004',
    category: 'hamburguesas' as const,
    price: 22.90,
    salePrice: 22.90,
    supplierId: 'sup-007',
    purchaseDate: '2024-03-01',
    quantity: 30,
    imageUrl: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400',
    ingredients: [
      { ingredientId: 'ing-012', quantity: 0.15, unit: 'kg' },
      { ingredientId: 'ing-002', quantity: 1, unit: 'unidades' },
      { ingredientId: 'ing-004', quantity: 0.04, unit: 'kg' },
    ],
  },
  {
    id: 'prod-005',
    name: 'Hamburguesa BBQ Bacon',
    sku: 'BURG-005',
    category: 'hamburguesas' as const,
    price: 26.90,
    salePrice: 26.90,
    supplierId: 'sup-001',
    purchaseDate: '2024-04-15',
    quantity: 28,
    imageUrl: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=400',
    ingredients: [
      { ingredientId: 'ing-001', quantity: 1, unit: 'unidades' },
      { ingredientId: 'ing-002', quantity: 1, unit: 'unidades' },
      { ingredientId: 'ing-008', quantity: 0.06, unit: 'kg' },
      { ingredientId: 'ing-009', quantity: 0.04, unit: 'litros' },
    ],
  },
  // --- POLLOS & PARRILLA ---
  {
    id: 'prod-006',
    name: 'Alitas BBQ x8',
    sku: 'POLL-001',
    category: 'pollos' as const,
    price: 29.90,
    salePrice: 29.90,
    supplierId: 'sup-007',
    purchaseDate: '2024-05-01',
    quantity: 22,
    imageUrl: 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=400',
    ingredients: [
      { ingredientId: 'ing-012', quantity: 0.5, unit: 'kg' },
      { ingredientId: 'ing-009', quantity: 0.05, unit: 'litros' },
    ],
  },
  {
    id: 'prod-007',
    name: 'Nuggets x6',
    sku: 'POLL-002',
    category: 'pollos' as const,
    price: 15.90,
    salePrice: 15.90,
    supplierId: 'sup-007',
    purchaseDate: '2024-05-10',
    quantity: 60,
    imageUrl: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=400',
    ingredients: [
      { ingredientId: 'ing-012', quantity: 0.25, unit: 'kg' },
    ],
  },
  // --- SALCHIPAPAS ---
  {
    id: 'prod-008',
    name: 'Salchipapa Clásica',
    sku: 'SALC-001',
    category: 'salchipapas' as const,
    price: 14.90,
    salePrice: 14.90,
    supplierId: 'sup-004',
    purchaseDate: '2024-01-15',
    quantity: 65,
    imageUrl: 'https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?w=400',
    ingredients: [
      { ingredientId: 'ing-006', quantity: 0.25, unit: 'kg' },
      { ingredientId: 'ing-013', quantity: 2, unit: 'unidades' },
      { ingredientId: 'ing-007', quantity: 0.1, unit: 'litros' },
    ],
  },
  {
    id: 'prod-009',
    name: 'Salchipapa Especial',
    sku: 'SALC-002',
    category: 'salchipapas' as const,
    price: 19.90,
    salePrice: 19.90,
    supplierId: 'sup-004',
    purchaseDate: '2024-02-01',
    quantity: 45,
    imageUrl: 'https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?w=400',
    ingredients: [
      { ingredientId: 'ing-006', quantity: 0.35, unit: 'kg' },
      { ingredientId: 'ing-013', quantity: 3, unit: 'unidades' },
      { ingredientId: 'ing-003', quantity: 2, unit: 'unidades' },
    ],
  },
  // --- CHORIPANES ---
  {
    id: 'prod-010',
    name: 'Choripán Argentino',
    sku: 'CHOR-001',
    category: 'choripanes' as const,
    price: 16.90,
    salePrice: 16.90,
    supplierId: 'sup-001',
    purchaseDate: '2024-03-15',
    quantity: 38,
    imageUrl: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400',
    ingredients: [
      { ingredientId: 'ing-014', quantity: 1, unit: 'unidades' },
      { ingredientId: 'ing-015', quantity: 1, unit: 'unidades' },
    ],
  },
  // --- ADICIONALES ---
  {
    id: 'prod-011',
    name: 'Hot Dog Clásico',
    sku: 'HOTD-001',
    category: 'adicionales' as const,
    price: 12.90,
    salePrice: 12.90,
    supplierId: 'sup-001',
    purchaseDate: '2024-04-01',
    quantity: 55,
    imageUrl: 'https://images.unsplash.com/photo-1612392062631-94e1e78e45f9?w=400',
    ingredients: [
      { ingredientId: 'ing-013', quantity: 1, unit: 'unidades' },
      { ingredientId: 'ing-015', quantity: 1, unit: 'unidades' },
    ],
  },
  // --- ACOMPAÑAMIENTOS ---
  {
    id: 'prod-012',
    name: 'Papas Fritas',
    sku: 'ACOM-001',
    category: 'acompanamientos' as const,
    price: 8.90,
    salePrice: 8.90,
    supplierId: 'sup-004',
    purchaseDate: '2024-01-15',
    quantity: 80,
    imageUrl: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400',
    ingredients: [
      { ingredientId: 'ing-006', quantity: 0.2, unit: 'kg' },
      { ingredientId: 'ing-007', quantity: 0.08, unit: 'litros' },
    ],
  },
  {
    id: 'prod-013',
    name: 'Aros de Cebolla',
    sku: 'ACOM-002',
    category: 'acompanamientos' as const,
    price: 12.90,
    salePrice: 12.90,
    supplierId: 'sup-004',
    purchaseDate: '2024-01-20',
    quantity: 45,
    imageUrl: 'https://images.unsplash.com/photo-1639024471283-03518883512d?w=400',
    ingredients: [
      { ingredientId: 'ing-016', quantity: 0.15, unit: 'kg' },
      { ingredientId: 'ing-007', quantity: 0.06, unit: 'litros' },
    ],
  },
  {
    id: 'prod-014',
    name: 'Ensalada Coleslaw',
    sku: 'ACOM-003',
    category: 'acompanamientos' as const,
    price: 9.90,
    salePrice: 9.90,
    supplierId: 'sup-004',
    purchaseDate: '2024-06-01',
    quantity: 35,
    imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400',
  },
  // --- BEBIDAS ---
  {
    id: 'prod-015',
    name: 'Coca Cola 500ml',
    sku: 'BEB-001',
    category: 'bebidas' as const,
    price: 5.50,
    salePrice: 5.50,
    supplierId: 'sup-005',
    purchaseDate: '2024-01-15',
    quantity: 144,
    imageUrl: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=400',
  },
  {
    id: 'prod-016',
    name: 'Inca Kola 500ml',
    sku: 'BEB-002',
    category: 'bebidas' as const,
    price: 5.50,
    salePrice: 5.50,
    supplierId: 'sup-005',
    purchaseDate: '2024-01-15',
    quantity: 120,
    imageUrl: 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=400',
  },
  {
    id: 'prod-017',
    name: 'Sprite 500ml',
    sku: 'BEB-003',
    category: 'bebidas' as const,
    price: 5.50,
    salePrice: 5.50,
    supplierId: 'sup-005',
    purchaseDate: '2024-02-01',
    quantity: 96,
    imageUrl: 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=400',
  },
  {
    id: 'prod-018',
    name: 'Chicha Morada 1L',
    sku: 'BEB-004',
    category: 'bebidas' as const,
    price: 8.90,
    salePrice: 8.90,
    supplierId: 'sup-006',
    purchaseDate: '2024-03-01',
    quantity: 48,
    imageUrl: 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=400',
  },
  {
    id: 'prod-019',
    name: 'Milkshake Chocolate',
    sku: 'BEB-005',
    category: 'bebidas' as const,
    price: 14.90,
    salePrice: 14.90,
    supplierId: 'sup-006',
    purchaseDate: '2024-03-01',
    quantity: 30,
    imageUrl: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400',
    ingredients: [
      { ingredientId: 'ing-017', quantity: 0.3, unit: 'litros' },
      { ingredientId: 'ing-018', quantity: 0.02, unit: 'kg' },
    ],
  },
  {
    id: 'prod-020',
    name: 'Milkshake Fresa',
    sku: 'BEB-006',
    category: 'bebidas' as const,
    price: 14.90,
    salePrice: 14.90,
    supplierId: 'sup-006',
    purchaseDate: '2024-03-01',
    quantity: 25,
    imageUrl: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400',
    ingredients: [
      { ingredientId: 'ing-017', quantity: 0.3, unit: 'litros' },
    ],
  },
  // --- POSTRES ---
  {
    id: 'prod-021',
    name: 'Brownie con Helado',
    sku: 'POST-001',
    category: 'postres' as const,
    price: 16.90,
    salePrice: 16.90,
    supplierId: 'sup-006',
    purchaseDate: '2024-05-01',
    quantity: 20,
    imageUrl: 'https://images.unsplash.com/photo-1564355808539-22fda35bed7e?w=400',
  },
  {
    id: 'prod-022',
    name: 'Sundae de Chocolate',
    sku: 'POST-002',
    category: 'postres' as const,
    price: 12.90,
    salePrice: 12.90,
    supplierId: 'sup-006',
    purchaseDate: '2024-05-15',
    quantity: 25,
    imageUrl: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400',
  },
  // --- COMBOS ---
  {
    id: 'prod-023',
    name: 'Combo Big Jack',
    sku: 'COMB-001',
    category: 'combos' as const,
    price: 38.90,
    salePrice: 38.90,
    supplierId: 'sup-001',
    purchaseDate: '2024-01-20',
    quantity: 25,
    imageUrl: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=400',
  },
  {
    id: 'prod-024',
    name: 'Combo Familiar (4 pers.)',
    sku: 'COMB-002',
    category: 'combos' as const,
    price: 89.90,
    salePrice: 79.90,
    supplierId: 'sup-001',
    purchaseDate: '2024-02-15',
    quantity: 15,
    imageUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=400',
  },
  {
    id: 'prod-025',
    name: 'Combo Clásico',
    sku: 'COMB-003',
    category: 'combos' as const,
    price: 29.90,
    salePrice: 27.90,
    supplierId: 'sup-001',
    purchaseDate: '2024-03-01',
    quantity: 30,
    imageUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=400',
  },
  {
    id: 'prod-026',
    name: 'Combo Pollo Crispy',
    sku: 'COMB-004',
    category: 'combos' as const,
    price: 34.90,
    salePrice: 32.90,
    supplierId: 'sup-007',
    purchaseDate: '2024-04-01',
    quantity: 20,
    imageUrl: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400',
  },
  // --- ADICIONALES EXTRA ---
  {
    id: 'prod-027',
    name: 'Extra Queso',
    sku: 'ADIC-001',
    category: 'adicionales' as const,
    price: 3.50,
    salePrice: 3.50,
    supplierId: 'sup-003',
    purchaseDate: '2024-01-15',
    quantity: 200,
  },
  {
    id: 'prod-028',
    name: 'Extra Bacon',
    sku: 'ADIC-002',
    category: 'adicionales' as const,
    price: 5.00,
    salePrice: 5.00,
    supplierId: 'sup-001',
    purchaseDate: '2024-01-15',
    quantity: 150,
  },
];

// Pesos de popularidad para cada producto (índice alineado con DEMO_PRODUCTS)
const POPULAR_PRODUCTS_WEIGHTS = [
  14, 18, 10, 8, 9,   // hamburguesas
  6, 7,                // pollos
  11, 5,               // salchipapas
  4,                   // choripanes
  6,                   // adicionales (hotdog)
  15, 5, 3,            // acompañamientos
  20, 18, 8, 7, 6, 4,  // bebidas
  3, 3,                // postres
  12, 5, 10, 7,        // combos
  8, 6,                // extras
];

// ==================== INGREDIENTES (20 ingredientes) ====================
export const DEMO_INGREDIENTS = [
  {
    id: 'ing-001',
    name: 'Carne de Res (150g)',
    sku: 'ING-CARN-001',
    category: 'protein' as const,
    cost: 4.50,
    quantity: 245,
    unit: 'unidades',
    minimumStock: 50,
    storageLocation: 'Congelador Principal',
    providers: [{ name: 'Carnes Premium SAC', pricePerUnit: 4.50, purchaseQuantity: 100 }],
  },
  {
    id: 'ing-002',
    name: 'Pan de Hamburguesa',
    sku: 'ING-PAN-001',
    category: 'bakery' as const,
    cost: 1.20,
    quantity: 180,
    unit: 'unidades',
    minimumStock: 40,
    storageLocation: 'Estante Panadería',
    providers: [{ name: 'Panadería El Sol', pricePerUnit: 1.20, purchaseQuantity: 50 }],
  },
  {
    id: 'ing-003',
    name: 'Queso Cheddar (lámina)',
    sku: 'ING-QUES-001',
    category: 'dairy' as const,
    cost: 0.80,
    quantity: 320,
    unit: 'unidades',
    minimumStock: 60,
    storageLocation: 'Refrigerador',
    providers: [{ name: 'Lácteos Gloria', pricePerUnit: 0.80, purchaseQuantity: 100 }],
  },
  {
    id: 'ing-004',
    name: 'Lechuga',
    sku: 'ING-LECH-001',
    category: 'vegetable' as const,
    cost: 6.00,
    quantity: 8.5,
    unit: 'kg',
    minimumStock: 3,
    storageLocation: 'Refrigerador',
    providers: [{ name: 'Mercado Mayorista', pricePerUnit: 6.00 }],
  },
  {
    id: 'ing-005',
    name: 'Tomate',
    sku: 'ING-TOM-001',
    category: 'vegetable' as const,
    cost: 4.50,
    quantity: 12,
    unit: 'kg',
    minimumStock: 4,
    storageLocation: 'Refrigerador',
    providers: [{ name: 'Mercado Mayorista', pricePerUnit: 4.50 }],
  },
  {
    id: 'ing-006',
    name: 'Papas',
    sku: 'ING-PAP-001',
    category: 'vegetable' as const,
    cost: 3.00,
    quantity: 45,
    unit: 'kg',
    minimumStock: 15,
    storageLocation: 'Almacén Seco',
    providers: [{ name: 'Mercado Mayorista', pricePerUnit: 3.00 }],
  },
  {
    id: 'ing-007',
    name: 'Aceite Vegetal',
    sku: 'ING-ACEI-001',
    category: 'other' as const,
    cost: 8.50,
    quantity: 25,
    unit: 'litros',
    minimumStock: 8,
    storageLocation: 'Almacén Seco',
    providers: [{ name: 'Distribuidora Central', pricePerUnit: 8.50 }],
  },
  {
    id: 'ing-008',
    name: 'Bacon',
    sku: 'ING-BAC-001',
    category: 'protein' as const,
    cost: 35.00,
    quantity: 6.2,
    unit: 'kg',
    minimumStock: 2,
    storageLocation: 'Congelador Principal',
    providers: [{ name: 'Carnes Premium SAC', pricePerUnit: 35.00 }],
  },
  {
    id: 'ing-009',
    name: 'Salsa BBQ',
    sku: 'ING-SBBQ-001',
    category: 'sauce' as const,
    cost: 18.00,
    quantity: 4.5,
    unit: 'litros',
    minimumStock: 2,
    storageLocation: 'Estante Salsas',
    providers: [{ name: 'Distribuidora Central', pricePerUnit: 18.00 }],
  },
  {
    id: 'ing-010',
    name: 'Coca Cola 500ml',
    sku: 'ING-CC-001',
    category: 'other' as const,
    cost: 2.80,
    quantity: 144,
    unit: 'unidades',
    minimumStock: 48,
    storageLocation: 'Refrigerador de Bebidas',
    providers: [{ name: 'Arca Continental', pricePerUnit: 2.80, purchaseQuantity: 24 }],
  },
  {
    id: 'ing-011',
    name: 'Inca Kola 500ml',
    sku: 'ING-IK-001',
    category: 'other' as const,
    cost: 2.80,
    quantity: 120,
    unit: 'unidades',
    minimumStock: 48,
    storageLocation: 'Refrigerador de Bebidas',
    providers: [{ name: 'Arca Continental', pricePerUnit: 2.80, purchaseQuantity: 24 }],
  },
  {
    id: 'ing-012',
    name: 'Pechuga de Pollo',
    sku: 'ING-POLL-001',
    category: 'protein' as const,
    cost: 16.00,
    quantity: 18,
    unit: 'kg',
    minimumStock: 5,
    storageLocation: 'Congelador Principal',
    providers: [{ name: 'Avícola San Fernando', pricePerUnit: 16.00 }],
  },
  {
    id: 'ing-013',
    name: 'Salchicha Hot Dog',
    sku: 'ING-SALC-001',
    category: 'protein' as const,
    cost: 1.80,
    quantity: 95,
    unit: 'unidades',
    minimumStock: 30,
    storageLocation: 'Congelador Principal',
    providers: [{ name: 'Carnes Premium SAC', pricePerUnit: 1.80, purchaseQuantity: 50 }],
  },
  {
    id: 'ing-014',
    name: 'Chorizo Argentino',
    sku: 'ING-CHOR-001',
    category: 'protein' as const,
    cost: 6.50,
    quantity: 42,
    unit: 'unidades',
    minimumStock: 10,
    storageLocation: 'Congelador Principal',
    providers: [{ name: 'Carnes Premium SAC', pricePerUnit: 6.50 }],
  },
  {
    id: 'ing-015',
    name: 'Pan de Choripán / Hot Dog',
    sku: 'ING-PANC-001',
    category: 'bakery' as const,
    cost: 0.90,
    quantity: 100,
    unit: 'unidades',
    minimumStock: 25,
    storageLocation: 'Estante Panadería',
    providers: [{ name: 'Panadería El Sol', pricePerUnit: 0.90 }],
  },
  {
    id: 'ing-016',
    name: 'Cebolla',
    sku: 'ING-CEB-001',
    category: 'vegetable' as const,
    cost: 3.50,
    quantity: 10,
    unit: 'kg',
    minimumStock: 3,
    storageLocation: 'Almacén Seco',
    providers: [{ name: 'Mercado Mayorista', pricePerUnit: 3.50 }],
  },
  {
    id: 'ing-017',
    name: 'Leche Fresca',
    sku: 'ING-LECH-002',
    category: 'dairy' as const,
    cost: 5.50,
    quantity: 15,
    unit: 'litros',
    minimumStock: 5,
    storageLocation: 'Refrigerador',
    providers: [{ name: 'Lácteos Gloria', pricePerUnit: 5.50 }],
  },
  {
    id: 'ing-018',
    name: 'Cacao en Polvo',
    sku: 'ING-CAC-001',
    category: 'additional' as const,
    cost: 28.00,
    quantity: 2.5,
    unit: 'kg',
    minimumStock: 0.5,
    storageLocation: 'Estante Seco',
    providers: [{ name: 'Distribuidora Central', pricePerUnit: 28.00 }],
  },
  {
    id: 'ing-019',
    name: 'Mostaza',
    sku: 'ING-MOST-001',
    category: 'sauce' as const,
    cost: 12.00,
    quantity: 3.2,
    unit: 'litros',
    minimumStock: 1,
    storageLocation: 'Estante Salsas',
    providers: [{ name: 'Makro', pricePerUnit: 12.00 }],
  },
  {
    id: 'ing-020',
    name: 'Ketchup',
    sku: 'ING-KETC-001',
    category: 'sauce' as const,
    cost: 10.00,
    quantity: 5.8,
    unit: 'litros',
    minimumStock: 2,
    storageLocation: 'Estante Salsas',
    providers: [{ name: 'Makro', pricePerUnit: 10.00 }],
  },
];

// ==================== OTROS ITEMS (INVENTARIO GENERAL) ====================
export const DEMO_OTHER_ITEMS = [
  { id: 'item-001', name: 'Servilletas (paquete x100)', stock: 45, minStock: 10 },
  { id: 'item-002', name: 'Vasos de Papel 12oz', stock: 350, minStock: 100 },
  { id: 'item-003', name: 'Bolsas de Papel (para llevar)', stock: 280, minStock: 80 },
  { id: 'item-004', name: 'Guantes Desechables (caja x100)', stock: 8, minStock: 3 },
  { id: 'item-005', name: 'Envases Tecnopor', stock: 420, minStock: 150 },
  { id: 'item-006', name: 'Sorbetes (paquete x200)', stock: 180, minStock: 50 },
  { id: 'item-007', name: 'Film Transparente Rollo', stock: 5, minStock: 2 },
  { id: 'item-008', name: 'Papel Aluminio Rollo', stock: 4, minStock: 2 },
  { id: 'item-009', name: 'Jabón Líquido Industrial (5L)', stock: 3, minStock: 1 },
  { id: 'item-010', name: 'Papel Térmico POS (rollo)', stock: 12, minStock: 5 },
];

// Versión compatible con el path 'inventory_items' y la interfaz InventoryItem
export const DEMO_INVENTORY_ITEMS = DEMO_OTHER_ITEMS.map(item => ({
  id: item.id,
  name: item.name,
  type: 'Desechable',
  quantity: item.stock,
  minimumStock: item.minStock,
  location: 'Almacén General',
}));

// ==================== CLIENTES (12 clientes) ====================
export const DEMO_CUSTOMERS = [
  {
    id: 'cust-001',
    firstName: 'Juan',
    lastName: 'Pérez García',
    nickname: 'Juancho',
    email: 'juan.perez@email.com',
    phone: '987654321',
    documentType: '1' as const,
    documentNumber: '72345678',
    address: 'Av. Larco 450, Miraflores',
    allergies: [] as string[],
    preferences: 'Le gusta extra ketchup',
    notes: 'Cliente frecuente del turno noche',
    totalVisits: 48,
    totalSpent: 1485.50,
    loyaltyPoints: 742,
    registrationDate: createTimestamp(new Date('2024-03-10')),
    lastVisit: createTimestamp(new Date('2026-02-18')),
  },
  {
    id: 'cust-002',
    firstName: 'María',
    lastName: 'López Sánchez',
    nickname: '',
    email: 'maria.lopez@email.com',
    phone: '912345678',
    documentType: '1' as const,
    documentNumber: '45678912',
    address: 'Jr. de la Unión 234, Centro de Lima',
    allergies: ['Gluten'],
    preferences: 'Hamburguesa sin pan (usa lechuga)',
    notes: '',
    totalVisits: 72,
    totalSpent: 2892.30,
    loyaltyPoints: 1446,
    registrationDate: createTimestamp(new Date('2024-02-05')),
    lastVisit: createTimestamp(new Date('2026-02-19')),
  },
  {
    id: 'cust-003',
    firstName: 'Carlos',
    lastName: 'Rodríguez Mendoza',
    nickname: 'Charlie',
    email: 'carlos.rodriguez@empresa.com',
    phone: '998877665',
    documentType: '6' as const,
    documentNumber: '20123456789',
    address: 'Calle Las Begonias 400, San Isidro',
    allergies: [] as string[],
    preferences: 'Siempre pide Combo Familiar para su oficina',
    notes: 'Factura a nombre de Inversiones RM SAC',
    totalVisits: 95,
    totalSpent: 5150.80,
    loyaltyPoints: 2575,
    registrationDate: createTimestamp(new Date('2024-01-15')),
    lastVisit: createTimestamp(new Date('2026-02-19')),
  },
  {
    id: 'cust-004',
    firstName: 'Ana',
    lastName: 'Martínez Torres',
    nickname: 'Anita',
    email: 'ana.martinez@gmail.com',
    phone: '945612378',
    documentType: '1' as const,
    documentNumber: '78945612',
    address: 'Av. Brasil 1200, Jesús María',
    allergies: ['Maní', 'Frutos Secos'],
    preferences: 'Sin salsas con maní',
    notes: 'Prefiere delivery por WhatsApp',
    totalVisits: 23,
    totalSpent: 834.60,
    loyaltyPoints: 417,
    registrationDate: createTimestamp(new Date('2024-06-20')),
    lastVisit: createTimestamp(new Date('2026-02-15')),
  },
  {
    id: 'cust-005',
    firstName: 'Roberto',
    lastName: 'Fernández Díaz',
    nickname: 'Beto',
    email: 'roberto.fernandez@outlook.com',
    phone: '956478123',
    documentType: '1' as const,
    documentNumber: '36985214',
    address: 'Av. Arequipa 3500, San Isidro',
    allergies: [] as string[],
    preferences: 'Extra bacon siempre',
    notes: 'Viene con su familia los domingos',
    totalVisits: 41,
    totalSpent: 1812.90,
    loyaltyPoints: 906,
    registrationDate: createTimestamp(new Date('2024-04-08')),
    lastVisit: createTimestamp(new Date('2026-02-18')),
  },
  {
    id: 'cust-006',
    firstName: 'Lucía',
    lastName: 'Herrera Ramos',
    nickname: 'Lu',
    email: 'lucia.herrera@hotmail.com',
    phone: '963258741',
    documentType: '1' as const,
    documentNumber: '41235687',
    address: 'Av. Salaverry 2100, Lince',
    allergies: ['Lácteos'],
    preferences: 'Sin queso en todas sus órdenes',
    notes: 'Intolerante a la lactosa',
    totalVisits: 34,
    totalSpent: 1120.40,
    loyaltyPoints: 560,
    registrationDate: createTimestamp(new Date('2024-05-12')),
    lastVisit: createTimestamp(new Date('2026-02-17')),
  },
  {
    id: 'cust-007',
    firstName: 'Diego',
    lastName: 'Castillo Vargas',
    nickname: '',
    email: 'diego.castillo@gmail.com',
    phone: '974125836',
    documentType: '1' as const,
    documentNumber: '52369874',
    address: 'Calle Los Pinos 456, Surco',
    allergies: [] as string[],
    preferences: 'Combo Big Jack con Inca Kola',
    notes: 'Trabaja cerca, viene en horario de almuerzo',
    totalVisits: 62,
    totalSpent: 2456.70,
    loyaltyPoints: 1228,
    registrationDate: createTimestamp(new Date('2024-03-22')),
    lastVisit: createTimestamp(new Date('2026-02-19')),
  },
  {
    id: 'cust-008',
    firstName: 'Valeria',
    lastName: 'Quispe Mamani',
    nickname: 'Vale',
    email: 'valeria.qm@gmail.com',
    phone: '985236147',
    documentType: '1' as const,
    documentNumber: '63214598',
    address: 'Jr. Huancayo 789, La Victoria',
    allergies: [] as string[],
    preferences: 'Siempre quiere papas bien crocantes',
    notes: 'Pide por WhatsApp con anticipación',
    totalVisits: 28,
    totalSpent: 945.20,
    loyaltyPoints: 472,
    registrationDate: createTimestamp(new Date('2024-07-15')),
    lastVisit: createTimestamp(new Date('2026-02-16')),
  },
  {
    id: 'cust-009',
    firstName: 'Fernando',
    lastName: 'Silva Paredes',
    nickname: 'Fer',
    email: 'fsilva@empresa.pe',
    phone: '991472583',
    documentType: '6' as const,
    documentNumber: '20567891234',
    address: 'Av. Javier Prado 1234, San Borja',
    allergies: [] as string[],
    preferences: 'Pedidos corporativos para eventos',
    notes: 'Factura a RUC empresa. Pide descuento por volumen.',
    totalVisits: 15,
    totalSpent: 3450.00,
    loyaltyPoints: 1725,
    registrationDate: createTimestamp(new Date('2024-08-01')),
    lastVisit: createTimestamp(new Date('2026-02-14')),
  },
  {
    id: 'cust-010',
    firstName: 'Camila',
    lastName: 'Torres Ruiz',
    nickname: 'Cami',
    email: 'camila.tr@yahoo.com',
    phone: '926374851',
    documentType: '1' as const,
    documentNumber: '74125896',
    address: 'Av. La Marina 2800, San Miguel',
    allergies: [] as string[],
    preferences: 'Le encanta el Brownie con Helado',
    notes: 'Cliente nueva, viene con amigas',
    totalVisits: 8,
    totalSpent: 289.60,
    loyaltyPoints: 144,
    registrationDate: createTimestamp(new Date('2025-01-10')),
    lastVisit: createTimestamp(new Date('2026-02-12')),
  },
  {
    id: 'cust-011',
    firstName: 'Miguel',
    lastName: 'Flores Gutiérrez',
    nickname: 'Migue',
    email: 'mflores@outlook.com',
    phone: '953681247',
    documentType: '1' as const,
    documentNumber: '81593572',
    address: 'Av. Universitaria 1500, Los Olivos',
    allergies: [] as string[],
    preferences: 'Salchipapa Especial sin mostaza',
    notes: '',
    totalVisits: 19,
    totalSpent: 623.10,
    loyaltyPoints: 311,
    registrationDate: createTimestamp(new Date('2024-09-20')),
    lastVisit: createTimestamp(new Date('2026-02-13')),
  },
  {
    id: 'cust-012',
    firstName: 'Sofía',
    lastName: 'Ramos Delgado',
    nickname: '',
    email: 'sofia.ramos@gmail.com',
    phone: '942587316',
    documentType: '1' as const,
    documentNumber: '95174263',
    address: 'Jr. Camaná 300, Centro de Lima',
    allergies: ['Mariscos'],
    preferences: '',
    notes: 'Sensible a mariscos - verificar ingredientes',
    totalVisits: 55,
    totalSpent: 1876.50,
    loyaltyPoints: 938,
    registrationDate: createTimestamp(new Date('2024-04-02')),
    lastVisit: createTimestamp(new Date('2026-02-19')),
  },
];

// ==================== VENTAS/ÓRDENES (90 días de datos) ====================

/** Genera datos de ventas realistas para los últimos 90 días con semilla determinista */
function generateSalesData() {
  const sales: any[] = [];
  const saleItems: any[] = [];
  const today = new Date();
  today.setHours(23, 59, 59, 0);

  // Semilla determinista para que los datos sean consistentes entre recargas
  let seed = 42;
  function seededRandom() {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  }

  function seededRandInt(min: number, max: number) {
    return Math.floor(seededRandom() * (max - min + 1)) + min;
  }

  function seededWeightedPick<T>(items: T[], weights: number[]): T {
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let r = seededRandom() * totalWeight;
    for (let i = 0; i < items.length; i++) {
      r -= weights[i];
      if (r <= 0) return items[i];
    }
    return items[items.length - 1];
  }

  const paymentMethods = ['Efectivo', 'Yape', 'Plin', 'Tarjeta', 'Transferencia'];
  const paymentWeights = [35, 25, 15, 18, 7];

  const sources = ['pos', 'delivery', 'pedidosya', 'web'];
  const sourceWeights = [60, 15, 15, 10];

  for (let daysAgo = 0; daysAgo < 90; daysAgo++) {
    const date = new Date(today);
    date.setDate(date.getDate() - daysAgo);

    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isFriday = dayOfWeek === 5;

    // Tendencia de crecimiento del negocio (~30% en 90 días)
    const growthFactor = 1 + (90 - daysAgo) * 0.003;

    let baseOrders: number;
    if (isWeekend) {
      baseOrders = seededRandInt(40, 62);
    } else if (isFriday) {
      baseOrders = seededRandInt(35, 55);
    } else {
      baseOrders = seededRandInt(22, 42);
    }

    const ordersCount = Math.round(baseOrders * growthFactor);

    for (let i = 0; i < ordersCount; i++) {
      // Distribución horaria: rush de almuerzo (12-14) y cena (18-21)
      let hour: number;
      const timeSlot = seededRandom();
      if (timeSlot < 0.05) {
        hour = seededRandInt(10, 11);
      } else if (timeSlot < 0.35) {
        hour = seededRandInt(12, 14);
      } else if (timeSlot < 0.45) {
        hour = seededRandInt(15, 16);
      } else if (timeSlot < 0.50) {
        hour = 17;
      } else if (timeSlot < 0.85) {
        hour = seededRandInt(18, 21);
      } else {
        hour = seededRandInt(22, 23);
      }

      const minute = seededRandInt(0, 59);
      const orderDate = new Date(date);
      orderDate.setHours(hour, minute, seededRandInt(0, 59), 0);

      // Seleccionar 1-5 productos
      const itemsCount = seededRandInt(1, 5);
      const items: any[] = [];
      let subtotal = 0;
      const usedProductIds = new Set<string>();

      for (let j = 0; j < itemsCount; j++) {
        let product: typeof DEMO_PRODUCTS[0];
        let attempts = 0;
        do {
          product = seededWeightedPick(DEMO_PRODUCTS, POPULAR_PRODUCTS_WEIGHTS);
          attempts++;
        } while (usedProductIds.has(product.id) && attempts < 10);

        if (usedProductIds.has(product.id)) continue;
        usedProductIds.add(product.id);

        const quantity = product.category === 'adicionales'
          ? seededRandInt(1, 3)
          : product.category === 'combos'
            ? 1
            : seededRandInt(1, 2);

        const itemTotal = product.salePrice * quantity;
        items.push({
          productId: product.id,
          productName: product.name,
          price: product.salePrice,
          unitPrice: product.salePrice,
          quantity,
          total: itemTotal,
        });
        subtotal += itemTotal;
      }

      if (items.length === 0) continue;

      const hasDiscount = seededRandom() > 0.88;
      const discountPct = hasDiscount ? (seededRandom() > 0.5 ? 0.10 : 0.15) : 0;
      const discount = Math.round(subtotal * discountPct * 100) / 100;
      const total = Math.round((subtotal - discount) * 100) / 100;

      const paymentMethod = seededWeightedPick(paymentMethods, paymentWeights);
      const source = seededWeightedPick(sources, sourceWeights);

      const hasCustomer = seededRandom() > 0.65;
      const customer = hasCustomer
        ? DEMO_CUSTOMERS[seededRandInt(0, DEMO_CUSTOMERS.length - 1)]
        : null;

      const saleId = `sale-${String(90 - daysAgo).padStart(3, '0')}-${String(i + 1).padStart(3, '0')}`;

      sales.push({
        id: saleId,
        orderNumber: `ORD-${String(90 - daysAgo).padStart(3, '0')}${String(i + 1).padStart(3, '0')}`,
        items,
        subtotal,
        discount,
        total,
        totalAmount: total,
        paymentMethod,
        status: 'completed',
        source,
        isDelivery: source !== 'pos',
        itemsCount: items.reduce((sum: number, it: any) => sum + it.quantity, 0),
        uniqueProductsCount: items.length,
        cashierId: 'demo-user-123',
        customerId: customer?.id ?? null,
        customerName: customer ? `${customer.firstName} ${customer.lastName}` : null,
        createdAt: orderDate,
        saleDate: createTimestamp(orderDate),
        completedAt: new Date(orderDate.getTime() + seededRandInt(8, 25) * 60000),
      });

      // Sale items individuales para collectionGroup queries
      items.forEach((item: any, idx: number) => {
        saleItems.push({
          id: `${saleId}-item-${idx}`,
          saleId,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        });
      });
    }
  }

  return {
    sales: sales.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    saleItems,
  };
}

const { sales: _DEMO_SALES, saleItems: _DEMO_SALE_ITEMS } = generateSalesData();
export const DEMO_SALES = _DEMO_SALES;
export const DEMO_SALE_ITEMS = _DEMO_SALE_ITEMS;

// ==================== PEDIDOS ONLINE (8 pedidos activos) ====================
export const DEMO_ONLINE_ORDERS = [
  {
    id: 'online-001',
    orderDate: createTimestamp(new Date(Date.now() - 5 * 60000)),
    customerId: 'cust-004',
    status: 'pending' as const,
    totalAmount: 75.60,
    items: [
      { productId: 'prod-002', productName: 'Hamburguesa Big Jack', quantity: 2, unitPrice: 28.90 },
      { productId: 'prod-012', productName: 'Papas Fritas', quantity: 2, unitPrice: 8.90 },
    ],
    customerName: 'Ana Martínez Torres',
    customerPhone: '945612378',
    paymentMethod: 'Yape',
    notes: 'Sin cebolla en las hamburguesas por favor',
    deliveryAddress: 'Av. Brasil 1200, Jesús María',
    source: 'delivery' as const,
  },
  {
    id: 'online-002',
    orderDate: createTimestamp(new Date(Date.now() - 15 * 60000)),
    customerId: null,
    status: 'processing' as const,
    totalAmount: 53.80,
    items: [
      { productId: 'prod-023', productName: 'Combo Big Jack', quantity: 1, unitPrice: 38.90 },
      { productId: 'prod-019', productName: 'Milkshake Chocolate', quantity: 1, unitPrice: 14.90 },
    ],
    customerName: 'Cliente PedidosYa',
    customerPhone: '998877665',
    paymentMethod: 'App',
    notes: '',
    deliveryAddress: 'Calle Los Olivos 123, Surco',
    source: 'pedidosya' as const,
  },
  {
    id: 'online-003',
    orderDate: createTimestamp(new Date(Date.now() - 25 * 60000)),
    customerId: 'cust-008',
    status: 'completed' as const,
    totalAmount: 79.90,
    items: [
      { productId: 'prod-024', productName: 'Combo Familiar (4 pers.)', quantity: 1, unitPrice: 79.90 },
    ],
    customerName: 'Valeria Quispe Mamani',
    customerPhone: '985236147',
    paymentMethod: 'Transferencia',
    notes: 'Papas extra crocantes por favor',
    deliveryAddress: 'Jr. Huancayo 789, La Victoria',
    source: 'delivery' as const,
  },
  {
    id: 'online-004',
    orderDate: createTimestamp(new Date(Date.now() - 3 * 60000)),
    customerId: null,
    status: 'pending' as const,
    totalAmount: 67.70,
    items: [
      { productId: 'prod-001', productName: 'Hamburguesa Clásica', quantity: 2, unitPrice: 18.90 },
      { productId: 'prod-006', productName: 'Alitas BBQ x8', quantity: 1, unitPrice: 29.90 },
    ],
    customerName: 'Delivery Web',
    customerPhone: '999111222',
    paymentMethod: 'Tarjeta',
    notes: 'Tocar timbre 2 veces',
    deliveryAddress: 'Av. Benavides 4500, Surco',
    source: 'web' as const,
  },
  {
    id: 'online-005',
    orderDate: createTimestamp(new Date(Date.now() - 8 * 60000)),
    customerId: 'cust-003',
    status: 'processing' as const,
    totalAmount: 134.50,
    items: [
      { productId: 'prod-002', productName: 'Hamburguesa Big Jack', quantity: 3, unitPrice: 28.90 },
      { productId: 'prod-012', productName: 'Papas Fritas', quantity: 3, unitPrice: 8.90 },
      { productId: 'prod-015', productName: 'Coca Cola 500ml', quantity: 3, unitPrice: 5.50 },
    ],
    customerName: 'Carlos Rodríguez Mendoza',
    customerPhone: '998877665',
    paymentMethod: 'Transferencia',
    notes: 'Pedido para la oficina. Factura a RUC 20123456789',
    deliveryAddress: 'Calle Las Begonias 400, San Isidro',
    source: 'delivery' as const,
    channelTag: 'prioritario' as const,
  },
  {
    id: 'online-006',
    orderDate: createTimestamp(new Date(Date.now() - 40 * 60000)),
    customerId: null,
    status: 'completed' as const,
    totalAmount: 38.90,
    items: [
      { productId: 'prod-023', productName: 'Combo Big Jack', quantity: 1, unitPrice: 38.90 },
    ],
    customerName: 'Pedido PedidosYa #4521',
    customerPhone: '',
    paymentMethod: 'App',
    notes: '',
    deliveryAddress: 'Av. Angamos 900, Miraflores',
    source: 'pedidosya' as const,
  },
  {
    id: 'online-007',
    orderDate: createTimestamp(new Date(Date.now() - 2 * 60000)),
    customerId: 'cust-007',
    status: 'pending' as const,
    totalAmount: 46.80,
    items: [
      { productId: 'prod-005', productName: 'Hamburguesa BBQ Bacon', quantity: 1, unitPrice: 26.90 },
      { productId: 'prod-009', productName: 'Salchipapa Especial', quantity: 1, unitPrice: 19.90 },
    ],
    customerName: 'Diego Castillo Vargas',
    customerPhone: '974125836',
    paymentMethod: 'Yape',
    notes: 'Recoger en tienda en 20 min',
    deliveryAddress: '',
    source: 'pos' as const,
    channelTag: 'nuevo' as const,
  },
  {
    id: 'online-008',
    orderDate: createTimestamp(new Date(Date.now() - 55 * 60000)),
    customerId: null,
    status: 'completed' as const,
    totalAmount: 98.50,
    items: [
      { productId: 'prod-008', productName: 'Salchipapa Clásica', quantity: 2, unitPrice: 14.90 },
      { productId: 'prod-025', productName: 'Combo Clásico', quantity: 2, unitPrice: 27.90 },
      { productId: 'prod-022', productName: 'Sundae de Chocolate', quantity: 1, unitPrice: 12.90 },
    ],
    customerName: 'Mesa 5 - Local',
    customerPhone: '',
    paymentMethod: 'Efectivo',
    notes: '',
    deliveryAddress: '',
    source: 'pos' as const,
  },
];

// ==================== CAJA / CASH FLOW (35 días) ====================
function generateCashFlowData() {
  const entries: any[] = [];
  const today = new Date();
  let entryIdx = 0;

  // Semilla determinista
  let seed = 123;
  function cfRandom() {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  }
  function cfRandInt(min: number, max: number) {
    return Math.floor(cfRandom() * (max - min + 1)) + min;
  }

  const incomeCategories = ['Ventas Efectivo', 'Ventas Digitales', 'Delivery', 'Eventos'];
  const expenseMainCategories = ['Insumos', 'Servicios', 'Alquiler', 'Marketing', 'Personal', 'Logística', 'Mantenimiento', 'Otros'];
  const paymentMethods = ['Efectivo', 'Tarjeta', 'Transferencia', 'Yape', 'Plin'];

  for (let daysAgo = 0; daysAgo < 35; daysAgo++) {
    const date = new Date(today);
    date.setDate(date.getDate() - daysAgo);
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // 2-5 ingresos por día
    const incomeCount = isWeekend ? cfRandInt(3, 5) : cfRandInt(2, 4);
    for (let i = 0; i < incomeCount; i++) {
      const hourOptions = [10, 13, 16, 19, 22];
      const hour = hourOptions[i] ?? 20;
      const entryDate = new Date(date);
      entryDate.setHours(hour, cfRandInt(0, 59), 0, 0);

      const amount = isWeekend
        ? Math.round((cfRandInt(180, 480) + cfRandom()) * 100) / 100
        : Math.round((cfRandInt(120, 350) + cfRandom()) * 100) / 100;

      const dd = entryDate.getDate().toString().padStart(2, '0');
      const mm = (entryDate.getMonth() + 1).toString().padStart(2, '0');

      entries.push({
        id: `cf-inc-${entryIdx++}`,
        type: 'income' as const,
        category: incomeCategories[i % incomeCategories.length],
        amount,
        paymentMethod: paymentMethods[cfRandInt(0, paymentMethods.length - 1)],
        note: `Ingreso turno ${hour < 15 ? 'mañana' : 'noche'} - ${dd}/${mm}`,
        entryDate: createTimestamp(entryDate),
        createdBy: 'demo-user-123',
        createdAt: createTimestamp(entryDate),
      });
    }

    // 1-3 gastos por día
    const expenseCount = cfRandInt(1, 3);
    for (let i = 0; i < expenseCount; i++) {
      const hourOptions = [8, 11, 15];
      const hour = hourOptions[i] ?? 11;
      const entryDate = new Date(date);
      entryDate.setHours(hour, cfRandInt(0, 59), 0, 0);

      const category = expenseMainCategories[cfRandInt(0, expenseMainCategories.length - 1)];
      let amount: number;

      switch (category) {
        case 'Insumos': amount = Math.round((cfRandInt(80, 350) + cfRandom()) * 100) / 100; break;
        case 'Alquiler': amount = daysAgo === 0 ? 3500 : 0; break;
        case 'Personal': amount = Math.round((cfRandInt(150, 300) + cfRandom()) * 100) / 100; break;
        case 'Servicios': amount = Math.round((cfRandInt(50, 200) + cfRandom()) * 100) / 100; break;
        case 'Marketing': amount = Math.round((cfRandInt(30, 150) + cfRandom()) * 100) / 100; break;
        default: amount = Math.round((cfRandInt(20, 120) + cfRandom()) * 100) / 100;
      }

      if (amount <= 0) continue;

      const dd = entryDate.getDate().toString().padStart(2, '0');
      const mm = (entryDate.getMonth() + 1).toString().padStart(2, '0');

      entries.push({
        id: `cf-exp-${entryIdx++}`,
        type: 'expense' as const,
        category,
        amount,
        paymentMethod: paymentMethods[cfRandInt(0, paymentMethods.length - 1)],
        note: `${category} - ${dd}/${mm}`,
        entryDate: createTimestamp(entryDate),
        createdBy: 'demo-user-123',
        createdAt: createTimestamp(entryDate),
      });
    }
  }

  return entries.sort((a, b) => b.entryDate.toMillis() - a.entryDate.toMillis());
}

export const DEMO_CASH_FLOWS = generateCashFlowData();

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

  const todayTotal = todaySales.reduce((sum, s) => sum + (s.totalAmount || s.total), 0);
  const yesterdayTotal = yesterdaySales.reduce((sum, s) => sum + (s.totalAmount || s.total), 0);

  const last7Days = DEMO_SALES.filter(s => {
    const diff = (today.getTime() - new Date(s.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 7;
  });

  const last30Days = DEMO_SALES.filter(s => {
    const diff = (today.getTime() - new Date(s.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 30;
  });

  return {
    todayOrders: todaySales.length,
    todayRevenue: todayTotal,
    yesterdayRevenue: yesterdayTotal,
    revenueChange: yesterdayTotal > 0 ? ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100 : 0,
    weeklyRevenue: last7Days.reduce((sum, s) => sum + (s.totalAmount || s.total), 0),
    weeklyOrders: last7Days.length,
    monthlyRevenue: last30Days.reduce((sum, s) => sum + (s.totalAmount || s.total), 0),
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
    sale.items.forEach((item: any) => {
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
    .slice(0, 10);
}

function getSalesByHour(sales: typeof DEMO_SALES) {
  const hours: Record<number, number> = {};
  for (let i = 10; i <= 23; i++) hours[i] = 0;

  sales.forEach(sale => {
    const hour = new Date(sale.createdAt).getHours();
    if (hours[hour] !== undefined) {
      hours[hour] += sale.total;
    }
  });

  return Object.entries(hours).map(([hour, total]) => ({ hour: parseInt(hour), total }));
}

function getSalesByCategory() {
  const categories: Record<string, number> = {};

  DEMO_SALES.forEach(sale => {
    sale.items.forEach((item: any) => {
      const product = DEMO_PRODUCTS.find(p => p.id === item.productId);
      if (product) {
        const cat = product.category ?? 'otros';
        if (!categories[cat]) categories[cat] = 0;
        categories[cat] += item.total;
      }
    });
  });

  return Object.entries(categories).map(([category, total]) => ({ category, total }));
}

function getSalesByPaymentMethod() {
  const methods: Record<string, number> = {};

  DEMO_SALES.forEach(sale => {
    if (!methods[sale.paymentMethod]) methods[sale.paymentMethod] = 0;
    methods[sale.paymentMethod] += sale.total;
  });

  return Object.entries(methods).map(([method, total]) => ({ method, total }));
}

function getSalesBySource() {
  const sources: Record<string, { count: number; total: number }> = {};

  DEMO_SALES.forEach(sale => {
    if (!sources[sale.source]) sources[sale.source] = { count: 0, total: 0 };
    sources[sale.source].count++;
    sources[sale.source].total += sale.total;
  });

  return Object.entries(sources).map(([source, data]) => ({ source, ...data }));
}

// ==================== ROUTER DE DATOS DEMO ====================

/**
 * Retorna datos demo según la colección de Firestore solicitada.
 * IMPORTANTE: El orden de las condiciones importa. Paths más específicos primero.
 */
export function getDemoData(collectionPath: string): any[] {
  const path = collectionPath.toLowerCase();

  // Paths específicos primero (evitar conflictos)
  if (path === 'sale_items' || path.includes('sale_items')) return DEMO_SALE_ITEMS;
  if (path.includes('online_order') || path.includes('online-order')) return DEMO_ONLINE_ORDERS;
  if (path.includes('inventory_item') || path.includes('inventory-item')) return DEMO_INVENTORY_ITEMS;
  if (path.includes('supplier')) return DEMO_SUPPLIERS;
  if (path.includes('cash_flow') || path.includes('cash-flow') || path.includes('cashflow')) return DEMO_CASH_FLOWS;

  // Paths generales
  if (path.includes('product')) return DEMO_PRODUCTS;
  if (path.includes('ingredient')) return DEMO_INGREDIENTS;
  if (path.includes('customer')) return DEMO_CUSTOMERS;
  if (path.includes('sale') || path.includes('order')) return DEMO_SALES;
  if (path.includes('other') && path.includes('item')) return DEMO_OTHER_ITEMS;

  return [];
}

export function getDemoDocument(collectionPath: string, docId: string): any {
  const data = getDemoData(collectionPath);
  return data.find((item: any) => item.id === docId) || null;
}
