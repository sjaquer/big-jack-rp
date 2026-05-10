'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import type { Product, SaleItem } from '@/lib/types';
import { PRODUCT_CATEGORY_LABELS, ProductCategory } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo } from 'react';

interface CategorySalesChartProps {
  products: Product[];
  saleItems: SaleItem[];
  isLoading: boolean;
}

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--primary))',
  'hsl(var(--primary) / 0.7)',
  'hsl(var(--primary) / 0.5)',
];

export function CategorySalesChart({ products, saleItems, isLoading }: CategorySalesChartProps) {
  const chartData = useMemo(() => {
    if (!products || !saleItems || saleItems.length === 0) return [];

    const productMap = new Map(products.map(p => [p.id, p]));
    const categoryTotals = new Map<string, { count: number; revenue: number }>();

    saleItems.forEach((item) => {
      const product = productMap.get(item.productId);
      const category = product?.category || 'otros';
      const current = categoryTotals.get(category) || { count: 0, revenue: 0 };
      current.count += item.quantity;
      current.revenue += item.quantity * item.unitPrice;
      categoryTotals.set(category, current);
    });

    return Array.from(categoryTotals.entries())
      .map(([category, totals]) => ({
        name: PRODUCT_CATEGORY_LABELS[category as ProductCategory] || category,
        category,
        cantidad: totals.count,
        ingresos: totals.revenue,
      }))
      .sort((a, b) => b.ingresos - a.ingresos)
      .slice(0, 8);
  }, [products, saleItems]);

  const totalRevenue = useMemo(() => {
    return chartData.reduce((sum, item) => sum + item.ingresos, 0);
  }, [chartData]);

  if (isLoading) {
    return <Skeleton className="w-full h-[280px]" />;
  }

  if (!chartData.length) {
    return (
      <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
        Sin datos de categorías
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} layout="vertical">
          <XAxis
            type="number"
            stroke="hsl(var(--muted-foreground))"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `S/${value}`}
          />
          <YAxis
            type="category"
            dataKey="name"
            stroke="hsl(var(--muted-foreground))"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            width={100}
          />
          <Tooltip
            cursor={{ fill: 'hsl(var(--muted))' }}
            contentStyle={{
              background: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 'var(--radius)',
              fontSize: '12px',
            }}
            formatter={(value: number, name: string) => [
              name === 'ingresos' ? `S/ ${value.toFixed(2)}` : `${value} unidades`,
              name === 'ingresos' ? 'Ingresos' : 'Cantidad',
            ]}
          />
          <Bar dataKey="ingresos" radius={[0, 4, 4, 0]}>
            {chartData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-2 gap-1.5 text-xs">
        {chartData.slice(0, 4).map((item, index) => (
          <div key={item.category} className="flex items-center justify-between px-2 py-1 bg-muted/30 rounded">
            <div className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="text-muted-foreground truncate">{item.name}</span>
            </div>
            <span className="font-medium">{((item.ingresos / totalRevenue) * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
