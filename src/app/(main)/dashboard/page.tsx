'use client';

import { useMemo, useState } from 'react';
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
import { QuickExpenseModal } from '@/components/dashboard/quick-expense-modal';
import { QuickStockModal } from '@/components/inventory/quick-stock-modal';

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

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [stockModalItem, setStockModalItem] = useState<{ id: string; name: string; quantity: number; unit?: string } | null>(null);
  const [stockModalType, setStockModalType] = useState<'ingredient' | 'other_item'>('ingredient');

  return (
    <div className="h-full w-full overflow-hidden bg-transparent">
      <div className="flex h-full flex-col overflow-y-auto">
        <div className="erp-page erp-stack erp-compact-landscape">
          <div className="grid gap-4 lg:grid-cols-12 auto-rows-[minmax(120px,auto)]">
            {/* Header / Control Panel */}
            <Card className="erp-surface lg:col-span-12 border-primary/20 bg-gradient-to-br from-white via-primary/5 to-accent/10 dark:from-slate-900 dark:via-primary/5 dark:to-slate-900 shadow-sm">
              <CardContent className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
                <div className="space-y-1">
                  <div className="flex flex-wrap gap-2 mb-2">
                    <Badge className="border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-colors uppercase tracking-wider text-[10px]">Centro de Comando</Badge>
                    <Badge variant="outline" className="bg-background/50 text-[10px] uppercase tracking-wider">Operación en Vivo</Badge>
                  </div>
                  <h1 className="text-2xl font-bold sm:text-3xl tracking-tight text-foreground">Control del Negocio</h1>
                  <p className="text-sm text-muted-foreground sm:text-base">
                    Gestión inmediata de operaciones críticas y flujo de caja.
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/80 p-4 shadow-inner backdrop-blur-sm">
                  <LiveClock />
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions - THE COMMAND CENTER (Adapted Colors) */}
            <div className="lg:col-span-12 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <Link href="/pos" className="contents">
                <Button className="h-auto py-6 flex-col gap-3 bg-primary hover:bg-primary/90 shadow-primary/20 dark:shadow-none shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] rounded-2xl border-b-4 border-primary/30">
                  <div className="p-3 bg-white/20 rounded-xl">
                    <GrillIcon className="h-6 w-6 text-white" />
                  </div>
                  <span className="font-bold text-sm text-white">NUEVA VENTA</span>
                </Button>
              </Link>

              <Link href="/incoming-orders" className="contents">
                <Button variant="outline" className="h-auto py-6 flex-col gap-3 border-accent/30 bg-accent/5 hover:bg-accent/10 dark:bg-accent/5 dark:border-accent/20 transition-all hover:scale-[1.02] active:scale-[0.98] rounded-2xl">
                  <div className="p-3 bg-accent/20 rounded-xl text-accent-foreground">
                    <ClipboardList className="h-6 w-6" />
                  </div>
                  <span className="font-bold text-sm text-accent-foreground">PEDIDOS</span>
                </Button>
              </Link>

              <Button 
                variant="outline" 
                onClick={() => setIsExpenseModalOpen(true)}
                className="h-auto py-6 flex-col gap-3 border-destructive/20 bg-destructive/5 hover:bg-destructive/10 dark:bg-destructive/5 dark:border-destructive/20 transition-all hover:scale-[1.02] active:scale-[0.98] rounded-2xl"
              >
                <div className="p-3 bg-destructive/10 rounded-xl text-destructive">
                  <Wallet className="h-6 w-6" />
                </div>
                <span className="font-bold text-sm text-destructive/80 dark:text-destructive">REGISTRAR GASTO</span>
              </Button>

              <Link href="/inventory" className="contents">
                <Button variant="outline" className="h-auto py-6 flex-col gap-3 border-primary/20 bg-primary/5 hover:bg-primary/10 dark:bg-primary/5 dark:border-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] rounded-2xl">
                  <div className="p-3 bg-primary/10 rounded-xl text-primary">
                    <Boxes className="h-6 w-6" />
                  </div>
                  <span className="font-bold text-sm text-primary">INVENTARIO</span>
                </Button>
              </Link>

              <Link href="/cash-flow" className="contents">
                <Button variant="outline" className="h-auto py-6 flex-col gap-3 border-secondary/40 bg-secondary/20 hover:bg-secondary/40 dark:bg-secondary/10 dark:border-secondary/30 transition-all hover:scale-[1.02] active:scale-[0.98] rounded-2xl">
                  <div className="p-3 bg-secondary/50 rounded-xl text-secondary-foreground">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                  <span className="font-bold text-sm text-secondary-foreground">CAJA / FLUJO</span>
                </Button>
              </Link>

              <Link href="/insights" className="contents">
                <Button variant="outline" className="h-auto py-6 flex-col gap-3 border-border bg-background/50 hover:bg-background/80 transition-all hover:scale-[1.02] active:scale-[0.98] rounded-2xl">
                  <div className="p-3 bg-muted rounded-xl text-muted-foreground">
                    <ArrowUpRight className="h-6 w-6" />
                  </div>
                  <span className="font-bold text-sm text-muted-foreground">INSIGHTS</span>
                </Button>
              </Link>
            </div>

            {/* Main Metrics Row */}
            <div className="grid gap-3 sm:grid-cols-2 lg:col-span-12 xl:grid-cols-4">
              <StatCard
                title="Ventas del turno"
                value={currencyFormatter.format(shiftStats.revenue)}
                icon={DollarSign}
                description={`${shiftStats.orders} pedidos (Turno actual)`}
              />
              <StatCard
                title="Ticket promedio"
                value={currencyFormatter.format(shiftStats.avgTicket)}
                icon={Receipt}
                description="Monto por pedido"
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
                description="Respecto al mes anterior"
              />
            </div>

            {/* Left Column: Alerts */}
            <Card className="erp-surface lg:col-span-5 border-primary/10 bg-gradient-to-br from-card to-primary/5">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-primary/10 rounded-lg">
                    <TriangleAlert className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="font-headline text-lg">Alertas de Stock</CardTitle>
                </div>
                <CardDescription>Items que requieren atención inmediata.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-2xl border border-primary/20 bg-background/80 p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Insumos Críticos</p>
                      <p className="mt-1 text-3xl font-black text-primary">{lowStockIngredients.length}</p>
                    </div>
                    {lowStockIngredients.length > 0 && (
                      <Button 
                        size="sm" 
                        variant="secondary" 
                        onClick={() => {
                          setStockModalItem({
                            id: lowStockIngredients[0].id,
                            name: lowStockIngredients[0].name,
                            quantity: lowStockIngredients[0].quantity,
                            unit: lowStockIngredients[0].unit
                          });
                          setStockModalType('ingredient');
                        }}
                        className="text-[10px] font-bold h-8"
                      >
                        REPONER
                      </Button>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground font-medium truncate">
                    {lowStockIngredients.slice(0, 2).map((item) => item.name).join(', ') || 'Todo en orden'}
                  </p>
                </div>
                
                <div className="rounded-2xl border border-border bg-background/40 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Productos Bajos</p>
                      <p className="mt-1 text-3xl font-black text-foreground/80">{lowStockProducts.length}</p>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground font-medium truncate">
                    {lowStockProducts.slice(0, 2).map((item) => item.name).join(', ') || 'Cocina con stock'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Right Column: Recent Sales */}
            <Card className="erp-surface lg:col-span-7 border-accent/10 bg-gradient-to-br from-card to-accent/5">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-accent/20 rounded-lg">
                      <ClipboardList className="h-5 w-5 text-accent-foreground" />
                    </div>
                    <CardTitle className="font-headline text-lg">Ventas Recientes</CardTitle>
                  </div>
                </div>
                <CardDescription>Últimos movimientos del turno actual.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {currentShiftSales.slice(0, 5).map((sale) => (
                    <div key={sale.id} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-2xl border border-border/50 bg-white/40 dark:bg-slate-900/40 p-3 hover:bg-white dark:hover:bg-slate-900 transition-colors shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                          {sale.paymentMethod?.[0] || 'V'}
                        </div>
                        <div>
                          <p className="font-bold text-sm leading-tight text-foreground">{sale.customerName || 'Cliente'}</p>
                          <p className="text-[10px] text-muted-foreground font-medium">
                            {sale.saleDate ? format(sale.saleDate.toDate(), 'HH:mm') : '-'} • {sale.paymentMethod}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-black text-primary">
                          {currencyFormatter.format(sale.totalAmount)}
                        </p>
                        <p className="text-[9px] uppercase tracking-tighter font-bold text-muted-foreground">{sale.itemsCount || 0} items</p>
                      </div>
                    </div>
                  ))}
                  {currentShiftSales.length === 0 && (
                    <div className="py-12 text-center">
                      <p className="text-sm text-muted-foreground font-medium">No hay ventas registradas hoy</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Quick Modals */}
      <QuickExpenseModal 
        isOpen={isExpenseModalOpen} 
        onClose={() => setIsExpenseModalOpen(false)} 
      />
      
      {stockModalItem && (
        <QuickStockModal
          isOpen={!!stockModalItem}
          onClose={() => setStockModalItem(null)}
          item={stockModalItem}
          itemType={stockModalType}
        />
      )}
    </div>
  );
}
