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

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  onSuccess: (paymentMethod: string) => void;
}

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
    } catch (error) {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-headline">Procesar Pago</DialogTitle>
          <DialogDescription>
            El total del pedido es <span className="font-bold text-primary">S/ {total.toFixed(2)}</span>.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">

        <RadioGroup defaultValue="cash" onValueChange={setPaymentMethod} disabled={isProcessing}>
          <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent cursor-pointer">
            <RadioGroupItem value="cash" id="cash" className="h-5 w-5" />
            <Label htmlFor="cash" className="text-base font-medium cursor-pointer flex-1">Efectivo</Label>
          </div>
          <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent cursor-pointer">
            <RadioGroupItem value="card" id="card" className="h-5 w-5" />
            <Label htmlFor="card" className="text-base font-medium cursor-pointer flex-1">Tarjeta</Label>
          </div>
          <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent cursor-pointer">
            <RadioGroupItem value="yape" id="yape" className="h-5 w-5" />
            <Label htmlFor="yape" className="text-base font-medium cursor-pointer flex-1">Yape</Label>
          </div>
          <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent cursor-pointer">
            <RadioGroupItem value="plin" id="plin" className="h-5 w-5" />
            <Label htmlFor="plin" className="text-base font-medium cursor-pointer flex-1">Plin</Label>
          </div>
          <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent cursor-pointer">
            <RadioGroupItem value="transfer" id="transfer" className="h-5 w-5" />
            <Label htmlFor="transfer" className="text-base font-medium cursor-pointer flex-1">Transferencia</Label>
          </div>
        </RadioGroup>

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
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isProcessing} size="lg" className="h-12 text-base">
            Cancelar
          </Button>
          <Button 
            onClick={handlePayment} 
            disabled={isProcessing || (paymentMethod === 'cash' && (!amountReceived || amount < total))} 
            size="lg" 
            className="h-12 text-base"
          >
            {isProcessing ? 'Procesando...' : 'Confirmar Pago'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
