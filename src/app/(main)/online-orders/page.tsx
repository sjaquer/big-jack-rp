'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCollection, useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import type { OnlineOrder } from '@/lib/types';
import { useMemoFirebase } from '@/firebase/provider';


const statusMap: { [key in OnlineOrder['status']]: { label: string; color: 'default' | 'secondary' | 'destructive' | 'outline' } } = {
  pending: { label: 'Nuevo', color: 'default' },
  processing: { label: 'En Preparación', color: 'secondary' },
  completed: { label: 'Listo para Recoger', color: 'outline' },
};

export default function OnlineOrdersPage() {
  const firestore = useFirestore();
  const ordersQuery = useMemoFirebase(() => collection(firestore, 'online_orders'), [firestore]);
  const { data: onlineOrders, isLoading } = useCollection<OnlineOrder>(ordersQuery);

  const handleStatusChange = (orderId: string, newStatus: OnlineOrder['status']) => {
    const orderDocRef = doc(firestore, 'online_orders', orderId);
    updateDocumentNonBlocking(orderDocRef, { status: newStatus });
  };


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-headline font-bold">Gestión de Pedidos en Línea</h1>
        <p className="text-muted-foreground">Revisa y actualiza el estado de los pedidos en línea.</p>
      </div>
      {isLoading && <p>Cargando pedidos...</p>}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {onlineOrders?.map((order) => (
          <Card key={order.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="font-headline text-lg">{order.id.slice(0,8)}</CardTitle>
                  <CardDescription>{order.customerId}</CardDescription>
                </div>
                <Badge variant={statusMap[order.status]?.color ?? 'default'}>{statusMap[order.status]?.label ?? 'Desconocido'}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mt-4 pt-4 border-t">
                <p className="flex justify-between font-semibold">
                  <span>Total:</span>
                  <span>S/ {order.totalAmount.toFixed(2)}</span>
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Select defaultValue={order.status} onValueChange={(newStatus) => handleStatusChange(order.id, newStatus as OnlineOrder['status'])}>
                <SelectTrigger>
                  <SelectValue placeholder="Cambiar estado" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusMap).map(([status, { label }]) => (
                    <SelectItem key={status} value={status}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
