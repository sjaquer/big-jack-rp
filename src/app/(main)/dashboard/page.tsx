'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import StatCard from '@/components/dashboard/stat-card';
import { LiveClock } from '@/components/dashboard/live-clock';
import { StockOverview } from '@/components/dashboard/stock-overview';
import {
  DollarSign,
  Receipt,
  TrendingUp,
  CalendarDays,
  ArrowRight,
  BarChart3,
  CircleDollarSign,
  ArrowUpRight,
} from 'lucide-react';
import { AnalyticsIcon, GrillIcon, InventoryCrateIcon } from '@/components/icons';
import { useCollection } from '@/firebase';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import type { Sale, Product, Ingredient } from '@/lib/types';
import { startOfMonth, endOfMonth, subMonths, subDays, setHours, setMinutes, format } from 'date-fns';
import { useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const currencyFormatter = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  minimumFractionDigits: 2,
});


export default function DashboardPage() {
  const firestore = useFirestore();

  // Calcular rangos del turno de manera estable
  const shiftStart = useMemo(() => {
    const now = new Date();
    const currentHour = now.getHours();

    if (currentHour < 3) {
      return setMinutes(setHours(subDays(now, 1), 15), 0);
    } else if (currentHour < 15) {
      return setMinutes(setHours(subDays(now, 1), 15), 0);
    } else {
      return setMinutes(setHours(now, 15), 0);
    }
  }, []);

  const shiftEnd = useMemo(() => {
    const now = new Date();
    const currentHour = now.getHours();

    if (currentHour < 3) {
      return setMinutes(setHours(now, 2), 59);
    } else if (currentHour < 15) {
      return setMinutes(setHours(now, 2), 59);
    } else {
      return setMinutes(setHours(subDays(now, -1), 2), 59);
    }
  }, []);

  const currentShiftQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'sales'),
      where('saleDate', '>=', Timestamp.fromDate(shiftStart)),
      where('saleDate', '<=', Timestamp.fromDate(shiftEnd))
    );
  }, [firestore, shiftStart, shiftEnd]);

  const { data: currentShiftSalesRaw } = useCollection<Sale>(currentShiftQuery);

  const currentShiftSales = useMemo(() => {
    if (!currentShiftSalesRaw) return [];
    return currentShiftSalesRaw.filter(sale => {
      const saleDate = sale.saleDate.toDate();
      return saleDate >= shiftStart && saleDate <= shiftEnd;
    });
  }, [currentShiftSalesRaw, shiftStart, shiftEnd]);

  const productsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'products');
  }, [firestore]);
  const { data: productsData, isLoading: productsLoading } = useCollection<Product>(productsQuery);

  const ingredientsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'ingredients');
  }, [firestore]);
  const { data: ingredientsData, isLoading: ingredientsLoading } = useCollection<Ingredient>(ingredientsQuery);

  const monthStart = useMemo(() => startOfMonth(new Date()), []);
  const monthSalesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'sales'),
      where('saleDate', '>=', Timestamp.fromDate(monthStart))
    );
  }, [firestore, monthStart]);
  const { data: monthSalesData } = useCollection<Sale>(monthSalesQuery);

  const previousMonthStart = useMemo(() => startOfMonth(subMonths(new Date(), 1)), []);
  const previousMonthEnd = useMemo(() => endOfMonth(subMonths(new Date(), 1)), []);
  const previousMonthSalesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'sales'),
      where('saleDate', '>=', Timestamp.fromDate(previousMonthStart)),
      where('saleDate', '<=', Timestamp.fromDate(previousMonthEnd))
    );
  }, [firestore, previousMonthStart, previousMonthEnd]);
  const { data: previousMonthSalesData } = useCollection<Sale>(previousMonthSalesQuery);

  const shiftStats = useMemo(() => {
    const revenue = currentShiftSales.reduce((sum, sale) => sum + (sale.totalAmount ?? 0), 0);
    const orders = currentShiftSales.length;
    const avgTicket = orders > 0 ? revenue / orders : 0;

    return { revenue, orders, avgTicket };
  }, [currentShiftSales]);

  const monthStats = useMemo(() => {
    const revenue = (monthSalesData ?? []).reduce((sum, sale) => sum + (sale.totalAmount ?? 0), 0);
    const orders = (monthSalesData ?? []).length;

    return { revenue, orders };
  }, [monthSalesData]);

  const growthRate = useMemo(() => {
    const previousRevenue = (previousMonthSalesData ?? []).reduce((sum, sale) => sum + (sale.totalAmount ?? 0), 0);
    if (previousRevenue <= 0) return 0;
    return ((monthStats.revenue - previousRevenue) / previousRevenue) * 100;
  }, [monthStats.revenue, previousMonthSalesData]);

  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-gradient-to-br from-amber-50/45 to-teal-50/35 dark:from-slate-900 dark:to-slate-800">
      <div className="flex-1 overflow-y-auto">
        <div className="erp-page erp-stack erp-compact-landscape">
          <Card className="erp-surface border-primary/20" id="dashboard-header">
            <CardContent className="pt-5 sm:pt-6">
              <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-primary/15 text-primary border-primary/30">Panel Ejecutivo</Badge>
                    <Badge variant="outline">Turno Activo</Badge>
                  </div>
                  <div>
                    <h1 className="erp-section-title text-slate-900 dark:text-slate-50">Panel de Control Operativo</h1>
                    <p className="mt-1.5 text-sm sm:text-base text-slate-600 dark:text-slate-300">
                      Estado del negocio en tiempo real con acciones rápidas para caja, POS e inventario.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap" id="dashboard-quick-actions">
                    <Link href="/pos" className="contents sm:block">
                      <Button size="sm" className="w-full sm:w-auto">
                        <GrillIcon className="h-4 w-4" />
                        Abrir POS
                      </Button>
                    </Link>
                    <Link href="/cash-flow" className="contents sm:block">
                      <Button size="sm" variant="outline" className="w-full sm:w-auto">
                        <CircleDollarSign className="h-4 w-4" />
                        Registrar Caja
                      </Button>
                    </Link>
                    <Link href="/inventory" className="contents sm:block">
                      <Button size="sm" variant="outline" className="w-full sm:w-auto">
                        <InventoryCrateIcon className="h-4 w-4" />
                        Ver Inventario
                      </Button>
                    </Link>
                    <Link href="/insights" className="contents sm:block">
                      <Button size="sm" variant="ghost" className="w-full sm:w-auto">
                        <AnalyticsIcon className="h-4 w-4" />
                        Insights
                      </Button>
                    </Link>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/70 bg-background/75 p-3 sm:p-4">
                  <LiveClock />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-3 sm:gap-4 grid-cols-2 xl:grid-cols-4" id="stats-cards">
            <StatCard
              title="Ventas del Turno"
              value={currencyFormatter.format(shiftStats.revenue)}
              icon={DollarSign}
              description={`${shiftStats.orders} pedidos • Turno 3PM-2AM`}
            />
            <StatCard
              title="Ticket Promedio"
              value={currencyFormatter.format(shiftStats.avgTicket)}
              icon={Receipt}
              description="Gasto promedio por pedido"
            />
            <StatCard
              title="Ventas del Mes"
              value={currencyFormatter.format(monthStats.revenue)}
              icon={CalendarDays}
              description={`${monthStats.orders} pedidos este mes`}
            />
            <StatCard
              title="Crecimiento"
              value={`${growthRate >= 0 ? '+' : ''}${growthRate.toFixed(1)}%`}
              icon={TrendingUp}
              description="vs mes anterior"
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
            <Card className="border-blue-200 bg-gradient-to-br from-white to-blue-50/30 dark:from-slate-800 dark:to-transparent">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                      <InventoryCrateIcon className="h-5 w-5 text-blue-600" />
                    <CardTitle className="font-headline">Stock e Inventario</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-xs">Vista Rapida</Badge>
                </div>
                <CardDescription>Estado actual del inventario y alertas</CardDescription>
              </CardHeader>
              <CardContent>
                <StockOverview
                  ingredients={ingredientsData ?? []}
                  products={productsData ?? []}
                  isLoading={ingredientsLoading || productsLoading}
                />
              </CardContent>
            </Card>

            <Card className="border-emerald-200 bg-gradient-to-br from-white to-emerald-50/40 dark:from-slate-800 dark:to-transparent">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-emerald-700" />
                    <CardTitle className="font-headline">Resumen Comercial</CardTitle>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Hoy</Badge>
                </div>
                <CardDescription>Lectura compacta para decisiones rapidas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-xl border border-border/60 bg-background/70 p-3">
                  <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Pedidos del turno</p>
                  <p className="mt-1 text-2xl font-bold">{shiftStats.orders}</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-background/70 p-3">
                  <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Ingreso acumulado mes</p>
                  <p className="mt-1 text-xl font-bold">{currencyFormatter.format(monthStats.revenue)}</p>
                </div>
                <Link href="/insights" className="block">
                  <Button size="lg" className="w-full">
                    Ver Analisis Avanzado
                    <ArrowUpRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          <Card className="border-teal-200 bg-gradient-to-br from-white to-teal-50/30 dark:from-slate-800 dark:to-transparent">
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-teal-100">
                    <BarChart3 className="h-6 w-6 text-teal-700" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base sm:text-lg">Necesitas una vista de datos mas profunda?</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                      Explora tendencias, comparativas, top de productos y recomendaciones inteligentes.
                    </p>
                  </div>
                </div>
                <Link href="/insights">
                  <Button size="lg" className="w-full sm:w-auto h-11">
                    Ver Insights
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="font-headline">Ultimas Ventas del Turno</CardTitle>
                <Badge>{shiftStats.orders} ventas</Badge>
              </div>
              <CardDescription>Las 5 ventas mas recientes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {currentShiftSales.slice(0, 5).map((sale) => (
                  <div key={sale.id} className="grid grid-cols-[1fr_auto] items-start gap-2 p-2.5 rounded-xl border border-border/70 bg-muted/20 sm:flex sm:items-center sm:justify-between sm:gap-3 sm:p-3">
                    <div>
                      <p className="font-semibold">{sale.customerName || 'Cliente'}</p>
                      <p className="text-[11px] sm:text-xs text-muted-foreground">
                        {sale.saleDate ? format(sale.saleDate.toDate(), 'HH:mm') : '-'} • {sale.paymentMethod}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm sm:text-lg font-bold text-green-600">
                        {currencyFormatter.format(sale.totalAmount)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{sale.itemsCount || 0} items</p>
                    </div>
                  </div>
                ))}
                {currentShiftSales.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Aún no hay ventas en este turno
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
