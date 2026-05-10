import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { convertInventoryQuantity } from '@/lib/unit-conversion';

type IncomingOrderItem = {
  sku: string;
  quantity: number;
  notes?: string;
};

type IncomingOrderPayload = {
  eventId?: string;
  orderDate?: string | number;
  source?: string;
  customer?: {
    name: string;
    phone?: string;
  };
  paymentMethod?: string;
  notes?: string;
  items: IncomingOrderItem[];
  metadata?: Record<string, unknown>;
};

type ProductIngredient = {
  ingredientId: string;
  quantity: number;
  unit?: string;
  sourceType?: 'ingredient' | 'inventory_item';
};

type ProductSnapshot = {
  id: string;
  sku: string;
  name: string;
  salePrice: number;
  costPrice: number;
  ingredients: ProductIngredient[];
};

type ResolvedOrderItem = {
  productId: string;
  productSku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  costUnitPrice: number;
  lineNotes: string | null;
};

type ProcessIncomingOrderResult = {
  success: true;
  duplicated: boolean;
  orderId: string;
  saleId: string | null;
  totalAmount: number;
  itemsCount: number;
  uniqueItems: number;
};

export class MissingSkusError extends Error {
  readonly missingSkus: string[];

  constructor(missingSkus: string[]) {
    super('Hay SKUs no registrados en productos.');
    this.name = 'MissingSkusError';
    this.missingSkus = missingSkus;
  }
}

const SOURCE_ALIASES: Array<{ matcher: RegExp; source: 'web' | 'delivery' | 'pedidosya' | 'otros' }> = [
  { matcher: /(pedido|pya)/i, source: 'pedidosya' },
  { matcher: /(delivery|rappi|uber)/i, source: 'delivery' },
  { matcher: /(web|menu|site|hook)/i, source: 'web' },
];

function normalizeSku(value: string): string {
  return value.trim().toUpperCase();
}

function toNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function sanitizeDocId(input: string): string {
  const normalized = input.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-');
  const trimmed = normalized.slice(0, 120).replace(/^-+|-+$/g, '');
  return trimmed || `order-${Date.now()}`;
}

function isAlreadyExistsError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = (error as { code?: unknown }).code;
  return code === 6 || code === '6' || code === 'already-exists' || code === 'ALREADY_EXISTS';
}

function normalizeWebhookSource(rawSource?: string): 'web' | 'delivery' | 'pedidosya' | 'otros' {
  if (!rawSource) return 'web';
  const value = rawSource.trim();

  for (const alias of SOURCE_ALIASES) {
    if (alias.matcher.test(value)) {
      return alias.source;
    }
  }

  return 'otros';
}

function toFirestoreOrderDate(value: IncomingOrderPayload['orderDate']) {
  if (!value) return FieldValue.serverTimestamp();
  if (typeof value === 'number') return Timestamp.fromMillis(value);
  return Timestamp.fromDate(new Date(value));
}

function parseProductIngredients(value: unknown): ProductIngredient[] {
  if (!Array.isArray(value)) return [];

  return value
    .map<ProductIngredient | null>((item) => {
      if (!item || typeof item !== 'object') return null;
      const ingredientId = String((item as { ingredientId?: unknown }).ingredientId ?? '').trim();
      const quantity = toNumber((item as { quantity?: unknown }).quantity, 0);
      if (!ingredientId || quantity <= 0) return null;

      const sourceTypeRaw = (item as { sourceType?: unknown }).sourceType;
      const sourceType: 'ingredient' | 'inventory_item' = sourceTypeRaw === 'inventory_item' ? 'inventory_item' : 'ingredient';
      const unitRaw = (item as { unit?: unknown }).unit;

      return {
        ingredientId,
        quantity,
        ...(typeof unitRaw === 'string' ? { unit: unitRaw } : {}),
        sourceType,
      };
    })
    .filter((item): item is ProductIngredient => item !== null);
}

async function resolveProductsBySku(inputSkus: string[]) {
  const uniqueSkus = [...new Set(inputSkus.map(normalizeSku))];
  const lookups = await Promise.all(
    uniqueSkus.map(async (sku) => {
      const snapshot = await adminDb.collection('products').where('sku', '==', sku).limit(1).get();
      return { sku, snapshot };
    })
  );

  const bySku = new Map<string, ProductSnapshot>();
  const missingSkus: string[] = [];

  for (const lookup of lookups) {
    if (lookup.snapshot.empty) {
      missingSkus.push(lookup.sku);
      continue;
    }

    const doc = lookup.snapshot.docs[0];
    const data = doc.data() as Record<string, unknown>;
    bySku.set(lookup.sku, {
      id: doc.id,
      sku: normalizeSku(String(data.sku ?? lookup.sku)),
      name: String(data.name ?? `SKU ${lookup.sku}`),
      salePrice: toNumber(data.salePrice, 0),
      costPrice: toNumber(data.price, 0),
      ingredients: parseProductIngredients(data.ingredients),
    });
  }

  return { bySku, missingSkus };
}

function resolveOrderItems(order: IncomingOrderPayload, productsBySku: Map<string, ProductSnapshot>): ResolvedOrderItem[] {
  return order.items.map((item) => {
    const product = productsBySku.get(normalizeSku(item.sku));
    if (!product) {
      throw new MissingSkusError([normalizeSku(item.sku)]);
    }

    const unitPrice = Number(product.salePrice.toFixed(2));
    const subtotal = Number((unitPrice * item.quantity).toFixed(2));

    return {
      productId: product.id,
      productSku: product.sku,
      productName: product.name,
      quantity: item.quantity,
      unitPrice,
      subtotal,
      costUnitPrice: product.costPrice,
      lineNotes: item.notes ?? null,
    };
  });
}

async function buildStockAdjustments(resolvedItems: ResolvedOrderItem[], productsBySku: Map<string, ProductSnapshot>) {
  const productsById = new Map<string, ProductSnapshot>();
  productsBySku.forEach((product) => productsById.set(product.id, product));

  const ingredientUnitIds = [...new Set(
    resolvedItems.flatMap((item) => {
      const product = productsById.get(item.productId);
      if (!product) return [] as string[];
      return product.ingredients
        .filter((ingredient) => (ingredient.sourceType ?? 'ingredient') === 'ingredient')
        .map((ingredient) => ingredient.ingredientId);
    })
  )];

  const ingredientUnits = new Map<string, string>();
  await Promise.all(
    ingredientUnitIds.map(async (ingredientId) => {
      const ingredientDoc = await adminDb.collection('ingredients').doc(ingredientId).get();
      if (!ingredientDoc.exists) return;
      const ingredientData = ingredientDoc.data() as { unit?: unknown };
      if (typeof ingredientData.unit === 'string' && ingredientData.unit.trim()) {
        ingredientUnits.set(ingredientId, ingredientData.unit);
      }
    })
  );

  const stockAdjustments = new Map<string, { collectionName: 'ingredients' | 'inventory_items'; id: string; amount: number }>();

  resolvedItems.forEach((item) => {
    const product = productsById.get(item.productId);
    if (!product?.ingredients?.length) return;

    product.ingredients.forEach((ingredient) => {
      const collectionName = ingredient.sourceType === 'inventory_item' ? 'inventory_items' : 'ingredients';
      const key = `${collectionName}:${ingredient.ingredientId}`;
      const currentAmount = stockAdjustments.get(key)?.amount ?? 0;
      const rawAmount = ingredient.quantity * item.quantity;
      const adjustedAmount = collectionName === 'ingredients'
        ? convertInventoryQuantity(rawAmount, ingredient.unit, ingredientUnits.get(ingredient.ingredientId)) ?? rawAmount
        : rawAmount;

      stockAdjustments.set(key, {
        collectionName,
        id: ingredient.ingredientId,
        amount: currentAmount + adjustedAmount,
      });
    });
  });

  return stockAdjustments;
}

export async function processIncomingOrder(order: IncomingOrderPayload): Promise<ProcessIncomingOrderResult> {
  const skuList = order.items.map((item) => normalizeSku(item.sku));
  const { bySku: productsBySku, missingSkus } = await resolveProductsBySku(skuList);

  if (missingSkus.length > 0) {
    throw new MissingSkusError(missingSkus);
  }

  const resolvedItems = resolveOrderItems(order, productsBySku);
  const totalAmount = Number(resolvedItems.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2));
  const totalItems = resolvedItems.reduce((sum, item) => sum + item.quantity, 0);
  const normalizedSource = normalizeWebhookSource(order.source);

  const orderRef = order.eventId
    ? adminDb.collection('online_orders').doc(`webhook-${sanitizeDocId(order.eventId)}`)
    : adminDb.collection('online_orders').doc();

  const existing = await orderRef.get();
  if (existing.exists) {
    const existingSaleId = String(existing.data()?.saleId ?? '') || null;
    return {
      success: true,
      duplicated: true,
      orderId: orderRef.id,
      saleId: existingSaleId,
      totalAmount,
      itemsCount: totalItems,
      uniqueItems: resolvedItems.length,
    };
  }

  const saleRef = adminDb.collection('sales').doc();
  const saleBatch = adminDb.batch();
  const stockAdjustments = await buildStockAdjustments(resolvedItems, productsBySku);

  saleBatch.set(saleRef, {
    saleDate: FieldValue.serverTimestamp(),
    totalAmount,
    cashierId: 'menu-webhook',
    cashierEmail: 'menu-webhook@system.local',
    paymentMethod: order.paymentMethod ?? 'online',
    itemsCount: totalItems,
    uniqueProductsCount: resolvedItems.length,
    source: normalizedSource === 'delivery' ? 'delivery' : 'online',
    deviceType: 'webhook',
    customerId: null,
    customerName: order.customer?.name ?? 'Cliente online',
    createdAt: FieldValue.serverTimestamp(),
    via: 'menu-webhook',
    externalOrderId: order.eventId ?? null,
    metadata: order.metadata ?? null,
    receiptReference: (order.eventId ?? saleRef.id).slice(0, 20).toUpperCase(),
  });

  for (const item of resolvedItems) {
    const saleItemRef = saleRef.collection('sale_items').doc();
    saleBatch.set(saleItemRef, {
      saleId: saleRef.id,
      productId: item.productId,
      productName: item.productName,
      productSku: item.productSku,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.subtotal,
      profit: Number(((item.unitPrice - item.costUnitPrice) * item.quantity).toFixed(2)),
      lineNotes: item.lineNotes,
    });
  }

  for (const [, adjustment] of stockAdjustments) {
    const targetRef = adminDb.collection(adjustment.collectionName).doc(adjustment.id);
    saleBatch.update(targetRef, {
      quantity: FieldValue.increment(-adjustment.amount),
    });
  }

  saleBatch.create(orderRef, {
    orderDate: toFirestoreOrderDate(order.orderDate),
    customerId: null,
    status: 'pending',
    totalAmount,
    items: resolvedItems.map((item) => ({
      productId: item.productId,
      productSku: item.productSku,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.subtotal,
      lineNotes: item.lineNotes,
    })),
    itemsCount: totalItems,
    customerName: order.customer?.name ?? 'Cliente online',
    customerPhone: order.customer?.phone,
    paymentMethod: order.paymentMethod ?? null,
    notes: order.notes ?? null,
    source: normalizedSource,
    externalOrderId: order.eventId ?? null,
    saleId: saleRef.id,
    metadata: order.metadata ?? null,
    createdAt: FieldValue.serverTimestamp(),
    via: 'webhook',
  });

  try {
    await saleBatch.commit();
  } catch (error) {
    if (order.eventId && isAlreadyExistsError(error)) {
      return {
        success: true,
        duplicated: true,
        orderId: orderRef.id,
        saleId: saleRef.id,
        totalAmount,
        itemsCount: totalItems,
        uniqueItems: resolvedItems.length,
      };
    }
    throw error;
  }

  return {
    success: true,
    duplicated: false,
    orderId: orderRef.id,
    saleId: saleRef.id,
    totalAmount,
    itemsCount: totalItems,
    uniqueItems: resolvedItems.length,
  };
}
