'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SalesChart } from '@/components/dashboard/sales-chart';
import { PopularItemsChart } from '@/components/dashboard/popular-items-chart';
import { DailyOrdersBreakdown } from '@/components/dashboard/daily-orders-breakdown';
import { HourlySalesChart } from '@/components/dashboard/hourly-sales-chart';
import { PaymentMethodsChart } from '@/components/dashboard/payment-methods-chart';
import { CategorySalesChart } from '@/components/dashboard/category-sales-chart';
import { ShiftMetrics } from '@/components/dashboard/shift-metrics';
import { SalesTrendChart } from '@/components/dashboard/sales-trend-chart';
import { DailyComparison } from '@/components/dashboard/daily-comparison';
import { WeekdaySalesChart } from '@/components/dashboard/weekday-sales-chart';
import { SalesSourceChart } from '@/components/dashboard/sales-source-chart';
import { TopProductsTable } from '@/components/dashboard/top-products-table';
import { HourlyPerformanceChart } from '@/components/dashboard/hourly-performance-chart';
import { WeeklyComparison } from '@/components/dashboard/weekly-comparison';
import { AIReportCard } from '@/components/dashboard/ai-report-card';
import { 
  TrendingUp,
  TrendingDown,
  CalendarDays,
  Clock,
  Target,
  Sparkles,
  Medal,
  BarChart3,
  Users,
  Zap,
  DollarSign
} from 'lucide-react';
import { useCollection } from '@/firebase';
import { collection, query, where, Timestamp, collectionGroup } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import type { Sale, Product, SaleItem, Ingredient, InventoryItem } from '@/lib/types';
import { startOfMonth, subMonths, format, getDay, getHours, startOfWeek, startOfDay, endOfDay, subDays, subWeeks, setHours, setMinutes, addDays } from 'date-fns';
import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { AnalyticsIcon } from '@/components/icons';
import { calculateProductProducibleQuantity } from '@/lib/product-stock';

const currencyFormatter = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  minimumFractionDigits: 2,
});

export default function InsightsPage() {
  const firestore = useFirestore();

  // Datos de los últimos 3 meses para análisis (estabilizado)
  const threeMonthsAgo = useMemo(() => subMonths(new Date(), 3), []);
  
  const salesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'sales'),
      where('saleDate', '>=', Timestamp.fromDate(threeMonthsAgo))
    );
  }, [firestore, threeMonthsAgo]);
  
  const { data: salesData, isLoading: salesLoading } = useCollection<Sale>(salesQuery);

  const productsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'products');
  }, [firestore]);
  const { data: productsData, isLoading: productsLoading } = useCollection<Product>(productsQuery);

  const ingredientsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'ingredients');
  }, [firestore]);
  const { data: ingredientsData } = useCollection<Ingredient>(ingredientsQuery);

  const inventoryItemsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'inventory_items');
  }, [firestore]);
  const { data: inventoryItemsData } = useCollection<InventoryItem>(inventoryItemsQuery);

  // Query para sale items
  const saleItemsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collectionGroup(firestore, 'sale_items');
  }, [firestore]);
  const { data: saleItems, isLoading: saleItemsLoading } = useCollection<SaleItem>(saleItemsQuery);

  // Rangos de tiempo estables (calculados una sola vez)
  const now = useMemo(() => new Date(), []);
  
  const shiftStart = useMemo(() => {
    return setMinutes(setHours(now.getHours() >= 18 ? now : subDays(now, 1), 18), 0);
  }, [now]);

  const shiftEnd = useMemo(() => {
    return setMinutes(setHours(now.getHours() >= 2 && now.getHours() < 18 ? now : addDays(shiftStart, 1), 1), 59);
  }, [now, shiftStart]);

  const todayStart = useMemo(() => startOfDay(now), [now]);
  const todayEnd = useMemo(() => endOfDay(now), [now]);
  const yesterdayStart = useMemo(() => startOfDay(subDays(now, 1)), [now]);
  const yesterdayEnd = useMemo(() => endOfDay(subDays(now, 1)), [now]);

  // Query ventas del turno actual
  const currentShiftQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'sales'),
      where('saleDate', '>=', Timestamp.fromDate(shiftStart)),
      where('saleDate', '<=', Timestamp.fromDate(shiftEnd))
    );
  }, [firestore, shiftStart, shiftEnd]);
  const { data: currentShiftSalesRaw, isLoading: currentShiftLoading } = useCollection<Sale>(currentShiftQuery);

  const currentShiftSales = useMemo(() => {
    if (!currentShiftSalesRaw) return [];
    return currentShiftSalesRaw.filter((sale: Sale) => {
      const saleDate = sale.saleDate.toDate();
      return saleDate >= shiftStart && saleDate <= shiftEnd;
    });
  }, [currentShiftSalesRaw, shiftStart, shiftEnd]);

  // Query turno anterior
  const previousShiftStart = useMemo(() => {
    return setMinutes(setHours(subDays(shiftStart, 1), 18), 0);
  }, [shiftStart]);
  
  const previousShiftEnd = useMemo(() => {
    return setMinutes(setHours(subDays(shiftEnd, 1), 1), 59);
  }, [shiftEnd]);

  const previousShiftQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'sales'),
      where('saleDate', '>=', Timestamp.fromDate(previousShiftStart)),
      where('saleDate', '<=', Timestamp.fromDate(previousShiftEnd))
    );
  }, [firestore, previousShiftStart, previousShiftEnd]);
  const { data: previousShiftSales, isLoading: previousShiftLoading } = useCollection<Sale>(previousShiftQuery);

  // Query ventas de hoy
  const todaySalesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'sales'),
      where('saleDate', '>=', Timestamp.fromDate(todayStart)),
      where('saleDate', '<=', Timestamp.fromDate(todayEnd))
    );
  }, [firestore, todayStart, todayEnd]);
  const { data: todaySalesData, isLoading: todaySalesLoading } = useCollection<Sale>(todaySalesQuery);

  // Query ventas de ayer
  const yesterdaySalesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'sales'),
      where('saleDate', '>=', Timestamp.fromDate(yesterdayStart)),
      where('saleDate', '<=', Timestamp.fromDate(yesterdayEnd))
    );
  }, [firestore, yesterdayStart, yesterdayEnd]);
  const { data: yesterdaySalesData, isLoading: yesterdaySalesLoading } = useCollection<Sale>(yesterdaySalesQuery);

  const monthStart = useMemo(() => startOfMonth(now), [now]);

  const monthSales = useMemo(() => {
    return (salesData ?? []).filter((sale) => sale.saleDate.toDate() >= monthStart);
  }, [salesData, monthStart]);

  const monthRevenue = useMemo(() => {
    return monthSales.reduce((sum, sale) => sum + (sale.totalAmount ?? 0), 0);
  }, [monthSales]);

  const lowStockIngredients = useMemo(() => {
    return (ingredientsData ?? []).filter((ingredient) => ingredient.quantity <= (ingredient.minimumStock || 0));
  }, [ingredientsData]);

  const lowStockProducts = useMemo(() => {
    return (productsData ?? []).filter(
      (product) => calculateProductProducibleQuantity(product, ingredientsData ?? [], inventoryItemsData ?? []) <= 5
    );
  }, [productsData, ingredientsData, inventoryItemsData]);

  const currentWeekStart = useMemo(() => startOfWeek(now, { weekStartsOn: 1 }), [now]);
  const previousWeekStart = useMemo(() => subWeeks(currentWeekStart, 1), [currentWeekStart]);
  const previousWeekComparableEnd = useMemo(() => subDays(now, 7), [now]);

  const currentWeekQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'sales'),
      where('saleDate', '>=', Timestamp.fromDate(currentWeekStart)),
      where('saleDate', '<=', Timestamp.fromDate(now))
    );
  }, [firestore, currentWeekStart, now]);
  const { data: currentWeekSales, isLoading: currentWeekLoading } = useCollection<Sale>(currentWeekQuery);

  const previousWeekQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'sales'),
      where('saleDate', '>=', Timestamp.fromDate(previousWeekStart)),
      where('saleDate', '<=', Timestamp.fromDate(previousWeekComparableEnd))
    );
  }, [firestore, previousWeekStart, previousWeekComparableEnd]);
  const { data: previousWeekSales, isLoading: previousWeekLoading } = useCollection<Sale>(previousWeekQuery);

  // Sale items del turno actual
  const currentShiftSaleItems = useMemo(() => {
    if (!saleItems || !currentShiftSales) return [];
    const saleIds = currentShiftSales.map((s: Sale) => s.id);
    return saleItems.filter((item: SaleItem) => saleIds.includes(item.saleId));
  }, [saleItems, currentShiftSales]);

  const currentWeekSalesClipped = useMemo(() => {
    if (!currentWeekSales) return [];
    return currentWeekSales.filter((sale) => sale.saleDate.toDate() >= currentWeekStart && sale.saleDate.toDate() <= now);
  }, [currentWeekSales, currentWeekStart, now]);

  const previousWeekSalesClipped = useMemo(() => {
    if (!previousWeekSales) return [];
    return previousWeekSales.filter((sale) => sale.saleDate.toDate() >= previousWeekStart && sale.saleDate.toDate() <= previousWeekComparableEnd);
  }, [previousWeekSales, previousWeekStart, previousWeekComparableEnd]);

  // Análisis de datos
  const analysis = useMemo(() => {
    if (!salesData || salesData.length === 0) {
      return {
        growthRate: 0,
        avgTicket: 0,
        topSellingDay: 'N/A',
        peakHour: 0,
        topProducts: [],
        recommendations: [],
        campaignSuggestions: [],
      };
    }

    // Tasa de crecimiento (mes actual vs mes anterior)
    const currentMonth = startOfMonth(new Date());
    const lastMonth = subMonths(currentMonth, 1);
    const currentMonthSales = salesData.filter((s: Sale) => s.saleDate.toDate() >= currentMonth);
    const lastMonthSales = salesData.filter((s: Sale) => {
      const date = s.saleDate.toDate();
      return date >= lastMonth && date < currentMonth;
    });

    const currentRevenue = currentMonthSales.reduce((sum: number, s: Sale) => sum + s.totalAmount, 0);
    const lastRevenue = lastMonthSales.reduce((sum: number, s: Sale) => sum + s.totalAmount, 0);
    const growthRate = lastRevenue > 0 ? ((currentRevenue - lastRevenue) / lastRevenue) * 100 : 0;

    // Ticket promedio
    const avgTicket = salesData.reduce((sum: number, s: Sale) => sum + s.totalAmount, 0) / salesData.length;

    // Día con más ventas
    const dayStats = new Map<number, number>();
    salesData.forEach((sale: Sale) => {
      const day = getDay(sale.saleDate.toDate());
      dayStats.set(day, (dayStats.get(day) || 0) + sale.totalAmount);
    });
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const topDay = Array.from(dayStats.entries()).sort((a, b) => b[1] - a[1])[0];
    const topSellingDay = topDay ? dayNames[topDay[0]] : 'N/A';

    // Hora pico
    const hourStats = new Map<number, number>();
    salesData.forEach((sale: Sale) => {
      const hour = getHours(sale.saleDate.toDate());
      hourStats.set(hour, (hourStats.get(hour) || 0) + sale.totalAmount);
    });
    const topHour = Array.from(hourStats.entries()).sort((a, b) => b[1] - a[1])[0];
    const peakHour = topHour ? topHour[0] : 0;

    // Top productos
    const productMap = new Map<string, { name: string; quantity: number; revenue: number; productId: string }>();
    (saleItems ?? []).forEach((item: SaleItem) => {
      const product = productsData?.find((p: Product) => p.id === item.productId);
      if (!product) return;
      
      const current = productMap.get(item.productId) || { 
        productId: item.productId,
        name: product.name, 
        quantity: 0, 
        revenue: 0 
      };
      current.quantity += item.quantity;
      current.revenue += item.unitPrice * item.quantity;
      productMap.set(item.productId, current);
    });

    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Recomendaciones inteligentes
    const recommendations: Array<{ type: 'success' | 'warning' | 'info'; title: string; description: string }> = [];

    if (growthRate > 10) {
      recommendations.push({
        type: 'success',
        title: 'Crecimiento acelerado',
        description: `Ventas crecieron ${(growthRate ?? 0).toFixed(1)}% vs mes anterior. Aumenta stock de ingredientes populares.`,
      });
    } else if (growthRate < -5) {
      recommendations.push({
        type: 'warning',
        title: 'Ventas en descenso',
        description: `Ventas bajaron ${Math.abs(growthRate ?? 0).toFixed(1)}% vs mes anterior. Lanza promociones o combos especiales.`,
      });
    }

    if (avgTicket < 15) {
      recommendations.push({
        type: 'info',
        title: 'Oportunidad de upselling',
        description: `Ticket promedio ${currencyFormatter.format(avgTicket)}. Ofrece combos o bebidas para aumentar valor por pedido.`,
      });
    }

    // Sugerencias de campañas
    const slowestDay = Array.from(dayStats.entries()).sort((a, b) => a[1] - b[1])[0];
    const avgDayRevenue = Array.from(dayStats.values()).reduce((s, v) => s + v, 0) / dayStats.size;
    
    const campaignSuggestions: Array<{ title: string; timing: string; description: string; action: string }> = [];

    if (slowestDay && slowestDay[1] < avgDayRevenue * 0.7) {
      const slowDayName = dayNames[slowestDay[0]];
      campaignSuggestions.push({
        title: `Promo de ${slowDayName}`,
        timing: `Cada ${slowDayName}`,
        description: `${slowDayName} es tu día más lento. Una promoción podría activar ventas.`,
        action: '2x1 en productos seleccionados',
      });
    }

    campaignSuggestions.push(
      {
        title: 'Fin de mes',
        timing: 'Día 28-31',
        description: 'Día de pago - clientes con más presupuesto',
        action: 'Combos premium a precio especial',
      },
      {
        title: 'Quincena',
        timing: 'Día 13-15',
        description: 'Día de pago quincenal - alta demanda esperada',
        action: 'Descuentos en combos familiares',
      }
    );

    return {
      growthRate,
      avgTicket,
      topSellingDay,
      peakHour,
      topProducts,
      recommendations,
      campaignSuggestions,
    };
  }, [salesData, saleItems, productsData]);

  const { growthRate, avgTicket, topSellingDay, peakHour, topProducts, recommendations, campaignSuggestions } = analysis;

  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-gradient-to-br from-amber-50/35 to-teal-50/25 dark:from-slate-900 dark:to-slate-800">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1600px] mx-auto w-full px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-5">
          <Card className="erp-surface border-teal-200/70">
            <CardContent className="pt-5 sm:pt-6">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Badge className="bg-teal-100 text-teal-700 border-teal-200">Analytics</Badge>
                  <Badge variant="outline">Ultimos 90 dias</Badge>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div className="flex items-center gap-2">
              <AnalyticsIcon className="h-8 w-8 text-teal-700" />
              <h1 className="text-3xl lg:text-4xl font-headline font-bold text-slate-900 tracking-tight">
                Insights de Negocio
              </h1>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                    <Link href="/dashboard" className="contents sm:block">
                      <Button size="sm" variant="outline" className="w-full sm:w-auto">Panel</Button>
                    </Link>
                    <Link href="/pos" className="contents sm:block">
                      <Button size="sm" className="w-full sm:w-auto">Ir a POS</Button>
                    </Link>
                  </div>
                </div>
                <p className="text-sm sm:text-base text-slate-600">Analisis profundo de ventas, tendencias y oportunidades de crecimiento</p>
              </div>
            </CardContent>
          </Card>

          {/* KPIs Principales */}
          <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
            <Card className="border-green-200 bg-gradient-to-br from-white to-green-50/30 dark:from-slate-800 dark:to-transparent">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[11px] sm:text-sm font-medium text-muted-foreground">Crecimiento</CardTitle>
                  {growthRate >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-lg sm:text-3xl font-bold">
                  {growthRate >= 0 ? '+' : ''}{(growthRate ?? 0).toFixed(1)}%
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">vs mes anterior</p>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-gradient-to-br from-white to-blue-50/30 dark:from-slate-800 dark:to-transparent">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[11px] sm:text-sm font-medium text-muted-foreground">Ticket Promedio</CardTitle>
                  <DollarSign className="h-4 w-4 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-lg sm:text-3xl font-bold">
                  {currencyFormatter.format(avgTicket)}
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">ultimos 30 dias</p>
              </CardContent>
            </Card>

            <Card className="border-orange-200 bg-gradient-to-br from-white to-orange-50/30 dark:from-slate-800 dark:to-transparent">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[11px] sm:text-sm font-medium text-muted-foreground">Dia Top</CardTitle>
                  <CalendarDays className="h-4 w-4 text-orange-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-lg sm:text-3xl font-bold">{topSellingDay}</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">mejor dia de la semana</p>
              </CardContent>
            </Card>

            <Card className="border-teal-200 bg-gradient-to-br from-white to-teal-50/30 dark:from-slate-800 dark:to-transparent">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[11px] sm:text-sm font-medium text-muted-foreground">Hora Pico</CardTitle>
                  <Clock className="h-4 w-4 text-teal-700" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-lg sm:text-3xl font-bold">{peakHour}:00</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">mayor volumen de ventas</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs de análisis */}
          <Tabs defaultValue="tendencias" className="space-y-4">
            <TabsList className="w-full h-auto gap-1 overflow-x-auto whitespace-nowrap justify-start sm:justify-center [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <TabsTrigger value="tendencias" className="h-9 px-3 text-xs sm:text-sm">Tendencias</TabsTrigger>
              <TabsTrigger value="turno" className="h-9 px-3 text-xs sm:text-sm">Turno</TabsTrigger>
              <TabsTrigger value="diario" className="h-9 px-3 text-xs sm:text-sm">Comparacion</TabsTrigger>
              <TabsTrigger value="semanal" className="h-9 px-3 text-xs sm:text-sm">Semanal</TabsTrigger>
              <TabsTrigger value="productos" className="h-9 px-3 text-xs sm:text-sm">Productos</TabsTrigger>
              <TabsTrigger value="ia" className="h-9 px-3 text-xs sm:text-sm">IA</TabsTrigger>
            </TabsList>

            {/* Tab: Tendencias */}
            <TabsContent value="tendencias" className="space-y-3 sm:space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="font-headline">Tendencia de Ventas (14 días)</CardTitle>
                  <CardDescription>Evolución de ingresos y pedidos en las últimas 2 semanas</CardDescription>
                </CardHeader>
                <CardContent>
                  <SalesTrendChart 
                    data={salesData ?? []} 
                    isLoading={salesLoading}
                    days={14}
                  />
                </CardContent>
              </Card>

              <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="font-headline">Ventas por Día</CardTitle>
                    <CardDescription>Días con más ventas</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <WeekdaySalesChart 
                      data={salesData ?? []} 
                      isLoading={salesLoading} 
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="font-headline">Ventas por Canal</CardTitle>
                    <CardDescription>Fuente de ventas</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SalesSourceChart 
                      data={salesData ?? []} 
                      isLoading={salesLoading} 
                    />
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="font-headline">Rendimiento por Hora</CardTitle>
                  <CardDescription>Horas pico para optimizar personal</CardDescription>
                </CardHeader>
                <CardContent>
                  <HourlyPerformanceChart 
                    data={salesData ?? []} 
                    isLoading={salesLoading} 
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Turno Actual */}
            <TabsContent value="turno" className="space-y-3 sm:space-y-4">
              <ShiftMetrics 
                currentShiftSales={currentShiftSales ?? []}
                previousShiftSales={previousShiftSales ?? []}
                isLoading={currentShiftLoading || previousShiftLoading}
              />

              <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="font-headline text-base">Ventas por Hora</CardTitle>
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
                    <CardTitle className="font-headline text-base">Por Categoría</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CategorySalesChart 
                      products={productsData ?? []} 
                      saleItems={currentShiftSaleItems ?? []} 
                      isLoading={productsLoading || saleItemsLoading}
                    />
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="font-headline">Desglose de Pedidos</CardTitle>
                  <CardDescription>Ventas del turno (3 PM - 2 AM)</CardDescription>
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

            {/* Tab: Comparación */}
            <TabsContent value="diario" className="space-y-3 sm:space-y-4">
              <DailyComparison 
                todaySales={todaySalesData ?? []}
                yesterdaySales={yesterdaySalesData ?? []}
                isLoading={todaySalesLoading || yesterdaySalesLoading}
              />

              <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="font-headline">Métodos de Pago</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PaymentMethodsChart 
                      data={salesData ?? []} 
                      isLoading={salesLoading} 
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="font-headline">Categorías</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CategorySalesChart 
                      products={productsData ?? []} 
                      saleItems={saleItems ?? []} 
                      isLoading={productsLoading || saleItemsLoading}
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Tab: Comparación Semanal */}
            <TabsContent value="semanal" className="space-y-3 sm:space-y-4">
              <WeeklyComparison
                currentWeekSales={currentWeekSalesClipped}
                previousWeekSales={previousWeekSalesClipped}
                isLoading={currentWeekLoading || previousWeekLoading}
              />

              <Card>
                <CardHeader>
                  <CardTitle className="font-headline">Tendencia semanal</CardTitle>
                  <CardDescription>Últimos 7 días para detectar aceleraciones o caídas</CardDescription>
                </CardHeader>
                <CardContent>
                  <SalesTrendChart
                    data={currentWeekSalesClipped}
                    isLoading={currentWeekLoading}
                    days={7}
                  />
                </CardContent>
              </Card>

              <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="font-headline">Métodos de Pago</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PaymentMethodsChart
                      data={currentWeekSalesClipped}
                      isLoading={currentWeekLoading}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="font-headline">Ventas por Hora</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <HourlyPerformanceChart
                      data={currentWeekSalesClipped}
                      isLoading={currentWeekLoading}
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Tab: Productos */}
            <TabsContent value="productos" className="space-y-3 sm:space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Medal className="h-5 w-5 text-yellow-600" />
                    <CardTitle className="font-headline">Top 5 Productos</CardTitle>
                  </div>
                  <CardDescription>Ranking por ingresos</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {topProducts.map((product, index) => (
                      <div 
                        key={product.productId} 
                        className="flex items-center gap-3 p-2.5 sm:p-3 rounded-lg border border-border/70 bg-gradient-to-r from-muted/30 to-transparent dark:from-muted/20"
                      >
                        <div className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-bold text-base sm:text-lg dark:from-yellow-600 dark:to-orange-600">
                          {index < 3 ? <Medal className="h-5 w-5" /> : `#${index + 1}`}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-sm sm:text-base">{product.name}</p>
                          <p className="text-[11px] sm:text-xs text-muted-foreground">{product.quantity} unidades</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm sm:text-lg font-bold text-green-600">{currencyFormatter.format(product.revenue)}</p>
                        </div>
                      </div>
                    ))}
                    {topProducts.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-6">Sin datos</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="font-headline">Top 10 - Análisis Detallado</CardTitle>
                </CardHeader>
                <CardContent>
                  <TopProductsTable 
                    products={productsData ?? []} 
                    saleItems={saleItems ?? []} 
                    isLoading={productsLoading || saleItemsLoading}
                    limit={10}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="font-headline">Productos Populares</CardTitle>
                </CardHeader>
                <CardContent>
                  <PopularItemsChart 
                    products={productsData ?? []} 
                    saleItems={saleItems ?? []}
                    isLoading={productsLoading || saleItemsLoading}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: IA */}
            <TabsContent value="ia" className="space-y-3 sm:space-y-4">
              <AIReportCard
                shiftRevenue={currentShiftSales.reduce((sum, sale) => sum + (sale.totalAmount ?? 0), 0)}
                shiftOrders={currentShiftSales.length}
                shiftAvgTicket={currentShiftSales.length > 0 ? currentShiftSales.reduce((sum, sale) => sum + (sale.totalAmount ?? 0), 0) / currentShiftSales.length : 0}
                monthRevenue={monthRevenue}
                monthOrders={monthSales.length}
                growthRate={growthRate}
                lowStockIngredients={lowStockIngredients.length}
                lowStockProducts={lowStockProducts.length}
                lowStockIngredientNames={lowStockIngredients.slice(0, 5).map((item) => item.name)}
                lowStockProductNames={lowStockProducts.slice(0, 5).map((item) => item.name)}
              />

              <Card className="border-teal-200 bg-gradient-to-br from-white to-teal-50/30 dark:from-slate-800 dark:to-transparent">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-teal-700" />
                    <CardTitle className="font-headline">Recomendaciones Inteligentes</CardTitle>
                  </div>
                  <CardDescription>Insights automáticos basados en datos</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recommendations.map((rec, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 sm:p-4 rounded-lg border border-border/70 bg-white/60 dark:bg-slate-800/60">
                        <div className={`p-2 rounded-lg ${rec.type === 'success' ? 'bg-green-100 text-green-600' : rec.type === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                          <Target className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm">{rec.title}</h4>
                          <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">{rec.description}</p>
                        </div>
                        <Badge variant={rec.type === 'success' ? 'default' : rec.type === 'warning' ? 'destructive' : 'secondary'}>
                          {rec.type === 'success' ? 'Oportunidad' : rec.type === 'warning' ? 'Alerta' : 'Consejo'}
                        </Badge>
                      </div>
                    ))}
                    {recommendations.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-6">Sin recomendaciones aún</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-blue-200 bg-gradient-to-br from-white to-blue-50/30 dark:from-slate-800 dark:to-transparent">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-blue-600" />
                    <CardTitle className="font-headline">Calendario de Campañas</CardTitle>
                  </div>
                  <CardDescription>Momentos clave para impulsar ventas</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2.5 sm:gap-3 md:grid-cols-2">
                    {campaignSuggestions.map((campaign, index) => (
                      <div key={index} className="p-3 sm:p-4 rounded-lg border border-border/70 bg-white/60 space-y-2 dark:bg-slate-800/60">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-sm sm:text-base">{campaign.title}</h4>
                          <Badge variant="outline">{campaign.timing}</Badge>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground">{campaign.description}</p>
                        <div className="flex items-center gap-2 text-[11px] sm:text-xs text-teal-700 font-medium">
                          <Sparkles className="h-3 w-3" />
                          {campaign.action}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Funciones futuras */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-dashed border-2 opacity-60">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="font-headline text-muted-foreground">Predicción (Próximamente)</CardTitle>
                    </div>
                  </CardHeader>
                </Card>

                <Card className="border-dashed border-2 opacity-60">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="font-headline text-muted-foreground">Segmentación (Próximamente)</CardTitle>
                    </div>
                  </CardHeader>
                </Card>

                <Card className="border-dashed border-2 opacity-60">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="font-headline text-muted-foreground">Competencia (Próximamente)</CardTitle>
                    </div>
                  </CardHeader>
                </Card>

                <Card className="border-dashed border-2 opacity-60">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="font-headline text-muted-foreground">Precios (Próximamente)</CardTitle>
                    </div>
                  </CardHeader>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
