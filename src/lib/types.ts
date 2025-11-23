export interface Product {
  id: string;
  name: string;
  sku: string;
  ingredients: string[];
  price: number;
  salePrice: number;
  supplier: string;
  purchaseDate: string;
  stock: number;
  imageUrl?: string;
  imageHint?: string;
}

export interface Ingredient {
  id: string;
  name: string;
  stock: number;
  unit: 'g' | 'kg' | 'ml' | 'l' | 'units';
  cost: number;
  minStock: number;
  expiryDate: string;
}

export interface OtherItem {
  id: string;
  name: string;
  stock: number;
  minStock: number;
}

export interface Sale {
  date: string;
  revenue: number;
  netProfit: number;
}

export interface OnlineOrder {
  id: string;
  customerName: string;
  items: { productName: string; quantity: number }[];
  status: 'new' | 'preparing' | 'ready' | 'completed';
  total: number;
}
