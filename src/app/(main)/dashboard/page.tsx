
'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import StatCard from '@/components/dashboard/stat-card';
import { SalesChart } from '@/components/dashboard/sales-chart';
import { PopularItemsChart } from '@/components/dashboard/popular-items-chart';
import { DailyOrdersBreakdown } from '@/components/dashboard/daily-orders-breakdown';
import { DollarSign, ShoppingCart, BarChart, CalendarDays } from 'lucide-react';
import { useCollection } from '@/firebase';
import { collection, query, where, Timestamp, collectionGroup } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import type { Sale, Product, SaleItem, CashFlowEntry } from '@/lib/types';
import { startOfToday, startOfWeek, startOfMonth } from 'date-fns';
import { useMemo } from 'react';

type PeriodKey = 'daily' | 'weekly' | 'monthly';

interface PeriodSummary {
  label: string;
  startDate: Date;
  revenue: number;
  cost: number;
  margin: number;
  incomes: number;
  expenses: number;
  net: number;
  orders: number;
}

const currencyFormatter = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  minimumFractionDigits: 2,
});


export default function DashboardPage() {
  const firestore = useFirestore();
  
  const salesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'sales');
  }, [firestore]);
  const { data: salesData, isLoading: salesLoading } = useCollection<Sale>(salesQuery);

  const todaySalesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    const today = startOfToday();
    return query(collection(firestore, 'sales'), where('saleDate', '>=', Timestamp.fromDate(today)));
  }, [firestore]);
  const { data: todaySalesData, isLoading: todaySalesLoading } = useCollection<Sale>(todaySalesQuery);

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

  const todaySalesIds = useMemo(() => todaySalesData?.map(s => s.id) ?? [], [todaySalesData]);
  
  const todaySaleItems = useMemo(() => {
    if (!saleItems || !todaySalesIds) return [];
    return saleItems?.filter(item => todaySalesIds.includes(item.saleId)) ?? [];
  }, [saleItems, todaySalesIds]);

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

  const todayStart = startOfToday();
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const monthStart = startOfMonth(new Date());

  const periodStats = useMemo(() => {
    const summaries: Record<PeriodKey, PeriodSummary> = {
      daily: {
        label: 'Hoy',
        startDate: todayStart,
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

    (Object.entries(summaries) as Array<[PeriodKey, PeriodSummary]>).forEach(([key, summary]) => {
      const startDate = summary.startDate;

      (salesData ?? []).forEach((sale) => {
        if (!sale.saleDate) return;
        const saleDate = sale.saleDate.toDate();
        if (saleDate < startDate) return;
        summary.revenue += sale.totalAmount ?? 0;
        summary.orders += 1;
        const saleTotals = saleItemTotals.get(sale.id);
        if (saleTotals) {
          summary.cost += saleTotals.cost;
          summary.margin += saleTotals.margin;
        }
      });

      (cashFlowEntries ?? []).forEach((entry) => {
        if (!entry.entryDate) return;
        const entryDate = entry.entryDate.toDate();
        if (entryDate < startDate) return;
        if (entry.type === 'expense') {
          summary.expenses += entry.amount;
        } else {
          summary.incomes += entry.amount;
        }
      });

      summary.net = summary.margin + summary.incomes - summary.expenses;
    });

    return summaries;
  }, [salesData, saleItemTotals, cashFlowEntries, todayStart, weekStart, monthStart]);

  const todaySummary = periodStats.daily;
  const weeklySummary = periodStats.weekly;
  const monthlySummary = periodStats.monthly;
  const totalSales = todaySummary.orders;

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0 pb-3">
        <h1 className="text-2xl lg:text-3xl font-headline font-bold">Panel de Control</h1>
        <p className="text-sm text-muted-foreground">Vista general del rendimiento de ventas y estadísticas clave.</p>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-4 pb-2">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Ingresos de Hoy"
              value={currencyFormatter.format(todaySummary.revenue)}
              icon={DollarSign}
              description="Total de ventas del día actual"
            />
            <StatCard
              title="Neto de Hoy"
              value={currencyFormatter.format(todaySummary.net)}
              icon={BarChart}
              description="Margen después de costos y gastos"
            />
            <StatCard
              title="Ingresos del Mes"
              value={currencyFormatter.format(monthlySummary.revenue)}
              icon={CalendarDays}
              description="Total acumulado del mes en curso"
            />
            <StatCard
              title="Ventas de Hoy"
              value={`+${totalSales}`}
              icon={ShoppingCart}
              description="Número total de transacciones de hoy"
            />
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            {(['daily', 'weekly', 'monthly'] as PeriodKey[]).map((key) => {
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
              </CardContent>
            </Card>
              );
            })}
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle className="font-headline">Ventas de los Últimos 7 Días</CardTitle>
                <CardDescription>Resumen de los ingresos diarios.</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <SalesChart data={salesData ?? []} isLoading={salesLoading} />
              </CardContent>
            </Card>
            <Card className="col-span-4 lg:col-span-3">
              <CardHeader>
                <CardTitle className="font-headline">Los 5 Artículos Más Vendidos</CardTitle>
                <CardDescription>Los productos más vendidos históricamente.</CardDescription>
              </CardHeader>
              <CardContent>
                <PopularItemsChart products={productsData ?? []} saleItems={saleItems ?? []} isLoading={productsLoading || saleItemsLoading} />
              </CardContent>
            </Card>
          </div>

          {/* Desglose de pedidos diarios */}
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Desglose de Pedidos de Hoy</CardTitle>
              <CardDescription>Detalle completo de todas las ventas realizadas hoy.</CardDescription>
            </CardHeader>
            <CardContent>
              <DailyOrdersBreakdown 
                sales={todaySalesData ?? []} 
                saleItems={todaySaleItems ?? []} 
                products={productsData ?? []} 
                isLoading={todaySalesLoading || saleItemsLoading || productsLoading}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
