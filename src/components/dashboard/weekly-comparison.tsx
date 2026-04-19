'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowDownRight, ArrowUpRight, CalendarDays, Minus, ShoppingCart, Target, TrendingDown, TrendingUp, DollarSign } from 'lucide-react';
import type { Sale } from '@/lib/types';
import { cn } from '@/lib/utils';
import { addDays, endOfWeek, format, startOfWeek, subWeeks } from 'date-fns';

interface WeeklyComparisonProps {
  currentWeekSales: Sale[];
  previousWeekSales: Sale[];
  isLoading: boolean;
}

const currencyFormatter = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  minimumFractionDigits: 2,
});

function formatWeekRange(date: Date) {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
  return `${format(weekStart, 'dd MMM')} - ${format(weekEnd, 'dd MMM')}`;
}

export function WeeklyComparison({ currentWeekSales, previousWeekSales, isLoading }: WeeklyComparisonProps) {
  const comparison = useMemo(() => {
    const now = new Date();
    const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
    const currentElapsedDays = Math.min(6, Math.max(0, Math.floor((now.getTime() - currentWeekStart.getTime()) / (1000 * 60 * 60 * 24))));
    const previousWeekStart = subWeeks(currentWeekStart, 1);
    const previousWeekComparableEnd = addDays(previousWeekStart, currentElapsedDays + 1);

    const currentWeekComparable = currentWeekSales.filter((sale) => sale.saleDate.toDate() <= now);
    const previousWeekComparable = previousWeekSales.filter((sale) => {
      const saleDate = sale.saleDate.toDate();
      return saleDate >= previousWeekStart && saleDate < previousWeekComparableEnd;
    });

    const currentTotal = currentWeekComparable.reduce((sum, sale) => sum + (sale.totalAmount ?? 0), 0);
    const currentOrders = currentWeekComparable.length;
    const currentAvgTicket = currentOrders > 0 ? currentTotal / currentOrders : 0;

    const previousTotal = previousWeekComparable.reduce((sum, sale) => sum + (sale.totalAmount ?? 0), 0);
    const previousOrders = previousWeekComparable.length;
    const previousAvgTicket = previousOrders > 0 ? previousTotal / previousOrders : 0;

    const revenueChange = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : currentTotal > 0 ? 100 : 0;
    const ordersChange = previousOrders > 0 ? ((currentOrders - previousOrders) / previousOrders) * 100 : currentOrders > 0 ? 100 : 0;
    const ticketChange = previousAvgTicket > 0 ? ((currentAvgTicket - previousAvgTicket) / previousAvgTicket) * 100 : 0;

    const progressToPreviousWeek = previousTotal > 0 ? Math.min((currentTotal / previousTotal) * 100, 150) : 0;

    const dayTotals = new Map<string, number>();
    currentWeekComparable.forEach((sale) => {
      const day = format(sale.saleDate.toDate(), 'EEEE');
      dayTotals.set(day, (dayTotals.get(day) || 0) + sale.totalAmount);
    });

    const strongestDay = Array.from(dayTotals.entries()).sort((a, b) => b[1] - a[1])[0];

    const projectedWeekTotal = currentElapsedDays > 0
      ? (currentTotal / (currentElapsedDays + 1)) * 7
      : currentTotal;

    return {
      currentTotal,
      currentOrders,
      currentAvgTicket,
      previousTotal,
      previousOrders,
      previousAvgTicket,
      revenueChange,
      ordersChange,
      ticketChange,
      progressToPreviousWeek,
      currentElapsedDays,
      projectedWeekTotal,
      strongestDay: strongestDay ? strongestDay[0] : 'N/A',
    };
  }, [currentWeekSales, previousWeekSales]);

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-5 bg-muted rounded w-48" />
          <div className="h-4 bg-muted rounded w-64" />
        </CardHeader>
        <CardContent>
          <div className="h-40 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  const ChangeIndicator = ({ value }: { value: number }) => {
    const isPositive = value >= 0;
    const Icon = value === 0 ? Minus : isPositive ? TrendingUp : TrendingDown;
    return (
      <div className={cn('flex items-center gap-1 text-sm font-medium', isPositive ? 'text-green-600' : 'text-red-500')}>
        <Icon className="h-4 w-4" />
        <span>{isPositive && value !== 0 ? '+' : ''}{value.toFixed(1)}%</span>
      </div>
    );
  };

  return (
    <Card className="border-border/70">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="font-headline text-lg flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              Comparación Semanal
            </CardTitle>
            <CardDescription>
              {formatWeekRange(new Date())} vs semana anterior en el mismo tramo de tiempo
            </CardDescription>
          </div>
          <div className="rounded-xl border border-border/70 bg-muted/25 px-3 py-2 text-right self-start">
            <p className="text-[11px] text-muted-foreground">Progreso vs semana anterior</p>
            <p className={cn(
              'text-lg font-bold',
              comparison.progressToPreviousWeek >= 100 ? 'text-green-600' : 'text-amber-500'
            )}>
              {comparison.progressToPreviousWeek.toFixed(0)}%
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex flex-col gap-1 text-[11px] text-muted-foreground sm:flex-row sm:justify-between sm:text-xs">
            <span>Esta semana: {currencyFormatter.format(comparison.currentTotal)}</span>
            <span>Semana anterior: {currencyFormatter.format(comparison.previousTotal)}</span>
          </div>
          <Progress value={Math.min(comparison.progressToPreviousWeek, 100)} className="h-3" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
          <div className="bg-muted/30 rounded-xl border border-border/60 p-3 space-y-2">
            <div className="flex items-center gap-2 text-[11px] sm:text-xs text-muted-foreground">
              <DollarSign className="h-3 w-3" />
              <span>Ingresos</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-baseline justify-between">
                <span className="text-base sm:text-lg font-bold">{currencyFormatter.format(comparison.currentTotal)}</span>
                <span className="text-[10px] sm:text-xs text-muted-foreground">esta semana</span>
              </div>
              <div className="flex items-baseline justify-between text-muted-foreground">
                <span className="text-xs sm:text-sm">{currencyFormatter.format(comparison.previousTotal)}</span>
                <span className="text-[10px] sm:text-xs">semana anterior</span>
              </div>
              <ChangeIndicator value={comparison.revenueChange} />
            </div>
          </div>

          <div className="bg-muted/30 rounded-xl border border-border/60 p-3 space-y-2">
            <div className="flex items-center gap-2 text-[11px] sm:text-xs text-muted-foreground">
              <ShoppingCart className="h-3 w-3" />
              <span>Pedidos</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-baseline justify-between">
                <span className="text-base sm:text-lg font-bold">{comparison.currentOrders}</span>
                <span className="text-[10px] sm:text-xs text-muted-foreground">esta semana</span>
              </div>
              <div className="flex items-baseline justify-between text-muted-foreground">
                <span className="text-xs sm:text-sm">{comparison.previousOrders}</span>
                <span className="text-[10px] sm:text-xs">semana anterior</span>
              </div>
              <ChangeIndicator value={comparison.ordersChange} />
            </div>
          </div>

          <div className="bg-muted/30 rounded-xl border border-border/60 p-3 space-y-2">
            <div className="flex items-center gap-2 text-[11px] sm:text-xs text-muted-foreground">
              <Target className="h-3 w-3" />
              <span>Ticket Promedio</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-baseline justify-between">
                <span className="text-base sm:text-lg font-bold">{currencyFormatter.format(comparison.currentAvgTicket)}</span>
                <span className="text-[10px] sm:text-xs text-muted-foreground">esta semana</span>
              </div>
              <div className="flex items-baseline justify-between text-muted-foreground">
                <span className="text-xs sm:text-sm">{currencyFormatter.format(comparison.previousAvgTicket)}</span>
                <span className="text-[10px] sm:text-xs">semana anterior</span>
              </div>
              <ChangeIndicator value={comparison.ticketChange} />
            </div>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-2 text-[11px] sm:text-xs text-primary">
              <TrendingUp className="h-3 w-3" />
              <span>Proyección semanal</span>
            </div>
            <div className="space-y-1">
              <span className="text-base sm:text-lg font-bold text-primary">
                {currencyFormatter.format(comparison.projectedWeekTotal)}
              </span>
              <p className="text-xs text-muted-foreground">Basado en el ritmo actual</p>
              <p className="text-xs text-muted-foreground">
                Día más fuerte: <span className="font-semibold text-foreground">{comparison.strongestDay}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Tramo actual de la semana:</span>
          <span className="font-semibold">{comparison.currentElapsedDays + 1} días evaluados</span>
        </div>
      </CardContent>
    </Card>
  );
}