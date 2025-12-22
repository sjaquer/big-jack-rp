'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import StatCard from '@/components/dashboard/stat-card';
import { SalesChart } from '@/components/dashboard/sales-chart';
import { PopularItemsChart } from '@/components/dashboard/popular-items-chart';
import { DailyOrdersBreakdown } from '@/components/dashboard/daily-orders-breakdown';
import { HourlySalesChart } from '@/components/dashboard/hourly-sales-chart';
import { PaymentMethodsChart } from '@/components/dashboard/payment-methods-chart';
import { CategorySalesChart } from '@/components/dashboard/category-sales-chart';
import { ShiftMetrics } from '@/components/dashboard/shift-metrics';
import { SalesTrendChart } from '@/components/dashboard/sales-trend-chart';
import { DailyComparison } from '@/components/dashboard/daily-comparison';
import { SalesList } from '@/components/dashboard/sales-list';
import { LiveClock } from '@/components/dashboard/live-clock';
import { 
  DollarSign, 
  ShoppingCart, 
  BarChart, 
  CalendarDays, 
  Clock, 
  TrendingUp,
  Receipt,
  Target
} from 'lucide-react';
import { useCollection } from '@/firebase';
import { collection, query, where, Timestamp, collectionGroup } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import type { Sale, Product, SaleItem, CashFlowEntry } from '@/lib/types';
import { startOfWeek, startOfMonth, subDays, setHours, setMinutes, format, startOfDay, endOfDay } from 'date-fns';
import { useMemo } from 'react';

type PeriodKey = 'shift' | 'weekly' | 'monthly';

interface PeriodSummary {
  label: string;
  startDate: Date;
  endDate?: Date;
  revenue: number;
  cost: number;
  margin: number;
  incomes: number;
  expenses: number;
  net: number;
  orders: number;
}

/**
 * Calcula el inicio y fin del turno actual (3 PM a 2 AM)
 * Si estamos entre las 0:00 y las 2:59, el turno empezó ayer a las 3 PM
 * Si estamos entre las 3:00 y las 23:59, el turno empezó hoy a las 3 PM
 */
function getCurrentShiftRange(): { start: Date; end: Date } {
  const now = new Date();
  const currentHour = now.getHours();
  
  let shiftStart: Date;
  let shiftEnd: Date;
  
  if (currentHour < 3) {
    // Estamos en las primeras horas del día (0-2 AM), el turno empezó ayer
    shiftStart = setMinutes(setHours(subDays(now, 1), 15), 0); // Ayer 3 PM
    shiftEnd = setMinutes(setHours(now, 2), 59); // Hoy 2:59 AM
  } else if (currentHour < 15) {
    // Estamos entre 3 AM y 3 PM, mostrar el turno anterior completo
    shiftStart = setMinutes(setHours(subDays(now, 1), 15), 0); // Ayer 3 PM
    shiftEnd = setMinutes(setHours(now, 2), 59); // Hoy 2:59 AM
  } else {
    // Estamos después de las 3 PM, turno actual
    shiftStart = setMinutes(setHours(now, 15), 0); // Hoy 3 PM
    shiftEnd = setMinutes(setHours(subDays(now, -1), 2), 59); // Mañana 2:59 AM
  }
  
  return { start: shiftStart, end: shiftEnd };
}

/**
 * Calcula el rango del turno anterior
 */
function getPreviousShiftRange(): { start: Date; end: Date } {
  const currentShift = getCurrentShiftRange();
  return {
    start: subDays(currentShift.start, 1),
    end: subDays(currentShift.end, 1),
  };
}

const currencyFormatter = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  minimumFractionDigits: 2,
});


export default function DashboardPage() {
  const firestore = useFirestore();
  
  // Calcular rangos de turno
  const shiftRanges = useMemo(() => {
    const current = getCurrentShiftRange();
    const previous = getPreviousShiftRange();
    return { current, previous };
  }, []);

  // Query para todas las ventas (para gráficos históricos)
  const salesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'sales');
  }, [firestore]);
  const { data: salesData, isLoading: salesLoading } = useCollection<Sale>(salesQuery);

  // Query para ventas del turno actual
  const currentShiftQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'sales'), 
      where('saleDate', '>=', Timestamp.fromDate(shiftRanges.current.start))
    );
  }, [firestore, shiftRanges.current.start]);
  const { data: currentShiftSalesRaw, isLoading: currentShiftLoading } = useCollection<Sale>(currentShiftQuery);

  // Query para ventas del turno anterior (para comparación)
  const previousShiftQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'sales'), 
      where('saleDate', '>=', Timestamp.fromDate(shiftRanges.previous.start)),
      where('saleDate', '<=', Timestamp.fromDate(shiftRanges.previous.end))
    );
  }, [firestore, shiftRanges.previous.start, shiftRanges.previous.end]);
  const { data: previousShiftSalesRaw, isLoading: previousShiftLoading } = useCollection<Sale>(previousShiftQuery);

  // Filtrar ventas del turno actual que estén dentro del rango correcto
  const currentShiftSales = useMemo(() => {
    if (!currentShiftSalesRaw) return [];
    return currentShiftSalesRaw.filter(sale => {
      const saleDate = sale.saleDate.toDate();
      return saleDate >= shiftRanges.current.start && saleDate <= shiftRanges.current.end;
    });
  }, [currentShiftSalesRaw, shiftRanges.current]);

  const previousShiftSales = useMemo(() => {
    return previousShiftSalesRaw ?? [];
  }, [previousShiftSalesRaw]);

  // Calcular rangos de hoy y ayer para comparación diaria
  const dailyRanges = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const yesterdayStart = startOfDay(subDays(now, 1));
    const yesterdayEnd = endOfDay(subDays(now, 1));
    return { todayStart, todayEnd, yesterdayStart, yesterdayEnd };
  }, []);

  // Query para ventas de hoy (día calendario completo)
  const todaySalesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'sales'), 
      where('saleDate', '>=', Timestamp.fromDate(dailyRanges.todayStart)),
      where('saleDate', '<=', Timestamp.fromDate(dailyRanges.todayEnd))
    );
  }, [firestore, dailyRanges.todayStart, dailyRanges.todayEnd]);
  const { data: todaySalesData, isLoading: todaySalesLoading } = useCollection<Sale>(todaySalesQuery);

  // Query para ventas de ayer (día calendario completo)
  const yesterdaySalesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'sales'), 
      where('saleDate', '>=', Timestamp.fromDate(dailyRanges.yesterdayStart)),
      where('saleDate', '<=', Timestamp.fromDate(dailyRanges.yesterdayEnd))
    );
  }, [firestore, dailyRanges.yesterdayStart, dailyRanges.yesterdayEnd]);
  const { data: yesterdaySalesData, isLoading: yesterdaySalesLoading } = useCollection<Sale>(yesterdaySalesQuery);

  const productsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'products');
  }, [firestore]);
  const { data: productsData, isLoading: productsLoading } = useCollection<Product>(productsQuery);

  const saleItemsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collectionGroup(firestore, 'sale_items');
  }, [firestore]);
  const { data: saleItems, isLoading: saleItemsLoading } = useCollection<SaleItem>(saleItemsQuery);

  const cashFlowQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'cash_flows');
  }, [firestore]);
  const { data: cashFlowEntries } = useCollection<CashFlowEntry>(cashFlowQuery);

  // Items del turno actual
  const currentShiftSalesIds = useMemo(() => currentShiftSales?.map(s => s.id) ?? [], [currentShiftSales]);
  
  const currentShiftSaleItems = useMemo(() => {
    if (!saleItems || !currentShiftSalesIds.length) return [];
    return saleItems?.filter(item => currentShiftSalesIds.includes(item.saleId)) ?? [];
  }, [saleItems, currentShiftSalesIds]);

  const productMap = useMemo(() => {
    if (!productsData) return new Map<string, Product>();
    return new Map(productsData.map((product) => [product.id, product]));
  }, [productsData]);

  const saleItemTotals = useMemo(() => {
    const totals = new Map<string, { cost: number; margin: number }>();
    if (!saleItems) return totals;

    saleItems.forEach((item) => {
      const product = productMap.get(item.productId);
      const costPerUnit = product?.price ?? 0;
      const cost = costPerUnit * item.quantity;
      const margin = (item.unitPrice - costPerUnit) * item.quantity;
      const current = totals.get(item.saleId) ?? { cost: 0, margin: 0 };
      current.cost += cost;
      current.margin += margin;
      totals.set(item.saleId, current);
    });

    return totals;
  }, [saleItems, productMap]);

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const monthStart = startOfMonth(new Date());

  const periodStats = useMemo(() => {
    const summaries: Record<PeriodKey, PeriodSummary> = {
      shift: {
        label: 'Turno Actual',
        startDate: shiftRanges.current.start,
        endDate: shiftRanges.current.end,
        revenue: 0,
        cost: 0,
        margin: 0,
        incomes: 0,
        expenses: 0,
        net: 0,
        orders: 0,
      },
      weekly: {
        label: 'Semana',
        startDate: weekStart,
        revenue: 0,
        cost: 0,
        margin: 0,
        incomes: 0,
        expenses: 0,
        net: 0,
        orders: 0,
      },
      monthly: {
        label: 'Mes',
        startDate: monthStart,
        revenue: 0,
        cost: 0,
        margin: 0,
        incomes: 0,
        expenses: 0,
        net: 0,
        orders: 0,
      },
    };

    // Calcular estadísticas del turno
    currentShiftSales.forEach((sale) => {
      summaries.shift.revenue += sale.totalAmount ?? 0;
      summaries.shift.orders += 1;
      const saleTotals = saleItemTotals.get(sale.id);
      if (saleTotals) {
        summaries.shift.cost += saleTotals.cost;
        summaries.shift.margin += saleTotals.margin;
      }
    });

    // Calcular estadísticas semanales y mensuales
    (salesData ?? []).forEach((sale) => {
      if (!sale.saleDate) return;
      const saleDate = sale.saleDate.toDate();
      
      if (saleDate >= weekStart) {
        summaries.weekly.revenue += sale.totalAmount ?? 0;
        summaries.weekly.orders += 1;
        const saleTotals = saleItemTotals.get(sale.id);
        if (saleTotals) {
          summaries.weekly.cost += saleTotals.cost;
          summaries.weekly.margin += saleTotals.margin;
        }
      }
      
      if (saleDate >= monthStart) {
        summaries.monthly.revenue += sale.totalAmount ?? 0;
        summaries.monthly.orders += 1;
        const saleTotals = saleItemTotals.get(sale.id);
        if (saleTotals) {
          summaries.monthly.cost += saleTotals.cost;
          summaries.monthly.margin += saleTotals.margin;
        }
      }
    });

    // Cash flow
    (cashFlowEntries ?? []).forEach((entry) => {
      if (!entry.entryDate) return;
      const entryDate = entry.entryDate.toDate();
      
      (['shift', 'weekly', 'monthly'] as PeriodKey[]).forEach((key) => {
        const summary = summaries[key];
        if (entryDate >= summary.startDate && (!summary.endDate || entryDate <= summary.endDate)) {
          if (entry.type === 'expense') {
            summary.expenses += entry.amount;
          } else {
            summary.incomes += entry.amount;
          }
        }
      });
    });

    // Calcular neto
    Object.values(summaries).forEach((summary) => {
      summary.net = summary.margin + summary.incomes - summary.expenses;
    });

    return summaries;
  }, [salesData, currentShiftSales, saleItemTotals, cashFlowEntries, shiftRanges, weekStart, monthStart]);

  const shiftSummary = periodStats.shift;
  const weeklySummary = periodStats.weekly;
  const monthlySummary = periodStats.monthly;

  // Ticket promedio del turno
  const avgTicket = shiftSummary.orders > 0 ? shiftSummary.revenue / shiftSummary.orders : 0;

  // Formatear rango del turno para mostrar
  const shiftRangeText = useMemo(() => {
    const start = format(shiftRanges.current.start, "dd/MM HH:mm");
    const end = format(shiftRanges.current.end, "dd/MM HH:mm");
    return `${start} - ${end}`;
  }, [shiftRanges]);

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl lg:text-3xl font-headline font-bold">Panel de Control</h1>
            <p className="text-sm text-muted-foreground">Vista general del rendimiento y estadísticas clave.</p>
          </div>
        </div>
        {/* Reloj en tiempo real */}
        <LiveClock />
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-4 pb-2">
          
          {/* Métricas principales del turno */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Ventas del Turno"
              value={currencyFormatter.format(shiftSummary.revenue)}
              icon={DollarSign}
              description={`${shiftSummary.orders} pedidos • Turno 3PM-2AM`}
            />
            <StatCard
              title="Ticket Promedio"
              value={currencyFormatter.format(avgTicket)}
              icon={Receipt}
              description="Gasto promedio por cliente"
            />
            <StatCard
              title="Neto del Turno"
              value={currencyFormatter.format(shiftSummary.net)}
              icon={BarChart}
              description="Margen después de costos"
            />
            <StatCard
              title="Ventas del Mes"
              value={currencyFormatter.format(monthlySummary.revenue)}
              icon={CalendarDays}
              description={`${monthlySummary.orders} pedidos este mes`}
            />
          </div>

          {/* Métricas de rendimiento del turno */}
          <ShiftMetrics 
            currentShiftSales={currentShiftSales ?? []}
            previousShiftSales={previousShiftSales ?? []}
            isLoading={currentShiftLoading || previousShiftLoading}
          />

          {/* Comparación Hoy vs Ayer */}
          <DailyComparison 
            todaySales={todaySalesData ?? []}
            yesterdaySales={yesterdaySalesData ?? []}
            isLoading={todaySalesLoading || yesterdaySalesLoading}
          />

          {/* Tabs para diferentes vistas */}
          <Tabs defaultValue="turno" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4 lg:w-[500px] h-12">
              <TabsTrigger value="turno" className="h-full">Turno Actual</TabsTrigger>
              <TabsTrigger value="tendencias" className="h-full">Tendencias</TabsTrigger>
              <TabsTrigger value="resumen" className="h-full">Resumen</TabsTrigger>
              <TabsTrigger value="ventas" className="h-full">Ventas</TabsTrigger>
            </TabsList>

            <TabsContent value="turno" className="space-y-4">
              {/* Gráficos del turno actual */}
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="font-headline text-base">Ventas por Hora</CardTitle>
                    <CardDescription className="text-xs">Distribución de ventas durante el turno</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <HourlySalesChart 
                      data={currentShiftSales ?? []} 
                      isLoading={currentShiftLoading} 
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="font-headline text-base">Métodos de Pago</CardTitle>
                    <CardDescription className="text-xs">Distribución por tipo de pago</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PaymentMethodsChart 
                      data={currentShiftSales ?? []} 
                      isLoading={currentShiftLoading} 
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="font-headline text-base">Ventas por Categoría</CardTitle>
                    <CardDescription className="text-xs">Qué categorías venden más</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CategorySalesChart 
                      products={productsData ?? []} 
                      saleItems={currentShiftSaleItems ?? []} 
                      isLoading={productsLoading || saleItemsLoading || currentShiftLoading}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Desglose de pedidos del turno */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-headline">Desglose de Pedidos del Turno</CardTitle>
                  <CardDescription>Detalle completo de las ventas del turno actual (3 PM - 2 AM).</CardDescription>
                </CardHeader>
                <CardContent>
                  <DailyOrdersBreakdown 
                    sales={currentShiftSales ?? []} 
                    saleItems={currentShiftSaleItems ?? []} 
                    products={productsData ?? []} 
                    isLoading={currentShiftLoading || saleItemsLoading || productsLoading}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tendencias" className="space-y-4">
              {/* Gráfico de tendencias */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-headline">Tendencia de Ventas</CardTitle>
                  <CardDescription>Evolución de ingresos y pedidos en las últimas 2 semanas.</CardDescription>
                </CardHeader>
                <CardContent>
                  <SalesTrendChart 
                    data={salesData ?? []} 
                    isLoading={salesLoading}
                    days={14}
                  />
                </CardContent>
              </Card>

              <div className="grid gap-3 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="font-headline">Ventas de los Últimos 7 Días</CardTitle>
                    <CardDescription>Resumen de los ingresos diarios.</CardDescription>
                  </CardHeader>
                  <CardContent className="pl-2">
                    <SalesChart data={salesData ?? []} isLoading={salesLoading} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="font-headline">Top 5 Productos</CardTitle>
                    <CardDescription>Los productos más vendidos históricamente.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PopularItemsChart 
                      products={productsData ?? []} 
                      saleItems={saleItems ?? []} 
                      isLoading={productsLoading || saleItemsLoading} 
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="resumen" className="space-y-4">
              {/* Resumen por períodos */}
              <div className="grid gap-3 lg:grid-cols-3">
                {(['shift', 'weekly', 'monthly'] as PeriodKey[]).map((key) => {
                  const summary = periodStats[key];
                  return (
                    <Card key={key} className="border-primary/10">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="font-headline text-lg">{summary.label}</CardTitle>
                            <CardDescription>Ingresos vs Gastos</CardDescription>
                          </div>
                          <div className="text-right text-sm">
                            <p className="text-muted-foreground">Pedidos</p>
                            <p className="text-2xl font-semibold">{summary.orders}</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Ingresos</span>
                          <span className="text-base font-semibold">{currencyFormatter.format(summary.revenue)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Costos de producción</span>
                          <span className="text-base font-semibold">{currencyFormatter.format(summary.cost)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Gastos registrados</span>
                          <span className="text-base font-semibold">{currencyFormatter.format(summary.expenses)}</span>
                        </div>
                        <div className="pt-2 border-t">
                          <p className="text-xs text-muted-foreground">Neto</p>
                          <p className="text-2xl font-bold text-primary">{currencyFormatter.format(summary.net)}</p>
                        </div>
                        {key === 'shift' && summary.orders > 0 && (
                          <div className="pt-2 border-t">
                            <p className="text-xs text-muted-foreground">Ticket Promedio</p>
                            <p className="text-lg font-semibold">{currencyFormatter.format(summary.revenue / summary.orders)}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Métricas adicionales de marketing */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-headline flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    KPIs de Marketing
                  </CardTitle>
                  <CardDescription>Métricas clave para tomar decisiones de negocio.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Pedidos/Día (Prom. Semanal)</p>
                      <p className="text-xl font-bold">
                        {(weeklySummary.orders / 7).toFixed(1)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Ingresos/Día (Prom. Semanal)</p>
                      <p className="text-xl font-bold">
                        {currencyFormatter.format(weeklySummary.revenue / 7)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Margen Bruto (%)</p>
                      <p className="text-xl font-bold">
                        {monthlySummary.revenue > 0 
                          ? ((monthlySummary.margin / monthlySummary.revenue) * 100).toFixed(1) 
                          : '0'}%
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Ticket Promedio Mensual</p>
                      <p className="text-xl font-bold">
                        {currencyFormatter.format(
                          monthlySummary.orders > 0 ? monthlySummary.revenue / monthlySummary.orders : 0
                        )}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ventas" className="space-y-4">
              <SalesList allSaleItems={saleItems ?? []} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
