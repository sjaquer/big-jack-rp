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
  const { toast } = useToast();

  const amount = parseFloat(amountReceived);
  const change = amount >= total ? amount - total : 0;

  useEffect(() => {
    if (!isOpen) {
      setAmountReceived('');
      setPaymentMethod('cash');
    }
  }, [isOpen]);

  const handlePayment = () => {
    if (paymentMethod === 'cash' && (amount < total || !amount)) {
      toast({
        variant: "destructive",
        title: "Monto Insuficiente",
        description: "El monto recibido es menor que el total del pedido.",
      });
      return;
    }
    toast({
      title: "Pago Exitoso",
      description: "El pedido ha sido procesado.",
    });
    onSuccess(paymentMethod);
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

        <RadioGroup defaultValue="cash" onValueChange={setPaymentMethod}>
            <div className="flex items-center space-x-2">
                <RadioGroupItem value="cash" id="cash" />
                <Label htmlFor="cash">Efectivo</Label>
            </div>
            <div className="flex items-center space-x-2">
                <RadioGroupItem value="card" id="card" />
                <Label htmlFor="card">Tarjeta</Label>
            </div>
        </RadioGroup>

          {paymentMethod === 'cash' && (
            <>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount" className="text-right">
                Monto Recibido
                </Label>
                <Input
                id="amount"
                type="number"
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
                className="col-span-3"
                placeholder='e.g., 50.00'
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
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handlePayment} disabled={paymentMethod === 'cash' && (!amountReceived || amount < total)}>
            Confirmar Pago
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
