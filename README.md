# Big Jack Manager

Sistema completo de gestión para restaurantes de comida rápida, construido con Next.js y Firebase.

## 🍔 Características Principales

### Panel de Control (Dashboard)
- Vista rápida de ventas del turno actual
- Métricas de rendimiento en tiempo real
- Ticket promedio y ventas del mes
- Alertas de inventario bajo

### Punto de Venta (POS)
- Interfaz táctil optimizada para tablets
- Gestión de pedidos rápida
- Múltiples métodos de pago (Efectivo, Yape, Plin, Tarjeta)
- Impresión de comprobantes/tickets
- Registro de clientes en venta

### Gestión de Productos
- Catálogo de productos con categorías
- Control de ingredientes por producto
- Imágenes y descripciones
- Precios de costo y venta

### Inventario
- Control de ingredientes
- Seguimiento de stock
- Alertas de stock mínimo
- Registro de movimientos de inventario
- Otros items (empaques, suministros)

### Clientes
- Base de datos de clientes
- Historial de compras
- Sistema de puntos de fidelidad
- Preferencias y notas

### Pedidos Online
- Recepción de pedidos por webhook
- Registro automático en ERP como venta normal
- Descuento automático de stock por SKU

### Flujo de Caja
- Registro de ingresos y gastos
- Resumen mensual
- Categorización de movimientos

### Insights y Análisis
- Gráficos de ventas por hora
- Productos más vendidos
- Tendencias de ventas
- Comparativas diarias

## 🛠️ Tecnologías

- **Frontend**: Next.js 15, React 18, TypeScript
- **Estilos**: Tailwind CSS, shadcn/ui
- **Base de datos**: Firebase Firestore
- **Autenticación**: Firebase Auth
- **Hosting**: Firebase App Hosting
- **Tema**: Soporte para modo claro/oscuro

## 🚀 Instalación

```bash
# Clonar el repositorio
git clone https://github.com/sjaquer/big-jack-rp.git

# Instalar dependencias
npm install

# Configurar variables de entorno (crear .env.local)
# Copiar desde .env.example y completar valores

# Ejecutar en desarrollo
npm run dev
```

Variables recomendadas:
- NEXT_PUBLIC_FIREBASE_PROJECT_ID
- NEXT_PUBLIC_FIREBASE_APP_ID
- NEXT_PUBLIC_FIREBASE_API_KEY
- NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
- NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
- NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID (opcional)
- UPLOAD_MAX_IMAGE_MB (default: 5)
- UPLOAD_IMAGE_SUBDIR (default: images)
- UPLOAD_ALLOWED_TYPES (CSV de MIME types)
- WEBHOOK_MENU_SECRET (opcional, para validar webhook con header x-webhook-secret)
- FIREBASE_SERVICE_ACCOUNT_KEY (opcional en local; JSON de service account en una sola línea)

## 🔌 Webhook de Pedidos

Se simplificó la integración para recibir pedidos desde la web del menú mediante un único webhook.

- Método: `POST`
- URL: `/api/webhooks/orders`
- URL producción: `https://bigjack-rp.vercel.app/api/webhooks/orders`
- Headers:
	- `Content-Type: application/json`
	- `x-webhook-secret: <WEBHOOK_MENU_SECRET>` (solo si configuraste secret)

Ejemplo de payload:

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
	]
}
```

Notas:
- `sku` es obligatorio por cada item. El ERP busca el producto por SKU en `products`.
- El precio final se toma siempre del catálogo ERP (`products.salePrice`).
- Se crea venta en `sales` + `sales/{saleId}/sale_items`.
- Se descuenta stock de `products` e `ingredients` automáticamente.
- Se registra movimiento en `inventory_movements`.
- Si envías `eventId`, el webhook es idempotente: no duplica pedidos repetidos.
- Los pedidos se guardan en `online_orders` y aparecen automáticamente en la cola de pedidos.

Estructura completa de integración:
- Ver `docs/webhook-pedidos.md`

## 📱 Diseño Responsivo

La aplicación está optimizada para:
- Desktop (1024px+)
- Tablet (768px - 1024px)
- Móvil (< 768px)

## 🔐 Autenticación

El sistema utiliza Firebase Auth para la autenticación de usuarios administradores.

## 📄 Licencia

Proyecto privado - Todos los derechos reservados.
