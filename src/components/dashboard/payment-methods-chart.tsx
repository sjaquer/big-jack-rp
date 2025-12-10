'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { Sale } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo } from 'react';

interface PaymentMethodsChartProps {
  data: Sale[];
  isLoading: boolean;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  yape: 'Yape',
  plin: 'Plin',
  transfer: 'Pedidos Ya',
};

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export function PaymentMethodsChart({ data, isLoading }: PaymentMethodsChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const methodTotals = new Map<string, { count: number; amount: number }>();

    data.forEach((sale) => {
      const method = sale.paymentMethod || 'cash';
      const current = methodTotals.get(method) || { count: 0, amount: 0 };
      current.count += 1;
      current.amount += sale.totalAmount;
      methodTotals.set(method, current);
    });

    return Array.from(methodTotals.entries())
      .map(([method, totals]) => ({
        name: PAYMENT_METHOD_LABELS[method] || method,
        value: totals.count,
        amount: totals.amount,
        percentage: ((totals.count / data.length) * 100).toFixed(1),
      }))
      .sort((a, b) => b.value - a.value);
  }, [data]);

  if (isLoading) {
    return <Skeleton className="w-full h-[250px]" />;
  }

  if (!chartData.length) {
    return (
      <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
        Sin datos de métodos de pago
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
            label={({ name, percentage }) => `${name} (${percentage}%)`}
            labelLine={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1 }}
          >
            {chartData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 'var(--radius)',
              fontSize: '12px',
            }}
            formatter={(value: number, name: string, props: any) => [
              `${value} pedidos • S/ ${props.payload.amount.toFixed(2)}`,
              props.payload.name,
            ]}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-2 gap-2 text-xs">
        {chartData.map((item, index) => (
          <div key={item.name} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="text-muted-foreground truncate">{item.name}</span>
            <span className="ml-auto font-medium">S/ {item.amount.toFixed(0)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
