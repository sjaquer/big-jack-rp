'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFirestore, useUser } from '@/firebase';
import { collection, query, orderBy, limit, where, getDocs, doc, deleteDoc, writeBatch, getDoc, Timestamp, increment } from 'firebase/firestore';
import type { Sale, SaleItem, Product } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Trash2, X, Receipt, Clock, User, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { convertInventoryQuantity } from '@/lib/unit-conversion';

interface RecentSalesDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SaleWithItems extends Sale {
  items: SaleItem[];
}

export function RecentSalesDialog({ isOpen, onClose }: RecentSalesDialogProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [sales, setSales] = useState<SaleWithItems[]>([]);
  const [loading, setLoading] = useState(false);
  const [cancelingSaleId, setCancelingSaleId] = useState<string | null>(null);
  const [saleToCancel, setSaleToCancel] = useState<SaleWithItems | null>(null);

  useEffect(() => {
    if (isOpen && firestore) {
      loadRecentSales();
    }
  }, [isOpen, firestore]);

  const loadRecentSales = async () => {
    if (!firestore) return;

    setLoading(true);
    try {
      // Obtener ventas de las últimas 24 horas del turno actual
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const salesQuery = query(
        collection(firestore, 'sales'),
        where('saleDate', '>=', Timestamp.fromDate(twentyFourHoursAgo)),
        orderBy('saleDate', 'desc'),
        limit(50)
      );

      const salesSnapshot = await getDocs(salesQuery);
      const salesData: SaleWithItems[] = [];

      for (const saleDoc of salesSnapshot.docs) {
        const saleData = { id: saleDoc.id, ...saleDoc.data() } as Sale;

        // Obtener los items de esta venta (Subcolección)
        const itemsQuery = query(
          collection(firestore, 'sales', saleDoc.id, 'sale_items')
        );
        const itemsSnapshot = await getDocs(itemsQuery);
        const items = itemsSnapshot.docs.map(itemDoc => ({
          id: itemDoc.id,
          ...itemDoc.data(),
        })) as SaleItem[];

        salesData.push({
          ...saleData,
          items,
        });
      }

      setSales(salesData);
    } catch (error) {
      console.error('Error cargando ventas recientes:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las ventas recientes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSale = async () => {
    if (!firestore || !saleToCancel) return;

    setCancelingSaleId(saleToCancel.id);

    try {
      const batch = writeBatch(firestore);

      const ingredientUnits = new Map<string, string>();

      // 1. Restaurar el stock de los productos
      for (const item of saleToCancel.items) {
        const productRef = doc(firestore, 'products', item.productId);
        const productDoc = await getDoc(productRef);

        if (productDoc.exists()) {
          const productData = productDoc.data() as Product;

          const productIngredientIds = (productData.ingredients ?? [])
            .filter((ingredient) => (ingredient.sourceType ?? 'ingredient') === 'ingredient')
            .map((ingredient) => ingredient.ingredientId);

          await Promise.all(productIngredientIds.map(async (ingredientId) => {
            if (ingredientUnits.has(ingredientId)) return;
            const ingredientDoc = await getDoc(doc(firestore, 'ingredients', ingredientId));
            if (!ingredientDoc.exists()) return;
            const ingredientData = ingredientDoc.data() as { unit?: string };
            if (ingredientData.unit) {
              ingredientUnits.set(ingredientId, ingredientData.unit);
            }
          }));
          
          // Restaurar ingredientes
          if (productData.ingredients && productData.ingredients.length > 0) {
            for (const ingredient of productData.ingredients) {
              const sourceType = ingredient.sourceType === 'inventory_item' ? 'inventory_items' : 'ingredients';
              const restoreQuantity = sourceType === 'ingredients'
                ? convertInventoryQuantity(ingredient.quantity * item.quantity, ingredient.unit, ingredientUnits.get(ingredient.ingredientId)) ?? (ingredient.quantity * item.quantity)
                : ingredient.quantity * item.quantity;
              const ingredientRef = doc(firestore, sourceType, ingredient.ingredientId);
              batch.update(ingredientRef, {
                quantity: increment(restoreQuantity),
              });
            }
          }

        }
      }

      // 2. Eliminar los items de la venta
      for (const item of saleToCancel.items) {
        const itemRef = doc(firestore, 'sales', saleToCancel.id, 'sale_items', item.id);
        batch.delete(itemRef);
      }

      // 3. Eliminar la venta
      const saleRef = doc(firestore, 'sales', saleToCancel.id);
      batch.delete(saleRef);

      // 4. Registrar el movimiento de cancelación
      const movementRef = doc(collection(firestore, 'inventory_movements'));
      batch.set(movementRef, {
        type: 'sale_cancellation',
        saleId: saleToCancel.id,
        totalAmount: saleToCancel.totalAmount,
        userId: user?.uid || 'unknown',
        timestamp: Timestamp.now(),
        note: `Venta cancelada - ${saleToCancel.receiptReference || saleToCancel.id}`,
      });

      await batch.commit();

      toast({
        title: 'Venta cancelada',
        description: 'El stock ha sido restaurado correctamente',
      });

      // Recargar la lista
      await loadRecentSales();
      setSaleToCancel(null);
    } catch (error) {
      console.error('Error cancelando venta:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cancelar la venta',
        variant: 'destructive',
      });
    } finally {
      setCancelingSaleId(null);
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: 'Efectivo',
      card: 'Tarjeta',
      yape: 'Yape',
      plin: 'Plin',
      'pedidos-ya': 'Pedidos Ya',
    };
    return labels[method] || method;
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px] h-[85vh] sm:h-auto sm:max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Ventas Recientes (24h)
            </DialogTitle>
            <DialogDescription>
              Ventas del POS de las últimas 24 horas. Puedes cancelar una venta para restaurar el stock.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-muted-foreground">Cargando...</p>
              </div>
            ) : sales.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-muted-foreground">No hay ventas recientes</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sales.map((sale) => (
                  <div
                    key={sale.id}
                    className="border rounded-lg p-4 space-y-3 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {sale.receiptReference && (
                            <Badge variant="secondary" className="font-mono">
                              Ref: {sale.receiptReference}
                            </Badge>
                          )}
                          <Badge variant="outline">
                            S/ {(sale.totalAmount ?? 0).toFixed(2)}
                          </Badge>
                        </div>

                        <div className="text-sm space-y-1">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {format(sale.saleDate.toDate(), "dd MMM yyyy 'a las' HH:mm", { locale: es })}
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <User className="h-3 w-3" />
                            {sale.customerName || 'Cliente Mostrador'}
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <CreditCard className="h-3 w-3" />
                            {getPaymentMethodLabel(sale.paymentMethod)}
                          </div>
                        </div>

                        {sale.items.length > 0 && (
                          <div className="text-xs text-muted-foreground border-t pt-2 mt-2">
                            <p className="font-medium mb-1">Items:</p>
                            <ul className="space-y-0.5">
                              {sale.items.map((item, idx) => (
                                <li key={idx}>
                                  • {item.quantity}x {item.productName || 'Producto'} - S/ {(item.unitPrice ?? 0).toFixed(2)}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setSaleToCancel(sale)}
                        disabled={cancelingSaleId === sale.id}
                        className="flex-shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!saleToCancel} onOpenChange={() => setSaleToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar esta venta?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Esta acción no se puede deshacer. Se realizará lo siguiente:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Se eliminará la venta y sus items</li>
                <li>Se restaurará el stock de productos e ingredientes</li>
                <li>Se registrará el movimiento de cancelación</li>
              </ul>
              {saleToCancel && (
                <div className="mt-3 p-3 bg-muted rounded-lg">
                  <p className="font-semibold">
                    Venta: S/ {(saleToCancel.totalAmount ?? 0).toFixed(2)}
                  </p>
                  {saleToCancel.receiptReference && (
                    <p className="text-sm">
                      Referencia: {saleToCancel.receiptReference}
                    </p>
                  )}
                  <p className="text-sm">
                    {saleToCancel.items.length} item(s)
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!cancelingSaleId}>
              No, mantener venta
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSale}
              disabled={!!cancelingSaleId}
              className="bg-destructive hover:bg-destructive/90"
            >
              {cancelingSaleId ? 'Cancelando...' : 'Sí, cancelar venta'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
