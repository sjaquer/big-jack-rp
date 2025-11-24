
'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import type { Sale } from '@/lib/types';
import { format, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo } from 'react';

interface SalesChartProps {
  data: Sale[];
  isLoading: boolean;
}

export function SalesChart({ data, isLoading }: SalesChartProps) {

  const aggregatedData = useMemo(() => {
    if (!data) return [];

    const salesByDay = new Map<string, number>();

    data.forEach((sale) => {
      if (sale.saleDate) {
        const day = format(startOfDay(sale.saleDate.toDate()), 'yyyy-MM-dd');
        const currentTotal = salesByDay.get(day) || 0;
        salesByDay.set(day, currentTotal + sale.totalAmount);
      }
    });

    const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return format(startOfDay(d), 'yyyy-MM-dd');
    }).reverse();
    
    return last7Days.map(day => {
        return {
            name: format(new Date(day), 'EEE', { locale: es }),
            total: salesByDay.get(day) || 0,
        };
    });
  }, [data]);

  if (isLoading) {
    return <Skeleton className="w-full h-[350px]" />;
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={aggregatedData}>
        <XAxis
          dataKey="name"
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `S/ ${value}`}
        />
        <Tooltip
          cursor={{ fill: 'hsl(var(--muted))' }}
          contentStyle={{
            background: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 'var(--radius)',
          }}
          labelStyle={{ color: 'hsl(var(--foreground))' }}
          formatter={(value: number) => [`S/ ${value.toFixed(2)}`, 'Ventas']}
        />
        <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
