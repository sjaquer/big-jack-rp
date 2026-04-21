'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import StatCard from '@/components/dashboard/stat-card';
import { LiveClock } from '@/components/dashboard/live-clock';
import { useCollection, useFirestore } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import type { Ingredient, InventoryItem, Product, Sale } from '@/lib/types';
import { startOfMonth, endOfMonth, subMonths, subDays, setHours, setMinutes, format } from 'date-fns';
import {
  DollarSign,
  Receipt,
  TrendingUp,
  TriangleAlert,
  ArrowUpRight,
  ClipboardList,
  Boxes,
  Wallet,
} from 'lucide-react';
import { GrillIcon } from '@/components/icons';
import { calculateProductProducibleQuantity } from '@/lib/product-stock';

const currencyFormatter = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  minimumFractionDigits: 2,
});

export default function DashboardPage() {
  const firestore = useFirestore();

  const shiftStart = useMemo(() => {
    const now = new Date();
    const currentHour = now.getHours();

    if (currentHour < 18) {
      return setMinutes(setHours(subDays(now, 1), 18), 0);
    }

    return setMinutes(setHours(now, 18), 0);
  }, []);

  const shiftEnd = useMemo(() => {
    const now = new Date();
    const currentHour = now.getHours();

    if (currentHour < 18) {
      return setMinutes(setHours(now, 1), 59);
    }

    return setMinutes(setHours(subDays(now, -1), 1), 59);
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
    return currentShiftSalesRaw.filter((sale) => {
      const saleDate = sale.saleDate.toDate();
      return saleDate >= shiftStart && saleDate <= shiftEnd;
    });
  }, [currentShiftSalesRaw, shiftStart, shiftEnd]);

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

  const productsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'products');
  }, [firestore]);
  const { data: productsData } = useCollection<Product>(productsQuery);

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

  const lowStockIngredients = useMemo(() => {
    return (ingredientsData ?? []).filter((ingredient) => ingredient.quantity <= (ingredient.minimumStock || 0));
  }, [ingredientsData]);

  const lowStockProducts = useMemo(() => {
    return (productsData ?? []).filter(
      (product) => calculateProductProducibleQuantity(product, ingredientsData ?? [], inventoryItemsData ?? []) <= 5
    );
  }, [productsData, ingredientsData, inventoryItemsData]);

  return (
    <div className="h-full w-full overflow-hidden bg-transparent">
      <div className="flex h-full flex-col overflow-y-auto">
        <div className="erp-page erp-stack erp-compact-landscape">
          <div className="grid gap-4 lg:grid-cols-12 auto-rows-[minmax(120px,auto)]">
            <Card className="erp-surface lg:col-span-12 border-primary/20 bg-gradient-to-br from-white via-amber-50/70 to-teal-50/40 dark:from-slate-900 dark:via-slate-800 dark:to-slate-800">
              <CardContent className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <Badge className="border-primary/30 bg-primary/15 text-primary">Panel esencial</Badge>
                    <Badge variant="outline">Operación en vivo</Badge>
                  </div>
                  <h1 className="text-2xl font-bold sm:text-3xl">Control diario del negocio</h1>
                  <p className="text-sm text-muted-foreground sm:text-base">
                    Vista compacta con indicadores críticos. Los informes detallados se revisan manualmente desde Insights.
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                  <LiveClock />
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-3 sm:grid-cols-2 lg:col-span-12 xl:grid-cols-4">
              <StatCard
                title="Ventas del turno"
                value={currencyFormatter.format(shiftStats.revenue)}
                icon={DollarSign}
                description={`${shiftStats.orders} pedidos (6PM-1AM)`}
              />
              <StatCard
                title="Ticket promedio"
                value={currencyFormatter.format(shiftStats.avgTicket)}
                icon={Receipt}
                description="Monto promedio por pedido"
              />
              <StatCard
                title="Ventas del mes"
                value={currencyFormatter.format(monthStats.revenue)}
                icon={TrendingUp}
                description={`${monthStats.orders} pedidos acumulados`}
              />
              <StatCard
                title="Crecimiento"
                value={`${growthRate >= 0 ? '+' : ''}${growthRate.toFixed(1)}%`}
                icon={ArrowUpRight}
                description="Comparado al mes anterior"
              />
            </div>

            <Card className="erp-surface lg:col-span-5 border-amber-200/70 bg-gradient-to-br from-white to-amber-50/40 dark:from-slate-900 dark:to-slate-800">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TriangleAlert className="h-5 w-5 text-amber-600" />
                  <CardTitle className="font-headline">Alertas críticas</CardTitle>
                </div>
                <CardDescription>Solo indicadores que requieren atención inmediata.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-2xl border border-border/60 bg-background/80 p-3">
                  <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Ingredientes en mínimo</p>
                  <p className="mt-1 text-2xl font-bold">{lowStockIngredients.length}</p>
                  <p className="text-xs text-muted-foreground">
                    {lowStockIngredients.slice(0, 2).map((item) => item.name).join(', ') || 'Sin alertas'}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background/80 p-3">
                  <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Productos con bajo stock producible</p>
                  <p className="mt-1 text-2xl font-bold">{lowStockProducts.length}</p>
                  <p className="text-xs text-muted-foreground">
                    {lowStockProducts.slice(0, 2).map((item) => item.name).join(', ') || 'Sin alertas'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="erp-surface lg:col-span-7 border-emerald-200/70 bg-gradient-to-br from-white to-emerald-50/40 dark:from-slate-900 dark:to-slate-800">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-emerald-700" />
                  <CardTitle className="font-headline">Ventas recientes</CardTitle>
                </div>
                <CardDescription>Últimas 5 ventas del turno para control operativo.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {currentShiftSales.slice(0, 5).map((sale) => (
                    <div key={sale.id} className="grid grid-cols-[1fr_auto] items-start gap-2 rounded-2xl border border-border/70 bg-muted/20 p-3 sm:flex sm:items-center sm:justify-between sm:gap-3">
                      <div>
                        <p className="font-semibold">{sale.customerName || 'Cliente'}</p>
                        <p className="text-[11px] text-muted-foreground sm:text-xs">
                          {sale.saleDate ? format(sale.saleDate.toDate(), 'HH:mm') : '-'} • {sale.paymentMethod}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-green-600 sm:text-lg">
                          {currencyFormatter.format(sale.totalAmount)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">{sale.itemsCount || 0} items</p>
                      </div>
                    </div>
                  ))}
                  {currentShiftSales.length === 0 && (
                    <p className="py-6 text-center text-sm text-muted-foreground">Aún no hay ventas en este turno</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="erp-surface lg:col-span-12 border-slate-200/70 bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800">
              <CardHeader>
                <CardTitle className="font-headline">Acciones operativas rápidas</CardTitle>
                <CardDescription>Accesos a tareas clave y reporte manual.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                <Link href="/pos" className="contents sm:block">
                  <Button className="w-full justify-start gap-2">
                    <GrillIcon className="h-4 w-4" />
                    Abrir POS
                  </Button>
                </Link>
                <Link href="/incoming-orders" className="contents sm:block">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <ClipboardList className="h-4 w-4" />
                    Gestionar pedidos
                  </Button>
                </Link>
                <Link href="/inventory" className="contents sm:block">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <Boxes className="h-4 w-4" />
                    Revisar inventario
                  </Button>
                </Link>
                <Link href="/cash-flow" className="contents sm:block">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <Wallet className="h-4 w-4" />
                    Caja y flujo
                  </Button>
                </Link>
                <Link href="/insights" className="contents sm:block">
                  <Button variant="secondary" className="w-full justify-start gap-2">
                    <ArrowUpRight className="h-4 w-4" />
                    Informe manual (Insights)
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
