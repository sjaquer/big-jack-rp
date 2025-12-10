# 🚀 PROPUESTA DE OPTIMIZACIÓN - BIG JACK RP

## Resumen de Problemas Detectados

| Problema | Impacto | Prioridad |
|----------|---------|-----------|
| Transacción muy grande | Alto latencia (2-5s) | 🔴 Crítico |
| SUNAT bloqueante | Usuario espera 1-3s extra | 🔴 Crítico |
| Duplicación sales/online_orders | Inconsistencia de datos | 🟡 Medio |
| Sin índices Firestore | Queries lentas | 🟡 Medio |
| Sin validación de stock | Stock negativo posible | 🟡 Medio |
| Reglas muy permisivas | Riesgo de seguridad | 🔴 Crítico |

---

## 📋 FASE 1: Optimización del Flujo de Venta

### 1.1 Separar la Transacción en Pasos

**ANTES (actual):**
```
[Transacción Grande: ~5 segundos]
├── Leer series
├── Leer productos
├── Leer ingredientes
├── Escribir todo
└── Usuario espera...
```

**DESPUÉS (propuesto):**
```
[Transacción Mínima: ~500ms]
├── Leer/Actualizar series (1 doc)
├── Escribir venta (1 doc)
└── Escribir sale_items (N docs)

[Background Job - No bloqueante]
├── Actualizar stock productos
├── Actualizar stock ingredientes
└── Enviar a SUNAT
└── Crear orden de cocina
```

### 1.2 Código Optimizado

```typescript
// POS optimizado - versión simplificada
const handleSuccessfulPayment = async ({ paymentMethod, customer, issueBoleta }) => {
  const startTime = performance.now();
  
  // PASO 1: Transacción mínima (solo lo crítico)
  const { saleId, serie, correlativo } = await runTransaction(firestore, async (tx) => {
    // Solo leer/actualizar series
    const seriesRef = doc(firestore, 'sunat_series', 'boletas');
    const seriesDoc = await tx.get(seriesRef);
    const nextCorrelativo = (seriesDoc.data()?.correlativo ?? 0) + 1;
    
    tx.set(seriesRef, {
      serie: seriesDoc.data()?.serie || 'B001',
      correlativo: nextCorrelativo,
      updatedAt: serverTimestamp()
    });
    
    // Crear venta
    const saleRef = doc(collection(firestore, 'sales'));
    tx.set(saleRef, {
      saleDate: serverTimestamp(),
      totalAmount: total,
      paymentMethod,
      customerName: customer.name,
      // ... campos mínimos
      sunatStatus: issueBoleta ? 'pending' : 'skipped',
      boletaSerie: seriesDoc.data()?.serie || 'B001',
      boletaCorrelativo: nextCorrelativo,
    });
    
    // Crear sale_items (sin leer productos)
    for (const item of order) {
      const itemRef = doc(collection(firestore, `sales/${saleRef.id}/sale_items`));
      tx.set(itemRef, {
        saleId: saleRef.id,
        productId: item.id,
        productName: item.name, // Ya lo tenemos en memoria
        quantity: item.quantity,
        unitPrice: item.salePrice,
      });
    }
    
    return { 
      saleId: saleRef.id, 
      serie: seriesDoc.data()?.serie || 'B001', 
      correlativo: nextCorrelativo 
    };
  });
  
  console.log(`[POS] Venta creada en ${performance.now() - startTime}ms`);
  
  // PASO 2: Mostrar éxito al usuario INMEDIATAMENTE
  toast({ title: "✅ Venta registrada", description: "Procesando detalles..." });
  handleResetOrder();
  
  // PASO 3: Background tasks (no bloqueantes)
  // Actualizar stocks en background
  updateStocksInBackground(order);
  
  // Enviar a SUNAT en background
  if (issueBoleta) {
    sendToSunatInBackground(saleId, serie, correlativo, customer, order, total, paymentMethod);
  }
  
  // Crear orden de cocina
  createKitchenOrderNonBlocking(order, customer, paymentMethod, total);
};

// Funciones de background
const updateStocksInBackground = (order) => {
  // Usar batched writes para eficiencia
  const batch = writeBatch(firestore);
  
  order.forEach(item => {
    const productRef = doc(firestore, 'products', item.id);
    batch.update(productRef, { 
      quantity: increment(-item.quantity) 
    });
  });
  
  batch.commit().catch(err => {
    console.error('[Stock] Error actualizando:', err);
    // Crear alerta para revisión manual
  });
};

const sendToSunatInBackground = async (saleId, serie, correlativo, customer, items, total, paymentMethod) => {
  try {
    const response = await fetch('/api/sunat/boletas', {
      method: 'POST',
      body: JSON.stringify({ saleId, serie, correlativo, customer, items, total, paymentMethod })
    });
    
    const result = await response.json();
    
    // Actualizar estado en Firestore
    await updateDoc(doc(firestore, 'sales', saleId), {
      sunatStatus: result.status === 'accepted' ? 'accepted' : 'rejected',
      sunatNote: result.message
    });
    
    // Imprimir si fue exitoso
    if (result.status === 'accepted') {
      triggerThermalPrint({ serie, correlativo, ... });
    }
  } catch (error) {
    console.error('[SUNAT] Error:', error);
  }
};
```

---

## 📋 FASE 2: Estructura de Base de Datos Mejorada

### 2.1 Eliminar Duplicación

**Problema:** `sales` y `online_orders` tienen datos duplicados.

**Solución:** Usar SOLO `orders` con un campo `source`:

```typescript
// Nueva estructura unificada
interface Order {
  id: string;
  orderDate: Timestamp;
  totalAmount: number;
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  source: 'pos' | 'online' | 'pedidosya' | 'delivery';
  
  // Cliente
  customerId?: string;
  customerName: string;
  customerDocumentType?: '0' | '1' | '6';
  customerDocumentNumber?: string;
  
  // Pago
  paymentMethod: string;
  isPaid: boolean;
  
  // SUNAT
  sunatStatus?: 'pending' | 'sent' | 'accepted' | 'rejected' | 'skipped';
  boletaSerie?: string;
  boletaCorrelativo?: number;
  
  // Items (denormalizados para consultas rápidas)
  itemsSummary: Array<{
    productId: string;
    name: string;
    quantity: number;
    unitPrice: number;
  }>;
  itemsCount: number;
  
  // Metadata
  cashierId?: string;
  createdAt: Timestamp;
  completedAt?: Timestamp;
}

// Subcolección para detalles
orders/{orderId}/items/{itemId}
```

### 2.2 Índices Recomendados

Crear archivo `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "orders",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "orderDate", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "orders",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "orderDate", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "orders",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "source", "order": "ASCENDING" },
        { "fieldPath": "orderDate", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "orders",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "paymentMethod", "order": "ASCENDING" },
        { "fieldPath": "orderDate", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "orders",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "sunatStatus", "order": "ASCENDING" },
        { "fieldPath": "orderDate", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

## 📋 FASE 3: Seguridad para Producción

### 3.1 Reglas de Firestore Mejoradas

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // Función helper para verificar autenticación
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Función para verificar rol (requiere custom claims)
    function hasRole(role) {
      return isAuthenticated() && 
             request.auth.token.role == role;
    }
    
    // Productos - Solo lectura para usuarios, escritura para admins
    match /products/{productId} {
      allow read: if isAuthenticated();
      allow write: if hasRole('admin') || hasRole('manager');
    }
    
    // Ingredientes - Solo lectura para usuarios
    match /ingredients/{ingredientId} {
      allow read: if isAuthenticated();
      allow write: if hasRole('admin') || hasRole('manager');
    }
    
    // Ventas/Orders - Crear cualquiera, leer/actualizar las propias
    match /sales/{saleId} {
      allow create: if isAuthenticated();
      allow read: if isAuthenticated();
      allow update: if isAuthenticated() && 
                       (resource.data.cashierId == request.auth.uid || 
                        hasRole('admin'));
      allow delete: if hasRole('admin');
      
      // Subcolección de items
      match /sale_items/{itemId} {
        allow read, write: if isAuthenticated();
      }
    }
    
    // Clientes
    match /customers/{customerId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update, delete: if hasRole('admin') || hasRole('manager');
    }
    
    // Series SUNAT - Solo lectura y actualización atómica
    match /sunat_series/{seriesId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated();
    }
    
    // Cash flows
    match /cash_flows/{entryId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update, delete: if hasRole('admin');
    }
  }
}
```

---

## 📋 FASE 4: Optimizaciones Adicionales

### 4.1 Cache Local con Zustand

```typescript
// stores/pos-store.ts
import { create } from 'zustand';

interface POSStore {
  products: Product[];
  isLoaded: boolean;
  setProducts: (products: Product[]) => void;
  updateProductStock: (productId: string, newStock: number) => void;
}

export const usePOSStore = create<POSStore>((set) => ({
  products: [],
  isLoaded: false,
  setProducts: (products) => set({ products, isLoaded: true }),
  updateProductStock: (productId, newStock) => 
    set((state) => ({
      products: state.products.map(p => 
        p.id === productId ? { ...p, quantity: newStock } : p
      )
    })),
}));
```

### 4.2 Validación de Stock

```typescript
// Antes de procesar la venta
const validateStock = (order: OrderItem[], products: Product[]) => {
  const errors: string[] = [];
  
  for (const item of order) {
    const product = products.find(p => p.id === item.id);
    if (!product) {
      errors.push(`Producto ${item.name} no encontrado`);
      continue;
    }
    if (product.quantity < item.quantity) {
      errors.push(`Stock insuficiente de ${item.name}: disponible ${product.quantity}, solicitado ${item.quantity}`);
    }
  }
  
  return errors;
};
```

### 4.3 Retry Logic para SUNAT

```typescript
const sendToSunatWithRetry = async (payload, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch('/api/sunat/boletas', {
        method: 'POST',
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000) // 10s timeout
      });
      
      if (response.ok) {
        return await response.json();
      }
      
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 1000 * attempt)); // Backoff
      }
    } catch (error) {
      if (attempt === maxRetries) throw error;
    }
  }
};
```

---

## 📊 Impacto Esperado

| Métrica | Antes | Después |
|---------|-------|---------|
| Tiempo de registro de venta | 3-5 segundos | 500ms - 1s |
| Tiempo hasta feedback visual | 3-5 segundos | <500ms |
| Riesgo de stock negativo | Alto | Bajo |
| Seguridad de datos | Baja | Alta |
| Consistencia de datos | Media | Alta |

---

## 🚀 Plan de Implementación

### Semana 1: Optimización Crítica
- [ ] Separar transacción en pasos
- [ ] Mover SUNAT a background
- [ ] Agregar feedback visual inmediato

### Semana 2: Estructura de Datos
- [ ] Crear índices de Firestore
- [ ] Unificar sales/online_orders
- [ ] Agregar validación de stock

### Semana 3: Seguridad
- [ ] Implementar reglas de Firestore
- [ ] Agregar custom claims para roles
- [ ] Auditar permisos

### Semana 4: Testing y Deploy
- [ ] Tests de carga
- [ ] Tests de seguridad
- [ ] Deploy a producción
