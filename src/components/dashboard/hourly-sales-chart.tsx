'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import type { Sale } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo } from 'react';

interface HourlySalesChartProps {
  data: Sale[];
  isLoading: boolean;
}

// Horas del turno de 3PM (15:00) a 2AM (02:00)
const SHIFT_HOURS = [15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2];

export function HourlySalesChart({ data, isLoading }: HourlySalesChartProps) {
  const aggregatedData = useMemo(() => {
    if (!data) return [];

    const salesByHour = new Map<number, { count: number; amount: number }>();
    
    // Inicializar todas las horas del turno
    SHIFT_HOURS.forEach(hour => {
      salesByHour.set(hour, { count: 0, amount: 0 });
    });

    data.forEach((sale) => {
      if (sale.saleDate) {
        const saleHour = sale.saleDate.toDate().getHours();
        if (SHIFT_HOURS.includes(saleHour)) {
          const current = salesByHour.get(saleHour)!;
          current.count += 1;
          current.amount += sale.totalAmount;
        }
      }
    });

    return SHIFT_HOURS.map(hour => ({
      hour: hour.toString().padStart(2, '0') + ':00',
      ventas: salesByHour.get(hour)?.count || 0,
      monto: salesByHour.get(hour)?.amount || 0,
      isPeakHour: (salesByHour.get(hour)?.count || 0) >= Math.max(...Array.from(salesByHour.values()).map(v => v.count)) * 0.8,
    }));
  }, [data]);

  const peakHour = useMemo(() => {
    if (!aggregatedData.length) return null;
    const maxSales = Math.max(...aggregatedData.map(d => d.ventas));
    return aggregatedData.find(d => d.ventas === maxSales);
  }, [aggregatedData]);

  if (isLoading) {
    return <Skeleton className="w-full h-[250px]" />;
  }

  return (
    <div className="space-y-2">
      {peakHour && peakHour.ventas > 0 && (
        <div className="text-xs text-muted-foreground">
          🔥 Hora pico: <span className="font-semibold text-primary">{peakHour.hour}</span> con {peakHour.ventas} ventas
        </div>
      )}
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={aggregatedData}>
          <XAxis
            dataKey="hour"
            stroke="hsl(var(--muted-foreground))"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            interval={0}
            angle={-45}
            textAnchor="end"
            height={50}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
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
              name === 'ventas' ? `${value} pedidos` : `S/ ${value.toFixed(2)}`,
              name === 'ventas' ? 'Pedidos' : 'Monto',
            ]}
          />
          <Bar dataKey="ventas" radius={[4, 4, 0, 0]}>
            {aggregatedData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.isPeakHour ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.5)'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
