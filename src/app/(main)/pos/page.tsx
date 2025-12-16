'use client'

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { Product, ProductCategory, Ingredient } from '@/lib/types';
import { PRODUCT_CATEGORY_LABELS } from '@/lib/types';
import { ShoppingCart } from 'lucide-react';
import { PaymentModal, PaymentCustomerPayload } from '@/components/pos/payment-modal';
import { RecentSalesDialog } from '@/components/pos/recent-sales-dialog';
import { useCollection, useFirestore, useUser, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp, doc, runTransaction, Timestamp, updateDoc, query, orderBy, limit, getDocs, getDoc, writeBatch, increment } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ProductGrid, CartPanel } from '@/components/pos/pos-components';

interface OrderItem extends Product {
  quantity: number;
}

interface SunatBoletaPayload {
  saleId: string;
  total: number;
  paymentMethod: string;
  issuedAt: string;
  serie: string;
  correlativo: number;
  customer: PaymentCustomerPayload;
  items: Array<{
    productId: string;
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
}

interface ThermalPrintPayload {
  serie: string;
  correlativo: number;
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
  sunatStatus: string;
  sunatNote?: string;
  cashierEmail?: string | null;
}

type SunatDispatchResult = {
  status: 'accepted' | 'sent' | 'queued' | 'rejected' | 'error';
  message?: string;
  documentId?: string | null;
};

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
            <span class="right">S/ ${item.unitPrice.toFixed(2)}</span>
          </div>
          ${showSubtotal ? `<div class="row subtotal"><span class="left"></span><span class="right">Subtotal: S/ ${item.subtotal.toFixed(2)}</span></div>` : ''}
        </div>`;
      })
      .join('');

    const safeCustomerName = escapeHtml(payload.customer.name);
    const safeDocumentNumber = escapeHtml(payload.customer.documentNumber);
    // const safeCashier = payload.cashierEmail ? escapeHtml(payload.cashierEmail) : '---'; // Removed in favor of hardcoded JACK
    // const safeSunatNote = payload.sunatNote ? escapeHtml(payload.sunatNote) : ''; // Removed detailed note

    const simpleSunatStatus = payload.sunatStatus === 'accepted' ? 'ACEPTADO' : 'NO REGISTRADO';

    const html = `<!DOCTYPE html>
    <html>
      <head>
        <meta charSet="utf-8" />
        <title>Boleta ${payload.serie}-${String(payload.correlativo).padStart(8, '0')}</title>
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
            <h1>Boleta Electrónica</h1>
            <p class="small">${payload.serie}-${String(payload.correlativo).padStart(8, '0')}</p>
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
            <div class="row total"><span>TOTAL</span><span>S/ ${payload.total.toFixed(2)}</span></div>
          </div>

          <div class="section center">
            <p class="small">Estado SUNAT: ${simpleSunatStatus}</p>
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
const SUNAT_SERIES_COLLECTION = 'sunat_series';
const DEFAULT_SERIES_DOC = 'boletas';
const DEFAULT_SERIE_CODE = 'B001';

interface PaymentResult {
  paymentMethod: string;
  customer: PaymentCustomerPayload;
  issueBoleta: boolean;
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

    const productsQuery = useMemoFirebase(() => {
      if (!firestore) return null;
      return collection(firestore, 'products');
    }, [firestore]);
    const { data: products, isLoading } = useCollection<Product>(productsQuery);

    const sendSaleToSunat = async (saleId: string, payload: SunatBoletaPayload): Promise<SunatDispatchResult> => {
      if (!firestore || !saleId) {
        return { status: 'error', message: 'Firestore no disponible' };
      }
      console.groupCollapsed('[SUNAT] Enviando boleta', saleId);
      console.info('[SUNAT] Payload preparado', payload);
      try {
        const response = await fetch('/api/sunat/boletas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const result = await response.json().catch(() => ({}));
        console.info('[SUNAT] Respuesta cruda', result);
        const saleRef = doc(firestore, 'sales', saleId);

        if (response.ok && (result.status === 'accepted' || result.status === 'queued' || result.status === 'sent')) {
          const normalizedStatus = result.status === 'accepted' ? 'accepted' : result.status === 'queued' ? 'queued' : 'sent';
          await updateDoc(saleRef, {
            sunatStatus: normalizedStatus,
            sunatDocumentId: result.ticket ?? result.response?.numeroComprobante ?? null,
            sunatNote: result.message ?? 'Boleta enviada a SUNAT.',
          });
          toast({ title: 'Boleta electrónica enviada', description: 'SUNAT recibió la boleta.' });
          return {
            status: normalizedStatus,
            documentId: result.ticket ?? result.response?.numeroComprobante ?? null,
            message: result.message,
          };
        } else {
          await updateDoc(saleRef, {
            sunatStatus: 'rejected',
            sunatNote: result.message ?? 'No se pudo registrar la boleta.',
          });
          console.warn('[SUNAT] Boleta rechazada', { saleId, message: result.message, details: result });
          toast({
            variant: 'destructive',
            title: 'SUNAT rechazó la boleta',
            description: result.message ?? 'Revisa las credenciales configuradas.',
          });
          return {
            status: 'rejected',
            message: result.message ?? 'SUNAT rechazó la boleta.',
          };
        }
      } catch (error) {
        console.error('[SUNAT] Error enviando boleta', error);
        const saleRef = doc(firestore, 'sales', saleId);
        await updateDoc(saleRef, {
          sunatStatus: 'rejected',
          sunatNote: (error as Error).message,
        });
        toast({
          variant: 'destructive',
          title: 'Boleta pendiente',
          description: 'No se pudo contactar con SUNAT. Intenta reenviar más tarde.',
        });
        return {
          status: 'error',
          message: (error as Error).message,
        };
      } finally {
        console.groupEnd();
      }
      return { status: 'error', message: 'Respuesta desconocida de SUNAT.' };
    };

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
        list.sort((a, b) => a.name.localeCompare(b.name));
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
        
        // Actualizar stock de productos usando increment (atómico)
        for (const item of orderItems) {
          const productRef = doc(firestore, 'products', item.id);
          batch.update(productRef, { 
            quantity: increment(-item.quantity) 
          });
        }
        
        // Obtener ingredientes y actualizarlos
        const productDocs = await Promise.all(
          orderItems.map(item => getDoc(doc(firestore, 'products', item.id)))
        );
        
        const ingredientUpdates = new Map<string, number>();
        
        productDocs.forEach((pDoc, idx) => {
          if (!pDoc.exists()) return;
          const productData = pDoc.data() as Product;
          const orderItem = orderItems[idx];
          
          if (productData.ingredients) {
            for (const ing of productData.ingredients) {
              const currentDecrement = ingredientUpdates.get(ing.ingredientId) || 0;
              ingredientUpdates.set(
                ing.ingredientId, 
                currentDecrement + (ing.quantity * orderItem.quantity)
              );
            }
          }
        });
        
        // Actualizar ingredientes
        for (const [ingredientId, decrementAmount] of ingredientUpdates) {
          const ingredientRef = doc(firestore, 'ingredients', ingredientId);
          batch.update(ingredientRef, {
            quantity: increment(-decrementAmount)
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
        customerId: null,
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

    /**
     * Envía la boleta a SUNAT y actualiza el estado en background
     */
    const sendToSunatInBackground = async (
      saleId: string,
      serie: string,
      correlativo: number,
      customer: PaymentCustomerPayload,
      orderItems: OrderItem[],
      totalAmount: number,
      paymentMethod: string
    ) => {
      if (!firestore) return;
      
      const issuedAt = new Date().toISOString();
      const orderItemsSnapshot = orderItems.map(item => ({
        productId: item.id,
        productName: item.name,
        quantity: item.quantity,
        unitPrice: item.salePrice,
        subtotal: item.salePrice * item.quantity,
      }));
      
      const sunatPayload: SunatBoletaPayload = {
        saleId,
        total: totalAmount,
        paymentMethod,
        issuedAt,
        serie,
        correlativo,
        customer: {
          name: customer.name,
          documentType: customer.documentType,
          documentNumber: customer.documentNumber,
        },
        items: orderItemsSnapshot.map(item => ({
          productId: item.productId,
          description: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      };
      
      const sunatResult = await sendSaleToSunat(saleId, sunatPayload);
      
      // Imprimir ticket
      triggerThermalPrint({
        serie,
        correlativo,
        issuedAt,
        customer,
        items: orderItemsSnapshot,
        total: totalAmount,
        paymentMethod,
        sunatStatus: sunatResult.status,
        sunatNote: sunatResult.message,
        cashierEmail: user?.email || null,
      });
    };

    // === FUNCIÓN PRINCIPAL DE PAGO (OPTIMIZADA) ===
    const handleSuccessfulPayment = async ({ paymentMethod, customer, issueBoleta }: PaymentResult) => {
      if (!firestore || !user) {
        toast({ variant: "destructive", title: "Error", description: "No se pudo conectar a la base de datos o no hay usuario."});
        return;
      }

      const startTime = performance.now();
      let createdSaleId = '';
      let generatedSerie = DEFAULT_SERIE_CODE;
      let generatedCorrelativo = 0;

      const normalizedCustomer: PaymentCustomerPayload = {
        name: customer.name?.trim() || WALK_IN_CUSTOMER,
        documentType: customer.documentType,
        documentNumber: customer.documentNumber || (customer.documentType === '0' ? '00000000' : ''),
      };

      // Guardar copia del pedido antes de limpiar
      const orderSnapshot = [...order];

      try {
        // === TRANSACCIÓN MÍNIMA: Solo lo crítico ===
        // Esta transacción solo hace:
        // 1. Leer/actualizar el correlativo de series
        // 2. Crear el documento de venta
        // 3. Crear los sale_items
        // NO actualiza stocks (eso se hace en background)
        
        await runTransaction(firestore, async (transaction) => {
          console.groupCollapsed('[POS] Transacción rápida de venta');
          
          // 1. Leer y actualizar series (1 lectura, 1 escritura)
          const seriesDocRef = doc(firestore, SUNAT_SERIES_COLLECTION, DEFAULT_SERIES_DOC);
          const seriesDoc = await transaction.get(seriesDocRef);
          const storedSerie = seriesDoc.exists() ? (seriesDoc.data()?.serie as string | undefined) : undefined;
          const storedCorrelativo = seriesDoc.exists() ? (seriesDoc.data()?.correlativo as number | undefined) : undefined;
          generatedSerie = storedSerie || DEFAULT_SERIE_CODE;
          const nextCorrelativo = (storedCorrelativo ?? 0) + 1;
          generatedCorrelativo = nextCorrelativo;

          transaction.set(seriesDocRef, {
            serie: generatedSerie,
            correlativo: nextCorrelativo,
            updatedAt: Timestamp.now(),
          });

          // 2. Crear documento de venta (1 escritura)
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
            customerId: null,
            customerName: normalizedCustomer.name,
            customerDocumentType: normalizedCustomer.documentType,
            customerDocumentNumber: normalizedCustomer.documentNumber,
            sunatStatus: issueBoleta ? 'pending' : 'skipped',
            boletaSerie: generatedSerie,
            boletaCorrelativo: generatedCorrelativo,
          };
          
          transaction.set(newSaleRef, saleData);
          console.info('[POS] Venta creada', { saleId: createdSaleId, serie: generatedSerie, correlativo: generatedCorrelativo });

          // 3. Crear sale_items (N escrituras, sin lecturas adicionales)
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

        // === FEEDBACK INMEDIATO AL USUARIO ===
        toast({
          title: "✅ Venta registrada",
          description: `Boleta ${generatedSerie}-${String(generatedCorrelativo).padStart(8, '0')} • S/ ${total.toFixed(2)}`,
        });
        
        // Limpiar pedido INMEDIATAMENTE
        handleResetOrder();

        // === TAREAS EN BACKGROUND (no bloqueantes) ===
        // El usuario ya puede seguir trabajando mientras esto se procesa
        
        // 1. Actualizar stocks (productos e ingredientes)
        updateStocksInBackground(orderSnapshot);
        
        // 2. Crear orden de cocina
        createKitchenOrderInBackground(orderSnapshot, normalizedCustomer, paymentMethod, total);
        
        // 3. Enviar a SUNAT e imprimir (solo si se solicitó boleta)
        if (issueBoleta && createdSaleId) {
          sendToSunatInBackground(
            createdSaleId,
            generatedSerie,
            generatedCorrelativo,
            normalizedCustomer,
            orderSnapshot,
            total,
            paymentMethod
          );
        }

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
    <div className="h-full w-full relative">
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
          <SheetContent side="right" className="w-[90%] sm:w-[400px] p-0">
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
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
