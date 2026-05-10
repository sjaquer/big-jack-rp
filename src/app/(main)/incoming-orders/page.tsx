
'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import { collection, doc, query, orderBy, where, Timestamp } from 'firebase/firestore';
import { subDays } from 'date-fns';
import type { OnlineOrder, OrderSource } from '@/lib/types';
import { useMemoFirebase } from '@/firebase/provider';
import { format, differenceInMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { OrderDetailDialog } from '@/components/online-orders/order-detail-dialog';
import { Clock, ChefHat, CheckCircle2, AlertCircle, Eye, ArrowRight, Bell } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { OrderTicketIcon } from '@/components/icons';
import { useToast } from '@/hooks/use-toast';


const statusConfig = {
  pending: { 
    label: 'Nuevos', 
    icon: AlertCircle, 
    color: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
    badge: 'default' as const,
    nextStatus: 'processing' as const,
    nextLabel: 'Preparar'
  },
  processing: { 
    label: 'Preparación', 
    icon: ChefHat, 
    color: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
    badge: 'secondary' as const,
    nextStatus: 'completed' as const,
    nextLabel: 'Listo'
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
    label: 'Tienda',
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
    label: 'Web',
    className: 'bg-cyan-500/15 text-cyan-700 border-cyan-500/20',
  },
  otros: {
    label: 'Otro',
    className: 'bg-muted text-muted-foreground border-muted/60',
  },
};

const NEW_ORDER_THRESHOLD_MINUTES = 5;
const AUTO_TRANSITION_SECONDS = {
  pending: 5 * 60,
  processing: 12 * 60,
} as const;

const formatCountdown = (seconds: number) => {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export default function IncomingOrdersPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState<OnlineOrder['status']>('pending');
  const [selectedOrder, setSelectedOrder] = useState<OnlineOrder | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const previousOrderIdsRef = useRef<Set<string>>(new Set());
  const autoTransitioningOrderIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef(true);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [timerTick, setTimerTick] = useState(0);

  const playNewOrderSound = () => {
    if (typeof window === 'undefined' || typeof window.AudioContext === 'undefined') return;

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new window.AudioContext();
      }

      const audioContext = audioContextRef.current;
      if (audioContext.state === 'suspended') {
        void audioContext.resume();
      }

      const now = audioContext.currentTime;
      const gainNode = audioContext.createGain();
      gainNode.gain.setValueAtTime(0.0001, now);
      gainNode.gain.exponentialRampToValueAtTime(0.22, now + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
      gainNode.connect(audioContext.destination);

      const oscillator = audioContext.createOscillator();
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(880, now);
      oscillator.frequency.exponentialRampToValueAtTime(1320, now + 0.15);
      oscillator.connect(gainNode);
      oscillator.start(now);
      oscillator.stop(now + 0.35);
    } catch (error) {
      console.error('No se pudo reproducir sonido de nuevo pedido:', error);
    }
  };
  
  // Solo cargar pedidos de las últimas 24 horas para mejor rendimiento
  const ordersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    const yesterday = Timestamp.fromDate(subDays(new Date(), 1));
    return query(
      collection(firestore, 'online_orders'), 
      where('orderDate', '>=', yesterday),
      orderBy('orderDate', 'desc')
    );
  }, [firestore]);

  const { data: onlineOrders, isLoading } = useCollection<OnlineOrder>(ordersQuery);

  const allOrders = useMemo(() => onlineOrders ?? [], [onlineOrders]);

  // Filtrar pedidos por estado
  const filteredOrders = useMemo(() => {
    return allOrders.filter((order) => order.status === selectedTab);
  }, [allOrders, selectedTab]);

  // Contar pedidos por estado
  const orderCounts = useMemo(() => {
    return {
      pending: allOrders.filter(o => o.status === 'pending').length,
      processing: allOrders.filter(o => o.status === 'processing').length,
      completed: allOrders.filter(o => o.status === 'completed').length,
    };
  }, [allOrders]);

  const newPendingCount = useMemo(() => {
    const now = new Date();
    return allOrders.filter((order) => {
      if (order.status !== 'pending' || !order.orderDate) return false;
      return differenceInMinutes(now, order.orderDate.toDate()) <= NEW_ORDER_THRESHOLD_MINUTES;
    }).length;
  }, [allOrders]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setTimerTick((prev) => prev + 1);
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  const getTransitionRemainingSeconds = (order: OnlineOrder) => {
    if (order.status === 'completed') return null;

    const totalSeconds = AUTO_TRANSITION_SECONDS[order.status];
    if (!totalSeconds) return null;

    const baseTimestamp =
      order.status === 'processing'
        ? order.processingStartedAt ?? order.orderDate
        : order.orderDate;

    if (!baseTimestamp) return null;

    const elapsedSeconds = Math.floor((Date.now() - baseTimestamp.toDate().getTime()) / 1000);
    return Math.max(totalSeconds - elapsedSeconds, 0);
  };

  useEffect(() => {
    if (!firestore || !allOrders.length) return;

    allOrders.forEach((order) => {
      const remainingSeconds = getTransitionRemainingSeconds(order);
      if (remainingSeconds === null || remainingSeconds > 0) return;
      if (autoTransitioningOrderIdsRef.current.has(order.id)) return;

      const nextStatus = statusConfig[order.status].nextStatus;
      if (!nextStatus) return;

      const orderDocRef = doc(firestore, 'online_orders', order.id);
      autoTransitioningOrderIdsRef.current.add(order.id);

      const updatePayload: Partial<OnlineOrder> =
        nextStatus === 'processing'
          ? { status: 'processing', processingStartedAt: Timestamp.now() }
          : { status: 'completed', completedAt: Timestamp.now() };

      updateDocumentNonBlocking(orderDocRef, updatePayload);
      window.setTimeout(() => {
        autoTransitioningOrderIdsRef.current.delete(order.id);
      }, 1500);
    });
  }, [allOrders, firestore, timerTick]);

  useEffect(() => {
    if (!allOrders.length) {
      previousOrderIdsRef.current = new Set();
      isFirstLoadRef.current = false;
      return;
    }

    const currentIds = new Set(allOrders.map((order) => order.id));

    if (isFirstLoadRef.current) {
      previousOrderIdsRef.current = currentIds;
      isFirstLoadRef.current = false;
      return;
    }

    const newOrders = allOrders.filter((order) => !previousOrderIdsRef.current.has(order.id));

    if (newOrders.length > 0) {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        playNewOrderSound();
      }

      newOrders.forEach((order) => {
        const sourceKey = (order.source ?? 'otros') as OrderSource | 'otros';
        const sourceInfo = orderSourceConfig[sourceKey] ?? orderSourceConfig.otros;
        const title = `Nuevo pedido ${sourceInfo.label}`;
        const description = `${order.customerName ?? 'Cliente'} • ${format(order.orderDate?.toDate?.() ?? new Date(), 'HH:mm', { locale: es })}`;

        toast({
          title,
          description,
        });

        if (typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'granted') {
          new window.Notification(title, { body: description });
        }
      });
    }

    previousOrderIdsRef.current = currentIds;
  }, [allOrders, toast]);

  const handleStatusChange = (orderId: string, newStatus: OnlineOrder['status']) => {
    if (!firestore) return;
    const orderDocRef = doc(firestore, 'online_orders', orderId);
    const statusPayload: Partial<OnlineOrder> =
      newStatus === 'processing'
        ? { status: newStatus, processingStartedAt: Timestamp.now() }
        : newStatus === 'completed'
          ? { status: newStatus, completedAt: Timestamp.now() }
          : { status: newStatus };

    updateDocumentNonBlocking(orderDocRef, statusPayload);
    toast({
      title: 'Estado actualizado',
      description: 'El pedido cambió de estado correctamente.',
    });
  };

  const handleViewDetails = (order: OnlineOrder) => {
    setSelectedOrder(order);
    setDetailDialogOpen(true);
  };


  const activeConfig = statusConfig[selectedTab];
  const activeOrders = filteredOrders;

  return (
    <div className="h-full w-full overflow-hidden bg-transparent">
      <div className="flex h-full flex-col gap-3 p-2 sm:p-4 lg:p-6">
        <header className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Pedidos</p>
            <h1 className="font-headline text-2xl font-bold sm:text-3xl lg:text-4xl">Cola de pedidos</h1>
            <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
              Nuevos, en preparación y listos en una sola vista.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
            <div className="rounded-2xl border border-border/70 bg-card/80 px-3 py-2 text-sm shadow-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Bell className="h-4 w-4" />
                Nuevos
              </div>
              <p className="mt-1 text-lg font-bold">{orderCounts.pending}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-card/80 px-3 py-2 text-sm shadow-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <ChefHat className="h-4 w-4" />
                En proceso
              </div>
              <p className="mt-1 text-lg font-bold">{orderCounts.processing}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-card/80 px-3 py-2 text-sm shadow-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4" />
                Listos
              </div>
              <p className="mt-1 text-lg font-bold">{orderCounts.completed}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-card/80 px-3 py-2 text-sm shadow-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <OrderTicketIcon className="h-4 w-4" />
                Alertas
              </div>
              <p className="mt-1 text-lg font-bold">{newPendingCount}</p>
            </div>
          </div>
        </header>

        <Tabs value={selectedTab} onValueChange={(value) => setSelectedTab(value as OnlineOrder['status'])} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <TabsList className="grid h-auto w-full grid-cols-3 gap-2 bg-muted/30 p-1.5 shadow-sm">
            {Object.entries(statusConfig).map(([status, config]) => {
              const Icon = config.icon;
              const count = orderCounts[status as OnlineOrder['status']];
              return (
                <TabsTrigger
                  key={status}
                  value={status}
                  className="flex h-14 flex-col gap-1 rounded-xl text-sm font-semibold transition-all active:scale-95 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span>{config.label}</span>
                  </div>
                  {count > 0 && (
                    <Badge variant="secondary" className="px-2 py-0 text-[10px] font-bold">
                      {count}
                    </Badge>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value={selectedTab} className="mt-3 flex-1 overflow-hidden">
            <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card/80 px-3 py-2 text-sm shadow-sm">
                <div className="flex items-center gap-2">
                  <activeConfig.icon className="h-4 w-4 text-primary" />
                  <span className="font-semibold">{activeConfig.label}</span>
                </div>
                <span className="text-muted-foreground">
                  {activeOrders.length} pedidos
                </span>
              </div>

              {isLoading ? (
                <div className="flex flex-1 items-center justify-center rounded-3xl border border-dashed border-border/70 bg-card/50">
                  <p className="text-lg text-muted-foreground">Cargando pedidos...</p>
                </div>
              ) : activeOrders.length === 0 ? (
                <Card className="border-2 border-dashed bg-card/60">
                  <CardContent className="flex flex-col items-center justify-center py-12 sm:py-16">
                    <activeConfig.icon className="mb-4 h-12 w-12 text-muted-foreground sm:h-16 sm:w-16" />
                    <p className="text-lg font-medium text-muted-foreground sm:text-xl">
                      No hay pedidos {activeConfig.label.toLowerCase()}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Los nuevos aparecerán aquí automáticamente.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto pb-2 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {activeOrders.map((order) => {
                    const currentConfig = statusConfig[order.status];
                    const StatusIcon = currentConfig.icon;
                    const orderDate = order.orderDate ? order.orderDate.toDate() : null;
                    const isNewOrder =
                      order.status === 'pending' &&
                      orderDate &&
                      differenceInMinutes(new Date(), orderDate) <= NEW_ORDER_THRESHOLD_MINUTES;
                    const sourceKey = (order.source ?? 'otros') as OrderSource | 'otros';
                    const sourceInfo = orderSourceConfig[sourceKey] ?? orderSourceConfig.otros;
                    const totalItems = order.items.reduce((sum, item) => sum + (item.quantity ?? 0), 0);
                    const remainingSeconds = getTransitionRemainingSeconds(order);
                    const isPosOrder = sourceKey === 'pos';

                    return (
                      <Card
                        key={order.id}
                        className={cn(
                          'flex h-full flex-col overflow-hidden border-2 transition-all hover:shadow-xl',
                          currentConfig.color,
                          isPosOrder && 'border-orange-500/60 bg-orange-100/60 dark:bg-orange-950/30'
                        )}
                      >
                        <CardHeader className="space-y-3 pb-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 flex-1 items-center gap-3">
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                                <StatusIcon className="h-6 w-6 text-primary" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <CardTitle className="truncate font-headline text-lg">
                                  #{order.id.slice(0, 6).toUpperCase()}
                                </CardTitle>
                                <CardDescription className="mt-1 flex items-center gap-2 text-sm">
                                  <Clock className="h-4 w-4" />
                                  {orderDate ? format(orderDate, 'HH:mm', { locale: es }) : '--:--'}
                                </CardDescription>
                              </div>
                            </div>
                            <Badge className={cn('border px-2 py-0.5 text-[11px] font-semibold', sourceInfo.className)}>
                              {sourceInfo.label}
                            </Badge>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {isNewOrder && (
                              <Badge className="animate-pulse border border-amber-500/40 bg-amber-500/20 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                                Nuevo
                              </Badge>
                            )}
                            {remainingSeconds !== null && (
                              <Badge variant="outline" className="px-2 py-0.5 text-[11px] font-semibold">
                                Auto {statusConfig[order.status].nextLabel.toLowerCase()} en {formatCountdown(remainingSeconds)}
                              </Badge>
                            )}
                            <Badge variant="outline" className="px-2 py-0.5 text-[11px] font-semibold">
                              {order.items.length} tipos
                            </Badge>
                            <Badge variant="outline" className="px-2 py-0.5 text-[11px] font-semibold">
                              {totalItems} items
                            </Badge>
                          </div>
                        </CardHeader>

                        <CardContent className="flex-1 space-y-4 pt-0">
                          <div className="grid gap-3 rounded-2xl bg-muted/40 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
                            <div className="min-w-0">
                              <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Cliente</p>
                              <p className="truncate text-base font-semibold">
                                {order.customerName ?? 'Cliente POS'}
                              </p>
                            </div>
                            <div className="text-left sm:text-right">
                              <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Total</p>
                              <p className="text-xl font-bold text-primary">
                                S/ {(order.totalAmount ?? 0).toFixed(2)}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="text-sm font-semibold">Artículos</h4>
                              <span className="text-xs text-muted-foreground">{order.items.length} líneas</span>
                            </div>
                            <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                              {order.items.map((item, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card px-3 py-2"
                                >
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold">{item.quantity} x {item.productName}</p>
                                    <p className="text-[11px] text-muted-foreground">S/ {(item.unitPrice ?? 0).toFixed(2)} c/u</p>
                                  </div>
                                  <p className="shrink-0 text-sm font-bold text-primary">
                                    S/ {((item.quantity ?? 0) * (item.unitPrice ?? 0)).toFixed(2)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {order.notes && (
                            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-700">Nota</p>
                              <p className="mt-1 text-sm text-amber-950 dark:text-amber-100">{order.notes}</p>
                            </div>
                          )}
                        </CardContent>

                        <CardFooter className="grid grid-cols-1 gap-2 border-t border-border/60 bg-background/50 p-3 sm:grid-cols-2">
                          {currentConfig.nextStatus ? (
                            <Button
                              onClick={() => handleStatusChange(order.id, currentConfig.nextStatus!)}
                              className="h-11 w-full gap-2 font-semibold"
                            >
                              {currentConfig.nextLabel}
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button variant="secondary" className="h-11 w-full gap-2 font-semibold" disabled>
                              Listo
                            </Button>
                          )}

                          <Button
                            variant="outline"
                            onClick={() => handleViewDetails(order)}
                            className="h-11 w-full gap-2 font-semibold"
                          >
                            <Eye className="h-4 w-4" />
                            Detalle
                          </Button>
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <OrderDetailDialog
          order={selectedOrder}
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
        />
      </div>
    </div>
  );
}
