import type { Product, Ingredient, OtherItem, Sale, OnlineOrder } from './types';
import { PlaceHolderImages } from './placeholder-images';

const classicBurgerImg = PlaceHolderImages.find(p => p.id === 'classic-burger');
const baconBurgerImg = PlaceHolderImages.find(p => p.id === 'bacon-burger');
const chickenBurgerImg = PlaceHolderImages.find(p => p.id === 'chicken-burger');
const veggieBurgerImg = PlaceHolderImages.find(p => p.id === 'veggie-burger');
const doubleBurgerImg = PlaceHolderImages.find(p => p.id === 'double-burger');
const friesImg = PlaceHolderImages.find(p => p.id === 'fries');
const sodaImg = PlaceHolderImages.find(p => p.id === 'soda');
const onionRingsImg = PlaceHolderImages.find(p => p.id === 'onion-rings');

export const mockProducts: Product[] = [
  { id: '1', name: 'Big Jack Clásica', sku: 'BJ-001', ingredients: ['Carne', 'Pan', 'Lechuga', 'Tomate'], price: 15, salePrice: 25, supplier: 'Proveedor A', purchaseDate: '2024-05-01', stock: 50, imageUrl: classicBurgerImg?.imageUrl, imageHint: classicBurgerImg?.imageHint },
  { id: '2', name: 'Big Jack Tocino', sku: 'BJ-002', ingredients: ['Carne', 'Pan', 'Tocino', 'Queso'], price: 18, salePrice: 30, supplier: 'Proveedor A', purchaseDate: '2024-05-01', stock: 40, imageUrl: baconBurgerImg?.imageUrl, imageHint: baconBurgerImg?.imageHint },
  { id: '3', name: 'Pollo Jack', sku: 'BJ-003', ingredients: ['Pollo', 'Pan', 'Mayonesa', 'Lechuga'], price: 14, salePrice: 24, supplier: 'Proveedor B', purchaseDate: '2024-05-02', stock: 60, imageUrl: chickenBurgerImg?.imageUrl, imageHint: chickenBurgerImg?.imageHint },
  { id: '4', name: 'Veggie Jack', sku: 'BJ-004', ingredients: ['Hamburguesa Vegetariana', 'Pan', 'Vegetales'], price: 16, salePrice: 28, supplier: 'Proveedor C', purchaseDate: '2024-05-03', stock: 30, imageUrl: veggieBurgerImg?.imageUrl, imageHint: veggieBurgerImg?.imageHint },
  { id: '5', name: 'Doble Jack', sku: 'BJ-005', ingredients: ['Doble Carne', 'Pan', 'Queso', 'Pepinillos'], price: 22, salePrice: 38, supplier: 'Proveedor A', purchaseDate: '2024-05-01', stock: 25, imageUrl: doubleBurgerImg?.imageUrl, imageHint: doubleBurgerImg?.imageHint },
  { id: '6', name: 'Papas Fritas', sku: 'AC-001', ingredients: ['Papa'], price: 4, salePrice: 8, supplier: 'Proveedor D', purchaseDate: '2024-05-01', stock: 100, imageUrl: friesImg?.imageUrl, imageHint: friesImg?.imageHint },
  { id: '7', name: 'Gaseosa', sku: 'BV-001', ingredients: [], price: 2.5, salePrice: 5, supplier: 'Proveedor E', purchaseDate: '2024-05-01', stock: 200, imageUrl: sodaImg?.imageUrl, imageHint: sodaImg?.imageHint },
  { id: '8', name: 'Aros de Cebolla', sku: 'AC-002', ingredients: ['Cebolla', 'Harina'], price: 5, salePrice: 10, supplier: 'Proveedor D', purchaseDate: '2024-05-01', stock: 80, imageUrl: onionRingsImg?.imageUrl, imageHint: onionRingsImg?.imageHint },
];

export const mockIngredients: Ingredient[] = [
  { id: '1', name: 'Carne', stock: 20, unit: 'kg', cost: 30, minStock: 5, expiryDate: '2024-06-15' },
  { id: '2', name: 'Pan', stock: 100, unit: 'units', cost: 0.5, minStock: 20, expiryDate: '2024-05-25' },
  { id: '3', name: 'Lechuga', stock: 5, unit: 'kg', cost: 5, minStock: 1, expiryDate: '2024-05-20' },
  { id: '4', name: 'Tomate', stock: 10, unit: 'kg', cost: 3, minStock: 2, expiryDate: '2024-05-22' },
  { id: '5', name: 'Queso', stock: 8, unit: 'kg', cost: 25, minStock: 2, expiryDate: '2024-07-01' },
  { id: '6', name: 'Papa', stock: 50, unit: 'kg', cost: 2, minStock: 10, expiryDate: '2024-06-30' },
];

export const mockOtherItems: OtherItem[] = [
  { id: '1', name: 'Cajas para hamburguesa', stock: 500, minStock: 100 },
  { id: '2', name: 'Pegatinas logo', stock: 1000, minStock: 200 },
  { id: '3', name: 'Bolsas de papel', stock: 300, minStock: 50 },
];

export const mockSalesData: Sale[] = [
  { date: '2024-05-13', revenue: 1200, netProfit: 700 },
  { date: '2024-05-14', revenue: 1500, netProfit: 900 },
  { date: '2024-05-15', revenue: 1350, netProfit: 800 },
  { date: '2024-05-16', revenue: 1800, netProfit: 1100 },
  { date: '2024-05-17', revenue: 2100, netProfit: 1300 },
  { date: '2024-05-18', revenue: 2500, netProfit: 1600 },
  { date: '2024-05-19', revenue: 2300, netProfit: 1450 },
];

export const mockOnlineOrders: OnlineOrder[] = [
    { id: 'ORD-001', customerName: 'Juan Perez', items: [{ productName: 'Big Jack Clásica', quantity: 2 }, { productName: 'Papas Fritas', quantity: 1 }], status: 'new', total: 58 },
    { id: 'ORD-002', customerName: 'Maria Garcia', items: [{ productName: 'Pollo Jack', quantity: 1 }, { productName: 'Gaseosa', quantity: 1 }], status: 'preparing', total: 29 },
    { id: 'ORD-003', customerName: 'Carlos Sanchez', items: [{ productName: 'Doble Jack', quantity: 1 }], status: 'ready', total: 38 },
    { id: 'ORD-004', customerName: 'Ana Lopez', items: [{ productName: 'Big Jack Tocino', quantity: 1 }, { productName: 'Aros de Cebolla', quantity: 1 }], status: 'completed', total: 40 },
]
