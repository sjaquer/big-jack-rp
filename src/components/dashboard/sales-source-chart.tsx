'use client';

import { useMemo } from 'react';
import { Pie, PieChart, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { Sale } from '@/lib/types';

interface SalesSourceChartProps {
  data: Sale[];
  isLoading: boolean;
}

const SOURCE_LABELS: Record<string, string> = {
  pos: 'POS',
  online: 'Online',
  delivery: 'Delivery',
};

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))'];

export function SalesSourceChart({ data, isLoading }: SalesSourceChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const sourceMap = new Map<string, { total: number; count: number }>();

    data.forEach((sale) => {
      const source = sale.source || 'pos';
      if (!sourceMap.has(source)) {
        sourceMap.set(source, { total: 0, count: 0 });
      }
      const stats = sourceMap.get(source)!;
      stats.total += sale.totalAmount;
      stats.count += 1;
    });

    return Array.from(sourceMap.entries()).map(([source, stats]) => ({
      name: SOURCE_LABELS[source] || source,
      value: stats.total,
      count: stats.count,
    }));
  }, [data]);

  if (isLoading) {
    return <div className="h-[300px] flex items-center justify-center text-muted-foreground">Cargando...</div>;
  }

  if (chartData.length === 0) {
    return <div className="h-[300px] flex items-center justify-center text-muted-foreground">No hay datos disponibles</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip 
          formatter={(value: number) => `S/ ${value.toFixed(2)}`}
          contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
