
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
import { DollarSign, ShoppingCart, BarChart } from 'lucide-react';
import { useCollection } from '@/firebase';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import type { Sale, Product } from '@/lib/types';
import { startOfToday } from 'date-fns';


export default function DashboardPage() {
  const firestore = useFirestore();
  
  const salesQuery = useMemoFirebase(() => {
    return collection(firestore, 'sales');
  }, [firestore]);
  const { data: salesData, isLoading: salesLoading } = useCollection<Sale>(salesQuery);

  const todaySalesQuery = useMemoFirebase(() => {
    const today = startOfToday();
    return query(collection(firestore, 'sales'), where('saleDate', '>=', Timestamp.fromDate(today)));
  }, [firestore]);
  const { data: todaySalesData, isLoading: todaySalesLoading } = useCollection<Sale>(todaySalesQuery);

  const productsQuery = useMemoFirebase(() => {
    return collection(firestore, 'products');
  }, [firestore]);
  const { data: productsData, isLoading: productsLoading } = useCollection<Product>(productsQuery);

  const totalRevenue = todaySalesData?.reduce((acc, sale) => acc + sale.totalAmount, 0) ?? 0;
  // Note: netProfit is not available in the Sale entity. We'll use a placeholder calculation.
  const totalProfit = totalRevenue * 0.4; // Assuming a 40% profit margin
  const totalSales = todaySalesData?.length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-headline font-bold">Panel de Informes de Hoy</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Ingresos de Hoy"
          value={`S/ ${totalRevenue.toLocaleString('es-PE')}`}
          icon={DollarSign}
          description="Total de ingresos generados hoy"
        />
        <StatCard
          title="Beneficio Neto de Hoy"
          value={`S/ ${totalProfit.toLocaleString('es-PE')}`}
          icon={BarChart}
          description="Beneficio total después de costos (estimado)"
        />
        <StatCard
          title="Ventas de Hoy"
          value={`+${totalSales}`}
          icon={ShoppingCart}
          description="Número total de transacciones de hoy"
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
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
            <CardTitle className="font-headline">Artículos Más Vendidos</CardTitle>
            <CardDescription>Los 5 productos más vendidos históricamente.</CardDescription>
          </CardHeader>
          <CardContent>
            <PopularItemsChart products={productsData ?? []} isLoadingProducts={productsLoading} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
