
import { Timestamp } from 'firebase/firestore';

export interface ProductIngredient {
  ingredientId: string;
  quantity: number;
  unit: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  ingredients?: ProductIngredient[];
  price: number;
  salePrice: number;
  supplierId: string;
  purchaseDate: string;
  quantity: number;
  imageUrl?: string;
  imageHint?: string;
}

export type IngredientCategory = 'protein' | 'vegetable' | 'dairy' | 'sauce' | 'bakery' | 'other';

export interface IngredientProvider {
  name: string;
  pricePerUnit: number;
}

export interface Ingredient {
  id:string;
  name: string;
  sku?: string;
  category?: IngredientCategory;
  cost: number;
  quantity: number;
  unit: string;
  storageLocation?: string;
  reorderLeadTimeDays?: number;
  notes?: string;
  productIds?: string[];
  minimumStock?: number;
  expiryDate?: string;
  providers?: IngredientProvider[];
}

export interface InventoryItem {
  id: string;
  name: string;
  type: string;
  quantity: number;
  expiryDate?: string;
  location?: string;
  minimumStock: number;
  costPerUnit?: number;
  supplier?: string;
  notes?: string;
}


export interface Sale {
  id: string;
  saleDate: Timestamp;
  totalAmount: number;
  cashierId: string;
  paymentMethod: string;
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface OrderItem {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
}

export interface OnlineOrder {
  id: string;
  orderDate: Timestamp;
  customerId: string;
  status: 'pending' | 'processing' | 'completed';
  totalAmount: number;
  items: OrderItem[];
  customerName: string;
}

export interface Supplier {
    id: string;
    name: string;
}

export interface OtherItem {
  id: string;
  name: string;
  stock: number;
  minStock: number;
}
