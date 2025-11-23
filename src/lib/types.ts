
import { Timestamp } from 'firebase/firestore';

export interface Product {
  id: string;
  name: string;
  sku: string;
  ingredientIds?: string[];
  price: number;
  salePrice: number;
  supplierId: string;
  purchaseDate: string;
  quantity: number;
  imageUrl?: string;
  imageHint?: string;
}

export interface Ingredient {
  id:string;
  name: string;
  cost: number;
  quantity: number;
  unit: string;
  productIds?: string[];
  minimumStock?: number;
  expiryDate?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  type: string;
  quantity: number;
  expiryDate?: string;
  location?: string;
  minimumStock: number;
}


export interface Sale {
  id: string;
  saleDate: Timestamp;
  totalAmount: number;
  cashierId: string;
  paymentMethod: string;
}

export interface OnlineOrder {
  id: string;
  orderDate: Timestamp;
  customerId: string;
  status: 'pending' | 'processing' | 'completed';
  totalAmount: number;
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
