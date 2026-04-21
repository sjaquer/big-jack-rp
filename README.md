# Big Jack RP

ERP operativo para restaurante fast food, construido con Next.js 15 + Firebase.

Este proyecto centraliza ventas POS, pedidos online, inventario, clientes, caja e insights en una sola plataforma.

## 1. Estado Actual Del Proyecto

Implementado y activo:
- POS completo con registro de venta y comprobante.
- Cola de pedidos unificada (POS + web) en `incoming-orders`.
- Transición de estados con temporizador automático en pedidos.
- Integración webhook para menú digital por SKU.
- Flujo ERP normal aplicado a pedidos webhook (venta + stock + pedido).
- Dashboard compacto (solo KPIs críticos).
- Informe IA movido a Insights (pestaña IA).

## 2. Stack Tecnológico

- Frontend: Next.js 15, React 18, TypeScript
- UI: Tailwind CSS, shadcn/ui, Radix
- Base de datos: Firestore
- Auth: Firebase Auth
- Admin backend: firebase-admin
- IA: Genkit + Google GenAI
- Charts: Recharts

## 3. Estructura Funcional

### 3.1 App Router

- `src/app/(main)/dashboard/page.tsx`: panel ejecutivo compacto
- `src/app/(main)/pos/page.tsx`: punto de venta
- `src/app/(main)/incoming-orders/page.tsx`: cola operativa de pedidos
- `src/app/(main)/insights/page.tsx`: analítica avanzada + IA
- `src/app/(main)/inventory/*`: inventario
- `src/app/(main)/customers/*`: clientes
- `src/app/(main)/cash-flow/*`: flujo de caja

### 3.2 APIs

- `src/app/api/webhooks/orders/route.ts`
  - Recibe pedidos del menú digital
  - Solo valida y delega procesamiento al servicio interno
- `src/app/api/ai/dashboard-report/route.ts`
  - Genera reporte IA desde métricas ERP

### 3.3 Servicios Backend Internos

- `src/lib/orders/process-incoming-order.ts`
  - Servicio central para procesar pedidos entrantes por SKU
  - Resuelve productos por SKU
  - Registra venta (`sales` + `sale_items`)
  - Descuenta stock según receta en `ingredients` e `inventory_items`
  - Crea orden en `online_orders`
  - Maneja idempotencia por `eventId`

## 4. Flujo Operativo De Pedidos

## 4.1 POS (local)

1. Usuario cobra en POS.
2. Se registra `sales` y `sale_items`.
3. Se descuenta stock en background.
4. Se crea pedido en `online_orders` con `source: pos`.
5. El pedido aparece en `incoming-orders`.

## 4.2 Webhook (menú digital)

1. Menú digital envía payload con SKUs.
2. Webhook valida `WEBHOOK_MENU_SECRET` (si configurado).
3. Webhook valida estructura del payload.
4. Webhook delega a `processIncomingOrder`.
5. ERP aplica flujo normal completo (venta + stock + cola pedidos).

Importante:
- El contrato de entrada del webhook se mantiene estable para no exigir cambios al menú digital.
- El webhook no contiene lógica de negocio pesada; la lógica vive en servicio ERP interno.

## 5. Modelo De Datos (Colecciones Principales)

- `products`
  - Catálogo, SKU, precio venta, receta (ingredientes/insumos)
- `ingredients`
  - Materia prima con unidad y stock
- `inventory_items`
  - Insumos no-receta clásica (empaques, etc.)
- `sales`
  - Cabecera de venta
- `sales/{saleId}/sale_items`
  - Detalle por producto
- `online_orders`
  - Cola de pedidos para operación cocina/despacho
- `customers`
  - Maestro de clientes
- `cash_movements`
  - Flujo caja

## 6. Variables De Entorno

Mínimas para cliente Firebase:
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`

Servidor/Admin:
- `FIREBASE_SERVICE_ACCOUNT_KEY` (JSON en una línea, recomendado)
- `FIREBASE_PROJECT_ID` (fallback)

Webhook:
- `WEBHOOK_MENU_SECRET` (secreto compartido con menú digital)

Uploads:
- `UPLOAD_MAX_IMAGE_MB`
- `UPLOAD_IMAGE_SUBDIR`
- `UPLOAD_ALLOWED_TYPES`

## 7. Contrato Webhook (estable)

Endpoint:
- `POST /api/webhooks/orders`

Headers:
- `Content-Type: application/json`
- `x-webhook-secret: <WEBHOOK_MENU_SECRET>` (si configurado)

Payload ejemplo:

```json
{
  "eventId": "menu-20260419-0001",
  "orderDate": "2026-04-06T14:25:00.000Z",
  "source": "menu-web",
  "customer": {
    "name": "Juan Perez",
    "phone": "+51987654321"
  },
  "paymentMethod": "yape",
  "notes": "Sin cebolla",
  "items": [
    { "sku": "BURG-002", "quantity": 2 },
    { "sku": "BEB-001", "quantity": 1 }
  ],
  "metadata": {
    "channel": "menu-digital"
  }
}
```

Respuestas:
- `200`: procesado OK o duplicado controlado por `eventId`
- `400`: payload inválido o SKU inexistente
- `401`: secreto inválido
- `500`: error interno

## 8. Scripts

- `npm run dev`: entorno local en puerto 9002
- `npm run build`: build producción
- `npm run start`: levantar build en puerto 3000
- `npm run typecheck`: chequeo TypeScript
- `npm run lint`: lint (pendiente migración a ESLint CLI por deprecación de `next lint`)
- `npm run genkit:dev`: servidor local de flujos IA

## 9. Módulos De IA

- Flow: `src/ai/flows/generate-dashboard-report.ts`
  - Insumo: métricas operativas
  - Salida: resumen ejecutivo + hallazgos + riesgos + plan de acción
- UI consumo:
  - `src/components/dashboard/ai-report-card.tsx`
  - Renderizado actual en `src/app/(main)/insights/page.tsx` (tab IA)

## 10. Limpieza Técnica Realizada

Se removió código obsoleto/no referenciado:
- `src/components/dashboard/sales-list.tsx`
- `src/components/dashboard/stock-overview.tsx`
- `src/components/pos/cash-register.tsx`
- `src/app/api/online-orders/` (carpeta vacía)
- Bloques comentados legacy de caja chica en `src/app/(main)/pos/page.tsx`

Además se corrigieron errores de tipado:
- `src/firebase/index.ts`
- `src/lib/product-stock.ts`

## 11. Próximos Pasos Recomendados

1. Migrar `next lint` al ESLint CLI oficial (`next-lint-to-eslint-cli`).
2. Agregar pruebas de integración para webhook (casos: OK, SKU faltante, duplicado por `eventId`, secreto inválido).
3. Documentar Firestore rules por módulo en `docs/` (si se va a auditar seguridad por entorno).
4. Incorporar changelog por versión para operación.

## 12. Notas De Seguridad

- No commitear secrets reales en repositorio.
- Rotar credenciales si se expusieron accidentalmente.
- Mantener `WEBHOOK_MENU_SECRET` distinto por ambiente (dev/staging/prod).
