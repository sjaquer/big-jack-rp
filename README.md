# Big Jack RP - ERP Operativo

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat&logo=next.js)](https://nextjs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-11-orange?style=flat&logo=firebase)](https://firebase.google.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)

ERP operativo moderno para restaurantes fast food, optimizado para velocidad y facilidad de uso.

---

## 🇪🇸 Resumen del Proyecto

**Big Jack RP** es una solución integral que centraliza ventas POS, pedidos online, gestión de inventario por recetas, base de datos de clientes e insights generados por IA en una sola plataforma.

### Estado Actual
- **POS Completo**: Registro de ventas rápido con gestión de efectivo.
- **Cola de Pedidos Unificada**: Gestión en tiempo real de pedidos locales y online.
- **Inventario Inteligente**: Descuento automático de stock basado en recetas (ingredientes).
- **Integración Webhook**: Listo para recibir pedidos de menús digitales externos.
- **Insights con IA**: Reportes ejecutivos generados automáticamente mediante Google GenAI.

---

## 🇺🇸 Project Overview

**Big Jack RP** is a modern ERP solution designed for fast-food restaurants. It centralizes POS sales, online orders, recipe-based inventory management, customer tracking, and AI-driven business insights into a single unified platform.

### Key Features
- **Full POS System**: Fast sales registration and cash flow management.
- **Unified Order Queue**: Real-time management of both local and online orders.
- **Smart Inventory**: Automatic stock deduction based on product recipes and ingredients.
- **Webhook Integration**: Ready to receive orders from external digital menus via a secure API.
- **AI Insights**: Executive reports automatically generated using Google GenAI (Genkit).

---

## 🛠 Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database & Auth**: Firebase (Firestore & Auth)
- **AI Engine**: Google GenAI + Genkit
- **Styling**: Tailwind CSS + shadcn/ui
- **Charts**: Recharts

---

## 🚀 Quick Start / Inicio Rápido

### Prerequisites
- Node.js 18+
- A Firebase Project

### Setup / Configuración

1. **Clone the repository / Clonar el repositorio**:
   ```bash
   git clone https://github.com/youruser/big-jack-rp.git
   cd big-jack-rp
   ```

2. **Install dependencies / Instalar dependencias**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables / Configurar Variables**:
   Copy `.env.example` to `.env` and fill in your Firebase credentials.
   ```bash
   cp .env.example .env
   ```

4. **Run Development Server / Ejecutar en Desarrollo**:
   ```bash
   npm run dev
   ```
   The app will be available at [http://localhost:9002](http://localhost:9002).

---

## 🔒 Security / Seguridad

- **Environment Variables**: Never commit your `.env` file. A template is provided in `.env.example`.
- **Firebase Rules**: Ensure you deploy the rules provided in `firestore.rules` to your Firebase project.
- **Webhook Secret**: Always use a strong `WEBHOOK_MENU_SECRET` in production to authorize incoming orders.

---

## 📁 Project Structure / Estructura

- `src/app`: Next.js pages and API routes.
- `src/components`: Reusable UI components.
- `src/firebase`: Firebase configuration and custom hooks.
- `src/lib`: Core business logic (inventory, order processing).
- `src/ai`: Genkit AI flows and configurations.

---

## 📖 Documentación Técnica / Technical Docs

### 1. Modelo de Datos / Data Model (Firestore)
- `products`: Catálogo, SKU, precio, receta.
- `ingredients`: Materia prima y stock.
- `sales`: Cabecera de ventas.
- `online_orders`: Cola operativa de pedidos.
- `customers`: Maestro de clientes.
- `cash_movements`: Flujo de caja.

### 2. Contrato Webhook / Webhook Contract
**Endpoint**: `POST /api/webhooks/orders`

**Headers**:
- `x-webhook-secret`: `<WEBHOOK_MENU_SECRET>`

**Payload**:
```json
{
  "eventId": "unique-event-id",
  "orderDate": "ISO-8601",
  "source": "menu-web",
  "customer": { "name": "...", "phone": "..." },
  "items": [{ "sku": "...", "quantity": 1 }]
}
```

### 3. Scripts
- `npm run dev`: Inicia en puerto 9002.
- `npm run build`: Build de producción.
- `npm run lint`: Chequeo de calidad.
- `npm run typecheck`: Validación de tipos TS.

---

## 📄 License / Licencia

Este proyecto está bajo la licencia MIT. Consulta el archivo [LICENSE](LICENSE) para más detalles.

---

*Desarrollado con ❤️ para la eficiencia operativa.*
