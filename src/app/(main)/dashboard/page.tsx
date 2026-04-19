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
import { AnalyticsIcon, BurgerIcon, CashRegisterIcon, GrillIcon, InventoryCrateIcon, OrderTicketIcon } from '@/components/icons';
import {
  DollarSign,
  Receipt,
  TrendingUp,
  CalendarDays,
  ArrowRight,
  BarChart3,
  CircleDollarSign,
  ArrowUpRight,
  ChevronRight,
  Users,
} from 'lucide-react';
import { useCollection } from '@/firebase';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import type { Sale, Product, Ingredient } from '@/lib/types';
import { startOfMonth, endOfMonth, subMonths, subDays, setHours, setMinutes, format } from 'date-fns';
import { useMemo } from 'react';
import type { ComponentType, SVGProps } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type DashboardModule = {
  href: string;
  label: string;
  description: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  accent: string;
};

const dashboardModules: DashboardModule[] = [
  {
    href: '/dashboard',
    label: 'Panel',
    description: 'Resumen ejecutivo y alertas',
    icon: BarChart3,
    accent: 'from-slate-50 to-amber-50/80 dark:from-slate-800 dark:to-slate-700',
  },
  {
    href: '/pos',
    label: 'POS',
    description: 'Venta rápida y cobro',
    icon: GrillIcon,
    accent: 'from-orange-50 to-rose-50/80 dark:from-slate-800 dark:to-slate-700',
  },
  {
    href: '/cash-flow',
    label: 'Caja y Flujo',
    description: 'Movimientos y cierres',
    icon: CashRegisterIcon,
    accent: 'from-emerald-50 to-teal-50/80 dark:from-slate-800 dark:to-slate-700',
  },
  {
    href: '/incoming-orders',
    label: 'Pedidos',
    description: 'Pedidos entrantes y despacho',
    icon: OrderTicketIcon,
    accent: 'from-sky-50 to-cyan-50/80 dark:from-slate-800 dark:to-slate-700',
  },
  {
    href: '/customers',
    label: 'Clientes',
    description: 'Fichas, historial y segmentos',
    icon: Users,
    accent: 'from-lime-50 to-green-50/80 dark:from-slate-800 dark:to-slate-700',
  },
  {
    href: '/products',
    label: 'Productos',
    description: 'Catálogo, precios y combos',
    icon: BurgerIcon,
    accent: 'from-amber-50 to-orange-50/80 dark:from-slate-800 dark:to-slate-700',
  },
  {
    href: '/inventory',
    label: 'Inventario',
    description: 'Stock y reposición',
    icon: InventoryCrateIcon,
    accent: 'from-cyan-50 to-sky-50/80 dark:from-slate-800 dark:to-slate-700',
  },
  {
    href: '/insights',
    label: 'Insights',
    description: 'Tendencias y rendimiento',
    icon: AnalyticsIcon,
    accent: 'from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700',
  },
];

const currencyFormatter = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  minimumFractionDigits: 2,
});

function DashboardModuleCard({ module }: { module: DashboardModule }) {
  const Icon = module.icon;

  return (
    <Link href={module.href} className="group block h-full">
      <Card className={`card-touch h-full overflow-hidden border-border/70 bg-gradient-to-br ${module.accent}`}>
        <CardContent className="flex h-full flex-col gap-4 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Acceso rápido</p>
              <h3 className="mt-1 truncate text-base font-semibold">{module.label}</h3>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-background/80 text-primary shadow-sm transition-transform group-hover:-translate-y-0.5">
              <Icon className="h-5 w-5" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{module.description}</p>
          <div className="mt-auto flex items-center gap-2 text-sm font-semibold text-primary">
            Entrar
            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}


export default function DashboardPage() {
  const firestore = useFirestore();

  // Calcular rangos del turno de manera estable
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
    <div className="h-full w-full overflow-hidden bg-transparent">
      <div className="flex h-full flex-col overflow-y-auto">
        <div className="erp-page erp-stack erp-compact-landscape">
          <div className="grid gap-4 lg:grid-cols-12 auto-rows-[minmax(120px,auto)]">
            <Card className="erp-surface lg:col-span-7 overflow-hidden border-primary/20 bg-gradient-to-br from-white via-amber-50/70 to-teal-50/50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-800" id="dashboard-header">
              <CardContent className="flex h-full flex-col justify-between gap-6 p-5 sm:p-6">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="border-primary/30 bg-primary/15 text-primary">Panel Ejecutivo</Badge>
                    <Badge variant="outline">Turno Activo</Badge>
                    <Badge variant="secondary">Vista bento</Badge>
                  </div>
                  <div className="space-y-2">
                    <h1 className="erp-section-title text-slate-900 dark:text-slate-50">Panel de control operativo</h1>
                    <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-300 sm:text-base">
                      Estado del negocio en tiempo real con accesos grandes para entrar a cada módulo del ERP desde computadora o tablet horizontal.
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

                <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
                  <div className="rounded-2xl border border-border/60 bg-background/75 p-3">
                    <p className="text-[11px] uppercase tracking-[0.1em]">Pedidos en turno</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">{shiftStats.orders}</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-background/75 p-3">
                    <p className="text-[11px] uppercase tracking-[0.1em]">Ventas del mes</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">{currencyFormatter.format(monthStats.revenue)}</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-background/75 p-3">
                    <p className="text-[11px] uppercase tracking-[0.1em]">Crecimiento</p>
                    <p className={`mt-1 text-lg font-semibold ${growthRate >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {growthRate >= 0 ? '+' : ''}{growthRate.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="erp-surface lg:col-span-5 overflow-hidden border-teal-200/70 bg-gradient-to-br from-white to-teal-50/60 dark:from-slate-900 dark:to-slate-800">
              <CardHeader className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-teal-700" />
                    <CardTitle className="font-headline">Lectura rápida</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-xs">Hoy</Badge>
                </div>
                <CardDescription>Resumen compacto para decidir rápido</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl border border-border/70 bg-background/80 p-3 sm:p-4">
                  <LiveClock />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-border/60 bg-background/75 p-3">
                    <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Ticket promedio</p>
                    <p className="mt-1 text-lg font-semibold">{currencyFormatter.format(shiftStats.avgTicket)}</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-background/75 p-3">
                    <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Ventas del turno</p>
                    <p className="mt-1 text-lg font-semibold">{currencyFormatter.format(shiftStats.revenue)}</p>
                  </div>
                </div>
                <Link href="/insights" className="block">
                  <Button size="lg" className="w-full">
                    Abrir analítica avanzada
                    <ArrowUpRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="erp-surface lg:col-span-12" id="dashboard-module-hub">
              <CardHeader>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="font-headline">Acceso directo a módulos</CardTitle>
                    <CardDescription>El panel funciona como hub para entrar a cada parte del ERP sin depender de una barra lateral.</CardDescription>
                  </div>
                  <Badge variant="outline">8 accesos</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {dashboardModules.map((module) => (
                    <DashboardModuleCard key={module.href} module={module} />
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 lg:col-span-12" id="stats-cards">
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

            <Card className="erp-surface lg:col-span-7 border-blue-200/70 bg-gradient-to-br from-white to-blue-50/40 dark:from-slate-900 dark:to-slate-800">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <InventoryCrateIcon className="h-5 w-5 text-blue-600" />
                    <CardTitle className="font-headline">Stock e inventario</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-xs">Vista rápida</Badge>
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

            <Card className="erp-surface lg:col-span-5 border-emerald-200/70 bg-gradient-to-br from-white to-emerald-50/40 dark:from-slate-900 dark:to-slate-800">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-emerald-700" />
                    <CardTitle className="font-headline">Últimas ventas del turno</CardTitle>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">{shiftStats.orders} ventas</Badge>
                </div>
                <CardDescription>Las 5 ventas más recientes</CardDescription>
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

            <Card className="erp-surface lg:col-span-6 border-teal-200/70 bg-gradient-to-br from-white to-teal-50/40 dark:from-slate-900 dark:to-slate-800">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="font-headline">Resumen comercial</CardTitle>
                  <Badge variant="secondary">Hoy</Badge>
                </div>
                <CardDescription>Lectura compacta para decisiones rápidas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-border/60 bg-background/75 p-3">
                    <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Pedidos</p>
                    <p className="mt-1 text-xl font-semibold">{shiftStats.orders}</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-background/75 p-3">
                    <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Mes</p>
                    <p className="mt-1 text-xl font-semibold">{monthStats.orders}</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-background/75 p-3">
                    <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Crecimiento</p>
                    <p className={`mt-1 text-xl font-semibold ${growthRate >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {growthRate >= 0 ? '+' : ''}{growthRate.toFixed(1)}%
                    </p>
                  </div>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background/75 p-4">
                  <p className="text-sm font-medium">Acciones recomendadas</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <Link href="/pos" className="contents sm:block">
                      <Button variant="secondary" className="w-full justify-start gap-2">
                        <GrillIcon className="h-4 w-4" />
                        Ir a POS
                      </Button>
                    </Link>
                    <Link href="/cash-flow" className="contents sm:block">
                      <Button variant="outline" className="w-full justify-start gap-2">
                        <CashRegisterIcon className="h-4 w-4" />
                        Revisar caja
                      </Button>
                    </Link>
                    <Link href="/inventory" className="contents sm:block">
                      <Button variant="outline" className="w-full justify-start gap-2">
                        <InventoryCrateIcon className="h-4 w-4" />
                        Ver stock
                      </Button>
                    </Link>
                    <Link href="/incoming-orders" className="contents sm:block">
                      <Button variant="outline" className="w-full justify-start gap-2">
                        <OrderTicketIcon className="h-4 w-4" />
                        Gestionar pedidos
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="erp-surface lg:col-span-6 border-slate-200/70 bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="font-headline">Atajo a insights</CardTitle>
                  <Badge variant="outline">Análisis</Badge>
                </div>
                <CardDescription>Explora tendencias, comparativas y recomendaciones sin salir del flujo operativo.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border/60 bg-background/75 p-3">
                    <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Ticket promedio</p>
                    <p className="mt-1 text-lg font-semibold">{currencyFormatter.format(shiftStats.avgTicket)}</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-background/75 p-3">
                    <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Ventas del mes</p>
                    <p className="mt-1 text-lg font-semibold">{currencyFormatter.format(monthStats.revenue)}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Link href="/insights" className="contents sm:block">
                    <Button size="lg" className="w-full sm:w-auto">
                      Ver insights
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/customers" className="contents sm:block">
                    <Button size="lg" variant="outline" className="w-full sm:w-auto">
                      Revisar clientes
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
