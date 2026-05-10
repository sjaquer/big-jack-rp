import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { MissingSkusError, processIncomingOrder } from '@/lib/orders/process-incoming-order';

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

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      ...CORS_HEADERS,
      'Cache-Control': 'no-store',
    },
  });
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

    const result = await processIncomingOrder(parsed.data);

    return jsonResponse({
      success: true,
      duplicated: result.duplicated,
      orderId: result.orderId,
      saleId: result.saleId,
      erpSummary: {
        itemsCount: result.itemsCount,
        uniqueItems: result.uniqueItems,
        totalAmount: result.totalAmount,
      },
      message: result.duplicated ? 'Webhook ya procesado previamente.' : 'Venta registrada correctamente.',
    });
  } catch (error) {
    if (error instanceof MissingSkusError) {
      return jsonResponse(
        {
          success: false,
          error: 'Hay SKUs no registrados en productos.',
          missingSkus: error.missingSkus,
        },
        400
      );
    }

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
