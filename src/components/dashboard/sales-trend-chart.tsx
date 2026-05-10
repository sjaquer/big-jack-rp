'use client';

import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import type { Sale } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo } from 'react';
import { format, subDays, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

interface SalesTrendChartProps {
  data: Sale[];
  isLoading: boolean;
  days?: number;
}

export function SalesTrendChart({ data, isLoading, days = 14 }: SalesTrendChartProps) {
  const chartData = useMemo(() => {
    if (!data) return [];

    // Crear mapa de los últimos N días
    const salesByDay = new Map<string, { revenue: number; orders: number }>();
    
    // Inicializar todos los días
    for (let i = days - 1; i >= 0; i--) {
      const day = format(startOfDay(subDays(new Date(), i)), 'yyyy-MM-dd');
      salesByDay.set(day, { revenue: 0, orders: 0 });
    }

    // Agregar ventas
    data.forEach((sale) => {
      if (sale.saleDate) {
        const day = format(startOfDay(sale.saleDate.toDate()), 'yyyy-MM-dd');
        const current = salesByDay.get(day);
        if (current) {
          current.revenue += sale.totalAmount;
          current.orders += 1;
        }
      }
    });

    return Array.from(salesByDay.entries()).map(([day, totals]) => ({
      date: day,
      name: format(new Date(day), 'dd MMM', { locale: es }),
      ingresos: totals.revenue,
      pedidos: totals.orders,
    }));
  }, [data, days]);

  // Calcular promedios para líneas de referencia
  const averages = useMemo(() => {
    if (!chartData.length) return { avgRevenue: 0, avgOrders: 0 };
    const totalRevenue = chartData.reduce((sum, d) => sum + d.ingresos, 0);
    const totalOrders = chartData.reduce((sum, d) => sum + d.pedidos, 0);
    return {
      avgRevenue: totalRevenue / chartData.length,
      avgOrders: totalOrders / chartData.length,
    };
  }, [chartData]);

  if (isLoading) {
    return <Skeleton className="w-full h-[300px]" />;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Tendencia de los últimos {days} días</span>
        <span>Promedio: S/ {averages.avgRevenue.toFixed(0)}/día</span>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData}>
          <XAxis
            dataKey="name"
            stroke="hsl(var(--muted-foreground))"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="left"
            stroke="hsl(var(--muted-foreground))"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `S/${value}`}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="hsl(var(--muted-foreground))"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              background: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 'var(--radius)',
              fontSize: '12px',
            }}
            formatter={(value: number, name: string) => [
              name === 'ingresos' ? `S/ ${value.toFixed(2)}` : `${value} pedidos`,
              name === 'ingresos' ? 'Ingresos' : 'Pedidos',
            ]}
          />
          <Legend 
            wrapperStyle={{ fontSize: '11px' }}
            formatter={(value) => value === 'ingresos' ? 'Ingresos' : 'Pedidos'}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="ingresos"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 3 }}
            activeDot={{ r: 5 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="pedidos"
            stroke="hsl(var(--chart-2))"
            strokeWidth={2}
            dot={{ fill: 'hsl(var(--chart-2))', strokeWidth: 0, r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
