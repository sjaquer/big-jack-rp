
import { Timestamp } from 'firebase/firestore';

export type ProductCategory =
  | 'combos'
  | 'hamburguesas'
  | 'salchipapas'
  | 'choripanes'
  | 'adicionales'
  | 'pollos'
  | 'bebidas'
  | 'acompanamientos'
  | 'postres'
  | 'otros';

export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  combos: 'Combos',
  hamburguesas: 'Hamburguesas',
  salchipapas: 'Salchipapas',
  choripanes: 'Choripanes',
  adicionales: 'Adicionales',
  pollos: 'Pollos & Parrilla',
  bebidas: 'Bebidas',
  acompanamientos: 'Acompañamientos',
  postres: 'Postres',
  otros: 'Otros',
};

export interface ProductIngredient {
  ingredientId: string;
  quantity: number;
  unit: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category?: ProductCategory;
  ingredients?: ProductIngredient[];
  price: number;
  salePrice: number;
  supplierId: string;
  purchaseDate: string;
  quantity: number;
  imageUrl?: string;
  imageHint?: string;
}

export type IngredientCategory = 'protein' | 'vegetable' | 'dairy' | 'sauce' | 'bakery' | 'additional' | 'other';

export interface IngredientProvider {
  name: string;
  pricePerUnit: number;
  totalPrice?: number;
  purchaseQuantity?: number;
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


export type SaleSource = 'pos' | 'online' | 'delivery';
export type SunatStatus = 'pending' | 'queued' | 'sent' | 'accepted' | 'rejected';

export interface Sale {
  id: string;
  saleDate: Timestamp;
  totalAmount: number;
  cashierId: string;
  paymentMethod: string;
  itemsCount?: number;
  uniqueProductsCount?: number;
  source?: SaleSource;
  deviceType?: string;
  customerId?: string | null;
  customerName?: string | null;
  customerDocumentType?: '0' | '1' | '6';
  customerDocumentNumber?: string | null;
  sunatStatus?: SunatStatus;
  sunatDocumentId?: string;
  sunatNote?: string;
  boletaSerie?: string;
  boletaCorrelativo?: number;
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  productName?: string;
  quantity: number;
  unitPrice: number;
}

export interface OrderItem {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
}

export type OrderSource = 'pos' | 'delivery' | 'pedidosya' | 'web' | 'otros';

export interface OnlineOrder {
  id: string;
  orderDate: Timestamp;
  customerId: string | null;
  status: 'pending' | 'processing' | 'completed';
  totalAmount: number;
  items: OrderItem[];
  customerName: string;
  customerPhone?: string;
  paymentMethod?: string;
  notes?: string;
  deliveryAddress?: string;
  completedAt?: Timestamp;
  source?: OrderSource;
  channelTag?: 'nuevo' | 'prioritario';
  customerDocumentType?: '0' | '1' | '6';
  customerDocumentNumber?: string | null;
}

export interface Customer {
  id: string;
  firstName: string;
  lastName?: string;
  nickname?: string;
  phone?: string;
  email?: string;
  documentType?: '0' | '1' | '6'; // 0: Sin doc, 1: DNI, 6: RUC
  documentNumber?: string;
  address?: string;
  allergies?: string[];
  preferences?: string;
  notes?: string;
  registrationDate: Timestamp;
  lastVisit?: Timestamp;
  totalVisits: number;
  totalSpent: number;
  loyaltyPoints: number;
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

export type CashFlowType = 'income' | 'expense';

export interface CashFlowEntry {
  id: string;
  type: CashFlowType;
  category: string;
  amount: number;
  paymentMethod: string;
  note?: string;
  entryDate: Timestamp;
  createdBy?: string;
  createdAt?: Timestamp;
}

export interface CashFlowSummary {
  period: 'daily' | 'weekly' | 'monthly';
  income: number;
  expenses: number;
  net: number;
}
