'use client';

import { useMemo } from 'react';
import type { Ingredient, Product } from '@/lib/types';
import { AlertTriangle, Package, TrendingDown } from 'lucide-react';
import { Badge } from '../ui/badge';
import Link from 'next/link';
import { Button } from '../ui/button';

interface StockOverviewProps {
  ingredients: Ingredient[];
  products: Product[];
  isLoading?: boolean;
}

export function StockOverview({ ingredients, products, isLoading }: StockOverviewProps) {
  const stockStats = useMemo(() => {
    const lowStockIngredients = ingredients.filter(
      (ing) => ing.quantity <= (ing.minimumStock || 0)
    );
    const outOfStockIngredients = ingredients.filter((ing) => ing.quantity === 0);
    const lowStockProducts = products.filter(
      (prod) => prod.quantity && prod.quantity <= 5
    );
    const totalItems = ingredients.length + products.length;

    return {
      lowStockIngredients,
      outOfStockIngredients,
      lowStockProducts,
      totalItems,
      healthScore: totalItems > 0
        ? ((totalItems - (lowStockIngredients.length + lowStockProducts.length)) / totalItems) * 100
        : 100,
    };
  }, [ingredients, products]);

  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-8 bg-muted rounded" />
        <div className="h-24 bg-muted rounded" />
        <div className="h-24 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Health score */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground">Estado del Inventario</h3>
          <div className="flex items-center gap-2 mt-1">
            <div className="text-2xl font-bold">
              {stockStats.healthScore.toFixed(0)}%
            </div>
            <Badge variant={stockStats.healthScore >= 80 ? 'default' : stockStats.healthScore >= 60 ? 'secondary' : 'destructive'}>
              {stockStats.healthScore >= 80 ? 'Saludable' : stockStats.healthScore >= 60 ? 'Atención' : 'Crítico'}
            </Badge>
          </div>
        </div>
        <Link href="/inventory">
          <Button variant="outline" size="sm">
            Ver Todo
          </Button>
        </Link>
      </div>

      {/* Alertas críticas */}
      {stockStats.outOfStockIngredients.length > 0 && (
        <div className="p-3 rounded-lg border border-destructive bg-destructive/5">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-sm text-destructive">Ingredientes agotados ({stockStats.outOfStockIngredients.length})</p>
              <div className="mt-2 space-y-1">
                {stockStats.outOfStockIngredients.slice(0, 3).map((ing) => (
                  <p key={ing.id} className="text-xs text-muted-foreground">
                    • {ing.name}
                  </p>
                ))}
                {stockStats.outOfStockIngredients.length > 3 && (
                  <p className="text-xs text-muted-foreground">
                    + {stockStats.outOfStockIngredients.length - 3} más
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stock bajo ingredientes */}
      {stockStats.lowStockIngredients.length > 0 && (
        <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20">
          <div className="flex items-start gap-2">
            <TrendingDown className="h-5 w-5 text-amber-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-sm text-amber-900 dark:text-amber-200">
                Stock bajo - Ingredientes ({stockStats.lowStockIngredients.length})
              </p>
              <div className="mt-2 space-y-1.5">
                {stockStats.lowStockIngredients.slice(0, 5).map((ing) => (
                  <div key={ing.id} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{ing.name}</span>
                    <span className="font-medium text-amber-700 dark:text-amber-400">
                      {ing.quantity} {ing.unit}
                    </span>
                  </div>
                ))}
                {stockStats.lowStockIngredients.length > 5 && (
                  <p className="text-xs text-muted-foreground pt-1">
                    + {stockStats.lowStockIngredients.length - 5} más
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stock bajo productos */}
      {stockStats.lowStockProducts.length > 0 && (
        <div className="p-3 rounded-lg border bg-muted/30">
          <div className="flex items-start gap-2">
            <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-sm">Stock bajo - Productos ({stockStats.lowStockProducts.length})</p>
              <div className="mt-2 space-y-1.5">
                {stockStats.lowStockProducts.slice(0, 3).map((prod) => (
                  <div key={prod.id} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{prod.name}</span>
                    <span className="font-medium">{prod.quantity || 0} unidades</span>
                  </div>
                ))}
                {stockStats.lowStockProducts.length > 3 && (
                  <p className="text-xs text-muted-foreground pt-1">
                    + {stockStats.lowStockProducts.length - 3} más
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Todo bien */}
      {stockStats.lowStockIngredients.length === 0 && 
       stockStats.outOfStockIngredients.length === 0 && 
       stockStats.lowStockProducts.length === 0 && (
        <div className="p-4 rounded-lg border border-green-500/30 bg-green-50/50 dark:bg-green-950/20 text-center">
          <p className="text-sm font-medium text-green-900 dark:text-green-200">
            ✓ Todos los items tienen stock suficiente
          </p>
        </div>
      )}
    </div>
  );
}
