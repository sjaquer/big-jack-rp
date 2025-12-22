'use client';

import { useMemo } from 'react';
import { Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { Sale } from '@/lib/types';
import { format, getHours } from 'date-fns';

interface HourlyPerformanceChartProps {
  data: Sale[];
  isLoading: boolean;
}

export function HourlyPerformanceChart({ data, isLoading }: HourlyPerformanceChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const hourlyStats = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      total: 0,
      count: 0,
    }));

    data.forEach((sale) => {
      const date = sale.saleDate.toDate();
      const hour = getHours(date);
      hourlyStats[hour].total += sale.totalAmount;
      hourlyStats[hour].count += 1;
    });

    return hourlyStats
      .filter(h => h.count > 0)
      .map(h => ({
        hora: `${h.hour}:00`,
        ingresos: h.total,
        pedidos: h.count,
        promedio: h.count > 0 ? h.total / h.count : 0,
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
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="hora" className="text-xs" />
        <YAxis yAxisId="left" className="text-xs" />
        <YAxis yAxisId="right" orientation="right" className="text-xs" />
        <Tooltip 
          formatter={(value: number, name: string) => {
            if (name === 'ingresos' || name === 'promedio') {
              return `S/ ${value.toFixed(2)}`;
            }
            return value;
          }}
          contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
        />
        <Legend />
        <Line 
          yAxisId="left"
          type="monotone" 
          dataKey="ingresos" 
          stroke="hsl(var(--primary))" 
          strokeWidth={2}
          name="Ingresos"
        />
        <Line 
          yAxisId="right"
          type="monotone" 
          dataKey="pedidos" 
          stroke="hsl(var(--chart-2))" 
          strokeWidth={2}
          name="Pedidos"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
