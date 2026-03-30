'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  DollarSign,
  ShoppingCart,
  Target
} from 'lucide-react';
import type { Sale } from '@/lib/types';
import { cn } from '@/lib/utils';

interface DailyComparisonProps {
  todaySales: Sale[];
  yesterdaySales: Sale[];
  isLoading: boolean;
}

const currencyFormatter = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  minimumFractionDigits: 2,
});

export function DailyComparison({ todaySales, yesterdaySales, isLoading }: DailyComparisonProps) {
  const comparison = useMemo(() => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    
    // Filtrar ventas de ayer hasta la misma hora de hoy (comparación justa)
    const yesterdayUntilNow = yesterdaySales.filter(sale => {
      const saleDate = sale.saleDate.toDate();
      const saleHour = saleDate.getHours();
      const saleMinutes = saleDate.getMinutes();
      return saleHour < currentHour || (saleHour === currentHour && saleMinutes <= currentMinutes);
    });

    // Métricas de hoy
    const todayTotal = todaySales.reduce((sum, s) => sum + s.totalAmount, 0);
    const todayOrders = todaySales.length;
    const todayAvgTicket = todayOrders > 0 ? todayTotal / todayOrders : 0;

    // Métricas de ayer (completo)
    const yesterdayTotal = yesterdaySales.reduce((sum, s) => sum + s.totalAmount, 0);
    const yesterdayOrders = yesterdaySales.length;
    const yesterdayAvgTicket = yesterdayOrders > 0 ? yesterdayTotal / yesterdayOrders : 0;

    // Métricas de ayer hasta la misma hora
    const yesterdayUntilNowTotal = yesterdayUntilNow.reduce((sum, s) => sum + s.totalAmount, 0);
    const yesterdayUntilNowOrders = yesterdayUntilNow.length;

    // Cambios porcentuales (comparación justa: misma hora)
    const revenueChange = yesterdayUntilNowTotal > 0 
      ? ((todayTotal - yesterdayUntilNowTotal) / yesterdayUntilNowTotal) * 100 
      : todayTotal > 0 ? 100 : 0;
    
    const ordersChange = yesterdayUntilNowOrders > 0 
      ? ((todayOrders - yesterdayUntilNowOrders) / yesterdayUntilNowOrders) * 100 
      : todayOrders > 0 ? 100 : 0;

    const ticketChange = yesterdayAvgTicket > 0 
      ? ((todayAvgTicket - yesterdayAvgTicket) / yesterdayAvgTicket) * 100 
      : 0;

    // Progreso del día (qué % del día de ayer hemos alcanzado)
    const progressToYesterday = yesterdayTotal > 0 
      ? Math.min((todayTotal / yesterdayTotal) * 100, 150) 
      : 0;

    // Proyección del día (basado en el ritmo actual)
    const hoursWorked = currentHour >= 15 ? currentHour - 15 + (currentMinutes / 60) : 0;
    const projectedTotal = hoursWorked > 0 ? (todayTotal / hoursWorked) * 11 : 0; // 11 horas de turno (3PM-2AM)

    return {
      today: {
        total: todayTotal,
        orders: todayOrders,
        avgTicket: todayAvgTicket,
      },
      yesterday: {
        total: yesterdayTotal,
        orders: yesterdayOrders,
        avgTicket: yesterdayAvgTicket,
        untilNowTotal: yesterdayUntilNowTotal,
        untilNowOrders: yesterdayUntilNowOrders,
      },
      changes: {
        revenue: revenueChange,
        orders: ordersChange,
        ticket: ticketChange,
      },
      progressToYesterday,
      projectedTotal,
      currentHour,
    };
  }, [todaySales, yesterdaySales]);

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-5 bg-muted rounded w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-20 bg-muted rounded" />
            <div className="h-20 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const ChangeIndicator = ({ value, size = 'sm' }: { value: number; size?: 'sm' | 'lg' }) => {
    const isPositive = value >= 0;
    const Icon = value === 0 ? Minus : isPositive ? TrendingUp : TrendingDown;
    return (
      <div className={cn(
        "flex items-center gap-1",
        isPositive ? "text-green-600" : "text-red-500",
        size === 'lg' ? "text-lg font-bold" : "text-sm"
      )}>
        <Icon className={size === 'lg' ? "h-5 w-5" : "h-4 w-4"} />
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
              <Target className="h-5 w-5 text-primary" />
              Comparación Hoy vs Ayer
            </CardTitle>
            <CardDescription>
              Comparación a las {comparison.currentHour}:00 hrs
            </CardDescription>
          </div>
          <div className="rounded-xl border border-border/70 bg-muted/25 px-3 py-2 text-right self-start">
            <p className="text-[11px] text-muted-foreground">Progreso vs ayer</p>
            <p className={cn(
              "text-lg font-bold",
              comparison.progressToYesterday >= 100 ? "text-green-600" : "text-amber-500"
            )}>
              {comparison.progressToYesterday.toFixed(0)}%
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4">
        {/* Barra de progreso visual */}
        <div className="space-y-2">
          <div className="flex flex-col gap-1 text-[11px] text-muted-foreground sm:flex-row sm:justify-between sm:text-xs">
            <span>Hoy: {currencyFormatter.format(comparison.today.total)}</span>
            <span>Ayer total: {currencyFormatter.format(comparison.yesterday.total)}</span>
          </div>
          <Progress 
            value={Math.min(comparison.progressToYesterday, 100)} 
            className="h-3"
          />
          {comparison.progressToYesterday > 100 && (
            <p className="text-xs text-green-600 font-medium">
              ¡Ya superaste las ventas de ayer! 🎉
            </p>
          )}
        </div>

        {/* Grid de comparación */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
          {/* Ingresos */}
          <div className="bg-muted/30 rounded-xl border border-border/60 p-3 space-y-2">
            <div className="flex items-center gap-2 text-[11px] sm:text-xs text-muted-foreground">
              <DollarSign className="h-3 w-3" />
              <span>Ingresos</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-baseline justify-between">
                <span className="text-base sm:text-lg font-bold">{currencyFormatter.format(comparison.today.total)}</span>
                <span className="text-[10px] sm:text-xs text-muted-foreground">hoy</span>
              </div>
              <div className="flex items-baseline justify-between text-muted-foreground">
                <span className="text-xs sm:text-sm">{currencyFormatter.format(comparison.yesterday.untilNowTotal)}</span>
                <span className="text-[10px] sm:text-xs">ayer ({comparison.currentHour}:00)</span>
              </div>
              <ChangeIndicator value={comparison.changes.revenue} />
            </div>
          </div>

          {/* Pedidos */}
          <div className="bg-muted/30 rounded-xl border border-border/60 p-3 space-y-2">
            <div className="flex items-center gap-2 text-[11px] sm:text-xs text-muted-foreground">
              <ShoppingCart className="h-3 w-3" />
              <span>Pedidos</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-baseline justify-between">
                <span className="text-base sm:text-lg font-bold">{comparison.today.orders}</span>
                <span className="text-[10px] sm:text-xs text-muted-foreground">hoy</span>
              </div>
              <div className="flex items-baseline justify-between text-muted-foreground">
                <span className="text-xs sm:text-sm">{comparison.yesterday.untilNowOrders}</span>
                <span className="text-[10px] sm:text-xs">ayer ({comparison.currentHour}:00)</span>
              </div>
              <ChangeIndicator value={comparison.changes.orders} />
            </div>
          </div>

          {/* Ticket Promedio */}
          <div className="bg-muted/30 rounded-xl border border-border/60 p-3 space-y-2">
            <div className="flex items-center gap-2 text-[11px] sm:text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Ticket Promedio</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-baseline justify-between">
                <span className="text-base sm:text-lg font-bold">{currencyFormatter.format(comparison.today.avgTicket)}</span>
                <span className="text-[10px] sm:text-xs text-muted-foreground">hoy</span>
              </div>
              <div className="flex items-baseline justify-between text-muted-foreground">
                <span className="text-xs sm:text-sm">{currencyFormatter.format(comparison.yesterday.avgTicket)}</span>
                <span className="text-[10px] sm:text-xs">ayer</span>
              </div>
              <ChangeIndicator value={comparison.changes.ticket} />
            </div>
          </div>

          {/* Proyección */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-2 text-[11px] sm:text-xs text-primary">
              <TrendingUp className="h-3 w-3" />
              <span>Proyección del Día</span>
            </div>
            <div className="space-y-1">
              <span className="text-base sm:text-lg font-bold text-primary">
                {currencyFormatter.format(comparison.projectedTotal)}
              </span>
              <p className="text-xs text-muted-foreground">
                Basado en ritmo actual
              </p>
              {comparison.projectedTotal > comparison.yesterday.total && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <ArrowUpRight className="h-3 w-3" />
                  {((comparison.projectedTotal / comparison.yesterday.total - 1) * 100).toFixed(0)}% más que ayer
                </p>
              )}
              {comparison.projectedTotal < comparison.yesterday.total && comparison.projectedTotal > 0 && (
                <p className="text-xs text-amber-500 flex items-center gap-1">
                  <ArrowDownRight className="h-3 w-3" />
                  {((1 - comparison.projectedTotal / comparison.yesterday.total) * 100).toFixed(0)}% menos que ayer
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Resumen rápido */}
        <div className="pt-3 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Ayer total del día:</span>
            <span className="font-semibold">{currencyFormatter.format(comparison.yesterday.total)} ({comparison.yesterday.orders} pedidos)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
