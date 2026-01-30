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
  Package,
  CalendarDays,
  ArrowRight,
  BarChart3
} from 'lucide-react';
import { useCollection } from '@/firebase';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import type { Sale, Product, Ingredient } from '@/lib/types';
import { startOfMonth, subDays, setHours, setMinutes, format } from 'date-fns';
import { useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

function getCurrentShiftRange(): { start: Date; end: Date } {
  const now = new Date();
  const currentHour = now.getHours();
  
  let shiftStart: Date;
  let shiftEnd: Date;
  
  if (currentHour < 3) {
    shiftStart = setMinutes(setHours(subDays(now, 1), 15), 0);
    shiftEnd = setMinutes(setHours(now, 2), 59);
  } else if (currentHour < 15) {
    shiftStart = setMinutes(setHours(subDays(now, 1), 15), 0);
    shiftEnd = setMinutes(setHours(now, 2), 59);
  } else {
    shiftStart = setMinutes(setHours(now, 15), 0);
    shiftEnd = setMinutes(setHours(subDays(now, -1), 2), 59);
  }
  
  return { start: shiftStart, end: shiftEnd };
}

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

  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50/10 dark:from-slate-900 dark:to-slate-800">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto w-full px-3 sm:px-6 py-4 sm:py-6 space-y-5">
          {/* Header */}
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl lg:text-4xl font-headline font-bold text-slate-900 tracking-tight">
              Panel de Control
            </h1>
            <p className="text-base text-slate-600">Vista rápida del rendimiento de tu negocio</p>
          </div>

          {/* Reloj */}
          <LiveClock />

          {/* Métricas principales */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
              value="+12.5%"
              icon={TrendingUp}
              description="vs mes anterior"
            />
          </div>

          {/* Stock Overview */}
          <Card className="border-blue-200 bg-gradient-to-br from-white to-blue-50/30 dark:from-slate-800 dark:to-transparent">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-600" />
                  <CardTitle className="font-headline">Stock & Inventario</CardTitle>
                </div>
                <Badge variant="outline" className="text-xs">Vista Rápida</Badge>
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

          {/* CTA para análisis avanzado */}
          <Card className="border-purple-200 bg-gradient-to-br from-white to-purple-50/30 dark:from-slate-800 dark:to-transparent">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-purple-100">
                    <BarChart3 className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">¿Necesitas análisis más profundos?</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Ve a Insights para gráficos detallados, tendencias, recomendaciones IA y calendario de campañas
                    </p>
                  </div>
                </div>
                <Link href="/insights">
                  <Button size="lg" className="w-full sm:w-auto">
                    Ver Insights
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Últimas ventas rápidas */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="font-headline">Últimas Ventas del Turno</CardTitle>
                <Badge>{shiftStats.orders} ventas</Badge>
              </div>
              <CardDescription>Las 5 ventas más recientes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {currentShiftSales.slice(0, 5).map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div>
                      <p className="font-semibold">{sale.customerName || 'Cliente'}</p>
                      <p className="text-xs text-muted-foreground">
                        {sale.saleDate ? format(sale.saleDate.toDate(), 'HH:mm') : '-'} • {sale.paymentMethod}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">
                        {currencyFormatter.format(sale.totalAmount)}
                      </p>
                      <p className="text-xs text-muted-foreground">{sale.itemsCount || 0} items</p>
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
