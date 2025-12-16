'use client';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Plus, Minus, CheckCircle, Trash2, ShoppingCart, Banknote, CreditCard, Smartphone, ArrowRightLeft, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { PRODUCT_CATEGORY_LABELS, Product, ProductCategory } from '@/lib/types';
import { collection, query, orderBy, limit, getDocs, getDoc, doc } from 'firebase/firestore';

interface ProductGridProps {
  categoryFilter: 'all' | ProductCategory;
  setCategoryFilter: (category: 'all' | ProductCategory) => void;
  categoryKeys: ProductCategory[];
  groupedProducts: Record<ProductCategory, Product[]>;
  filteredProducts: Product[] | null;
  isLoading: boolean;
  recentlyAdded: string | null;
  addToOrder: (product: Product) => void;
  setRecentSalesOpen: (open: boolean) => void;
}

export function ProductGrid({
  categoryFilter,
  setCategoryFilter,
  categoryKeys,
  groupedProducts,
  filteredProducts,
  isLoading,
  recentlyAdded,
  addToOrder,
  setRecentSalesOpen,
}: ProductGridProps) {
  return (
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
  );
}

interface CartPanelProps {
  order: any[];
  handleResetOrder: () => void;
  updateQuantity: (id: string, delta: number) => void;
  subtotal: number;
  total: number;
  selectedPaymentMethod: string;
  setSelectedPaymentMethod: (method: string) => void;
  setPaymentModalOpen: (open: boolean) => void;
  firestore: any;
  triggerThermalPrint: (payload: any) => void;
}

export function CartPanel({
  order,
  handleResetOrder,
  updateQuantity,
  subtotal,
  total,
  selectedPaymentMethod,
  setSelectedPaymentMethod,
  setPaymentModalOpen,
  firestore,
  triggerThermalPrint,
}: CartPanelProps) {
  const { toast } = useToast();
  return (
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
  );
}
