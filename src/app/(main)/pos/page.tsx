'use client'

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { Product, ProductCategory, Ingredient } from '@/lib/types';
import { PRODUCT_CATEGORY_LABELS } from '@/lib/types';
import { Plus, Minus, CheckCircle, Trash2, ShoppingCart, Banknote, CreditCard, Smartphone, ArrowRightLeft, Receipt } from 'lucide-react';
import { PaymentModal, PaymentCustomerPayload } from '@/components/pos/payment-modal';
import { RecentSalesDialog } from '@/components/pos/recent-sales-dialog';
import { useCollection, useFirestore, useUser, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp, doc, runTransaction, Timestamp, updateDoc, query, orderBy, limit, getDocs, getDoc, writeBatch, increment } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';

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
      
      {/* Left Side: Product Grid - Optimizado para tablets */}
      <ResizablePanel defaultSize={65} minSize={40}>
      <div className="h-full flex flex-col bg-background rounded-xl border shadow-sm overflow-hidden">
        <div className="p-3 lg:p-4 border-b bg-muted/20 space-y-2 lg:space-y-3 flex-shrink-0">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xl lg:text-2xl font-headline font-bold">Productos</h2>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-sm font-semibold h-9 touch-manipulation"
                  onClick={() => setRecentSalesOpen(true)}
                >
                  <Receipt className="h-4 w-4 mr-2" />
                  Ventas
                </Button>
                <Button variant="ghost" size="sm" className="text-sm lg:text-base font-semibold h-9 lg:h-10" onClick={() => setCategoryFilter('all')}>
                  Ver todo
                </Button>
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin lg:flex-wrap">
              <Button
                variant={categoryFilter === 'all' ? 'default' : 'secondary'}
                size="sm"
                className="h-9 lg:h-10 text-sm lg:text-base font-semibold shrink-0 px-4 lg:px-5 touch-manipulation transition-all hover:scale-105 shadow-sm"
                onClick={() => setCategoryFilter('all')}
              >
                Todas
              </Button>
              {categoryKeys.map((key) => (
                <Button
                  key={key}
                  variant={categoryFilter === key ? 'default' : 'outline'}
                  size="sm"
                  className="h-9 lg:h-10 text-sm lg:text-base font-semibold shrink-0 px-4 lg:px-5 touch-manipulation transition-all hover:scale-105 shadow-sm"
                  onClick={() => setCategoryFilter(key)}
                >
                  {PRODUCT_CATEGORY_LABELS[key]}
                </Button>
              ))}
            </div>
        </div>
        
        <ScrollArea className="flex-1 p-2 lg:p-3">
            {isLoading ? (
                <div className="flex items-center justify-center h-full">
                    <p className="text-base lg:text-lg text-muted-foreground animate-pulse">Cargando productos...</p>
                </div>
            ) : (
                <div className="space-y-3 lg:space-y-4 pb-2">
                  {categoryFilter === 'all' ? (
                    categoryKeys.map((key) => (
                      groupedProducts[key].length > 0 && (
                        <div key={key} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="text-base lg:text-lg font-semibold">{PRODUCT_CATEGORY_LABELS[key]}</h3>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                              {groupedProducts[key].length}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 lg:gap-4">
                            {groupedProducts[key].map((product) => (
                              <button
                                key={product.id}
                                className="group relative flex flex-col items-center text-center bg-card rounded-xl border-2 border-transparent hover:border-primary active:scale-95 transition-all duration-200 overflow-hidden shadow-sm hover:shadow-xl touch-manipulation h-full"
                                onClick={() => addToOrder(product)}
                              >
                                {recentlyAdded === product.id && (
                                  <div className="absolute inset-0 bg-primary/90 flex items-center justify-center z-20 animate-in fade-in-0 zoom-in-95 duration-200">
                                    <CheckCircle className="h-12 w-12 lg:h-14 lg:w-14 text-primary-foreground" />
                                  </div>
                                )}
                                <div className="w-full p-3 lg:p-4 flex flex-col items-center justify-between bg-card h-full min-h-[7rem] lg:min-h-[9rem]">
                                  <p className="text-sm lg:text-base font-bold text-center leading-tight line-clamp-2 group-hover:text-primary transition-colors">{product.name}</p>
                                  <div className="mt-2 bg-muted/50 rounded-full px-3 py-1 group-hover:bg-primary/10 transition-colors">
                                    <p className="text-sm lg:text-base font-extrabold text-primary">S/ {product.salePrice.toFixed(2)}</p>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )
                    ))
                  ) : (
                    <>
                      {filteredProducts && filteredProducts.length > 0 ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="text-base lg:text-lg font-semibold">{PRODUCT_CATEGORY_LABELS[categoryFilter]}</h3>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                              {filteredProducts.length}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 lg:gap-4">
                            {filteredProducts.map((product) => (
                              <button
                                key={product.id}
                                className="group relative flex flex-col items-center text-center bg-card rounded-xl border-2 border-transparent hover:border-primary active:scale-95 transition-all duration-200 overflow-hidden shadow-sm hover:shadow-xl touch-manipulation h-full"
                                onClick={() => addToOrder(product)}
                              >
                                {recentlyAdded === product.id && (
                                  <div className="absolute inset-0 bg-primary/90 flex items-center justify-center z-20 animate-in fade-in-0 zoom-in-95 duration-200">
                                    <CheckCircle className="h-12 w-12 lg:h-14 lg:w-14 text-primary-foreground" />
                                  </div>
                                )}
                                <div className="w-full p-3 lg:p-4 flex flex-col items-center justify-between bg-card h-full min-h-[7rem] lg:min-h-[9rem]">
                                  <p className="text-sm lg:text-base font-bold text-center leading-tight line-clamp-2 group-hover:text-primary transition-colors">{product.name}</p>
                                  <div className="mt-2 bg-muted/50 rounded-full px-3 py-1 group-hover:bg-primary/10 transition-colors">
                                    <p className="text-sm lg:text-base font-extrabold text-primary">S/ {product.salePrice.toFixed(2)}</p>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-10 text-muted-foreground">
                          No hay productos en esta categoría.
                        </div>
                      )}
                    </>
                  )}
                </div>
            )}
        </ScrollArea>
      </div>
      </ResizablePanel>

      {/* Divider Handle - Draggable */}
      <ResizableHandle withHandle />

      {/* Right Side: Order Summary - Optimizado para tablets */}
      <ResizablePanel defaultSize={35} minSize={25} maxSize={50}>
      <div className="h-full flex flex-col bg-background rounded-xl border shadow-lg overflow-hidden">
        {/* Customer Selector Header */}
        <div className="p-3 lg:p-4 border-b bg-muted/20 space-y-2 lg:space-y-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-lg lg:text-xl font-headline font-bold flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 lg:h-6 lg:w-6" />
              Pedido
            </h2>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleResetOrder}
              className="text-muted-foreground hover:text-destructive h-8 lg:h-9 text-sm font-semibold"
              disabled={order.length === 0}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Limpiar
            </Button>
          </div>
          <div className="rounded-lg border bg-card p-2 text-xs leading-relaxed text-muted-foreground">
            <p className="font-semibold text-foreground mb-1">Pasos:</p>
            <ol className="list-decimal list-inside space-y-0.5 text-[11px]">
            <li>Añade productos al pedido</li>
            <li>Revisa cantidades y totales</li>
            <li>Presiona "Procesar Pago"</li>
            <li>Entrega comprobante</li>
            </ol>
          </div>
        </div>

        {/* Order Items List */}
        <ScrollArea className="flex-1 bg-muted/10">
            {order.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-4 text-center text-muted-foreground space-y-2">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                        <ShoppingCart className="h-6 w-6 opacity-20" />
                    </div>
                    <div>
                        <p className="text-sm font-medium">El pedido está vacío</p>
                        <p className="text-xs">Selecciona productos</p>
                    </div>
                </div>
            ) : (
                <div className="p-2 lg:p-3 space-y-2">
                    {order.map((item) => (
                        <div key={item.id} className="flex items-center gap-2 lg:gap-3 p-2 lg:p-3 bg-card rounded-lg border shadow-sm animate-in slide-in-from-left-5 duration-300">
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm lg:text-base truncate">{item.name}</p>
                            <p className="text-xs lg:text-sm text-muted-foreground">S/ {item.salePrice.toFixed(2)}</p>
                          </div>

                            <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-0.5 flex-shrink-0">
                                <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="h-8 w-8 lg:h-9 lg:w-9 rounded-md hover:bg-background touch-manipulation transition-all active:scale-90" 
                                    onClick={() => updateQuantity(item.id, -1)}
                                >
                                    <Minus className="h-4 w-4 lg:h-5 lg:w-5 stroke-[2.5]" />
                                </Button>
                                <span className="font-bold text-base lg:text-lg w-8 lg:w-10 text-center tabular-nums">{item.quantity}</span>
                                <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="h-8 w-8 lg:h-9 lg:w-9 rounded-md hover:bg-background touch-manipulation transition-all active:scale-90" 
                                    onClick={() => updateQuantity(item.id, 1)}
                                >
                                    <Plus className="h-4 w-4 lg:h-5 lg:w-5 stroke-[2.5]" />
                                </Button>
                            </div>
                            
                            <div className="text-right min-w-[4.5rem] lg:min-w-[5rem] flex-shrink-0">
                              <p className="font-bold text-sm lg:text-base text-primary whitespace-nowrap">S/ {(item.salePrice * item.quantity).toFixed(2)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </ScrollArea>

        {/* Footer Totals & Action - Optimizado para tablets */}
        <div className="p-3 lg:p-4 bg-background border-t space-y-2 lg:space-y-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10 flex-shrink-0">
            <div className="space-y-1.5">
                <div className="flex justify-between text-xs lg:text-sm text-muted-foreground">
                    <span className="font-medium">Subtotal</span>
                    <span className="font-semibold">S/ {subtotal.toFixed(2)}</span>
                </div>
                <Separator className="my-1" />
                <div className="flex justify-between items-end gap-2">
                    <span className="text-sm lg:text-base font-bold">Total</span>
                    <span className="text-xl lg:text-2xl font-bold text-primary whitespace-nowrap">S/ {total.toFixed(2)}</span>
                </div>
            </div>
            
            {/* Payment Method Quick Select */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Método de pago:</p>
              <div className="grid grid-cols-5 gap-1.5">
                <button
                  onClick={() => setSelectedPaymentMethod('cash')}
                  className={cn(
                    "flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all touch-manipulation",
                    selectedPaymentMethod === 'cash' 
                      ? "border-primary bg-primary/10 text-primary" 
                      : "border-muted bg-muted/20 text-muted-foreground hover:border-primary/50"
                  )}
                >
                  <Banknote className="h-4 w-4 lg:h-5 lg:w-5" />
                  <span className="text-[10px] lg:text-xs font-medium mt-0.5">Efectivo</span>
                </button>
                <button
                  onClick={() => setSelectedPaymentMethod('card')}
                  className={cn(
                    "flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all touch-manipulation",
                    selectedPaymentMethod === 'card' 
                      ? "border-primary bg-primary/10 text-primary" 
                      : "border-muted bg-muted/20 text-muted-foreground hover:border-primary/50"
                  )}
                >
                  <CreditCard className="h-4 w-4 lg:h-5 lg:w-5" />
                  <span className="text-[10px] lg:text-xs font-medium mt-0.5">Tarjeta</span>
                </button>
                <button
                  onClick={() => setSelectedPaymentMethod('yape')}
                  className={cn(
                    "flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all touch-manipulation",
                    selectedPaymentMethod === 'yape' 
                      ? "border-primary bg-primary/10 text-primary" 
                      : "border-muted bg-muted/20 text-muted-foreground hover:border-primary/50"
                  )}
                >
                  <Smartphone className="h-4 w-4 lg:h-5 lg:w-5" />
                  <span className="text-[10px] lg:text-xs font-medium mt-0.5">Yape</span>
                </button>
                <button
                  onClick={() => setSelectedPaymentMethod('plin')}
                  className={cn(
                    "flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all touch-manipulation",
                    selectedPaymentMethod === 'plin' 
                      ? "border-primary bg-primary/10 text-primary" 
                      : "border-muted bg-muted/20 text-muted-foreground hover:border-primary/50"
                  )}
                >
                  <Smartphone className="h-4 w-4 lg:h-5 lg:w-5" />
                  <span className="text-[10px] lg:text-xs font-medium mt-0.5">Plin</span>
                </button>
                <button
                  onClick={() => setSelectedPaymentMethod('transfer')}
                  className={cn(
                    "flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all touch-manipulation",
                    selectedPaymentMethod === 'transfer' 
                      ? "border-primary bg-primary/10 text-primary" 
                      : "border-muted bg-muted/20 text-muted-foreground hover:border-primary/50"
                  )}
                >
                  <ArrowRightLeft className="h-4 w-4 lg:h-5 lg:w-5" />
                  <span className="text-[10px] lg:text-xs font-medium mt-0.5">Pedidos Ya</span>
                </button>
              </div>
            </div>
            
            <Button 
                className="w-full h-12 lg:h-14 text-base lg:text-lg font-bold shadow-lg hover:shadow-xl transition-all active:scale-95 touch-manipulation" 
                size="lg" 
                onClick={() => setPaymentModalOpen(true)}
                disabled={order.length === 0}
            >
                Procesar Pago
                <span className="ml-2 bg-primary-foreground/20 px-2 py-0.5 rounded text-sm lg:text-base">
                    S/ {total.toFixed(2)}
                </span>
            </Button>
            <div className="flex flex-col gap-1.5 pt-1">
                    <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground hover:text-foreground w-full"
                onClick={async () => {
                  if (!firestore) return;
                  try {
                    // Query last sale
                    const salesQuery = query(collection(firestore, 'sales'), orderBy('createdAt', 'desc'), limit(1));
                    const snap = await getDocs(salesQuery);
                    if (snap.empty) {
                      toast({ title: 'No hay ventas', description: 'No se encontró ninguna venta para imprimir.' });
                      return;
                    }
                    const saleDoc = snap.docs[0];
                    const saleData = saleDoc.data() as any;
                    const saleId = saleDoc.id;

                    // Fetch sale items
                    const itemsSnap = await getDocs(collection(firestore, `sales/${saleId}/sale_items`));
                    const items = itemsSnap.docs.map(d => d.data() as any);

                    // Collect unique productIds to fetch names
                    const productIds = Array.from(new Set(items.map(i => i.productId)));
                    const productMap = new Map<string, string>();
                    await Promise.all(productIds.map(async (pid) => {
                      try {
                        const pDoc = await getDoc(doc(firestore, 'products', pid));
                        if (pDoc.exists()) productMap.set(pid, (pDoc.data() as any).name || pid);
                        else productMap.set(pid, pid);
                      } catch (_) {
                        productMap.set(pid, pid);
                      }
                    }));

                    const printItems = items.map(i => ({
                      productName: productMap.get(i.productId) ?? i.productId,
                      quantity: i.quantity,
                      unitPrice: i.unitPrice,
                      subtotal: (i.unitPrice * i.quantity),
                    }));

                    const payload = {
                      serie: saleData.boletaSerie ?? 'B001',
                      correlativo: saleData.boletaCorrelativo ?? 0,
                      issuedAt: (saleData.saleDate && (saleData.saleDate.toDate ? saleData.saleDate.toDate().toISOString() : new Date().toISOString())) || new Date().toISOString(),
                      customer: {
                        name: saleData.customerName ?? 'Cliente Mostrador',
                        documentType: saleData.customerDocumentType ?? '0',
                        documentNumber: saleData.customerDocumentNumber ?? '00000000',
                      },
                      items: printItems,
                      total: saleData.totalAmount ?? 0,
                      paymentMethod: saleData.paymentMethod ?? 'unknown',
                      sunatStatus: saleData.sunatStatus ?? 'unknown',
                      sunatNote: saleData.sunatNote ?? undefined,
                      cashierEmail: saleData.cashierEmail ?? undefined,
                    };

                    // Reuse triggerThermalPrint from file scope
                    triggerThermalPrint(payload as any);
                  } catch (error) {
                    console.error('Error imprimiendo última boleta', error);
                    toast({ variant: 'destructive', title: 'Error', description: 'No se pudo imprimir la última boleta.' });
                  }
                }}
                disabled={!firestore}
                    >
                    Reimprimir última
                  </Button>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    Tip: papel 58mm, márgenes mínimos
                  </p>
            </div>
        </div>
      </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
