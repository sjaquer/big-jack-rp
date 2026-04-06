# Integracion API de Pedidos Online

Este documento explica como integrar una web externa de pedidos con el endpoint del ERP Big Jack.

## 1) Endpoint

- Metodo: POST
- URL local: http://localhost:9002/api/online-orders
- URL produccion: https://<tu-dominio>/api/online-orders
- Content-Type: application/json
- Autenticacion:
  - Header recomendado: x-online-orders-key: <ONLINE_ORDERS_API_KEY>
  - Alternativa: Authorization: Bearer <ONLINE_ORDERS_API_KEY>

## 2) Reglas ERP aplicadas al recibir pedido

Cuando llega un pedido, el backend realiza automaticamente:

1. Validacion de payload.
2. Resolucion de cada item por SKU contra la coleccion products.
3. Calculo de precios usando catalogo (products.salePrice) si useCatalogPrice=true.
4. Creacion de venta en sales.
5. Creacion de lineas en sales/{saleId}/sale_items.
6. Descuento de stock de productos (products.quantity).
7. Descuento de ingredientes asociados (ingredients.quantity) segun receta del producto.
8. Registro de movimiento en inventory_movements.
9. Registro del pedido en online_orders (visible en pagina de pedidos).

## 3) Contrato de request

### Campos principales

- externalOrderId: string opcional. Si se envia, el endpoint es idempotente.
- orderDate: ISO datetime o epoch milliseconds (opcional).
- customerId: string|null (opcional).
- customerName: string (requerido logico, default: "Cliente online").
- customerPhone: string (opcional).
- paymentMethod: string (opcional, ejemplo: yape, plin, cash, card).
- notes: string (opcional).
- deliveryAddress: string (opcional).
- source: pos | delivery | pedidosya | web | otros (default: web).
- status: pending | processing | completed (default: pending).
- totalAmount: number (opcional, para comparacion).
- useCatalogPrice: boolean (default: true).
- acceptPriceDiff: boolean (default: true).
- enforceStock: boolean (default: false). Si es true, valida stock antes de registrar.
- items: array (requerido, min 1).

### Item

- sku: string (obligatorio).
- quantity: number > 0 (obligatorio).
- productName: string (opcional).
- unitPrice: number (opcional, usado solo si useCatalogPrice=false).
- lineNotes: string (opcional).
- modifiers: array opcional, cada modifier:
  - code?: string
  - name: string
  - quantity: number > 0 (default 1)
  - unitPrice: number >= 0 (default 0)

## 4) Ejemplo de request (recomendado)

```json
{
  "externalOrderId": "onlineweb-20260406-000123",
  "orderDate": "2026-04-06T19:15:00.000Z",
  "customerName": "Juan Perez",
  "customerPhone": "+51987654321",
  "paymentMethod": "yape",
  "deliveryAddress": "Av. Principal 123",
  "source": "web",
  "status": "pending",
  "useCatalogPrice": true,
  "acceptPriceDiff": true,
  "enforceStock": false,
  "items": [
    {
      "sku": "BURG-002",
      "quantity": 2,
      "lineNotes": "Sin cebolla"
    },
    {
      "sku": "BEB-001",
      "quantity": 1
    }
  ],
  "metadata": {
    "origin": "menu-online-v2",
    "channel": "web"
  }
}
```

## 5) Ejemplo fetch (JavaScript)

```js
const payload = {
  externalOrderId: "onlineweb-20260406-000123",
  customerName: "Juan Perez",
  customerPhone: "+51987654321",
  paymentMethod: "yape",
  source: "web",
  useCatalogPrice: true,
  acceptPriceDiff: true,
  items: [
    { sku: "BURG-002", quantity: 2 },
    { sku: "BEB-001", quantity: 1 }
  ]
};

const response = await fetch("https://<tu-dominio>/api/online-orders", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-online-orders-key": process.env.ONLINE_ORDERS_API_KEY
  },
  body: JSON.stringify(payload)
});

const data = await response.json();
console.log(data);
```

## 6) Respuestas esperadas

### 200 OK - Creado

```json
{
  "success": true,
  "orderId": "ext-onlineweb-20260406-000123",
  "saleId": "a1b2c3d4",
  "erpSummary": {
    "itemsCount": 3,
    "uniqueItems": 2,
    "totalAmount": 42,
    "requestedTotal": 42,
    "diff": 0
  },
  "message": "Pedido recibido correctamente."
}
```

### 200 OK - Duplicado idempotente

```json
{
  "success": true,
  "duplicated": true,
  "orderId": "ext-onlineweb-20260406-000123",
  "message": "Pedido ya registrado previamente."
}
```

### 400 Bad Request - SKU faltante en catalogo

```json
{
  "success": false,
  "error": "Hay SKUs no registrados en productos.",
  "missingSkus": ["SKU-INEXISTENTE"]
}
```

### 409 Conflict - Diferencia de precio no aceptada

```json
{
  "success": false,
  "error": "El total enviado no coincide con el calculo del ERP.",
  "requestedTotal": 40,
  "catalogTotal": 42,
  "diff": -2
}
```

### 409 Conflict - Stock insuficiente (solo si enforceStock=true)

```json
{
  "success": false,
  "error": "Stock insuficiente para procesar el pedido en modo estricto.",
  "insufficientProducts": [
    { "sku": "BURG-002", "required": 5, "available": 2 }
  ],
  "insufficientIngredients": [
    { "ingredientId": "abc123", "name": "Pan Brioche", "required": 5, "available": 3 }
  ]
}
```

## 7) Recomendaciones para el programador de la web externa

1. Sincronizar SKUs del menu con los SKUs reales del ERP.
2. Enviar siempre externalOrderId unico para evitar duplicados por reintentos.
3. Mantener useCatalogPrice=true para que el ERP gobierne precios finales.
4. Reintentar solo en errores 5xx y timeout de red.
5. No reintentar en 4xx sin corregir payload.
6. Registrar orderId y saleId devueltos para trazabilidad.

## 8) Checklist de puesta en marcha

1. Configurar ONLINE_ORDERS_API_KEY en servidor ERP.
2. Configurar la misma key en la web externa.
3. Validar que todos los productos del menu tengan SKU en ERP.
4. Probar con 1 pedido de test y confirmar:
   - aparece en cola de pedidos,
   - crea venta,
   - descuenta inventario.

## 9) Estructura recomendada de productos en la web de menu

Para evitar errores, la web de menu debe tratar al SKU como identificador principal de negocio.

### Reglas obligatorias

1. Cada producto visible en el menu debe tener un SKU valido y unico.
2. El carrito debe guardar SKU, no solo nombre o id local.
3. Si hay variantes (tamano, combo, etc.), cada variante debe tener SKU propio.
4. Si un item no tiene SKU, no debe permitirse agregar al carrito.

### Modelo de producto sugerido (frontend/menu)

```ts
export type MenuProduct = {
  id: string; // id interno de la web externa
  sku: string; // clave de integracion con ERP (obligatorio)
  name: string;
  description?: string;
  category: string;
  imageUrl?: string;
  basePrice: number; // referencial en frontend
  enabled: boolean;
  tags?: string[];
  variants?: Array<{
    id: string;
    name: string;
    sku: string; // SKU por variante
    price: number;
  }>;
  modifiers?: Array<{
    code: string;
    name: string;
    maxQty?: number;
    price: number;
  }>;
};
```

### Modelo de item en carrito (frontend/menu)

```ts
export type CartItem = {
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
  modifiers?: Array<{
    code?: string;
    name: string;
    quantity: number;
    unitPrice: number;
  }>;
};
```

## 10) Estructura tecnica recomendada del codigo (web externa)

Estructura sugerida para mantener integracion ordenada y mantenible:

```text
src/
  domain/
    menu/
      types.ts
      validators.ts
      mappers.ts
    checkout/
      types.ts
      build-order-payload.ts
  services/
    erp/
      erp-client.ts
      erp-types.ts
      erp-errors.ts
      erp-retry.ts
  features/
    cart/
      cart-store.ts
      cart-selectors.ts
    checkout/
      submit-order.ts
      order-status.ts
  config/
    env.ts
```

Objetivo por capa:

1. domain: reglas puras del negocio (sin fetch).
2. services: cliente HTTP al ERP, manejo de errores y retry.
3. features: casos de uso de UI (carrito, checkout).
4. config: validacion de variables de entorno.

## 11) Flujo tecnico recomendado de checkout

```text
UI -> CartStore -> buildOrderPayload() -> erpClient.createOnlineOrder() -> manejar respuesta -> UI
```

Pasos:

1. Validar carrito local (SKU, qty > 0).
2. Construir externalOrderId unico.
3. Construir payload final para ERP.
4. Enviar POST con timeout controlado.
5. Si 200 success: guardar orderId/saleId y mostrar confirmacion.
6. Si 409/400: mostrar mensaje de correccion (sin reintento ciego).
7. Si 5xx o timeout: reintento con misma externalOrderId.

## 12) Ejemplo tecnico de implementacion (TypeScript)

### Validacion y armado de payload

```ts
import { z } from "zod";

const cartItemSchema = z.object({
  sku: z.string().min(1),
  quantity: z.number().positive(),
  name: z.string().min(1),
  unitPrice: z.number().nonnegative(),
  notes: z.string().optional(),
});

const checkoutSchema = z.object({
  customerName: z.string().min(2),
  customerPhone: z.string().optional(),
  paymentMethod: z.string().min(1),
  items: z.array(cartItemSchema).min(1),
});

export function buildErpPayload(input: unknown) {
  const data = checkoutSchema.parse(input);

  return {
    externalOrderId: crypto.randomUUID(),
    customerName: data.customerName,
    customerPhone: data.customerPhone,
    paymentMethod: data.paymentMethod,
    source: "web",
    useCatalogPrice: true,
    acceptPriceDiff: true,
    enforceStock: false,
    items: data.items.map((item) => ({
      sku: item.sku,
      quantity: item.quantity,
      productName: item.name,
      unitPrice: item.unitPrice,
      lineNotes: item.notes,
    })),
  };
}
```

### Cliente HTTP al ERP

```ts
type CreateOrderResponse = {
  success: boolean;
  duplicated?: boolean;
  orderId?: string;
  saleId?: string;
  message?: string;
  error?: string;
};

export async function createOnlineOrder(payload: object): Promise<CreateOrderResponse> {
  const res = await fetch(`${process.env.ERP_BASE_URL}/api/online-orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-online-orders-key": process.env.ERP_ONLINE_ORDERS_KEY as string,
    },
    body: JSON.stringify(payload),
  });

  const json = (await res.json()) as CreateOrderResponse;

  if (!res.ok) {
    throw new Error(json.error || "No se pudo registrar el pedido en ERP");
  }

  return json;
}
```

## 13) Matriz de mapeo menu web -> ERP

| Web menu | ERP endpoint | Obligatorio | Observacion |
|---|---|---|---|
| customer.name | customerName | Si | Nombre o razon social |
| customer.phone | customerPhone | No | Recomendado para delivery |
| payment.method | paymentMethod | No | yape, plin, cash, card, etc |
| cart.items[].sku | items[].sku | Si | Clave principal de integracion |
| cart.items[].qty | items[].quantity | Si | Debe ser > 0 |
| cart.items[].name | items[].productName | No | Referencial |
| cart.items[].price | items[].unitPrice | No | Referencial si useCatalogPrice=true |
| cart.items[].notes | items[].lineNotes | No | Instrucciones por item |
| order.total | totalAmount | No | Solo comparacion/auditoria |
| order.id | externalOrderId | Muy recomendado | Idempotencia |

## 14) Buenas practicas de sincronizacion de catalogo

1. Establecer proceso de publicacion de menu solo para productos con SKU asignado.
2. Validar diariamente que no existan SKUs duplicados en la web externa.
3. Si el ERP cambia precios frecuentemente, usar useCatalogPrice=true.
4. Evitar cache largo para catalogo de SKUs (recomendado max 5 minutos).
5. Loguear cada envio con externalOrderId, orderId y saleId.
