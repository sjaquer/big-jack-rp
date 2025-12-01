import { NextRequest, NextResponse } from 'next/server';

interface SunatRequestBody {
  saleId: string;
  total: number;
  paymentMethod: string;
  issuedAt: string;
  items: Array<{
    productId: string;
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
  customer?: {
    name: string;
    documentType?: string;
    documentNumber?: string;
  };
}

const getEnv = (key: string) => process.env[key] ?? process.env[key.replace(/-/g, '_')];

const currencyFormatter = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  minimumFractionDigits: 2,
});

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SunatRequestBody;
    if (!body.saleId || !body.items?.length || !body.total) {
      return NextResponse.json(
        { status: 'error', message: 'Faltan datos para generar la boleta.' },
        { status: 400 }
      );
    }

    const clientId = getEnv('SUNAT_CLIENT_ID') ?? getEnv('id_client');
    const clientSecret = getEnv('SUNAT_CLIENT_SECRET') ?? getEnv('clave_sunat') ?? getEnv('clave-sunat');
    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { status: 'error', message: 'Credenciales de SUNAT no configuradas.' },
        { status: 500 }
      );
    }

    const baseUrl = getEnv('SUNAT_API_BASE_URL') ?? 'https://api.sunat.gob.pe/v1/contribuyente/conectate';
    const tokenUrl = getEnv('SUNAT_API_TOKEN_URL') ?? `${baseUrl}/token`; 
    const receiptUrl = getEnv('SUNAT_API_RECEIPT_URL') ?? `${baseUrl}/boleta`; 

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials',
      }),
    });

    const tokenJson = await tokenResponse.json().catch(() => ({}));

    if (!tokenResponse.ok || !tokenJson?.access_token) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'No se pudo obtener el token de SUNAT.',
          details: tokenJson,
        },
        { status: 502 }
      );
    }

    const serieEnv = getEnv('SUNAT_BOLETA_SERIE') ?? 'B001';
    const serie = body.serie ?? serieEnv;
    const correlativo = body.correlativo ?? Date.now();
    const customer = body.customer ?? {
      name: 'Cliente Mostrador',
      documentNumber: '00000000',
      documentType: '0',
    };

    const boletaPayload = {
      tipoComprobante: '03',
      serie,
      correlativo,
      fechaEmision: body.issuedAt,
      moneda: 'PEN',
      medioPago: body.paymentMethod,
      totalVenta: Number(body.total.toFixed(2)),
      descripcion: `Boleta ${serie}-${correlativo} por ${currencyFormatter.format(body.total)}`,
      cliente: {
        numeroDocumento: customer.documentNumber ?? '00000000',
        tipoDocumento: customer.documentType ?? '0',
        razonSocial: customer.name,
      },
      items: body.items.map((item, index) => ({
        numeroItem: index + 1,
        descripcion: item.description,
        cantidad: item.quantity,
        precioUnitario: Number(item.unitPrice.toFixed(2)),
        subtotal: Number((item.unitPrice * item.quantity).toFixed(2)),
      })),
    };

    const receiptResponse = await fetch(receiptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenJson.access_token}`,
      },
      body: JSON.stringify(boletaPayload),
    });

    const receiptJson = await receiptResponse.json().catch(() => ({}));

    if (!receiptResponse.ok) {
      return NextResponse.json(
        {
          status: 'rejected',
          message: receiptJson?.message ?? 'SUNAT rechazó la boleta.',
          details: receiptJson,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      status: 'accepted',
      ticket: receiptJson?.ticket ?? receiptJson?.numeroTicket ?? null,
      response: receiptJson,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: (error as Error).message ?? 'Error inesperado generando boleta.',
      },
      { status: 500 }
    );
  }
}
