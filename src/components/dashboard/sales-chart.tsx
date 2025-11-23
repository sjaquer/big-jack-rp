'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import type { Sale } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

interface SalesChartProps {
  data: Sale[];
  isLoading: boolean;
}

export function SalesChart({ data, isLoading }: SalesChartProps) {

  if (isLoading) {
    return <Skeleton className="w-full h-[350px]" />;
  }
    
  const chartData = data.map((sale) => ({
    // Firebase timestamps might need to be converted to Date objects
    name: sale.saleDate ? format(typeof sale.saleDate === 'string' ? parseISO(sale.saleDate) : sale.saleDate.toDate(), 'EEE', { locale: es }) : 'N/A',
    total: sale.totalAmount,
  }));


  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={chartData}>
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
        />
        <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
