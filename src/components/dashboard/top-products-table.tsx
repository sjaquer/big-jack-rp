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
import type { Product, SaleItem } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

interface TopProductsTableProps {
  products: Product[];
  saleItems: SaleItem[];
  isLoading: boolean;
  limit?: number;
}

export function TopProductsTable({ 
  products, 
  saleItems, 
  isLoading,
  limit = 10 
}: TopProductsTableProps) {
  const topProducts = useMemo(() => {
    if (!products || !saleItems || products.length === 0 || saleItems.length === 0) {
      return [];
    }

    const productMap = new Map(products.map(p => [p.id, p]));
    const stats = new Map<string, { 
      product: Product; 
      quantity: number; 
      revenue: number;
      orders: number;
    }>();

    saleItems.forEach(item => {
      const product = productMap.get(item.productId);
      if (!product) return;

      if (!stats.has(item.productId)) {
        stats.set(item.productId, {
          product,
          quantity: 0,
          revenue: 0,
          orders: 0,
        });
      }

      const stat = stats.get(item.productId)!;
      stat.quantity += item.quantity;
      stat.revenue += item.quantity * item.unitPrice;
      stat.orders += 1;
    });

    return Array.from(stats.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  }, [products, saleItems, limit]);

  const currencyFormatter = new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
  });

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Cargando...</div>;
  }

  if (topProducts.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No hay datos disponibles</div>;
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:hidden">
        {topProducts.map((item, index) => (
          <div key={item.product.id} className="rounded-xl border border-border/70 bg-background/70 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground font-semibold">#{index + 1}</p>
                <p className="font-semibold truncate">{item.product.name}</p>
              </div>
              <Badge variant="secondary">{item.quantity}</Badge>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-muted-foreground">Ingresos</p>
                <p className="font-semibold">{currencyFormatter.format(item.revenue)}</p>
              </div>
              <div className="text-right">
                <p className="text-muted-foreground">Pedidos</p>
                <p className="font-semibold">{item.orders}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead className="text-right">Cantidad</TableHead>
              <TableHead className="text-right">Ingresos</TableHead>
              <TableHead className="text-right">Pedidos</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topProducts.map((item, index) => (
              <TableRow key={item.product.id}>
                <TableCell className="font-bold text-muted-foreground">
                  {index + 1}
                </TableCell>
                <TableCell className="font-medium">{item.product.name}</TableCell>
                <TableCell className="text-right">
                  <Badge variant="secondary">{item.quantity}</Badge>
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {currencyFormatter.format(item.revenue)}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {item.orders}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
