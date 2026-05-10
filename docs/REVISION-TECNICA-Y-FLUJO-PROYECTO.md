# Revision Tecnica y Flujo del Proyecto

Fecha: 2026-04-21
Repositorio: big-jack-rp
Branch evaluada: sunat_api

## 1. Objetivo del documento

Este documento consolida:
- Revision tecnica del estado actual del proyecto (deuda tecnica y malas practicas)
- Flujo funcional del sistema extremo a extremo
- Mapa de funciones y responsabilidades por modulo

## 2. Arquitectura general

Stack principal:
- Next.js 15 (App Router)
- React 18 + TypeScript
- Firebase Auth + Firestore
- Firebase Admin SDK para rutas server
- Genkit (reportes IA)

Capas:
- Capa UI: src/app/(main) + src/components
- Capa de acceso Firestore cliente: src/firebase
- Capa backend API: src/app/api
- Capa dominio: src/lib (orders, stock, tipos, utilidades)
- Capa IA: src/ai/flows

## 3. Revision tecnica (priorizada)

### 3.1 Hallazgos criticos

1) Escrituras no bloqueantes en cliente con riesgo de falla silenciosa
- Evidencia:
  - src/firebase/non-blocking-updates.tsx (lineas 19, 39, 59, 78)
  - src/firebase/errors.ts (linea 7)
- Riesgo:
  - Operaciones importantes pueden fallar y continuar flujo UI sin confirmacion fuerte
  - Inconsistencias en datos de ventas/pedidos/inventario

2) Endpoints API sin autenticacion de usuario final
- Evidencia:
  - src/app/api/ai/dashboard-report/route.ts (linea 54)
  - src/app/api/upload-image/route.ts (linea 50)
- Riesgo:
  - Consumo no controlado (IA)
  - Subida de archivos sin identidad de usuario

3) Reglas de Firestore permisivas para usuario autenticado
- Evidencia:
  - firestore.rules (lineas 10, 14, 18, 22, 26, 30, 34, 37, 43, 47, 51, 55, 59)
- Riesgo:
  - Cualquier usuario autenticado puede leer/escribir colecciones operativas sin restriccion por rol/propietario

4) Transaccion de POS separada de tareas de stock/pedido
- Evidencia:
  - src/app/(main)/pos/page.tsx (linea 405 runTransaction)
  - src/app/(main)/pos/page.tsx (linea 467 updateStocksInBackground)
  - src/app/(main)/pos/page.tsx (linea 470 createKitchenOrderInBackground)
- Riesgo:
  - Si falla tarea background, la venta queda registrada pero stock/pedido puede no reflejarse igual

### 3.2 Hallazgos importantes

5) Query global de sale_items en Insights
- Evidencia:
  - src/app/(main)/insights/page.tsx (linea 94 collectionGroup sale_items)
- Riesgo:
  - Costos de lectura altos en Firestore
  - Escalabilidad limitada sin filtros/paginacion estricta

6) Deuda de tipos any en modulos criticos
- Evidencia:
  - src/components/pos/pos-components.tsx (lineas 167, 175, 176, 381, 386, 394, 423)
  - src/components/customers/customer-form.tsx (lineas 78, 96)
  - src/firebase/non-blocking-updates.tsx (lineas 19, 39, 59)
  - src/firebase/errors.ts (lineas 7, 33)
  - src/firebase/firestore/use-collection.tsx (linea 57 T = any)
  - src/firebase/firestore/use-doc.tsx (linea 43 T = any)
- Riesgo:
  - Menor seguridad de tipos
  - Mayor posibilidad de errores en runtime

7) Tooling de lint en transicion
- Evidencia:
  - package.json (linea 11: lint usa next lint)
  - eslint.config.mjs (config minima)
- Riesgo:
  - Menor cobertura de reglas de calidad
  - Dificulta detectar malas practicas temprano

## 4. Flujo de trabajo del sistema

## 4.1 Flujo POS (venta local)

1. Usuario selecciona productos en POS
- UI: src/app/(main)/pos/page.tsx
- Componentes: src/components/pos/pos-components.tsx

2. Confirmacion de pago
- UI modal: src/components/pos/payment-modal.tsx

3. Registro de venta
- runTransaction registra:
  - sales
  - sales/{saleId}/sale_items
- Archivo: src/app/(main)/pos/page.tsx

4. Post proceso
- Descuento de stock en background
- Creacion de pedido en online_orders con source pos

5. Visualizacion operativa
- Cola de pedidos: src/app/(main)/incoming-orders/page.tsx

## 4.2 Flujo webhook (menu digital)

1. Menu digital envia pedido con SKUs
- Endpoint: src/app/api/webhooks/orders/route.ts
- Secret: WEBHOOK_MENU_SECRET

2. Validacion de payload
- zod schema en route

3. Delegacion de logica ERP
- Servicio: src/lib/orders/process-incoming-order.ts
- Responsabilidades:
  - Resolver SKU contra products
  - Crear sales y sale_items
  - Descontar stock segun receta y unidad
  - Crear online_orders para cola operativa
  - Idempotencia por eventId

4. Seguimiento en operacion
- incoming-orders muestra pedidos web y pos
- temporizador de estado operativo en cola

## 4.3 Flujo de Insights e IA

1. Insights consolida ventas y items
- src/app/(main)/insights/page.tsx

2. Reporte IA
- UI: src/components/dashboard/ai-report-card.tsx
- API: src/app/api/ai/dashboard-report/route.ts
- Flow: src/ai/flows/generate-dashboard-report.ts

3. Objetivo
- Analisis ejecutivo para toma de decisiones

## 5. Mapa de funciones clave

### 5.1 Backend y dominio

- processIncomingOrder
  - Archivo: src/lib/orders/process-incoming-order.ts
  - Funcion: procesa pedido externo end-to-end con logica ERP

- calculateProductProducibleQuantity
  - Archivo: src/lib/product-stock.ts
  - Funcion: calcula capacidad de produccion segun stock real y receta

- convertInventoryQuantity
  - Archivo: src/lib/unit-conversion.ts
  - Funcion: convierte unidades para consistencia de descuentos

### 5.2 Firebase cliente

- useCollection
  - Archivo: src/firebase/firestore/use-collection.tsx
  - Funcion: suscripcion reactiva a colecciones

- useDoc
  - Archivo: src/firebase/firestore/use-doc.tsx
  - Funcion: suscripcion reactiva a documento individual

- non-blocking updates
  - Archivo: src/firebase/non-blocking-updates.tsx
  - Funcion: wrappers de escritura asincrona no bloqueante

### 5.3 API routes

- POST /api/webhooks/orders
  - Archivo: src/app/api/webhooks/orders/route.ts
  - Funcion: entrada webhook + delegacion

- POST /api/ai/dashboard-report
  - Archivo: src/app/api/ai/dashboard-report/route.ts
  - Funcion: generar reporte IA a partir de metricas

- POST /api/upload-image
  - Archivo: src/app/api/upload-image/route.ts
  - Funcion: subida de imagen a public

## 6. Estado de limpieza y orden

Limpieza ya realizada en esta branch:
- Eliminados archivos no usados:
  - src/components/dashboard/sales-list.tsx
  - src/components/dashboard/stock-overview.tsx
  - src/components/pos/cash-register.tsx
- Eliminada carpeta vacia:
  - src/app/api/online-orders
- README actualizado con estado, arquitectura y contrato webhook

## 7. Plan sugerido de mitigacion de deuda tecnica

Fase 1 (prioridad alta)
- Endurecer autenticacion/authorization en API routes sensibles
- Endurecer firestore.rules por rol/ownership
- Revisar estrategia de non-blocking writes para operaciones criticas

Fase 2 (prioridad media)
- Reducir any en modulos operativos
- Optimizar queries de insights (filtros, limites, paginacion)
- Formalizar convenciones de dominio (price/cost/profit)

Fase 3 (calidad continua)
- Migrar lint a ESLint CLI moderna y ampliar reglas
- Agregar pruebas de integracion para webhook y POS
- Documentar ADRs de dominio y decisiones de arquitectura

## 8. Criterios de exito para siguientes iteraciones

- Cero rutas API criticas sin control de acceso
- Reglas Firestore con permisos por rol y validacion de campo
- Menor uso de any en modulo POS y Firebase wrappers
- Querys de analitica con limites y costo controlado
- Suite de pruebas para flujo de ventas/pedidos/stock
