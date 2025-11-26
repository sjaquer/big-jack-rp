'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import type { OnlineOrder } from '@/lib/types';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Pencil, Trash2, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface OrderDetailDialogProps {
  order: OnlineOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusMap = {
  pending: { label: 'Nuevo', color: 'default' as const },
  processing: { label: 'En Preparación', color: 'secondary' as const },
  completed: { label: 'Listo para Recoger', color: 'outline' as const },
};

const paymentMethodLabels: { [key: string]: string } = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  yape: 'Yape',
  plin: 'Plin',
  transfer: 'Transferencia',
};

export function OrderDetailDialog({ order, open, onOpenChange }: OrderDetailDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Estado editable
  const [editedOrder, setEditedOrder] = useState<Partial<OnlineOrder>>({});

  // Resetear estado cuando se abre el dialog
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && order) {
      setEditedOrder({
        customerName: order.customerName,
        customerPhone: order.customerPhone || '',
        status: order.status,
        paymentMethod: order.paymentMethod || 'cash',
        notes: order.notes || '',
        deliveryAddress: order.deliveryAddress || '',
      });
      setIsEditing(false);
    }
    onOpenChange(newOpen);
  };

  const handleSave = async () => {
    if (!order || !firestore) return;
    
    setIsSaving(true);
    try {
      const orderRef = doc(firestore, 'online_orders', order.id);
      await updateDocumentNonBlocking(orderRef, editedOrder);
      
      toast({
        title: 'Pedido actualizado',
        description: 'Los cambios se guardaron correctamente.',
      });
      
      setIsEditing(false);
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating order:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el pedido.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!order || !firestore) return;
    
    setIsDeleting(true);
    try {
      const orderRef = doc(firestore, 'online_orders', order.id);
      await deleteDoc(orderRef);
      
      toast({
        title: 'Pedido eliminado',
        description: 'El pedido se eliminó correctamente.',
      });
      
      setShowDeleteDialog(false);
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting order:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el pedido.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!order) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="text-2xl font-headline">Pedido #{order.id.slice(0, 8).toUpperCase()}</DialogTitle>
                <DialogDescription>
                  {order.orderDate ? format(order.orderDate.toDate(), "dd 'de' MMMM yyyy, HH:mm", { locale: es }) : 'Fecha no disponible'}
                </DialogDescription>
              </div>
              <Badge variant={statusMap[order.status]?.color ?? 'default'}>
                {statusMap[order.status]?.label ?? 'Desconocido'}
              </Badge>
            </div>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Información del cliente */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Información del Cliente</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customerName">Nombre del Cliente</Label>
                  {isEditing ? (
                    <Input
                      id="customerName"
                      value={editedOrder.customerName || ''}
                      onChange={(e) => setEditedOrder({ ...editedOrder, customerName: e.target.value })}
                      className="h-11 text-base"
                    />
                  ) : (
                    <p className="text-base font-medium">{order.customerName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customerPhone">Teléfono</Label>
                  {isEditing ? (
                    <Input
                      id="customerPhone"
                      value={editedOrder.customerPhone || ''}
                      onChange={(e) => setEditedOrder({ ...editedOrder, customerPhone: e.target.value })}
                      className="h-11 text-base"
                    />
                  ) : (
                    <p className="text-base font-medium">{order.customerPhone || 'No registrado'}</p>
                  )}
                </div>
              </div>

              {isEditing ? (
                <div className="space-y-2">
                  <Label htmlFor="deliveryAddress">Dirección de Entrega</Label>
                  <Input
                    id="deliveryAddress"
                    value={editedOrder.deliveryAddress || ''}
                    onChange={(e) => setEditedOrder({ ...editedOrder, deliveryAddress: e.target.value })}
                    className="h-11 text-base"
                  />
                </div>
              ) : order.deliveryAddress ? (
                <div className="space-y-2">
                  <Label>Dirección de Entrega</Label>
                  <p className="text-base">{order.deliveryAddress}</p>
                </div>
              ) : null}
            </div>

            <Separator />

            {/* Estado y pago */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Detalles del Pedido</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Estado</Label>
                  {isEditing ? (
                    <Select
                      value={editedOrder.status || order.status}
                      onValueChange={(value) => setEditedOrder({ ...editedOrder, status: value as OnlineOrder['status'] })}
                    >
                      <SelectTrigger className="h-11 text-base">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(statusMap).map(([status, { label }]) => (
                          <SelectItem key={status} value={status} className="text-base py-3">
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-base font-medium">{statusMap[order.status]?.label}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Método de Pago</Label>
                  {isEditing ? (
                    <Select
                      value={editedOrder.paymentMethod || order.paymentMethod || 'cash'}
                      onValueChange={(value) => setEditedOrder({ ...editedOrder, paymentMethod: value })}
                    >
                      <SelectTrigger className="h-11 text-base">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(paymentMethodLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key} className="text-base py-3">
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-base font-medium">
                      {paymentMethodLabels[order.paymentMethod || 'cash']}
                    </p>
                  )}
                </div>
              </div>

              {isEditing ? (
                <div className="space-y-2">
                  <Label htmlFor="notes">Notas del Pedido</Label>
                  <Textarea
                    id="notes"
                    value={editedOrder.notes || ''}
                    onChange={(e) => setEditedOrder({ ...editedOrder, notes: e.target.value })}
                    placeholder="Instrucciones especiales, alergias, etc."
                    className="min-h-20 text-base"
                  />
                </div>
              ) : order.notes ? (
                <div className="space-y-2">
                  <Label>Notas</Label>
                  <p className="text-base bg-muted/50 p-3 rounded-md">{order.notes}</p>
                </div>
              ) : null}
            </div>

            <Separator />

            {/* Items del pedido */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Artículos ({order.items.length})</h3>
              <div className="space-y-2">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 rounded-md bg-muted/30">
                    <div className="flex-1">
                      <p className="font-medium text-base">{item.productName}</p>
                      <p className="text-sm text-muted-foreground">
                        Cantidad: {item.quantity} × S/ {item.unitPrice.toFixed(2)}
                      </p>
                    </div>
                    <p className="font-semibold text-base">
                      S/ {(item.quantity * item.unitPrice).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-between items-center pt-4 border-t-2">
                <span className="text-lg font-semibold">Total:</span>
                <span className="text-2xl font-bold text-primary">
                  S/ {order.totalAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setEditedOrder({
                      customerName: order.customerName,
                      customerPhone: order.customerPhone || '',
                      status: order.status,
                      paymentMethod: order.paymentMethod || 'cash',
                      notes: order.notes || '',
                      deliveryAddress: order.deliveryAddress || '',
                    });
                  }}
                  className="h-11 text-base touch-manipulation"
                >
                  <X className="mr-2 h-5 w-5" />
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="h-11 text-base touch-manipulation"
                >
                  {isSaving ? (
                    'Guardando...'
                  ) : (
                    <>
                      <Save className="mr-2 h-5 w-5" />
                      Guardar Cambios
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                  className="h-11 text-base touch-manipulation"
                >
                  <Trash2 className="mr-2 h-5 w-5" />
                  Eliminar
                </Button>
                <Button
                  onClick={() => setIsEditing(true)}
                  className="h-11 text-base touch-manipulation"
                >
                  <Pencil className="mr-2 h-5 w-5" />
                  Editar
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmación de eliminación */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El pedido #{order.id.slice(0, 8)} será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 text-base">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="h-11 text-base bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar Pedido'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
