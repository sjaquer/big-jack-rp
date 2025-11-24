
'use client';
import type { Product, SaleItem } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo } from 'react';

interface PopularItemsChartProps {
  products: Product[];
  saleItems: SaleItem[];
  isLoading: boolean;
}

export function PopularItemsChart({ products, saleItems, isLoading }: PopularItemsChartProps) {
  
  const popularItems = useMemo(() => {
    if (!saleItems || !products) return [];

    const productSales = new Map<string, number>();

    saleItems.forEach(item => {
      productSales.set(item.productId, (productSales.get(item.productId) || 0) + item.quantity);
    });

    return Array.from(productSales.entries())
      .map(([productId, quantitySold]) => {
        const product = products.find(p => p.id === productId);
        return {
          id: productId,
          name: product?.name || 'Producto Desconocido',
          quantitySold,
        };
      })
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, 5);

  }, [saleItems, products]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center">
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-1/5 ml-auto" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {popularItems.length === 0 && <p className="text-sm text-muted-foreground">No hay datos de ventas para mostrar.</p>}
      {popularItems.map((item, index) => (
        <div key={item.id} className="flex items-center">
          <div className="text-sm font-medium">
            {index + 1}. {item.name}
          </div>
          <div className="ml-auto text-sm font-semibold">
            {item.quantitySold} vendidos
          </div>
        </div>
      ))}
    </div>
  );
}
