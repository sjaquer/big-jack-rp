import { NextRequest, NextResponse } from 'next/server';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';
import { adminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

const webhookItemSchema = z.object({
  sku: z.string().trim().min(1, 'Cada item debe incluir sku.'),
  quantity: z.number().positive('quantity debe ser mayor a 0.'),
  notes: z.string().trim().max(300).optional(),
});

const webhookPayloadSchema = z.object({
  eventId: z.string().trim().min(1).max(120).optional(),
  orderDate: z.union([z.string().datetime(), z.number().int().positive()]).optional(),
  source: z.string().trim().min(1).max(60).default('menu-webhook'),
  customer: z
    .object({
      name: z.string().trim().min(1).max(140).default('Cliente online'),
      phone: z.string().trim().min(3).max(40).optional(),
    })
    .optional(),
  paymentMethod: z.string().trim().min(1).max(40).optional(),
  notes: z.string().trim().max(1200).optional(),
  items: z.array(webhookItemSchema).min(1, 'Debes enviar al menos 1 item.'),
  metadata: z.record(z.unknown()).optional(),
});

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-webhook-secret',
};

type ProductSnapshot = {
  id: string;
  sku: string;
  name: string;
  salePrice: number;
  costPrice: number;
  quantity: number;
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

function toFirestoreOrderDate(value: z.infer<typeof webhookPayloadSchema>['orderDate']) {
  if (!value) return FieldValue.serverTimestamp();
  if (typeof value === 'number') return Timestamp.fromMillis(value);
  return Timestamp.fromDate(new Date(value));
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
    });
  }

  return { bySku, missingSkus };
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function POST(request: NextRequest) {
  try {
    const configuredSecret = process.env.WEBHOOK_MENU_SECRET;
    const providedSecret = request.headers.get('x-webhook-secret')?.trim();

    if (configuredSecret && providedSecret !== configuredSecret) {
      return jsonResponse({ success: false, error: 'No autorizado.' }, 401);
    }

    const payload = await request.json();
    const parsed = webhookPayloadSchema.safeParse(payload);

    if (!parsed.success) {
      return jsonResponse(
        {
          success: false,
          error: 'Payload de webhook inválido.',
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

    const totalAmount = Number(resolvedItems.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2));
    const totalItems = resolvedItems.reduce((sum, item) => sum + item.quantity, 0);

    const orderRef = order.eventId
      ? adminDb.collection('online_orders').doc(`webhook-${sanitizeDocId(order.eventId)}`)
      : adminDb.collection('online_orders').doc();

    const existing = await orderRef.get();
    if (existing.exists) {
      return jsonResponse({
        success: true,
        duplicated: true,
        orderId: orderRef.id,
        message: 'Webhook ya procesado previamente.',
      });
    }

    const saleRef = adminDb.collection('sales').doc();

    const saleBatch = adminDb.batch();

    saleBatch.set(saleRef, {
      saleDate: FieldValue.serverTimestamp(),
      totalAmount,
      cashierId: 'menu-webhook',
      cashierEmail: 'menu-webhook@system.local',
      paymentMethod: order.paymentMethod ?? 'online',
      itemsCount: totalItems,
      uniqueProductsCount: resolvedItems.length,
      source: 'online',
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
      source: order.source,
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
        return jsonResponse({
          success: true,
          duplicated: true,
          orderId: orderRef.id,
          message: 'Webhook ya procesado previamente.',
        });
      }
      throw error;
    }

    return jsonResponse({
      success: true,
      orderId: orderRef.id,
      saleId: saleRef.id,
      erpSummary: {
        itemsCount: totalItems,
        uniqueItems: resolvedItems.length,
        totalAmount,
      },
      message: 'Venta registrada correctamente.',
    });
  } catch (error) {
    console.error('Error al procesar webhook de pedidos:', error);
    return jsonResponse(
      {
        success: false,
        error: 'No se pudo registrar el pedido desde webhook.',
      },
      500
    );
  }
}
