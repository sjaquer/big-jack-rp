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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFirestore, addDocumentNonBlocking, useUser } from '@/firebase';
import { collection, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Wallet, Receipt } from 'lucide-react';

interface QuickExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const expenseCategories = ['Insumos', 'Servicios', 'Alquiler', 'Marketing', 'Personal', 'Logística', 'Otros'];
const paymentMethods = ['Efectivo', 'Tarjeta', 'Transferencia', 'Yape', 'Plin', 'Caja chica'];

export function QuickExpenseModal({ isOpen, onClose }: QuickExpenseModalProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Insumos');
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!firestore || !amount || parseFloat(amount) <= 0) return;

    setIsSubmitting(true);
    try {
      const payload = {
        type: 'expense',
        category,
        amount: parseFloat(amount),
        paymentMethod,
        note: note || null,
        entryDate: Timestamp.now(),
        createdBy: user?.uid || null,
        createdAt: Timestamp.now(),
      };

      await addDocumentNonBlocking(collection(firestore, 'cash_flows'), payload);
      
      toast({
        title: '✅ Gasto registrado',
        description: `Se registró S/ ${parseFloat(amount).toFixed(2)} en ${category}`,
      });

      handleClose();
    } catch (error) {
      console.error('Error adding expense:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo registrar el gasto',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setAmount('');
    setCategory('Insumos');
    setPaymentMethod('Efectivo');
    setNote('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Wallet className="h-5 w-5 text-destructive" />
            Registrar Gasto Rápido
          </DialogTitle>
          <DialogDescription>
            Anota una salida de dinero inmediata del flujo de caja.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="amount">Monto (S/)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-lg font-bold h-12 border-primary/20 focus-visible:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Categoría</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="border-primary/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {expenseCategories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Método</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="border-primary/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="note">Nota / Motivo</Label>
            <Textarea
              id="note"
              placeholder="Ej: Compra de hielo, propinas, etc."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="border-primary/10 focus-visible:ring-primary"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} className="rounded-xl">Cancelar</Button>
          <Button 
            variant="destructive"
            className="rounded-xl shadow-md" 
            onClick={handleSubmit}
            disabled={!amount || isSubmitting}
          >
            <Receipt className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Registrando...' : 'Confirmar Gasto'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
