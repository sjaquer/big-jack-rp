'use client';

import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { Sale } from '@/lib/types';
import { format, getDay } from 'date-fns';
import { es } from 'date-fns/locale';

interface WeekdaySalesChartProps {
  data: Sale[];
  isLoading: boolean;
}

const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export function WeekdaySalesChart({ data, isLoading }: WeekdaySalesChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const weekdayStats = WEEKDAYS.map((name, index) => ({
      name,
      dayIndex: index,
      total: 0,
      count: 0,
    }));

    data.forEach((sale) => {
      const date = sale.saleDate.toDate();
      const dayIndex = getDay(date);
      weekdayStats[dayIndex].total += sale.totalAmount;
      weekdayStats[dayIndex].count += 1;
    });

    return weekdayStats.map(day => ({
      name: day.name.slice(0, 3),
      total: day.total,
      promedio: day.count > 0 ? day.total / day.count : 0,
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
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="name" className="text-xs" />
        <YAxis className="text-xs" />
        <Tooltip 
          formatter={(value: number) => `S/ ${value.toFixed(2)}`}
          contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
        />
        <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
