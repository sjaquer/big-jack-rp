'use client'

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { CreditCard, Smartphone, Wallet, Banknote } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  onSuccess: (paymentMethod: string) => void;
}

const paymentOptions = [
  { id: 'cash', label: 'Efectivo', description: 'Pago en caja', icon: Banknote },
  { id: 'card', label: 'Tarjeta', description: 'POS / Tap', icon: CreditCard },
  { id: 'yape', label: 'Yape', description: 'QR Yape', icon: Smartphone },
  { id: 'plin', label: 'Plin', description: 'QR Plin', icon: Smartphone },
  { id: 'transfer', label: 'Transferencia', description: 'Banco / app', icon: Wallet },
];

export function PaymentModal({ isOpen, onClose, total, onSuccess }: PaymentModalProps) {
  const [amountReceived, setAmountReceived] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const amount = parseFloat(amountReceived);
  const change = amount >= total ? amount - total : 0;

  useEffect(() => {
    if (!isOpen) {
      setAmountReceived('');
      setPaymentMethod('cash');
      setIsProcessing(false);
    }
  }, [isOpen]);

  const handlePayment = async () => {
    if (isProcessing) return; // Prevenir doble clic
    
    if (paymentMethod === 'cash' && (amount < total || !amount)) {
      toast({
        variant: "destructive",
        title: "Monto Insuficiente",
        description: "El monto recibido es menor que el total del pedido.",
      });
      return;
    }
    
    setIsProcessing(true);
    try {
      await onSuccess(paymentMethod);
      // Cerrar modal automáticamente después del éxito
      onClose();
    } catch (error) {
      setIsProcessing(false);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo procesar el pago. Intenta nuevamente.",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-[95vw] sm:max-w-xl md:max-w-2xl p-0 overflow-hidden">
        <DialogHeader>
          <div className="px-6 pt-6">
            <DialogTitle className="font-headline text-xl sm:text-2xl">Procesar Pago</DialogTitle>
            <DialogDescription className="text-base">
              Total del pedido:
              <span className="ml-2 font-semibold text-primary text-2xl">S/ {total.toFixed(2)}</span>
            </DialogDescription>
          </div>
        </DialogHeader>
        <div className="space-y-6 p-6">
          <div className="space-y-3">
            <Label className="text-base font-semibold">Método de pago</Label>
            <RadioGroup
              value={paymentMethod}
              onValueChange={setPaymentMethod}
              disabled={isProcessing}
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3"
            >
              {paymentOptions.map((option) => {
                const Icon = option.icon;
                const isActive = paymentMethod === option.id;
                return (
                  <Label
                    key={option.id}
                    htmlFor={`payment-${option.id}`}
                    className={cn(
                      'flex flex-col rounded-2xl border-2 p-4 sm:p-5 cursor-pointer touch-manipulation transition-all h-24 sm:h-28',
                      'focus-within:ring-2 focus-within:ring-primary/40 focus-visible:outline-none',
                      isActive
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/40 bg-card'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-lg leading-tight">{option.label}</p>
                        <p className="text-sm text-muted-foreground">{option.description}</p>
                      </div>
                      <Icon className={cn('h-6 w-6', isActive ? 'text-primary' : 'text-muted-foreground')} />
                    </div>
                    <RadioGroupItem value={option.id} id={`payment-${option.id}`} className="sr-only" />
                  </Label>
                );
              })}
            </RadioGroup>
          </div>

          {paymentMethod === 'cash' && (
            <>
            <div className="space-y-2">
                <Label htmlFor="amount" className="text-base font-medium">
                Monto Recibido
                </Label>
                <Input
                id="amount"
                type="number"
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
                className="h-14 text-lg"
                placeholder='50.00'
                disabled={isProcessing}
                />
            </div>
            {amountReceived && amount >= total && (
              <div className="text-center p-4 bg-secondary rounded-md">
                <p className="text-lg">Vuelto:</p>
                <p className="text-3xl font-bold text-primary">S/ {change.toFixed(2)}</p>
              </div>
            )}
            </>
          )}

        </div>
        <DialogFooter className="gap-2 sm:gap-0 px-6 pb-6">
          <Button variant="outline" onClick={onClose} disabled={isProcessing} size="lg" className="h-12 text-base w-full sm:w-auto">
            Cancelar
          </Button>
          <Button 
            onClick={handlePayment} 
            disabled={isProcessing || (paymentMethod === 'cash' && (!amountReceived || amount < total))} 
            size="lg" 
            className="h-12 text-base w-full sm:w-auto"
          >
            {isProcessing ? 'Procesando...' : 'Confirmar Pago'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
