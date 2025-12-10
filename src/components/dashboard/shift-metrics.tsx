'use client';

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Receipt, 
  Target,
  Users,
  Zap,
  Minus
} from 'lucide-react';
import type { Sale } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ShiftMetricsProps {
  currentShiftSales: Sale[];
  previousShiftSales: Sale[];
  isLoading: boolean;
}

const currencyFormatter = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  minimumFractionDigits: 2,
});

export function ShiftMetrics({ currentShiftSales, previousShiftSales, isLoading }: ShiftMetricsProps) {
  const metrics = useMemo(() => {
    const currentTotal = currentShiftSales.reduce((sum, s) => sum + s.totalAmount, 0);
    const currentOrders = currentShiftSales.length;
    const currentAvgTicket = currentOrders > 0 ? currentTotal / currentOrders : 0;

    const previousTotal = previousShiftSales.reduce((sum, s) => sum + s.totalAmount, 0);
    const previousOrders = previousShiftSales.length;
    const previousAvgTicket = previousOrders > 0 ? previousTotal / previousOrders : 0;

    // Calcular horas trabajadas del turno actual (basado en primera y última venta)
    let hoursWorked = 0;
    if (currentShiftSales.length > 0) {
      const sortedSales = [...currentShiftSales].sort((a, b) => 
        a.saleDate.toMillis() - b.saleDate.toMillis()
      );
      const firstSale = sortedSales[0].saleDate.toDate();
      const lastSale = sortedSales[sortedSales.length - 1].saleDate.toDate();
      hoursWorked = Math.max(1, (lastSale.getTime() - firstSale.getTime()) / (1000 * 60 * 60));
    }

    const salesPerHour = hoursWorked > 0 ? currentOrders / hoursWorked : 0;
    const revenuePerHour = hoursWorked > 0 ? currentTotal / hoursWorked : 0;

    // Variaciones porcentuales
    const revenueChange = previousTotal > 0 
      ? ((currentTotal - previousTotal) / previousTotal) * 100 
      : 0;
    const ordersChange = previousOrders > 0 
      ? ((currentOrders - previousOrders) / previousOrders) * 100 
      : 0;
    const ticketChange = previousAvgTicket > 0 
      ? ((currentAvgTicket - previousAvgTicket) / previousAvgTicket) * 100 
      : 0;

    // Métricas de clientes únicos (si tienen customerId)
    const uniqueCustomers = new Set(
      currentShiftSales.filter(s => s.customerId).map(s => s.customerId)
    ).size;

    return {
      currentTotal,
      currentOrders,
      currentAvgTicket,
      previousTotal,
      previousOrders,
      salesPerHour,
      revenuePerHour,
      revenueChange,
      ordersChange,
      ticketChange,
      uniqueCustomers,
      hoursWorked,
    };
  }, [currentShiftSales, previousShiftSales]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-muted rounded w-20 mb-2" />
              <div className="h-6 bg-muted rounded w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const metricCards = [
    {
      label: 'Ticket Promedio',
      value: currencyFormatter.format(metrics.currentAvgTicket),
      change: metrics.ticketChange,
      icon: Receipt,
      description: 'Gasto promedio por cliente',
    },
    {
      label: 'Ventas/Hora',
      value: metrics.salesPerHour.toFixed(1),
      subValue: `${currencyFormatter.format(metrics.revenuePerHour)}/hr`,
      icon: Zap,
      description: 'Ritmo actual de ventas',
    },
    {
      label: 'vs Turno Anterior',
      value: `${metrics.revenueChange >= 0 ? '+' : ''}${metrics.revenueChange.toFixed(1)}%`,
      change: metrics.revenueChange,
      icon: metrics.revenueChange >= 0 ? TrendingUp : TrendingDown,
      description: `Antes: ${currencyFormatter.format(metrics.previousTotal)}`,
      isComparison: true,
    },
    {
      label: 'Clientes del Turno',
      value: metrics.uniqueCustomers > 0 ? metrics.uniqueCustomers.toString() : metrics.currentOrders.toString(),
      subValue: metrics.uniqueCustomers > 0 ? 'registrados' : 'transacciones',
      icon: Users,
      description: `${metrics.hoursWorked.toFixed(1)}h de operación`,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {metricCards.map((metric) => (
        <Card key={metric.label} className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">{metric.label}</p>
                <p className={cn(
                  "text-xl font-bold",
                  metric.isComparison && metric.change !== undefined && (
                    metric.change >= 0 ? "text-green-600" : "text-red-500"
                  )
                )}>
                  {metric.value}
                </p>
                {metric.subValue && (
                  <p className="text-xs text-muted-foreground">{metric.subValue}</p>
                )}
                {metric.change !== undefined && !metric.isComparison && (
                  <div className={cn(
                    "flex items-center gap-1 text-xs",
                    metric.change >= 0 ? "text-green-600" : "text-red-500"
                  )}>
                    {metric.change === 0 ? (
                      <Minus className="h-3 w-3" />
                    ) : metric.change >= 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    <span>{metric.change >= 0 ? '+' : ''}{metric.change.toFixed(1)}%</span>
                  </div>
                )}
              </div>
              <metric.icon className={cn(
                "h-5 w-5",
                metric.isComparison && metric.change !== undefined
                  ? metric.change >= 0 ? "text-green-600" : "text-red-500"
                  : "text-muted-foreground"
              )} />
            </div>
            {metric.description && (
              <p className="text-[10px] text-muted-foreground mt-2 truncate">{metric.description}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
