'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useFirestore, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { doc, collection, increment, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Plus, Minus, Package, ShoppingCart } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

type ItemType = 'ingredient' | 'other_item';

interface QuickStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: {
    id: string;
    name: string;
    quantity: number;
    unit?: string;
    cost?: number;
  } | null;
  itemType: ItemType;
}

const QUICK_AMOUNTS = [1, 5, 10, 25, 50, 100];

function toFiniteNumber(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function QuickStockModal({ isOpen, onClose, item, itemType }: QuickStockModalProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [mode, setMode] = useState<'add' | 'subtract'>('add');
  const [amount, setAmount] = useState<string>('');
  const [note, setNote] = useState('');
  const [costPerUnit, setCostPerUnit] = useState<string>('');
  const [registerExpense, setRegisterExpense] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleQuickAmount = (value: number) => {
    setAmount(String(value));
  };

  const handleSubmit = async () => {
    if (!firestore || !item) return;
    
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast({
        variant: 'destructive',
        title: 'Cantidad inválida',
        description: 'Ingresa una cantidad mayor a 0',
      });
      return;
    }

    const finalAmount = mode === 'add' ? numAmount : -numAmount;
    
    // Verificar que no quede negativo
    if (mode === 'subtract' && numAmount > item.quantity) {
      toast({
        variant: 'destructive',
        title: 'Stock insuficiente',
        description: `Solo hay ${item.quantity} ${item.unit || 'unidades'} disponibles`,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const collectionName = itemType === 'ingredient' ? 'ingredients' : 'inventory_items';
      const itemRef = doc(firestore, collectionName, item.id);
      
      // Actualizar stock usando increment para evitar race conditions
      updateDocumentNonBlocking(itemRef, {
        quantity: increment(finalAmount),
      });

      // Registrar el movimiento en el historial
      const movementData = {
        itemId: item.id,
        itemName: item.name,
        itemType,
        type: mode === 'add' ? 'entrada' : 'salida',
        amount: numAmount,
        previousQuantity: item.quantity,
        newQuantity: item.quantity + finalAmount,
        unit: item.unit || 'unidad',
        costPerUnit: costPerUnit ? parseFloat(costPerUnit) : null,
        totalCost: costPerUnit ? parseFloat(costPerUnit) * numAmount : null,
        note: note || null,
        createdAt: Timestamp.now(),
      };

      addDocumentNonBlocking(collection(firestore, 'inventory_movements'), movementData);

      // Si es una entrada con costo, y el usuario eligió registrar el gasto
      if (mode === 'add' && movementData.totalCost && movementData.totalCost > 0 && registerExpense) {
        const cashFlowData = {
          type: 'expense',
          category: 'Insumos',
          amount: movementData.totalCost,
          paymentMethod: 'Efectivo', // Por defecto, luego puede editarlo en la página
          note: `Compra de ${item.name} (${numAmount} ${item.unit || 'unidades'})${note ? ' - ' + note : ''}`,
          entryDate: Timestamp.now(),
          createdAt: Timestamp.now(),
        };
        addDocumentNonBlocking(collection(firestore, 'cash_flows'), cashFlowData);
      }

      toast({
        title: mode === 'add' ? '✅ Stock agregado' : '✅ Stock descontado',
        description: `${item.name}: ${mode === 'add' ? '+' : '-'}${numAmount} ${item.unit || 'unidades'}`,
      });

      // Limpiar y cerrar
      setAmount('');
      setNote('');
      setCostPerUnit('');
      onClose();
    } catch (error) {
      console.error('Error updating stock:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo actualizar el stock',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setAmount('');
    setNote('');
    setCostPerUnit('');
    setMode('add');
    onClose();
  };

  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-[min(100vw,520px)] h-[100dvh] sm:h-auto p-0 gap-0 rounded-none sm:rounded-2xl shadow-2xl border-0 sm:border sm:border-slate-200 overflow-hidden">
        <DialogHeader className="px-4 sm:px-5 pt-5 pb-4 border-b bg-white dark:bg-slate-900/70">
          <DialogTitle className="font-headline text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <Package className="h-5 w-5" />
            Actualizar Stock
          </DialogTitle>
          <DialogDescription className="text-sm">
            <span className="font-semibold text-foreground">{item.name}</span>
            <br />
            Stock actual: <span className="font-bold text-primary">{item.quantity} {item.unit || 'unidades'}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-4">
          {/* Modo: Agregar / Quitar */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant={mode === 'add' ? 'default' : 'outline'}
              className={cn(
                "h-14 sm:h-12 text-base font-bold touch-manipulation rounded-xl",
                mode === 'add' && "bg-green-600 hover:bg-green-700"
              )}
              onClick={() => setMode('add')}
            >
              <Plus className="h-5 w-5 mr-2" />
              Agregar
            </Button>
            <Button
              type="button"
              variant={mode === 'subtract' ? 'default' : 'outline'}
              className={cn(
                "h-14 sm:h-12 text-base font-semibold touch-manipulation rounded-xl",
                mode === 'subtract' && "bg-orange-600 hover:bg-orange-700"
              )}
              onClick={() => setMode('subtract')}
            >
              <Minus className="h-5 w-5 mr-2" />
              Quitar
            </Button>
          </div>

          {/* Botones de cantidad rápida */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Cantidad rápida</Label>
            <div className="grid grid-cols-3 gap-2">
              {QUICK_AMOUNTS.map((qty) => (
                <Button
                  key={qty}
                  type="button"
                  variant={amount === String(qty) ? 'default' : 'outline'}
                  className="h-12 text-lg font-bold touch-manipulation rounded-xl"
                  onClick={() => handleQuickAmount(qty)}
                >
                  {qty}
                </Button>
              ))}
            </div>
          </div>

          {/* Input manual */}
          <div>
            <Label htmlFor="amount" className="text-sm font-medium">
              Cantidad {item.unit ? `(${item.unit})` : ''}
            </Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Ingresa cantidad"
              className="h-14 sm:h-12 text-lg font-semibold mt-1.5 rounded-xl"
              min="0"
              step="0.1"
            />
          </div>

          {/* Costo por unidad (solo en modo agregar) */}
          {mode === 'add' && (
            <div>
              <Label htmlFor="cost" className="text-sm font-medium">
                Costo por {item.unit || 'unidad'} (S/) - Opcional
              </Label>
              <Input
                id="cost"
                type="number"
                value={costPerUnit}
                onChange={(e) => setCostPerUnit(e.target.value)}
                placeholder="Ej: 2.50"
                className="h-11 text-base mt-1.5 rounded-xl"
                min="0"
                step="0.01"
              />
              {costPerUnit && amount && (
                <div className="mt-3 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Total a pagar: <span className="font-semibold text-foreground">S/ {(toFiniteNumber(costPerUnit) * toFiniteNumber(amount)).toFixed(2)}</span>
                  </p>
                  <div className="flex items-center space-x-2 bg-muted/30 p-2.5 rounded-lg border">
                    <Checkbox 
                      id="registerExpense" 
                      checked={registerExpense}
                      onCheckedChange={(checked) => setRegisterExpense(checked as boolean)}
                    />
                    <label
                      htmlFor="registerExpense"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-slate-700"
                    >
                      Registrar gasto automáticamente en Caja
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Nota */}
          <div>
            <Label htmlFor="note" className="text-sm font-medium">
              Nota (opcional)
            </Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={mode === 'add' ? "Ej: Compra en Makro" : "Ej: Merma, producto vencido"}
              className="mt-1.5 min-h-[60px] rounded-xl"
              rows={2}
            />
          </div>

          {/* Preview del resultado */}
          {amount && (
            <div className={cn(
              "p-3 rounded-lg border-2",
              mode === 'add' ? "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-900" : "bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-900"
            )}>
              <p className="text-sm font-medium text-center">
                Stock resultante:{' '}
                <span className="text-xl font-bold">
                  {mode === 'add' 
                    ? item.quantity + parseFloat(amount || '0')
                    : Math.max(0, item.quantity - parseFloat(amount || '0'))
                  } {item.unit || 'unidades'}
                </span>
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-4 pt-3 border-t bg-white dark:bg-slate-900/70 shadow-[0_-4px_12px_-2px_rgba(0,0,0,0.08)] gap-3 flex-col-reverse sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="w-full sm:w-auto h-12 text-base font-semibold touch-manipulation rounded-xl"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!amount || parseFloat(amount) <= 0 || isSubmitting}
            className={cn(
              "w-full sm:w-auto h-12 text-base font-bold touch-manipulation rounded-xl shadow-md hover:shadow-lg",
              mode === 'add' ? "bg-green-600 hover:bg-green-700" : "bg-orange-600 hover:bg-orange-700"
            )}
          >
            <ShoppingCart className="h-5 w-5 mr-2" />
            {isSubmitting ? 'Guardando...' : mode === 'add' ? 'Agregar Stock' : 'Quitar Stock'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
