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
import { mockOnlineOrders } from '@/lib/data';
import type { OnlineOrder } from '@/lib/types';

const statusMap: { [key in OnlineOrder['status']]: { label: string; color: 'default' | 'secondary' | 'destructive' | 'outline' } } = {
  new: { label: 'Nuevo', color: 'default' },
  preparing: { label: 'En Preparación', color: 'secondary' },
  ready: { label: 'Listo para Recoger', color: 'outline' },
  completed: { label: 'Completado', color: 'secondary' },
};

export default function OnlineOrdersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-headline font-bold">Gestión de Pedidos en Línea</h1>
        <p className="text-muted-foreground">Revisa y actualiza el estado de los pedidos en línea.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {mockOnlineOrders.map((order) => (
          <Card key={order.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="font-headline text-lg">{order.id}</CardTitle>
                  <CardDescription>{order.customerName}</CardDescription>
                </div>
                <Badge variant={statusMap[order.status].color}>{statusMap[order.status].label}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {order.items.map((item, index) => (
                  <li key={index} className="flex justify-between">
                    <span>{item.quantity}x {item.productName}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 pt-4 border-t">
                <p className="flex justify-between font-semibold">
                  <span>Total:</span>
                  <span>S/ {order.total.toFixed(2)}</span>
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Select defaultValue={order.status}>
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
