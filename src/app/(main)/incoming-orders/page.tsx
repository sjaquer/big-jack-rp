
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
import { collection, doc, query, orderBy } from 'firebase/firestore';
import type { OnlineOrder } from '@/lib/types';
import { useMemoFirebase } from '@/firebase/provider';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';


const statusMap: { [key in OnlineOrder['status']]: { label: string; color: 'default' | 'secondary' | 'destructive' | 'outline' } } = {
  pending: { label: 'Nuevo', color: 'default' },
  processing: { label: 'En Preparación', color: 'secondary' },
  completed: { label: 'Listo para Recoger', color: 'outline' },
};

export default function IncomingOrdersPage() {
  const firestore = useFirestore();
  
  const ordersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'online_orders'), orderBy('orderDate', 'desc'));
  }, [firestore]);

  const { data: onlineOrders, isLoading } = useCollection<OnlineOrder>(ordersQuery);

  const handleStatusChange = (orderId: string, newStatus: OnlineOrder['status']) => {
    if (!firestore) return;
    const orderDocRef = doc(firestore, 'online_orders', orderId);
    updateDocumentNonBlocking(orderDocRef, { status: newStatus });
  };


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-headline font-bold">Gestión de Pedidos Entrantes</h1>
        <p className="text-muted-foreground">Revisa y actualiza el estado de todos los pedidos a preparar.</p>
      </div>
      {isLoading && <p>Cargando pedidos...</p>}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {onlineOrders?.map((order) => (
          <Card key={order.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0 flex-1">
                  <CardTitle className="font-headline text-base sm:text-lg truncate">#{order.id.slice(0,6)}</CardTitle>
                  <CardDescription>
                    {order.orderDate ? format(order.orderDate.toDate(), 'dd/MM/yyyy HH:mm', { locale: es }) : 'Fecha no disponible'}
                  </CardDescription>
                </div>
                <Badge variant={statusMap[order.status]?.color ?? 'default'}>{statusMap[order.status]?.label ?? 'Desconocido'}</Badge>
              </div>
            </CardHeader>
            <CardContent>
               <div className="text-sm">
                <p className="font-medium">Cliente: {order.customerName ?? order.customerId.slice(0,10)}</p>
              </div>
               <Accordion type="single" collapsible className="w-full mt-4">
                <AccordionItem value="items" className="border-none">
                  <AccordionTrigger className="text-sm sm:text-base font-medium py-3 hover:no-underline touch-manipulation">
                    Ver artículos ({order.items.length})
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 pt-2">
                      {order.items.map(item => (
                        <div key={item.productId} className="flex justify-between text-xs sm:text-sm p-2 rounded-md bg-muted/30">
                          <span className="font-medium">{item.quantity} x {item.productName}</span>
                          <span className="font-semibold">S/ {(item.quantity * item.unitPrice).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
              <div className="mt-4 pt-4 border-t">
                <p className="flex justify-between font-semibold">
                  <span>Total:</span>
                  <span>S/ {order.totalAmount.toFixed(2)}</span>
                </p>
              </div>
            </CardContent>
            <CardFooter className="pt-4">
              <Select defaultValue={order.status} onValueChange={(newStatus) => handleStatusChange(order.id, newStatus as OnlineOrder['status'])}>
                <SelectTrigger className="h-12 text-base font-medium touch-manipulation">
                  <SelectValue placeholder="Cambiar estado" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusMap).map(([status, { label }]) => (
                    <SelectItem key={status} value={status} className="text-base py-3">{label}</SelectItem>
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
