# Webhook de Pedidos (Integracion Simplificada)

Este documento define la estructura minima para enviar pedidos desde la web del menu hacia el ERP.

## Endpoint

- Metodo: POST
- URL local: http://localhost:9002/api/webhooks/orders
- URL produccion: https://bigjack-rp.vercel.app/api/webhooks/orders
- Content-Type: application/json
- Header opcional de seguridad: x-webhook-secret: <WEBHOOK_MENU_SECRET>

Nota: Si configuras WEBHOOK_MENU_SECRET en el servidor, el header x-webhook-secret pasa a ser obligatorio.

## Objetivo del webhook

El ERP recibe SKUs y cantidades, y procesa todo como una venta normal de POS:

1. Busca productos por SKU en products.
2. Calcula precios con el catalogo del ERP (products.salePrice).
3. Crea venta en sales y sale_items.
4. Guarda el pedido en online_orders para seguimiento.
5. Intenta descontar stock de products e ingredients.
6. Registra movimiento en inventory_movements.

Nota: si la sincronizacion de inventario falla, el pedido y la venta igual quedan registrados y la respuesta puede incluir `stockSync: "failed"`.

## Estructura del payload (request)

Campos:

- eventId: string opcional (recomendado). Sirve para idempotencia.
- orderDate: string ISO datetime o epoch milliseconds (opcional).
- source: string opcional. Ejemplo: menu-web.
- customer: objeto opcional.
  - name: string opcional (default: Cliente online).
  - phone: string opcional.
- paymentMethod: string opcional. Ejemplo: yape, plin, card, cash.
- notes: string opcional.
- items: array obligatorio (min 1).
  - sku: string obligatorio.
  - quantity: number > 0 obligatorio.
  - notes: string opcional (nota de linea).
- metadata: objeto opcional para trazabilidad.

## Ejemplo recomendado

```json
{
  "eventId": "menu-20260419-0001",
  "orderDate": "2026-04-19T20:15:00.000Z",
  "source": "menu-web",
  "customer": {
    "name": "Juan Perez",
    "phone": "+51987654321"
  },
  "paymentMethod": "yape",
  "notes": "Entrega rapida",
  "items": [
    {
      "sku": "BURG-002",
      "quantity": 2,
      "notes": "Sin cebolla"
    },
    {
      "sku": "BEB-001",
      "quantity": 1
    }
  ],
  "metadata": {
    "origin": "menu-web",
    "table": null
  }
}
```

## Respuestas

### 200 OK - procesado

```json
{
  "success": true,
  "orderId": "webhook-menu-20260419-0001",
  "saleId": "abc123",
  "erpSummary": {
    "itemsCount": 3,
    "uniqueItems": 2,
    "totalAmount": 42
  },
  "message": "Webhook procesado correctamente."
}
```

### 200 OK - pedido registrado con aviso de inventario

```json
{
  "success": true,
  "orderId": "webhook-menu-20260419-0001",
  "saleId": "abc123",
  "erpSummary": {
    "itemsCount": 3,
    "uniqueItems": 2,
    "totalAmount": 42
  },
  "message": "Pedido registrado, pero no se pudo sincronizar el inventario.",
  "stockSync": "failed"
}
```

### 200 OK - duplicado idempotente

```json
{
  "success": true,
  "duplicated": true,
  "orderId": "webhook-menu-20260419-0001",
  "message": "Webhook ya procesado previamente."
}
```

### 400 Bad Request - SKU no existe

```json
{
  "success": false,
  "error": "Hay SKUs no registrados en productos.",
  "missingSkus": ["SKU-INEXISTENTE"]
}
```

## Reglas para la web del menu

1. Cada item debe enviar SKU real del ERP.
2. No enviar precios desde la web; el ERP define precio final.
3. Enviar eventId unico por pedido para evitar duplicados.
4. Reintentar solo ante errores 5xx o timeout.
5. No reintentar en 4xx sin corregir el payload.
