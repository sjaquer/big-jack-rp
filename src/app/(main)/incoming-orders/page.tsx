
'use client';
import { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCollection, useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc, query, orderBy } from 'firebase/firestore';
import type { OnlineOrder } from '@/lib/types';
import { useMemoFirebase } from '@/firebase/provider';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { OrderDetailDialog } from '@/components/online-orders/order-detail-dialog';
import { Clock, ChefHat, CheckCircle2, AlertCircle, Eye, ArrowRight } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';


const statusConfig = {
  pending: { 
    label: 'Nuevos', 
    icon: AlertCircle, 
    color: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
    badge: 'default' as const,
    nextStatus: 'processing' as const,
    nextLabel: 'Iniciar Preparación'
  },
  processing: { 
    label: 'En Preparación', 
    icon: ChefHat, 
    color: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
    badge: 'secondary' as const,
    nextStatus: 'completed' as const,
    nextLabel: 'Marcar Listo'
  },
  completed: { 
    label: 'Listos', 
    icon: CheckCircle2, 
    color: 'bg-green-500/10 text-green-700 border-green-500/20',
    badge: 'outline' as const,
    nextStatus: null,
    nextLabel: 'Completado'
  },
};

export default function IncomingOrdersPage() {
  const firestore = useFirestore();
  const [selectedTab, setSelectedTab] = useState<OnlineOrder['status']>('pending');
  const [selectedOrder, setSelectedOrder] = useState<OnlineOrder | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  
  const ordersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'online_orders'), orderBy('orderDate', 'desc'));
  }, [firestore]);

  const { data: onlineOrders, isLoading } = useCollection<OnlineOrder>(ordersQuery);

  // Filtrar pedidos por estado
  const filteredOrders = useMemo(() => {
    if (!onlineOrders) return [];
    return onlineOrders.filter(order => order.status === selectedTab);
  }, [onlineOrders, selectedTab]);

  // Contar pedidos por estado
  const orderCounts = useMemo(() => {
    if (!onlineOrders) return { pending: 0, processing: 0, completed: 0 };
    return {
      pending: onlineOrders.filter(o => o.status === 'pending').length,
      processing: onlineOrders.filter(o => o.status === 'processing').length,
      completed: onlineOrders.filter(o => o.status === 'completed').length,
    };
  }, [onlineOrders]);

  const handleStatusChange = (orderId: string, newStatus: OnlineOrder['status']) => {
    if (!firestore) return;
    const orderDocRef = doc(firestore, 'online_orders', orderId);
    updateDocumentNonBlocking(orderDocRef, { status: newStatus });
  };

  const handleViewDetails = (order: OnlineOrder) => {
    setSelectedOrder(order);
    setDetailDialogOpen(true);
  };


  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-headline font-bold">Pedidos de Cocina</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Gestión de pedidos en tiempo real</p>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
          <span className="text-sm sm:text-base font-medium">
            {format(new Date(), 'HH:mm', { locale: es })}
          </span>
        </div>
      </div>

      {/* Tabs de estado */}
      <Tabs value={selectedTab} onValueChange={(value) => setSelectedTab(value as OnlineOrder['status'])} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto p-1 gap-1">
          {Object.entries(statusConfig).map(([status, config]) => {
            const Icon = config.icon;
            const count = orderCounts[status as OnlineOrder['status']];
            return (
              <TabsTrigger
                key={status}
                value={status}
                className="h-16 sm:h-20 flex flex-col gap-1 sm:gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-base touch-manipulation"
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                  <span className="font-semibold hidden sm:inline">{config.label}</span>
                  <span className="font-semibold sm:hidden">{config.label.split(' ')[0]}</span>
                </div>
                {count > 0 && (
                  <Badge variant="secondary" className="text-xs sm:text-sm font-bold px-2 py-0.5">
                    {count}
                  </Badge>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground">Cargando pedidos...</p>
          </div>
        ) : (
          Object.entries(statusConfig).map(([status, config]) => (
            <TabsContent key={status} value={status} className="mt-6">
              {filteredOrders.length === 0 ? (
                <Card className="border-2 border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12 sm:py-16">
                    <config.icon className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mb-4" />
                    <p className="text-lg sm:text-xl font-medium text-muted-foreground">
                      No hay pedidos {config.label.toLowerCase()}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Los pedidos aparecerán aquí automáticamente
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
                  {filteredOrders.map((order) => {
                    const currentConfig = statusConfig[order.status];
                    const StatusIcon = currentConfig.icon;
                    
                    return (
                      <Card
                        key={order.id}
                        className={cn(
                          "border-2 hover:shadow-xl transition-all",
                          currentConfig.color
                        )}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <StatusIcon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <CardTitle className="font-headline text-lg sm:text-xl truncate">
                                  Pedido #{order.id.slice(0, 6).toUpperCase()}
                                </CardTitle>
                                <CardDescription className="flex items-center gap-2 text-xs sm:text-sm">
                                  <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                                  {order.orderDate ? format(order.orderDate.toDate(), 'HH:mm', { locale: es }) : '--:--'}
                                </CardDescription>
                              </div>
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-4">
                          {/* Cliente */}
                          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                            <span className="text-sm font-medium text-muted-foreground">Cliente:</span>
                            <span className="text-base font-semibold truncate ml-2">
                              {order.customerName ?? 'Cliente POS'}
                            </span>
                          </div>

                          {/* Items del pedido - SIEMPRE VISIBLES */}
                          <div className="space-y-2">
                            <h4 className="font-semibold text-base sm:text-lg flex items-center gap-2">
                              <span>Productos ({order.items.length})</span>
                            </h4>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                              {order.items.map((item, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-3 p-3 sm:p-4 rounded-lg bg-card border-2 hover:border-primary transition-colors"
                                >
                                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg sm:text-xl flex-shrink-0">
                                    {item.quantity}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-base sm:text-lg leading-tight">
                                      {item.productName}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      S/ {item.unitPrice.toFixed(2)} c/u
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-bold text-base sm:text-lg text-primary">
                                      S/ {(item.quantity * item.unitPrice).toFixed(2)}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Notas especiales */}
                          {order.notes && (
                            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                              <p className="text-xs font-semibold text-yellow-700 mb-1">⚠️ NOTA ESPECIAL:</p>
                              <p className="text-sm font-medium">{order.notes}</p>
                            </div>
                          )}

                          {/* Total */}
                          <div className="flex items-center justify-between p-4 rounded-lg bg-primary/10 border-2 border-primary/20">
                            <span className="text-lg font-semibold">Total:</span>
                            <span className="text-2xl font-bold text-primary">
                              S/ {order.totalAmount.toFixed(2)}
                            </span>
                          </div>
                        </CardContent>

                        <CardFooter className="flex flex-col gap-2 pt-4">
                          {/* Botón de cambio de estado */}
                          {currentConfig.nextStatus && (
                            <Button
                              onClick={() => handleStatusChange(order.id, currentConfig.nextStatus!)}
                              className="w-full h-14 sm:h-16 text-base sm:text-lg font-bold touch-manipulation"
                              size="lg"
                            >
                              {currentConfig.nextLabel}
                              <ArrowRight className="ml-2 h-5 w-5 sm:h-6 sm:w-6" />
                            </Button>
                          )}

                          {/* Botón ver detalles */}
                          <Button
                            variant="outline"
                            onClick={() => handleViewDetails(order)}
                            className="w-full h-12 text-base touch-manipulation"
                          >
                            <Eye className="mr-2 h-5 w-5" />
                            Ver Detalles / Editar
                          </Button>
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          ))
        )}
      </Tabs>

      {/* Dialog de detalles */}
      <OrderDetailDialog
        order={selectedOrder}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
      />
    </div>
  );
}
