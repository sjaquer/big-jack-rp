
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
import type { OnlineOrder, OrderSource } from '@/lib/types';
import { useMemoFirebase } from '@/firebase/provider';
import { format, differenceInMinutes } from 'date-fns';
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

const orderSourceConfig: Record<OrderSource | 'otros', { label: string; className: string }> = {
  pos: {
    label: 'En tienda',
    className: 'bg-orange-500/15 text-orange-700 border-orange-500/20',
  },
  pedidosya: {
    label: 'Pedidos Ya',
    className: 'bg-red-500/15 text-red-700 border-red-500/20',
  },
  delivery: {
    label: 'Delivery',
    className: 'bg-blue-500/15 text-blue-700 border-blue-500/20',
  },
  web: {
    label: 'Tienda Online',
    className: 'bg-cyan-500/15 text-cyan-700 border-cyan-500/20',
  },
  otros: {
    label: 'Otro canal',
    className: 'bg-muted text-muted-foreground border-muted/60',
  },
};

const NEW_ORDER_THRESHOLD_MINUTES = 5;

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

  // Filtrar pedidos por estado (excluir pedidos de POS/local)
  const filteredOrders = useMemo(() => {
    if (!onlineOrders) return [];
    return onlineOrders.filter(order => order.status === selectedTab && order.source !== 'pos');
  }, [onlineOrders, selectedTab]);

  // Contar pedidos por estado (excluir pedidos de POS/local)
  const orderCounts = useMemo(() => {
    if (!onlineOrders) return { pending: 0, processing: 0, completed: 0 };
    const onlineOnlyOrders = onlineOrders.filter(o => o.source !== 'pos');
    return {
      pending: onlineOnlyOrders.filter(o => o.status === 'pending').length,
      processing: onlineOnlyOrders.filter(o => o.status === 'processing').length,
      completed: onlineOnlyOrders.filter(o => o.status === 'completed').length,
    };
  }, [onlineOrders]);

  const newPendingCount = useMemo(() => {
    if (!onlineOrders) return 0;
    const now = new Date();
    return onlineOrders.filter((order) => {
      if (order.status !== 'pending' || !order.orderDate || order.source === 'pos') return false;
      return differenceInMinutes(now, order.orderDate.toDate()) <= NEW_ORDER_THRESHOLD_MINUTES;
    }).length;
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
    <div className="h-full w-full flex flex-col overflow-hidden">
      {/* Header optimizado para tablet */}
      <div className="flex-shrink-0 flex items-center justify-between gap-3 pb-3">
        <div>
          <h1 className="text-xl md:text-3xl font-headline font-bold">Pedidos de Cocina</h1>
          <p className="text-sm md:text-base text-muted-foreground">Gestión de pedidos en tiempo real</p>
        </div>
        <div className="flex items-center gap-2 bg-muted/50 px-3 py-2 rounded-xl">
          <Clock className="h-5 w-5 md:h-6 md:w-6 text-primary" />
          <span className="text-lg md:text-xl font-bold">
            {format(new Date(), 'HH:mm', { locale: es })}
          </span>
        </div>
      </div>

      {/* Tabs de estado - Optimizado para tablets */}
      <Tabs value={selectedTab} onValueChange={(value) => setSelectedTab(value as OnlineOrder['status'])} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="flex-shrink-0 grid w-full grid-cols-3 h-auto p-1.5 gap-2 bg-muted/30">
          {Object.entries(statusConfig).map(([status, config]) => {
            const Icon = config.icon;
            const count = orderCounts[status as OnlineOrder['status']];
            return (
              <TabsTrigger
                key={status}
                value={status}
                className="h-16 md:h-20 flex flex-col gap-1 md:gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-sm md:text-base touch-manipulation rounded-lg transition-all active:scale-95 shadow-sm data-[state=active]:shadow-lg"
              >
                <div className="flex items-center gap-1.5 md:gap-2">
                  <Icon className="h-5 w-5 md:h-6 md:w-6 stroke-[2]" />
                  <span className="font-bold">{config.label}</span>
                </div>
                {count > 0 && (
                  <Badge variant="secondary" className="text-xs md:text-sm font-bold px-2 py-0.5">
                    {count}
                  </Badge>
                )}
                {status === 'pending' && newPendingCount > 0 && (
                  <Badge variant="destructive" className="text-xs font-bold px-2 py-0.5 animate-pulse">
                    +{newPendingCount}
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
            <TabsContent key={status} value={status} className="flex-1 overflow-y-auto mt-3">
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
                <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 pb-2">
                  {filteredOrders.map((order) => {
                    const currentConfig = statusConfig[order.status];
                    const StatusIcon = currentConfig.icon;
                    const orderDate = order.orderDate ? order.orderDate.toDate() : null;
                    const isNewOrder =
                      order.status === 'pending' &&
                      orderDate &&
                      differenceInMinutes(new Date(), orderDate) <= NEW_ORDER_THRESHOLD_MINUTES;
                    const sourceKey = (order.source ?? 'otros') as OrderSource | 'otros';
                    const sourceInfo = orderSourceConfig[sourceKey] ?? orderSourceConfig.otros;
                    
                    return (
                      <Card
                        key={order.id}
                        className={cn(
                          "border-2 hover:shadow-xl transition-all",
                          currentConfig.color
                        )}
                      >
                        <CardHeader className="pb-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                              <div className="h-14 w-14 md:h-16 md:w-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <StatusIcon className="h-7 w-7 md:h-8 md:w-8 text-primary stroke-[2]" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <CardTitle className="font-headline text-xl md:text-2xl truncate">
                                  Pedido #{order.id.slice(0, 6).toUpperCase()}
                                </CardTitle>
                                <CardDescription className="flex items-center gap-2 text-base md:text-lg mt-1">
                                  <Clock className="h-5 w-5 md:h-6 md:w-6" />
                                  {orderDate ? format(orderDate, 'HH:mm', { locale: es }) : '--:--'}
                                </CardDescription>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  <Badge className={cn('border text-sm md:text-base font-bold px-3 py-1', sourceInfo.className)}>
                                    {sourceInfo.label}
                                  </Badge>
                                  {isNewOrder && (
                                    <Badge className="bg-amber-500/20 text-amber-700 border border-amber-500/40 animate-pulse text-xs md:text-sm font-bold px-3 py-1">
                                      Nuevo ingreso
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-4 md:space-y-5">
                          {/* Cliente */}
                          <div className="flex items-center justify-between p-4 md:p-5 rounded-xl bg-muted/50">
                            <span className="text-base md:text-lg font-medium text-muted-foreground">Cliente:</span>
                            <span className="text-lg md:text-xl font-bold truncate ml-2">
                              {order.customerName ?? 'Cliente POS'}
                            </span>
                          </div>

                          {/* Items del pedido - SIEMPRE VISIBLES */}
                          <div className="space-y-3">
                            <h4 className="font-bold text-lg md:text-xl flex items-center gap-2">
                              <span>Productos ({order.items.length})</span>
                            </h4>
                            <div className="space-y-3 max-h-80 md:max-h-96 overflow-y-auto pr-2">
                              {order.items.map((item, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-4 p-4 md:p-5 rounded-xl bg-card border-2 hover:border-primary transition-all hover:shadow-md"
                                >
                                  <div className="h-14 w-14 md:h-16 md:w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl md:text-2xl flex-shrink-0 shadow-lg">
                                    {item.quantity}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-bold text-lg md:text-xl leading-tight">
                                      {item.productName}
                                    </p>
                                    <p className="text-sm md:text-base text-muted-foreground mt-1">
                                      S/ {item.unitPrice.toFixed(2)} c/u
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-bold text-lg md:text-2xl text-primary">
                                      S/ {(item.quantity * item.unitPrice).toFixed(2)}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Notas especiales */}
                          {order.notes && (
                            <div className="p-4 md:p-5 rounded-xl bg-yellow-500/10 border-2 border-yellow-500/30">
                              <p className="text-sm md:text-base font-bold text-yellow-700 mb-2">⚠️ NOTA ESPECIAL:</p>
                              <p className="text-base md:text-lg font-medium">{order.notes}</p>
                            </div>
                          )}

                          {/* Total */}
                          <div className="flex items-center justify-between p-5 md:p-6 rounded-xl bg-primary/10 border-2 border-primary/30 shadow-md">
                            <span className="text-xl md:text-2xl font-bold">Total:</span>
                            <span className="text-3xl md:text-4xl font-bold text-primary">
                              S/ {order.totalAmount.toFixed(2)}
                            </span>
                          </div>
                        </CardContent>

                        <CardFooter className="flex flex-col gap-3 md:gap-4 pt-4">
                          {/* Botón de cambio de estado - ENORME para tablets */}
                          {currentConfig.nextStatus && (
                            <Button
                              onClick={() => handleStatusChange(order.id, currentConfig.nextStatus!)}
                              className="w-full h-16 md:h-20 text-lg md:text-xl font-bold touch-manipulation shadow-lg hover:shadow-xl transition-all active:scale-95"
                              size="lg"
                            >
                              {currentConfig.nextLabel}
                              <ArrowRight className="ml-3 h-6 w-6 md:h-7 md:w-7 stroke-[2.5]" />
                            </Button>
                          )}

                          {/* Botón ver detalles */}
                          <Button
                            variant="outline"
                            onClick={() => handleViewDetails(order)}
                            className="w-full h-14 md:h-16 text-base md:text-lg font-semibold touch-manipulation hover:bg-muted transition-all active:scale-95"
                          >
                            <Eye className="mr-2 h-5 w-5 md:h-6 md:w-6" />
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
