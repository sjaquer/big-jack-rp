import { NextRequest, NextResponse } from 'next/server';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';
import { adminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

const allowedSources = ['pos', 'delivery', 'pedidosya', 'web', 'otros'] as const;
const allowedStatuses = ['pending', 'processing', 'completed'] as const;
const allowedDocumentTypes = ['0', '1', '6'] as const;
const allowedChannelTags = ['nuevo', 'prioritario'] as const;

const orderItemSchema = z.object({
  sku: z.string().trim().min(1, 'Cada item debe incluir sku.'),
  productName: z.string().trim().min(1).optional(),
  quantity: z.number().positive('quantity debe ser mayor a 0.'),
  unitPrice: z.number().min(0, 'unitPrice no puede ser negativo.').optional(),
  lineNotes: z.string().trim().max(300).optional(),
  modifiers: z
    .array(
      z.object({
        code: z.string().trim().min(1).max(60).optional(),
        name: z.string().trim().min(1).max(120),
        quantity: z.number().positive().default(1),
        unitPrice: z.number().min(0).default(0),
      })
    )
    .optional(),
  metadata: z.record(z.unknown()).optional(),
});

const createOnlineOrderSchema = z.object({
  externalOrderId: z.string().trim().min(1).max(120).optional(),
  orderDate: z.union([z.string().datetime(), z.number().int().positive()]).optional(),
  customerId: z.string().trim().min(1).optional().nullable(),
  customerName: z.string().trim().min(1).max(140).default('Cliente online'),
  customerPhone: z.string().trim().min(3).max(40).optional(),
  paymentMethod: z.string().trim().min(1).max(50).optional(),
  notes: z.string().trim().max(2000).optional(),
  deliveryAddress: z.string().trim().max(300).optional(),
  source: z.enum(allowedSources).default('web'),
  status: z.enum(allowedStatuses).default('pending'),
  channelTag: z.enum(allowedChannelTags).optional(),
  customerDocumentType: z.enum(allowedDocumentTypes).optional(),
  customerDocumentNumber: z.string().trim().min(1).max(20).optional().nullable(),
  items: z.array(orderItemSchema).min(1, 'Debes enviar al menos 1 item.'),
  totalAmount: z.number().min(0).optional(),
  useCatalogPrice: z.boolean().default(true),
  acceptPriceDiff: z.boolean().default(true),
  enforceStock: z.boolean().default(false),
  cashierId: z.string().trim().min(1).optional().default('online-api'),
  cashierEmail: z.string().trim().email().optional().default('online-api@system.local'),
  receiptReference: z.string().trim().min(1).max(30).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-online-orders-key',
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      ...CORS_HEADERS,
      'Cache-Control': 'no-store',
    },
  });
}

function extractApiKey(request: NextRequest): string | null {
  const fromHeader = request.headers.get('x-online-orders-key')?.trim();
  if (fromHeader) return fromHeader;

  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;

  const [scheme, token] = authHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;

  return token.trim();
}

function sanitizeDocId(input: string): string {
  const normalized = input.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-');
  const trimmed = normalized.slice(0, 120).replace(/^-+|-+$/g, '');
  return trimmed || `order-${Date.now()}`;
}

type ProductIngredientSnapshot = {
  ingredientId?: string;
  quantity?: number;
  unit?: string;
};

type ProductSnapshot = {
  id: string;
  sku: string;
  name: string;
  salePrice: number;
  costPrice: number;
  quantity: number;
  ingredients: ProductIngredientSnapshot[];
};

function normalizeSku(value: string): string {
  return value.trim().toUpperCase();
}

function toNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function isAlreadyExistsError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = (error as { code?: unknown }).code;
  return code === 6 || code === '6' || code === 'already-exists' || code === 'ALREADY_EXISTS';
}

function buildErpFailureHint() {
  return (
    'Revisa logs del endpoint online-orders en produccion, escritura en sales/sale_items, ' +
    'descuento en products/ingredients/inventory_movements y variables de entorno de conexion/permisos.'
  );
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
      quantity: toNumber(data.quantity, 0),
      ingredients: Array.isArray(data.ingredients) ? (data.ingredients as ProductIngredientSnapshot[]) : [],
    });
  }

  return { bySku, missingSkus };
}

function mapSourceToSaleSource(source: (typeof allowedSources)[number]): 'online' | 'delivery' {
  return source === 'delivery' || source === 'pedidosya' ? 'delivery' : 'online';
}

function toFirestoreOrderDate(value: z.infer<typeof createOnlineOrderSchema>['orderDate']) {
  if (!value) return FieldValue.serverTimestamp();

  if (typeof value === 'number') {
    return Timestamp.fromMillis(value);
  }

  return Timestamp.fromDate(new Date(value));
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function POST(request: NextRequest) {
  try {
    const configuredApiKey = process.env.ONLINE_ORDERS_API_KEY;
    const providedApiKey = extractApiKey(request);

    if (configuredApiKey) {
      if (providedApiKey !== configuredApiKey) {
        return jsonResponse({ success: false, error: 'No autorizado.' }, 401);
      }
    } else if (process.env.NODE_ENV === 'production') {
      return jsonResponse(
        {
          success: false,
          error: 'Falta ONLINE_ORDERS_API_KEY en el servidor.',
        },
        500
      );
    }

    const payload = await request.json();
    const parsed = createOnlineOrderSchema.safeParse(payload);

    if (!parsed.success) {
      return jsonResponse(
        {
          success: false,
          error: 'Payload inválido.',
          details: parsed.error.flatten(),
        },
        400
      );
    }

    const order = parsed.data;
    const skuList = order.items.map((item) => normalizeSku(item.sku));
    const { bySku: productsBySku, missingSkus } = await resolveProductsBySku(skuList);

    if (missingSkus.length > 0) {
      return jsonResponse(
        {
          success: false,
          error: 'Hay SKUs no registrados en productos.',
          missingSkus,
        },
        400
      );
    }

    const resolvedItems = order.items.map((item) => {
      const normalizedSku = normalizeSku(item.sku);
      const product = productsBySku.get(normalizedSku)!;
      const modifiersTotal = (item.modifiers ?? []).reduce(
        (sum, modifier) => sum + modifier.quantity * modifier.unitPrice,
        0
      );

      const onlineUnitPrice = item.unitPrice ?? 0;
      const catalogUnitPrice = product.salePrice;
      const selectedUnitPrice = order.useCatalogPrice ? catalogUnitPrice : onlineUnitPrice || catalogUnitPrice;
      const lineUnitPrice = Number((selectedUnitPrice + modifiersTotal).toFixed(2));
      const subtotal = Number((lineUnitPrice * item.quantity).toFixed(2));

      return {
        productId: product.id,
        productSku: product.sku,
        productName: item.productName || product.name,
        quantity: item.quantity,
        unitPrice: lineUnitPrice,
        catalogUnitPrice,
        requestedUnitPrice: item.unitPrice ?? null,
        modifiers: item.modifiers ?? [],
        lineNotes: item.lineNotes ?? null,
        metadata: item.metadata ?? null,
        subtotal,
        costUnitPrice: product.costPrice,
      };
    });

    const catalogTotal = Number(resolvedItems.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2));
    const requestedTotal = Number((order.totalAmount ?? catalogTotal).toFixed(2));
    const totalDiff = Number((requestedTotal - catalogTotal).toFixed(2));

    if (Math.abs(totalDiff) > 0.01 && !order.acceptPriceDiff) {
      return jsonResponse(
        {
          success: false,
          error: 'El total enviado no coincide con el cálculo del ERP.',
          requestedTotal,
          catalogTotal,
          diff: totalDiff,
        },
        409
      );
    }

    const totalAmount = catalogTotal;
    const totalItems = resolvedItems.reduce((sum, item) => sum + item.quantity, 0);

    if (order.enforceStock) {
      const requiredByProduct = new Map<string, number>();
      for (const item of resolvedItems) {
        const current = requiredByProduct.get(item.productId) || 0;
        requiredByProduct.set(item.productId, current + item.quantity);
      }

      const insufficientProducts: Array<{ sku: string; required: number; available: number }> = [];
      for (const [productId, required] of requiredByProduct) {
        const product = [...productsBySku.values()].find((entry) => entry.id === productId);
        if (!product) continue;
        if (product.quantity < required) {
          insufficientProducts.push({
            sku: product.sku,
            required,
            available: product.quantity,
          });
        }
      }

      const requiredByIngredient = new Map<string, number>();
      for (const item of resolvedItems) {
        const product = productsBySku.get(normalizeSku(item.productSku));
        if (!product) continue;
        for (const ingredient of product.ingredients) {
          if (!ingredient?.ingredientId || typeof ingredient.quantity !== 'number') continue;
          const current = requiredByIngredient.get(ingredient.ingredientId) || 0;
          requiredByIngredient.set(ingredient.ingredientId, current + ingredient.quantity * item.quantity);
        }
      }

      const ingredientDocs = await Promise.all(
        [...requiredByIngredient.keys()].map(async (ingredientId) => {
          const docSnap = await adminDb.collection('ingredients').doc(ingredientId).get();
          return {
            ingredientId,
            exists: docSnap.exists,
            name: docSnap.exists ? String((docSnap.data() as Record<string, unknown>).name ?? ingredientId) : ingredientId,
            available: docSnap.exists ? toNumber((docSnap.data() as Record<string, unknown>).quantity, 0) : 0,
          };
        })
      );

      const insufficientIngredients = ingredientDocs
        .map((ingredient) => ({
          ingredientId: ingredient.ingredientId,
          name: ingredient.name,
          required: requiredByIngredient.get(ingredient.ingredientId) || 0,
          available: ingredient.available,
        }))
        .filter((entry) => entry.available < entry.required);

      if (insufficientProducts.length > 0 || insufficientIngredients.length > 0) {
        return jsonResponse(
          {
            success: false,
            error: 'Stock insuficiente para procesar el pedido en modo estricto.',
            insufficientProducts,
            insufficientIngredients,
          },
          409
        );
      }
    }

    const collectionRef = adminDb.collection('online_orders');
    const docRef = order.externalOrderId
      ? collectionRef.doc(`ext-${sanitizeDocId(order.externalOrderId)}`)
      : collectionRef.doc();

    const existing = await docRef.get();
    if (existing.exists) {
      return jsonResponse({
        success: true,
        duplicated: true,
        orderId: docRef.id,
        message: 'Pedido ya registrado previamente.',
      });
    }

    const saleRef = adminDb.collection('sales').doc();

    const ingredientUpdates = new Map<string, number>();
    for (const item of resolvedItems) {
      const product = productsBySku.get(normalizeSku(item.productSku));
      if (!product) continue;

      for (const ingredient of product.ingredients) {
        if (!ingredient?.ingredientId || typeof ingredient.quantity !== 'number') continue;
        const current = ingredientUpdates.get(ingredient.ingredientId) || 0;
        ingredientUpdates.set(ingredient.ingredientId, current + ingredient.quantity * item.quantity);
      }
    }

    const batch = adminDb.batch();

    batch.set(saleRef, {
      saleDate: FieldValue.serverTimestamp(),
      totalAmount,
      cashierId: order.cashierId,
      cashierEmail: order.cashierEmail,
      paymentMethod: order.paymentMethod ?? 'online',
      itemsCount: totalItems,
      uniqueProductsCount: resolvedItems.length,
      source: mapSourceToSaleSource(order.source),
      deviceType: 'api',
      customerId: order.customerId ?? null,
      customerName: order.customerName,
      customerDocumentType: order.customerDocumentType,
      customerDocumentNumber: order.customerDocumentNumber ?? null,
      receiptReference:
        order.receiptReference ??
        order.externalOrderId?.slice(0, 20)?.toUpperCase() ??
        saleRef.id.slice(0, 8).toUpperCase(),
      createdAt: FieldValue.serverTimestamp(),
      via: 'online-orders-api',
      externalOrderId: order.externalOrderId ?? null,
      metadata: order.metadata ?? null,
    });

    for (const item of resolvedItems) {
      const saleItemRef = saleRef.collection('sale_items').doc();
      batch.set(saleItemRef, {
        saleId: saleRef.id,
        productId: item.productId,
        productName: item.productName,
        productSku: item.productSku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
        catalogUnitPrice: item.catalogUnitPrice,
        requestedUnitPrice: item.requestedUnitPrice,
        profit: Number(((item.unitPrice - item.costUnitPrice) * item.quantity).toFixed(2)),
        modifiers: item.modifiers,
        lineNotes: item.lineNotes,
        metadata: item.metadata,
      });
    }

    for (const item of resolvedItems) {
      const productRef = adminDb.collection('products').doc(item.productId);
      batch.update(productRef, {
        quantity: FieldValue.increment(-item.quantity),
      });
    }

    for (const [ingredientId, amountToDecrement] of ingredientUpdates) {
      const ingredientRef = adminDb.collection('ingredients').doc(ingredientId);
      batch.update(ingredientRef, {
        quantity: FieldValue.increment(-amountToDecrement),
      });
    }

    const inventoryMovementRef = adminDb.collection('inventory_movements').doc();
    batch.set(inventoryMovementRef, {
      type: 'online_sale',
      source: order.source,
      saleId: saleRef.id,
      onlineOrderId: docRef.id,
      externalOrderId: order.externalOrderId ?? null,
      itemType: 'mixed',
      amount: totalItems,
      totalAmount,
      skuList: resolvedItems.map((item) => item.productSku),
      note: `Pedido online recibido por API${order.externalOrderId ? ` (${order.externalOrderId})` : ''}`,
      createdAt: FieldValue.serverTimestamp(),
    });

    // Use create to enforce true idempotency under concurrent requests.
    batch.create(docRef, {
      orderDate: toFirestoreOrderDate(order.orderDate),
      customerId: order.customerId ?? null,
      status: order.status,
      totalAmount,
      items: resolvedItems.map((item) => ({
        productId: item.productId,
        productSku: item.productSku,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
        modifiers: item.modifiers,
        lineNotes: item.lineNotes,
      })),
      itemsCount: totalItems,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      paymentMethod: order.paymentMethod,
      notes: order.notes,
      deliveryAddress: order.deliveryAddress,
      source: order.source,
      channelTag: order.channelTag,
      customerDocumentType: order.customerDocumentType,
      customerDocumentNumber: order.customerDocumentNumber ?? null,
      externalOrderId: order.externalOrderId ?? null,
      saleId: saleRef.id,
      erpPriceTotal: totalAmount,
      externalPriceTotal: order.totalAmount ?? null,
      priceDiff: Number((requestedTotal - totalAmount).toFixed(2)),
      priceValidationMode: {
        useCatalogPrice: order.useCatalogPrice,
        acceptPriceDiff: order.acceptPriceDiff,
      },
      metadata: order.metadata ?? null,
      createdAt: FieldValue.serverTimestamp(),
      via: 'api',
    });

    try {
      await batch.commit();
    } catch (commitError) {
      if (order.externalOrderId && isAlreadyExistsError(commitError)) {
        return jsonResponse({
          success: true,
          duplicated: true,
          orderId: docRef.id,
          message: 'Pedido ya registrado previamente.',
        });
      }
      throw commitError;
    }

    return jsonResponse({
      success: true,
      orderId: docRef.id,
      saleId: saleRef.id,
      erpSummary: {
        itemsCount: totalItems,
        uniqueItems: resolvedItems.length,
        totalAmount,
        requestedTotal,
        diff: Number((requestedTotal - totalAmount).toFixed(2)),
      },
      message: 'Pedido recibido correctamente.',
    });
  } catch (error) {
    console.error('Error al crear pedido online desde API:', error);
    return jsonResponse(
      {
        success: false,
        error: 'El ERP devolvio un error interno al registrar el pedido.',
        upstreamStatus: 500,
        hint: buildErpFailureHint(),
      },
      500
    );
  }
}
