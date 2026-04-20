'use client'

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { Product, ProductCategory, Ingredient } from '@/lib/types';
import { PRODUCT_CATEGORY_LABELS } from '@/lib/types';
import { ShoppingCart } from 'lucide-react';
import { PaymentModal, PaymentCustomerPayload } from '@/components/pos/payment-modal';
import { RecentSalesDialog } from '@/components/pos/recent-sales-dialog';
// import { CashRegister } from '@/components/pos/cash-register'; // Deshabilitado temporalmente
import { useCollection, useFirestore, useUser, addDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp, doc, runTransaction, Timestamp, getDoc, writeBatch, increment } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ProductGrid, CartPanel } from '@/components/pos/pos-components';
import { convertInventoryQuantity } from '@/lib/unit-conversion';

interface OrderItem extends Product {
  quantity: number;
}

interface ThermalPrintPayload {
  reference: string;
  issuedAt: string;
  customer: PaymentCustomerPayload;
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
  total: number;
  paymentMethod: string;
  cashierEmail?: string | null;
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const triggerThermalPrint = (payload: ThermalPrintPayload) => {
  if (typeof window === 'undefined') {
    console.info('[POS] Impresión omitida (entorno sin ventana)');
    return;
  }

  try {
    // Open a narrow window matching 58mm approx (at 96dpi ~ 220px). Use small chrome so print dialog is shown.
    const printWindow = window.open('', '_blank', 'toolbar=0,location=0,menubar=0,width=720,height=800');
    if (!printWindow) {
      console.warn('[POS] No se pudo abrir la ventana de impresión');
      return;
    }

    const itemsHtml = payload.items
      .map((item) => {
        const safeName = escapeHtml(item.productName);
        // Only show subtotal line if quantity > 1 to save space
        const showSubtotal = item.quantity > 1;
        return `
        <div class="line-item">
          <div class="row item-row">
            <span class="left">${item.quantity} x ${safeName}</span>
            <span class="right">S/ ${(item.unitPrice ?? 0).toFixed(2)}</span>
          </div>
          ${showSubtotal ? `<div class="row subtotal"><span class="left"></span><span class="right">Subtotal: S/ ${(item.subtotal ?? 0).toFixed(2)}</span></div>` : ''}
        </div>`;
      })
      .join('');

    const safeCustomerName = escapeHtml(payload.customer.name);
    const safeDocumentNumber = escapeHtml(payload.customer.documentNumber);
    const html = `<!DOCTYPE html>
    <html>
      <head>
        <meta charSet="utf-8" />
        <title>Comprobante ${payload.reference}</title>
        <style>
          @page { size: 58mm auto; margin: 0; }
          *, *:before, *:after { box-sizing: border-box; }
          html, body { margin: 0; padding: 0; width: 100%; font-family: 'Courier New', Courier, monospace; font-size: 10px; line-height: 1.1; background: #fff; font-weight: bold; }
          .receipt { width: 100%; max-width: 58mm; margin: 0; padding: 4px 2px; }
          .center { text-align: center; }
          .section { margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px dashed #000; }
          .section:last-child { border-bottom: none; margin-bottom: 0; }
          .line-item { margin-bottom: 4px; }
          .row { display: flex; justify-content: space-between; align-items: flex-start; }
          .item-row { gap: 4px; }
          .item-row .left { flex: 1; word-break: break-all; font-weight: 800; }
          .item-row .right { flex: 0 0 auto; text-align: right; white-space: nowrap; }
          .subtotal { font-size: 9px; color: #000; margin-top: 1px; }
          .total { font-size: 12px; font-weight: 900; margin-top: 4px; border-top: 1px solid #000; padding-top: 4px; }
          h1 { font-size: 12px; margin: 0 0 4px 0; text-transform: uppercase; font-weight: 900; }
          p { margin: 2px 0; }
          .small { font-size: 9px; }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="section center">
            <h1>Comprobante de Venta</h1>
            <p class="small">Ref: ${payload.reference}</p>
            <p class="small">${new Date(payload.issuedAt).toLocaleString()}</p>
          </div>
          
          <div class="section">
            <p>Cliente: ${safeCustomerName}</p>
            <p>Doc: ${payload.customer.documentType === '0' ? 'Sin documento' : safeDocumentNumber}</p>
            <p class="small">Atendió: JACK</p>
          </div>

          <div class="section">
            ${itemsHtml}
          </div>

          <div class="section">
            <div class="row"><span>Pago:</span><span>${payload.paymentMethod}</span></div>
            <div class="row total"><span>TOTAL</span><span>S/ ${(payload.total ?? 0).toFixed(2)}</span></div>
          </div>

          <div class="section center">
            <p style="margin-top: 8px;">*** Gracias por su compra ***</p>
          </div>
        </div>
      </body>
    </html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    // Wait for the content to layout before printing
    printWindow.onload = () => {
      try {
        printWindow.focus();
        printWindow.print();
      } catch (e) {
        console.warn('[POS] Error during print()', e);
      }
      // Close shortly after print dialog opened
      setTimeout(() => printWindow.close(), 500);
    };
  } catch (error) {
    console.error('[POS] Error al preparar la impresión térmica', error);
  }
};

const WALK_IN_CUSTOMER = 'Cliente Mostrador';

interface PaymentResult {
  paymentMethod: string;
  customer: PaymentCustomerPayload;
}

export default function POSPage() {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    
    const [order, setOrder] = useState<OrderItem[]>([]);
    const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);
    const [isRecentSalesOpen, setRecentSalesOpen] = useState(false);
    const [recentlyAdded, setRecentlyAdded] = useState<string | null>(null);
    const [categoryFilter, setCategoryFilter] = useState<'all' | ProductCategory>('all');
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('cash');
    // const [cashBalance, setCashBalance] = useState<number>(0); // Deshabilitado - Caja chica removida

    // Query para verificar si hay caja abierta - DESHABILITADO
    // const currentRegisterQuery = useMemoFirebase(() => {
    //   if (!firestore) return null;
    //   return query(
    //     collection(firestore, 'cash_registers'),
    //     where('status', '==', 'open'),
    //     limit(1)
    //   );
    // }, [firestore]);
    // const { data: currentRegisterData } = useCollection(currentRegisterQuery);
    // const currentRegister = currentRegisterData?.[0];

    const productsQuery = useMemoFirebase(() => {
      if (!firestore) return null;
      return collection(firestore, 'products');
    }, [firestore]);
    const { data: products, isLoading } = useCollection<Product>(productsQuery);

    const categoryKeys = useMemo(() => Object.keys(PRODUCT_CATEGORY_LABELS) as ProductCategory[], []);
    const groupedProducts = useMemo(() => {
      // Initialize groups from the current category keys so newly added categories are present
      const groups = categoryKeys.reduce((acc, k) => {
        acc[k] = [] as Product[];
        return acc;
      }, {} as Record<ProductCategory, Product[]>);

      (products ?? []).forEach((product) => {
        const rawCategory = (product.category ?? 'otros') as ProductCategory;
        const resolvedCategory = PRODUCT_CATEGORY_LABELS[rawCategory]
          ? rawCategory
          : ('otros' as ProductCategory);
        // Ensure the group exists (defensive) before pushing
        if (!groups[resolvedCategory]) groups[resolvedCategory] = [];
        groups[resolvedCategory].push(product);
      });

      categoryKeys.forEach((key) => {
        const list = groups[key] ?? [];
        // Defensive: ensure we compare strings to avoid calling localeCompare on undefined
        list.sort((a, b) => String(a.name ?? '').localeCompare(String(b.name ?? '')));
        groups[key] = list;
      });

      return groups;
    }, [products, categoryKeys]);

    const filteredProducts = useMemo(() => {
      if (categoryFilter === 'all') {
        return null;
      }
      return groupedProducts[categoryFilter];
    }, [categoryFilter, groupedProducts]);

    // NOTE: removed image handling for touch-first POS. Products show large text + price.

    const addToOrder = (product: Product) => {
        setOrder((prevOrder) => {
            const existingItem = prevOrder.find((item) => item.id === product.id);
            if (existingItem) {
                return prevOrder.map((item) =>
                item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prevOrder, { ...product, quantity: 1 }];
        });

        setRecentlyAdded(product.id);
        setTimeout(() => setRecentlyAdded(null), 500);
    };

    const updateQuantity = (productId: string, amount: number) => {
        setOrder(prevOrder => {
            return prevOrder.map(item => {
                if(item.id === productId) {
                    const newQuantity = item.quantity + amount;
                    return newQuantity > 0 ? {...item, quantity: newQuantity} : null;
                }
                return item;
            }).filter((item): item is OrderItem => item !== null);
        });
    }

    const removeFromOrder = (productId: string) => {
        setOrder(prevOrder => prevOrder.filter(item => item.id !== productId));
    }

    const subtotal = order.reduce((acc, item) => acc + item.salePrice * item.quantity, 0);
    const total = subtotal; // Assuming no tax for now

    // === FUNCIONES DE BACKGROUND (NO BLOQUEANTES) ===
    
    /**
     * Actualiza el stock de productos e ingredientes en background
     * Usa batched writes para eficiencia
     */
    const updateStocksInBackground = async (orderItems: OrderItem[]) => {
      if (!firestore) return;
      
      try {
        const batch = writeBatch(firestore);
        
        // Obtener ingredientes y actualizarlos
        const productDocs = await Promise.all(
          orderItems.map(item => getDoc(doc(firestore, 'products', item.id)))
        );

        const ingredientIds = [...new Set(
          productDocs.flatMap((pDoc) => {
            if (!pDoc.exists()) return [] as string[];
            const productData = pDoc.data() as Product;
            return (productData.ingredients ?? [])
              .filter((ing) => (ing.sourceType ?? 'ingredient') === 'ingredient')
              .map((ing) => ing.ingredientId);
          })
        )];

        const ingredientUnits = new Map<string, string>();
        await Promise.all(ingredientIds.map(async (ingredientId) => {
          const ingredientDoc = await getDoc(doc(firestore, 'ingredients', ingredientId));
          if (!ingredientDoc.exists()) return;
          const ingredientData = ingredientDoc.data() as { unit?: string };
          if (ingredientData.unit) {
            ingredientUnits.set(ingredientId, ingredientData.unit);
          }
        }));
        
        const ingredientUpdates = new Map<string, { collectionName: 'ingredients' | 'inventory_items'; id: string; amount: number }>();
        
        productDocs.forEach((pDoc, idx) => {
          if (!pDoc.exists()) return;
          const productData = pDoc.data() as Product;
          const orderItem = orderItems[idx];
          
          if (productData.ingredients) {
            for (const ing of productData.ingredients) {
              const sourceType = ing.sourceType === 'inventory_item' ? 'inventory_items' : 'ingredients';
              const key = `${sourceType}:${ing.ingredientId}`;
              const currentDecrement = ingredientUpdates.get(key)?.amount || 0;
              const rawAmount = ing.quantity * orderItem.quantity;
              const adjustedQuantity = sourceType === 'ingredients'
                ? convertInventoryQuantity(rawAmount, ing.unit, ingredientUnits.get(ing.ingredientId)) ?? rawAmount
                : rawAmount;
              ingredientUpdates.set(
                key,
                { collectionName: sourceType, id: ing.ingredientId, amount: currentDecrement + adjustedQuantity }
              );
            }
          }
        });
        
        // Actualizar ingredientes
        for (const [, update] of ingredientUpdates) {
          const ingredientRef = doc(firestore, update.collectionName, update.id);
          batch.update(ingredientRef, {
            quantity: increment(-update.amount)
          });
        }
        
        await batch.commit();
        console.info('[POS-BG] Stock actualizado correctamente');
      } catch (error) {
        console.error('[POS-BG] Error actualizando stock:', error);
        // Aquí podrías crear una alerta o notificación para revisión manual
      }
    };

    /**
     * Crea la orden de cocina en background
     */
    const createKitchenOrderInBackground = (
      orderItems: OrderItem[],
      normalizedCustomer: PaymentCustomerPayload,
      paymentMethod: string,
      totalAmount: number
    ) => {
      if (!firestore) return;
      
      const orderItemsSnapshot = orderItems.map(item => ({
        productId: item.id,
        productName: item.name,
        quantity: item.quantity,
        unitPrice: item.salePrice,
        subtotal: item.salePrice * item.quantity,
      }));
      
      const newOrderData = {
        orderDate: Timestamp.now(),
        customerId: normalizedCustomer.customerId ?? null,
        customerName: normalizedCustomer.name,
        customerPhone: null,
        status: 'pending',
        totalAmount,
        paymentMethod,
        source: 'pos',
        itemsCount: orderItems.reduce((sum, item) => sum + item.quantity, 0),
        items: orderItemsSnapshot,
        notes: null,
        customerDocumentType: normalizedCustomer.documentType,
        customerDocumentNumber: normalizedCustomer.documentNumber,
      };
      
      addDocumentNonBlocking(collection(firestore, 'online_orders'), newOrderData);
      console.info('[POS-BG] Pedido enviado a cocina');
    };

    // === FUNCIÓN PRINCIPAL DE PAGO (OPTIMIZADA) ===
    const handleSuccessfulPayment = async ({ paymentMethod, customer }: PaymentResult) => {
      if (!firestore || !user) {
        toast({ variant: "destructive", title: "Error", description: "No se pudo conectar a la base de datos o no hay usuario."});
        return;
      }

      // Validación de caja abierta DESHABILITADA (funcionalidad removida)
      // if (paymentMethod === 'cash' && !currentRegister) {
      //   toast({ variant: "destructive", title: "Caja Cerrada", description: "Debes abrir la caja antes de recibir pagos en efectivo."});
      //   return;
      // }

      const startTime = performance.now();
      let createdSaleId = '';

      const normalizedCustomer: PaymentCustomerPayload = {
        customerId: customer.customerId ?? null,
        name: customer.name?.trim() || WALK_IN_CUSTOMER,
        documentType: customer.documentType,
        documentNumber: customer.documentNumber || (customer.documentType === '0' ? '00000000' : ''),
      };

      // Guardar copia del pedido antes de limpiar
      const orderSnapshot = [...order];

      try {
        // === TRANSACCIÓN MÍNIMA: Solo lo crítico ===
        // Esta transacción solo hace:
        // 1. Crear el documento de venta
        // 2. Crear los sale_items
        // NO actualiza stocks (eso se hace en background)
        
        await runTransaction(firestore, async (transaction) => {
          console.groupCollapsed('[POS] Transacción rápida de venta');

          // 1. Crear documento de venta (1 escritura)
          const newSaleRef = doc(collection(firestore, 'sales'));
          createdSaleId = newSaleRef.id;

          const saleData = {
            saleDate: serverTimestamp(),
            totalAmount: total,
            cashierId: user.uid,
            cashierEmail: user.email || 'unknown',
            paymentMethod: paymentMethod,
            itemsCount: orderSnapshot.reduce((sum, item) => sum + item.quantity, 0),
            uniqueProductsCount: orderSnapshot.length,
            source: 'pos',
            deviceType: typeof window !== 'undefined' ? (window.innerWidth < 768 ? 'mobile' : window.innerWidth < 1024 ? 'tablet' : 'desktop') : 'unknown',
            createdAt: Timestamp.now(),
            customerId: normalizedCustomer.customerId ?? null,
            customerName: normalizedCustomer.name,
            customerDocumentType: normalizedCustomer.documentType,
            customerDocumentNumber: normalizedCustomer.documentNumber,
            receiptReference: createdSaleId.slice(0, 8).toUpperCase(),
          };
          
          transaction.set(newSaleRef, saleData);
          console.info('[POS] Venta creada', { saleId: createdSaleId });

          // 2. Crear sale_items (N escrituras, sin lecturas adicionales)
          for (const item of orderSnapshot) {
            const saleItemRef = doc(collection(firestore, `sales/${newSaleRef.id}/sale_items`));
            const saleItemData = {
              saleId: newSaleRef.id,
              productId: item.id,
              productName: item.name, // Ya tenemos el nombre en memoria
              quantity: item.quantity,
              unitPrice: item.salePrice,
              profit: item.price ? (item.salePrice - item.price) * item.quantity : 0,
            };
            transaction.set(saleItemRef, saleItemData);
          }
          
          console.groupEnd();
        });
        
        const transactionTime = performance.now() - startTime;
        console.info(`[POS] ✅ Transacción completada en ${transactionTime.toFixed(0)}ms`);

        // === REGISTRO EN CAJA CHICA DESHABILITADO ===
        // La funcionalidad de caja chica ha sido removida temporalmente
        // if (paymentMethod === 'cash' && currentRegister) {
        //   try {
        //     const cashMovementsCol = collection(firestore, 'cash_movements');
        //     await addDocumentNonBlocking(cashMovementsCol, {...});
        //     const registerDoc = doc(firestore, 'cash_registers', currentRegister.id);
        //     await updateDocumentNonBlocking(registerDoc, {...});
        //   } catch (error) {
        //     console.error('[POS] Error al actualizar caja:', error);
        //   }
        // }

        // === FEEDBACK INMEDIATO AL USUARIO ===
        toast({
          title: "✅ Venta registrada",
          description: `Venta ${createdSaleId.slice(0, 8).toUpperCase()} • S/ ${(total ?? 0).toFixed(2)}`,
        });
        
        // Limpiar pedido INMEDIATAMENTE
        handleResetOrder();

        // === TAREAS EN BACKGROUND (no bloqueantes) ===
        // El usuario ya puede seguir trabajando mientras esto se procesa
        
        // 1. Actualizar stocks (productos e ingredientes)
        updateStocksInBackground(orderSnapshot);
        
        // 2. Crear orden de cocina
        createKitchenOrderInBackground(orderSnapshot, normalizedCustomer, paymentMethod, total);

        toast({
          title: 'Pedido enviado',
          description: 'La orden quedó registrada para cocina.',
        });

        // 3. Imprimir comprobante interno
        const issuedAt = new Date().toISOString();
        const orderItemsSnapshot = orderSnapshot.map(item => ({
          productName: item.name,
          quantity: item.quantity,
          unitPrice: item.salePrice,
          subtotal: item.salePrice * item.quantity,
        }));
        triggerThermalPrint({
          reference: createdSaleId.slice(0, 8).toUpperCase(),
          issuedAt,
          customer: normalizedCustomer,
          items: orderItemsSnapshot,
          total,
          paymentMethod,
          cashierEmail: user?.email || null,
        });

        const totalTime = performance.now() - startTime;
        console.info(`[POS] 🚀 Flujo completo iniciado en ${totalTime.toFixed(0)}ms (tareas de background en proceso)`);

      } catch (error) {
        console.error("Error creating sale:", error);
        toast({
          variant: "destructive",
          title: "Error al registrar la venta",
          description: (error as Error).message || "No se pudo guardar la venta. Inténtalo de nuevo.",
        });
      }
    };

    const handleResetOrder = () => {
        setOrder([]);
        setPaymentModalOpen(false);
    }

  return (
    <div className="relative h-full w-full bg-transparent">
      {/* Mobile Cart Trigger - Floating Button */}
      <div className="lg:hidden fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] right-4 z-50">
        <Sheet>
          <SheetTrigger asChild>
            <Button size="lg" className="rounded-full h-14 w-14 shadow-xl relative">
              <ShoppingCart className="h-6 w-6" />
              {order.length > 0 && (
                <Badge className="absolute -top-2 -right-2 h-6 w-6 flex items-center justify-center rounded-full p-0">
                  {order.reduce((acc, item) => acc + item.quantity, 0)}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[90%] sm:w-[400px] p-0 flex flex-col">
            <SheetHeader className="px-4 py-3 border-b flex-shrink-0">
              <SheetTitle>Pedido Actual</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto">
              {/* Caja Chica en Mobile - DESHABILITADO */}
              {/* <div className="p-4">
                <CashRegister onBalanceUpdate={setCashBalance} userEmail={user?.email || null} />
              </div> */}
              
              <CartPanel
                order={order}
                subtotal={subtotal}
                total={total}
                selectedPaymentMethod={selectedPaymentMethod}
                setSelectedPaymentMethod={setSelectedPaymentMethod}
                handleResetOrder={handleResetOrder}
                updateQuantity={updateQuantity}
                setPaymentModalOpen={setPaymentModalOpen}
                firestore={firestore}
                triggerThermalPrint={triggerThermalPrint}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <ResizablePanelGroup direction="horizontal" className="h-full w-full gap-3 lg:gap-4">
        <PaymentModal 
            isOpen={isPaymentModalOpen}
            onClose={() => setPaymentModalOpen(false)}
            total={total}
            defaultPaymentMethod={selectedPaymentMethod}
            onSuccess={handleSuccessfulPayment}
        />
        <RecentSalesDialog 
            isOpen={isRecentSalesOpen}
            onClose={() => setRecentSalesOpen(false)}
        />
      
        {/* Left Side: Product Grid */}
        <ResizablePanel defaultSize={65} minSize={40} className="h-full">
          <ProductGrid
            isLoading={isLoading}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
            categoryKeys={categoryKeys}
            groupedProducts={groupedProducts}
            filteredProducts={filteredProducts}
            recentlyAdded={recentlyAdded}
            addToOrder={addToOrder}
            setRecentSalesOpen={setRecentSalesOpen}
          />
        </ResizablePanel>

        {/* Divider Handle - Hidden on mobile if we want, but ResizablePanelGroup handles it usually */}
        <ResizableHandle withHandle className="hidden lg:flex" />

        {/* Right Side: Order Summary - Desktop Only */}
        <ResizablePanel defaultSize={35} minSize={25} maxSize={50} className="hidden lg:block h-full">
          <div className="h-full flex flex-col gap-3">
            {/* Caja Chica en Desktop - DESHABILITADO */}
            {/* <div className="flex-shrink-0">
              <CashRegister onBalanceUpdate={setCashBalance} userEmail={user?.email || null} />
            </div> */}
            
            <div className="flex-1 overflow-hidden">
              <CartPanel
                order={order}
                subtotal={subtotal}
                total={total}
            selectedPaymentMethod={selectedPaymentMethod}
            setSelectedPaymentMethod={setSelectedPaymentMethod}
            handleResetOrder={handleResetOrder}
            updateQuantity={updateQuantity}
            setPaymentModalOpen={setPaymentModalOpen}
            firestore={firestore}
            triggerThermalPrint={triggerThermalPrint}
          />
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}