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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

export type DocumentType = '0' | '1' | '6';

export interface PaymentCustomerPayload {
  name: string;
  documentType: DocumentType;
  documentNumber: string;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  onSuccess: (payload: {
    paymentMethod: string;
    customer: PaymentCustomerPayload;
    issueBoleta: boolean;
  }) => void | Promise<void>;
}

const DOCUMENT_OPTIONS: { label: string; value: DocumentType; description: string }[] = [
  { label: 'Consumidor Final', value: '0', description: 'Sin documento / Cliente Mostrador' },
  { label: 'DNI', value: '1', description: 'Personas naturales en Perú' },
  { label: 'RUC', value: '6', description: 'Empresas o emisores de factura' },
];

export function PaymentModal({ isOpen, onClose, total, onSuccess }: PaymentModalProps) {
  const [amountReceived, setAmountReceived] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [documentType, setDocumentType] = useState<DocumentType>('0');
  const [documentNumber, setDocumentNumber] = useState('');
  const [customerName, setCustomerName] = useState('Cliente Mostrador');
  const [shouldIssueBoleta, setShouldIssueBoleta] = useState(true);
  const { toast } = useToast();

  const amount = parseFloat(amountReceived);
  const change = amount >= total ? amount - total : 0;
  const sanitizedDocument = documentNumber.replace(/\D/g, '');
  const isCustomerNameRequired = documentType !== '0';

  const documentError = (() => {
    if (documentType === '0') {
      return '';
    }
    if (documentType === '1' && sanitizedDocument.length !== 8) {
      return 'El DNI debe tener 8 dígitos.';
    }
    if (documentType === '6' && sanitizedDocument.length !== 11) {
      return 'El RUC debe tener 11 dígitos.';
    }
    return '';
  })();
  const isDocumentInvalid = Boolean(documentError || (isCustomerNameRequired && !customerName.trim()));

  useEffect(() => {
    if (!isOpen) {
      setAmountReceived('');
      setPaymentMethod('cash');
      setIsProcessing(false);
      setDocumentType('0');
      setDocumentNumber('');
      setCustomerName('Cliente Mostrador');
      setShouldIssueBoleta(true);
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

    if (documentError) {
      toast({
        variant: 'destructive',
        title: 'Documento inválido',
        description: documentError,
      });
      return;
    }

    if (isCustomerNameRequired && !customerName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Nombre requerido',
        description: 'Ingresa el nombre o razón social del cliente.',
      });
      return;
    }
    
    setIsProcessing(true);
    try {
      await onSuccess({
        paymentMethod,
        customer: {
          name: customerName.trim() || 'Cliente Mostrador',
          documentType,
          documentNumber: sanitizedDocument || (documentType === '0' ? '00000000' : ''),
        },
        issueBoleta: shouldIssueBoleta,
      });
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-headline">Procesar Pago</DialogTitle>
          <DialogDescription>
            El total del pedido es <span className="font-bold text-primary">S/ {total.toFixed(2)}</span>.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">

        <RadioGroup defaultValue="cash" onValueChange={setPaymentMethod} disabled={isProcessing} className="space-y-3">
          <div className="flex items-center space-x-4 p-4 sm:p-5 rounded-2xl border-2 hover:bg-accent cursor-pointer h-20 sm:h-24 text-lg font-semibold">
            <RadioGroupItem value="cash" id="cash" className="h-5 w-5" />
            <Label htmlFor="cash" className="text-lg font-semibold cursor-pointer flex-1">Efectivo</Label>
          </div>
          <div className="flex items-center space-x-4 p-4 sm:p-5 rounded-2xl border-2 hover:bg-accent cursor-pointer h-20 sm:h-24 text-lg font-semibold">
            <RadioGroupItem value="card" id="card" className="h-5 w-5" />
            <Label htmlFor="card" className="text-lg font-semibold cursor-pointer flex-1">Tarjeta</Label>
          </div>
          <div className="flex items-center space-x-4 p-4 sm:p-5 rounded-2xl border-2 hover:bg-accent cursor-pointer h-20 sm:h-24 text-lg font-semibold">
            <RadioGroupItem value="yape" id="yape" className="h-5 w-5" />
            <Label htmlFor="yape" className="text-lg font-semibold cursor-pointer flex-1">Yape</Label>
          </div>
          <div className="flex items-center space-x-4 p-4 sm:p-5 rounded-2xl border-2 hover:bg-accent cursor-pointer h-20 sm:h-24 text-lg font-semibold">
            <RadioGroupItem value="plin" id="plin" className="h-5 w-5" />
            <Label htmlFor="plin" className="text-lg font-semibold cursor-pointer flex-1">Plin</Label>
          </div>
          <div className="flex items-center space-x-4 p-4 sm:p-5 rounded-2xl border-2 hover:bg-accent cursor-pointer h-20 sm:h-24 text-lg font-semibold">
            <RadioGroupItem value="transfer" id="transfer" className="h-5 w-5" />
            <Label htmlFor="transfer" className="text-lg font-semibold cursor-pointer flex-1">Transferencia</Label>
          </div>
        </RadioGroup>

        <div className="space-y-2">
          <Label className="text-base font-medium">Datos del cliente</Label>
          <div className="grid gap-3">
            <div className="grid gap-1">
              <Label className="text-sm">Tipo de documento</Label>
              <Select value={documentType} onValueChange={(value) => setDocumentType(value as DocumentType)} disabled={isProcessing}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {documentType !== '0' && (
              <div className="grid gap-1">
                <Label className="text-sm">Número de documento</Label>
                <Input
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  placeholder={documentType === '1' ? '12345678' : '12345678901'}
                  inputMode="numeric"
                  maxLength={documentType === '1' ? 8 : 11}
                  disabled={isProcessing}
                  className="h-11"
                />
                {documentError && (
                  <p className="text-xs text-destructive">{documentError}</p>
                )}
              </div>
            )}

            <div className="grid gap-1">
              <Label className="text-sm">Nombre / Razón social</Label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Cliente Mostrador"
                disabled={isProcessing}
                className="h-11"
              />
            </div>
          </div>
        </div>

        <div className="flex items-start justify-between rounded-xl border p-4">
          <div className="space-y-1 pr-4">
            <p className="text-base font-semibold">Emitir boleta electrónica</p>
            <p className="text-sm text-muted-foreground">
              Si lo desactivas, solo se registrará la venta sin enviarla a SUNAT.
            </p>
          </div>
          <Switch checked={shouldIssueBoleta} onCheckedChange={setShouldIssueBoleta} disabled={isProcessing} />
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
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isProcessing} size="lg" className="h-12 text-base">
            Cancelar
          </Button>
          <Button 
            onClick={handlePayment} 
            disabled={isProcessing || (paymentMethod === 'cash' && (!amountReceived || amount < total)) || isDocumentInvalid} 
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
