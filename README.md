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
- Impresión de boletas/tickets
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
- Recepción de pedidos externos
- Estados de pedido (pendiente, procesando, completado)
- Integración con delivery

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
# Ver firebase/config.ts para las variables necesarias

# Ejecutar en desarrollo
npm run dev
```

## 📱 Diseño Responsivo

La aplicación está optimizada para:
- Desktop (1024px+)
- Tablet (768px - 1024px)
- Móvil (< 768px)

## 🔐 Autenticación

El sistema utiliza Firebase Auth para la autenticación de usuarios administradores.

## 📄 Licencia

Proyecto privado - Todos los derechos reservados.
