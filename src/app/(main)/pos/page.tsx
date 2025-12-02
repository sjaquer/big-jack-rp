'use client'

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { Product, ProductCategory, Ingredient } from '@/lib/types';
import { PRODUCT_CATEGORY_LABELS } from '@/lib/types';
import { Plus, Minus, CheckCircle, Trash2, ShoppingCart } from 'lucide-react';
import { PaymentModal, PaymentCustomerPayload } from '@/components/pos/payment-modal';
import { useCollection, useFirestore, useUser, addDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp, doc, runTransaction, Timestamp, updateDoc, query, orderBy, limit, getDocs, getDoc } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

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
    const printWindow = window.open('', '_blank', 'toolbar=0,location=0,menubar=0,width=240,height=800');
    if (!printWindow) {
      console.warn('[POS] No se pudo abrir la ventana de impresión');
      return;
    }

    const itemsHtml = payload.items
      .map((item) => {
        const safeName = escapeHtml(item.productName);
        return `
        <div class="line-item">
          <div class="row"><span>${item.quantity} x ${safeName}</span><span>S/ ${item.unitPrice.toFixed(2)}</span></div>
          <div class="row subtotal">Subtotal: S/ ${item.subtotal.toFixed(2)}</div>
        </div>`;
      })
      .join('');

    const safeCustomerName = escapeHtml(payload.customer.name);
    const safeDocumentNumber = escapeHtml(payload.customer.documentNumber);
    const safeCashier = payload.cashierEmail ? escapeHtml(payload.cashierEmail) : '---';
    const safeSunatNote = payload.sunatNote ? escapeHtml(payload.sunatNote) : '';

    const html = `<!DOCTYPE html>
    <html>
      <head>
        <meta charSet="utf-8" />
        <title>Boleta ${payload.serie}-${String(payload.correlativo).padStart(8, '0')}</title>
        <style>
          @page { size: 58mm auto; margin: 0; }
          *, *:before, *:after { box-sizing: border-box; }
          html, body { width: 58mm; margin: 0; padding: 0; font-family: 'Courier New', Courier, monospace; font-size: 10px; line-height: 1.15; }
          .center { text-align: center; }
          .section { margin-bottom: 4px; }
          .line-item { border-bottom: 1px dashed #999; padding: 2px 0; }
          .row { display: flex; justify-content: space-between; }
          .total { font-size: 12px; font-weight: bold; }
          h1 { font-size: 12px; margin: 0 0 2px 0; }
          /* Reduce whitespace and force content-driven height */
          .receipt { display: inline-block; width: 58mm; padding: 4px 6px 6px 6px; }
          body { -webkit-print-color-adjust: exact; }
          @media print { html, body { margin: 0; padding: 0; } .receipt { padding: 2px 4px 4px 4px; } }
        </style>
      </head>
      <body>
        <div class="section center">
          <h1>BOLETA ELECTRÓNICA</h1>
          <p>${payload.serie}-${String(payload.correlativo).padStart(8, '0')}</p>
          <p>${new Date(payload.issuedAt).toLocaleString()}</p>
        </div>
        <div class="section">
          <p>Cliente: ${safeCustomerName}</p>
          <p>Doc: ${payload.customer.documentType === '0' ? 'Sin documento' : safeDocumentNumber}</p>
          <p>Atendió: ${safeCashier}</p>
        </div>
        <div class="section">
          ${itemsHtml}
        </div>
        <div class="section">
          <div class="row"><span>Medio de pago</span><span>${payload.paymentMethod}</span></div>
          <div class="row total"><span>Total</span><span>S/ ${payload.total.toFixed(2)}</span></div>
        </div>
        <div class="section center">
          <p>Estado SUNAT: ${payload.sunatStatus}</p>
          ${safeSunatNote ? `<p>${safeSunatNote}</p>` : ''}
          <p>Gracias por su compra</p>
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
    const [recentlyAdded, setRecentlyAdded] = useState<string | null>(null);
    const [categoryFilter, setCategoryFilter] = useState<'all' | ProductCategory>('all');

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
      const groups: Record<ProductCategory, Product[]> = {
        combos: [],
        hamburguesas: [],
        pollos: [],
        bebidas: [],
        acompanamientos: [],
        postres: [],
        otros: [],
      };

      (products ?? []).forEach((product) => {
        const rawCategory = (product.category ?? 'otros') as ProductCategory;
        const resolvedCategory = PRODUCT_CATEGORY_LABELS[rawCategory]
          ? rawCategory
          : 'otros';
        groups[resolvedCategory].push(product);
      });

      categoryKeys.forEach((key) => {
        groups[key].sort((a, b) => a.name.localeCompare(b.name));
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

    const handleSuccessfulPayment = async ({ paymentMethod, customer, issueBoleta }: PaymentResult) => {
      if (!firestore || !user) {
        toast({ variant: "destructive", title: "Error", description: "No se pudo conectar a la base de datos o no hay usuario."});
        return;
      }

      let createdSaleId = '';
      let generatedSerie = DEFAULT_SERIE_CODE;
      let generatedCorrelativo = 0;

      const normalizedCustomer: PaymentCustomerPayload = {
        name: customer.name?.trim() || WALK_IN_CUSTOMER,
        documentType: customer.documentType,
        documentNumber: customer.documentNumber || (customer.documentType === '0' ? '00000000' : ''),
      };

      try {
        await runTransaction(firestore, async (transaction) => {
          console.groupCollapsed('[POS] Iniciando transacción de venta');
          console.info('[POS] Pedido actual', order);
          console.info('[POS] Cliente normalizado', normalizedCustomer);
          const newSaleRef = doc(collection(firestore, 'sales'));
          createdSaleId = newSaleRef.id;

          const seriesDocRef = doc(firestore, SUNAT_SERIES_COLLECTION, DEFAULT_SERIES_DOC);
          const seriesDoc = await transaction.get(seriesDocRef);
          const storedSerie = seriesDoc.exists() ? (seriesDoc.data()?.serie as string | undefined) : undefined;
          const storedCorrelativo = seriesDoc.exists() ? (seriesDoc.data()?.correlativo as number | undefined) : undefined;
          generatedSerie = storedSerie || DEFAULT_SERIE_CODE;
          const nextCorrelativo = (storedCorrelativo ?? 0) + 1;
          generatedCorrelativo = nextCorrelativo;

          // --- READS first: gather all product and ingredient documents needed ---
          const productRefs = order.map(item => doc(firestore, 'products', item.id));
          const productDocs = await Promise.all(productRefs.map(ref => transaction.get(ref)));

          // Verify products exist and build a map
          const productsMap = new Map<string, Product>();
          productDocs.forEach((pDoc, idx) => {
            if (!pDoc.exists()) {
              const missing = order[idx];
              throw new Error(`Producto ${missing?.name || missing?.id || productRefs[idx].id} no encontrado.`);
            }
            productsMap.set(productRefs[idx].id, pDoc.data() as Product);
          });

          // Collect unique ingredient ids that will be touched
          const ingredientIdSet = new Set<string>();
          productsMap.forEach((prod) => {
            if (prod.ingredients) {
              for (const ri of prod.ingredients) {
                if (ri?.ingredientId) ingredientIdSet.add(ri.ingredientId);
              }
            }
          });

          const ingredientIds = Array.from(ingredientIdSet);
          const ingredientRefs = ingredientIds.map(id => doc(firestore, 'ingredients', id));
          const ingredientDocs = await Promise.all(ingredientRefs.map(ref => transaction.get(ref)));

          const ingredientMap = new Map<string, Ingredient>();
          ingredientDocs.forEach((iDoc, idx) => {
            if (!iDoc.exists()) {
              throw new Error(`Ingrediente con ID ${ingredientIds[idx]} no encontrado.`);
            }
            ingredientMap.set(ingredientIds[idx], iDoc.data() as Ingredient);
          });

          // --- All reads done. Perform writes now ---
          const saleData = {
            saleDate: serverTimestamp(),
            totalAmount: total,
            cashierId: user.uid,
            cashierEmail: user.email || 'unknown',
            paymentMethod: paymentMethod,
            itemsCount: order.reduce((sum, item) => sum + item.quantity, 0),
            uniqueProductsCount: order.length,
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
          console.info('[POS] Lecturas completadas — preparando escrituras');
          console.info('[POS] Reservando correlativo', { serie: generatedSerie, correlativo: generatedCorrelativo });
          transaction.set(seriesDocRef, {
            serie: generatedSerie,
            correlativo: nextCorrelativo,
            updatedAt: Timestamp.now(),
          });
          transaction.set(newSaleRef, saleData);
          console.info('[POS] Venta guardada preliminarmente', saleData);

          for (const item of order) {
            const saleItemRef = doc(collection(firestore, `sales/${newSaleRef.id}/sale_items`));
            const productData = productsMap.get(item.id)!;
            const saleItemData = {
              saleId: newSaleRef.id,
              productId: item.id,
              quantity: item.quantity,
              unitPrice: item.salePrice,
              profit: item.price ? (item.salePrice - item.price) * item.quantity : 0,
            };
            transaction.set(saleItemRef, saleItemData);
            console.debug('[POS] Item registrado', saleItemData);

            // Update product stock
            const productRef = doc(firestore, 'products', item.id);
            const newProductStock = (productData.quantity ?? 0) - item.quantity;
            transaction.update(productRef, { quantity: newProductStock });
            console.debug('[POS] Stock producto actualizado', { productId: item.id, stockAnterior: productData.quantity ?? 0, stockNuevo: newProductStock });

            // Update ingredient stocks (if any)
            if (productData.ingredients) {
              for (const recipeIngredient of productData.ingredients) {
                const ingredientRef = doc(firestore, 'ingredients', recipeIngredient.ingredientId);
                const currentIngredient = ingredientMap.get(recipeIngredient.ingredientId)!;
                const newIngredientStock = (currentIngredient.quantity ?? 0) - (recipeIngredient.quantity * item.quantity);
                transaction.update(ingredientRef, { quantity: newIngredientStock });
                console.debug('[POS] Stock ingrediente actualizado', {
                  ingredientId: recipeIngredient.ingredientId,
                  cantidadAnterior: currentIngredient.quantity ?? 0,
                  cantidadNueva: newIngredientStock,
                  usadoPor: item.id,
                });
              }
            }
          }
          console.groupEnd();
        });
        
        // Create a corresponding online_order for the kitchen
        const onlineOrderRef = collection(firestore, 'online_orders');
        const orderItemsSnapshot = order.map(item => ({
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
            totalAmount: total,
            paymentMethod: paymentMethod,
            source: 'pos',
            itemsCount: order.reduce((sum, item) => sum + item.quantity, 0),
            items: orderItemsSnapshot,
            notes: null,
          customerDocumentType: normalizedCustomer.documentType,
          customerDocumentNumber: normalizedCustomer.documentNumber,
        };
        await addDocumentNonBlocking(onlineOrderRef, newOrderData);
        console.info('[POS] Pedido enviado a cocina', newOrderData);

        const issuedAt = new Date().toISOString();

        if (createdSaleId && issueBoleta) {
          console.info('[POS] Venta lista para SUNAT', { saleId: createdSaleId, serie: generatedSerie, correlativo: generatedCorrelativo });
          const sunatPayload: SunatBoletaPayload = {
            saleId: createdSaleId,
            total,
            paymentMethod,
            issuedAt,
            serie: generatedSerie,
            correlativo: generatedCorrelativo,
            customer: {
              name: normalizedCustomer.name,
              documentType: normalizedCustomer.documentType,
              documentNumber: normalizedCustomer.documentNumber,
            },
            items: orderItemsSnapshot.map(item => ({
              productId: item.productId,
              description: item.productName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            })),
          };
          const sunatResult = await sendSaleToSunat(createdSaleId, sunatPayload);
          triggerThermalPrint({
            serie: generatedSerie,
            correlativo: generatedCorrelativo,
            issuedAt,
            customer: normalizedCustomer,
            items: orderItemsSnapshot,
            total,
            paymentMethod,
            sunatStatus: sunatResult.status,
            sunatNote: sunatResult.message,
            cashierEmail: user.email,
          });
        }

        toast({
          title: "Venta registrada",
          description: "La venta se ha guardado, el stock se actualizó y el pedido fue enviado a cocina.",
        });
        handleResetOrder();

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
    <div className="flex flex-col lg:flex-row h-[calc(100vh-6rem)] gap-4 overflow-hidden">
        <PaymentModal 
            isOpen={isPaymentModalOpen}
            onClose={() => setPaymentModalOpen(false)}
            total={total}
            onSuccess={handleSuccessfulPayment}
        />
      
      {/* Left Side: Product Grid */}
      <div className="flex-1 flex flex-col min-h-0 bg-background rounded-xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-muted/20 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-headline font-bold">Productos</h2>
              <Button variant="ghost" size="sm" className="text-xs uppercase tracking-wide" onClick={() => setCategoryFilter('all')}>
                Ver todo
              </Button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              <Button
                variant={categoryFilter === 'all' ? 'default' : 'secondary'}
                size="sm"
                className="h-9 shrink-0"
                onClick={() => setCategoryFilter('all')}
              >
                Todas
              </Button>
              {categoryKeys.map((key) => (
                <Button
                  key={key}
                  variant={categoryFilter === key ? 'default' : 'outline'}
                  size="sm"
                  className="h-9 shrink-0"
                  onClick={() => setCategoryFilter(key)}
                >
                  {PRODUCT_CATEGORY_LABELS[key]}
                </Button>
              ))}
            </div>
        </div>
        
        <ScrollArea className="flex-1 p-4">
            {isLoading ? (
                <div className="flex items-center justify-center h-full">
                    <p className="text-lg text-muted-foreground animate-pulse">Cargando productos...</p>
                </div>
            ) : (
                <div className="space-y-6 pb-20 lg:pb-0">
                  {categoryFilter === 'all' ? (
                    categoryKeys.map((key) => (
                      groupedProducts[key].length > 0 && (
                        <div key={key} className="space-y-3">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-semibold">{PRODUCT_CATEGORY_LABELS[key]}</h3>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                              {groupedProducts[key].length} productos
                            </span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                            {groupedProducts[key].map((product) => (
                              <button
                                key={product.id}
                                className="group relative flex flex-col items-center text-center bg-card rounded-xl border-2 border-transparent hover:border-primary/50 active:scale-95 transition-all duration-200 overflow-hidden shadow-sm hover:shadow-md touch-manipulation"
                                onClick={() => addToOrder(product)}
                              >
                                {recentlyAdded === product.id && (
                                  <div className="absolute inset-0 bg-primary/90 flex items-center justify-center z-20 animate-in fade-in-0 zoom-in-95 duration-200">
                                    <CheckCircle className="h-12 w-12 text-primary-foreground" />
                                  </div>
                                )}
                                <div className="w-full p-6 sm:p-8 flex flex-col items-center justify-center bg-card min-h-[8rem]">
                                  <p className="text-lg sm:text-2xl font-bold text-center leading-tight">{product.name}</p>
                                  <p className="mt-2 text-base sm:text-lg font-extrabold text-primary">S/ {product.salePrice.toFixed(2)}</p>
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
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-semibold">{PRODUCT_CATEGORY_LABELS[categoryFilter]}</h3>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                              {filteredProducts.length} productos
                            </span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                            {filteredProducts.map((product) => (
                              <button
                                key={product.id}
                                className="group relative flex flex-col items-center text-center bg-card rounded-xl border-2 border-transparent hover:border-primary/50 active:scale-95 transition-all duration-200 overflow-hidden shadow-sm hover:shadow-md touch-manipulation"
                                onClick={() => addToOrder(product)}
                              >
                                {recentlyAdded === product.id && (
                                  <div className="absolute inset-0 bg-primary/90 flex items-center justify-center z-20 animate-in fade-in-0 zoom-in-95 duration-200">
                                    <CheckCircle className="h-12 w-12 text-primary-foreground" />
                                  </div>
                                )}
                                <div className="w-full p-6 sm:p-8 flex flex-col items-center justify-center bg-card min-h-[8rem]">
                                  <p className="text-lg sm:text-2xl font-bold text-center leading-tight">{product.name}</p>
                                  <p className="mt-2 text-base sm:text-lg font-extrabold text-primary">S/ {product.salePrice.toFixed(2)}</p>
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

      {/* Right Side: Order Summary */}
      <div className="w-full lg:w-[400px] xl:w-[450px] flex flex-col bg-background rounded-xl border shadow-sm overflow-hidden h-[40vh] lg:h-auto flex-shrink-0">
        {/* Customer Selector Header */}
        <div className="p-4 border-b bg-muted/20 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-headline font-bold flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Pedido Actual
            </h2>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleResetOrder}
              className="text-muted-foreground hover:text-destructive"
              disabled={order.length === 0}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Limpiar
            </Button>
          </div>
          <div className="rounded-lg border bg-card p-3 text-sm leading-relaxed text-muted-foreground">
            <p className="font-semibold text-foreground mb-2">Paso a paso para vender:</p>
            <ol className="list-decimal list-inside space-y-1">
            <li>Selecciona la categoría y añade productos al pedido.</li>
            <li>Revisa cantidades y totales del pedido.</li>
            <li>Presiona "Procesar Pago" y elige el método.</li>
            <li>Entrega el comprobante al cliente y envía el ticket a cocina.</li>
            </ol>
          </div>
        </div>

        {/* Order Items List */}
        <ScrollArea className="flex-1 bg-muted/10">
            {order.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center text-muted-foreground space-y-4">
                    <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
                        <ShoppingCart className="h-10 w-10 opacity-20" />
                    </div>
                    <div>
                        <p className="text-lg font-medium">El pedido está vacío</p>
                        <p className="text-sm">Selecciona productos del menú para comenzar</p>
                    </div>
                </div>
            ) : (
                <div className="p-4 space-y-3">
                    {order.map((item) => (
                        <div key={item.id} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-card rounded-lg border shadow-sm animate-in slide-in-from-left-5 duration-300">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-base truncate">{item.name}</p>
                            <p className="text-sm text-muted-foreground">S/ {item.salePrice.toFixed(2)} c/u</p>
                          </div>

                            <div className="flex items-center gap-0.5 sm:gap-1 bg-muted/30 rounded-lg p-0.5 sm:p-1 flex-shrink-0">
                                <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="h-8 w-8 sm:h-10 sm:w-10 rounded-md hover:bg-background hover:shadow-sm touch-manipulation" 
                                    onClick={() => updateQuantity(item.id, -1)}
                                >
                                    <Minus className="h-4 w-4 sm:h-5 sm:w-5" />
                                </Button>
                                <span className="font-bold text-base sm:text-lg w-6 sm:w-8 text-center tabular-nums">{item.quantity}</span>
                                <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="h-8 w-8 sm:h-10 sm:w-10 rounded-md hover:bg-background hover:shadow-sm touch-manipulation" 
                                    onClick={() => updateQuantity(item.id, 1)}
                                >
                                    <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                                </Button>
                            </div>
                            
                            <div className="text-right min-w-[5rem] flex-shrink-0">
                              <p className="font-bold text-sm sm:text-base whitespace-nowrap">S/ {(item.salePrice * item.quantity).toFixed(2)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </ScrollArea>

        {/* Footer Totals & Action */}
        <div className="p-4 bg-background border-t space-y-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
            <div className="space-y-2">
                <div className="flex justify-between text-sm sm:text-base text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="font-medium">S/ {subtotal.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-end gap-2">
                    <span className="text-base sm:text-lg font-semibold">Total a Pagar</span>
                    <span className="text-2xl sm:text-3xl font-bold text-primary whitespace-nowrap">S/ {total.toFixed(2)}</span>
                </div>
            </div>
            
            <Button 
                className="w-full h-16 text-xl font-bold shadow-lg hover:shadow-xl transition-all active:scale-[0.98] touch-manipulation" 
                size="lg" 
                onClick={() => setPaymentModalOpen(true)}
                disabled={order.length === 0}
            >
                Procesar Pago
                <span className="ml-2 bg-primary-foreground/20 px-2 py-0.5 rounded text-sm">
                    (S/ {total.toFixed(2)})
                </span>
            </Button>
            <div className="mt-2 flex gap-2">
                    <Button
                variant="outline"
                size="sm"
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
                    Imprimir última boleta
                  </Button>
                  <div className="text-xs text-muted-foreground mt-1">
                    Consejo: en el diálogo de impresión selecciona papel "Thermal Paper (58 x 210)", Márgenes "Ninguno"/"Mínimos" y desactiva "Encabezado y pie de página" para evitar áreas en blanco.
                  </div>
            </div>
        </div>
      </div>
    </div>
  );
}
