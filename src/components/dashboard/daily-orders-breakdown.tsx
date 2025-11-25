'use client';
import { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { Sale, SaleItem, Product } from '@/lib/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface DailyOrdersBreakdownProps {
  sales: Sale[];
  saleItems: SaleItem[];
  products: Product[];
  isLoading: boolean;
}

interface OrderWithDetails extends Sale {
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
}

export function DailyOrdersBreakdown({ sales, saleItems, products, isLoading }: DailyOrdersBreakdownProps) {
  const ordersWithDetails = useMemo((): OrderWithDetails[] => {
    if (!sales || !saleItems || !products) return [];

    return sales.map(sale => {
      const orderItems = saleItems
        .filter(item => item.saleId === sale.id)
        .map(item => {
          const product = products.find(p => p.id === item.productId);
          return {
            productName: product?.name || 'Producto desconocido',
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.quantity * item.unitPrice,
          };
        });

      return {
        ...sale,
        items: orderItems,
      };
    }).sort((a, b) => b.saleDate.toMillis() - a.saleDate.toMillis()); // Más recientes primero
  }, [sales, saleItems, products]);

  const productSummary = useMemo(() => {
    if (!saleItems || !products) return [];

    const summary = new Map<string, { name: string; quantity: number; revenue: number }>();

    saleItems.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      const productName = product?.name || 'Producto desconocido';
      
      if (summary.has(item.productId)) {
        const existing = summary.get(item.productId)!;
        existing.quantity += item.quantity;
        existing.revenue += item.quantity * item.unitPrice;
      } else {
        summary.set(item.productId, {
          name: productName,
          quantity: item.quantity,
          revenue: item.quantity * item.unitPrice,
        });
      }
    });

    return Array.from(summary.values()).sort((a, b) => b.quantity - a.quantity);
  }, [saleItems, products]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (!ordersWithDetails.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">No hay pedidos registrados hoy.</p>
        <p className="text-xs mt-1">Los pedidos aparecerán aquí a medida que se realicen ventas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumen de productos vendidos */}
      <div className="rounded-lg border p-4 bg-muted/30">
        <h3 className="font-semibold text-base mb-3">Resumen de productos vendidos hoy</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {productSummary.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 rounded-md border bg-background">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {item.quantity} {item.quantity === 1 ? 'unidad' : 'unidades'}
                </p>
              </div>
              <div className="ml-2 text-right">
                <p className="font-semibold text-sm">S/ {item.revenue.toFixed(2)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lista detallada de pedidos */}
      <div>
        <h3 className="font-semibold text-base mb-3">Detalle de pedidos ({ordersWithDetails.length})</h3>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hora</TableHead>
                <TableHead>Productos</TableHead>
                <TableHead>Método de pago</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordersWithDetails.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">
                    {format(order.saleDate.toDate(), 'HH:mm', { locale: es })}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="text-sm">
                          <span className="font-medium">{item.quantity}x</span> {item.productName}
                          <span className="text-muted-foreground ml-2">
                            (S/ {item.subtotal.toFixed(2)})
                          </span>
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={order.paymentMethod === 'cash' ? 'default' : 'secondary'}>
                      {order.paymentMethod === 'cash' ? 'Efectivo' :
                       order.paymentMethod === 'card' ? 'Tarjeta' :
                       order.paymentMethod === 'yape' ? 'Yape' :
                       order.paymentMethod === 'plin' ? 'Plin' :
                       order.paymentMethod === 'transfer' ? 'Transferencia' :
                       order.paymentMethod}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    S/ {order.totalAmount.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
