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
import { collection } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import type { Sale, Product } from '@/lib/types';


export default function DashboardPage() {
  const firestore = useFirestore();
  
  const salesQuery = useMemoFirebase(() => {
    return collection(firestore, 'sales');
  }, [firestore]);
  const { data: salesData, isLoading: salesLoading } = useCollection<Sale>(salesQuery);

  const productsQuery = useMemoFirebase(() => {
    return collection(firestore, 'products');
  }, [firestore]);
  const { data: productsData, isLoading: productsLoading } = useCollection<Product>(productsQuery);

  const totalRevenue = salesData?.reduce((acc, sale) => acc + sale.totalAmount, 0) ?? 0;
  // Note: netProfit is not available in the Sale entity. We'll use a placeholder calculation.
  const totalProfit = totalRevenue * 0.4; // Assuming a 40% profit margin
  const totalSales = salesData?.length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-headline font-bold">Panel de Informes de Ventas</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Ingresos Totales"
          value={`S/ ${totalRevenue.toLocaleString('es-PE')}`}
          icon={DollarSign}
          description="Total de ingresos generados"
        />
        <StatCard
          title="Beneficio Neto"
          value={`S/ ${totalProfit.toLocaleString('es-PE')}`}
          icon={BarChart}
          description="Beneficio total después de costos (estimado)"
        />
        <StatCard
          title="Ventas Totales"
          value={`+${totalSales}`}
          icon={ShoppingCart}
          description="Número total de transacciones"
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle className="font-headline">Ventas Diarias</CardTitle>
            <CardDescription>Resumen de los ingresos de los últimos 7 días.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <SalesChart data={salesData ?? []} isLoading={salesLoading} />
          </CardContent>
        </Card>
        <Card className="col-span-4 lg:col-span-3">
          <CardHeader>
            <CardTitle className="font-headline">Artículos Populares</CardTitle>
            <CardDescription>Los productos más vendidos.</CardDescription>
          </CardHeader>
          <CardContent>
            <PopularItemsChart data={productsData ?? []} isLoading={productsLoading} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
