'use client'

import { useState, useEffect, useMemo } from 'react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, User, CreditCard, Banknote, Smartphone, ArrowRightLeft, Check, UserPlus, Wallet } from 'lucide-react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, serverTimestamp, addDoc } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import type { Customer } from '@/lib/types';
import { cn } from '@/lib/utils';

export type DocumentType = '0' | '1' | '6';

export interface PaymentCustomerPayload {
  customerId?: string | null;
  name: string;
  documentType: DocumentType;
  documentNumber: string;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  defaultPaymentMethod?: string;
  onSuccess: (payload: {
    paymentMethod: string;
    customer: PaymentCustomerPayload;
  }) => void | Promise<void>;
}

const DOCUMENT_OPTIONS: { label: string; value: DocumentType; description: string }[] = [
  { label: 'Consumidor Final', value: '0', description: 'Sin documento / Cliente Mostrador' },
  { label: 'DNI', value: '1', description: 'Personas naturales en Perú' },
  { label: 'RUC', value: '6', description: 'Empresas o emisores de factura' },
];

const paymentOptions = [
  { id: 'cash', label: 'Efectivo', description: 'Pago en caja', icon: Banknote },
  { id: 'card', label: 'Tarjeta', description: 'POS / Tap', icon: CreditCard },
  { id: 'yape', label: 'Yape', description: 'QR Yape', icon: Smartphone },
  { id: 'plin', label: 'Plin', description: 'QR Plin', icon: Smartphone },
  { id: 'transfer', label: 'Transferencia', description: 'Banco / app', icon: Wallet },
];

export function PaymentModal({ isOpen, onClose, total, defaultPaymentMethod = 'cash', onSuccess }: PaymentModalProps) {
  const [amountReceived, setAmountReceived] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState(defaultPaymentMethod);
  const [isProcessing, setIsProcessing] = useState(false);
  const [documentType, setDocumentType] = useState<DocumentType>('0');
  const [documentNumber, setDocumentNumber] = useState('');
  const [customerName, setCustomerName] = useState('Cliente Mostrador');
  
  // Customer Search State
  const [customerSearchMode, setCustomerSearchMode] = useState<'search' | 'manual'>('manual');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [saveCustomer, setSaveCustomer] = useState(false);

  const { toast } = useToast();
  const firestore = useFirestore();

  const customersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'customers');
  }, [firestore]);
  const { data: customers } = useCollection<Customer>(customersQuery);

  const amount = parseFloat(amountReceived) || 0;
  // Redondear a 2 decimales para evitar problemas de precisión con punto flotante
  const roundedAmount = Math.round(amount * 100) / 100;
  const roundedTotal = Math.round(total * 100) / 100;
  const change = roundedAmount >= roundedTotal ? roundedAmount - roundedTotal : 0;
  const isInsufficientCash = paymentMethod === 'cash' && roundedAmount > 0 && roundedAmount < roundedTotal;
  const sanitizedDocument = documentNumber.replace(/\D/g, '');
  const isCustomerNameRequired = documentType !== '0';

  const filteredCustomers = useMemo(() => {
    if (!customers || !searchTerm) return [];
    const lowerTerm = searchTerm.toLowerCase();
    return customers.filter(c => 
      c.firstName.toLowerCase().includes(lowerTerm) || 
      c.lastName?.toLowerCase().includes(lowerTerm) ||
      c.phone?.includes(lowerTerm) ||
      c.documentNumber?.includes(searchTerm) // Search by document number too
    ).slice(0, 5);
  }, [customers, searchTerm]);

  // Check if customer with same document already exists
  const existingCustomerWithDocument = useMemo(() => {
    if (!customers || documentType === '0' || !sanitizedDocument) return null;
    return customers.find(c => 
      c.documentType === documentType && 
      c.documentNumber === sanitizedDocument
    );
  }, [customers, documentType, sanitizedDocument]);

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
    if (isOpen) {
      // Set payment method from prop when modal opens
      setPaymentMethod(defaultPaymentMethod);
    } else {
      setAmountReceived('');
      setPaymentMethod(defaultPaymentMethod);
      setIsProcessing(false);
      setDocumentType('0');
      setDocumentNumber('');
      setCustomerName('Cliente Mostrador');
      setCustomerSearchMode('manual');
      setSearchTerm('');
      setSelectedCustomerId(null);
      setSaveCustomer(false);
    }
  }, [isOpen, defaultPaymentMethod]);

  const handleSelectCustomer = (customer: Customer) => {
    setCustomerName(`${customer.firstName} ${customer.lastName || ''}`.trim());
    // Use customer's document info if available
    if (customer.documentType && customer.documentNumber) {
      setDocumentType(customer.documentType);
      setDocumentNumber(customer.documentNumber);
    } else {
      setDocumentType('1'); // Default to DNI for registered customers
      setDocumentNumber('');
    }
    setSelectedCustomerId(customer.id);
    setSaveCustomer(false); // Already saved
    setCustomerSearchMode('manual'); // Switch to manual view to verify/edit details
  };

  const handlePayment = async () => {
    if (isProcessing) return;

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
      let resolvedCustomerId: string | null = selectedCustomerId;

      // If a customer exists with the same document, always link the sale to that customer.
      if (!resolvedCustomerId && existingCustomerWithDocument?.id) {
        resolvedCustomerId = existingCustomerWithDocument.id;
      }

      // Save customer if requested and has valid document, then link sale to new customer.
      if (!resolvedCustomerId && saveCustomer && firestore && documentType !== '0' && !documentError && customerName.trim()) {
        const nameParts = customerName.trim().split(' ');
        const firstName = nameParts[0] || customerName.trim();
        const lastName = nameParts.slice(1).join(' ') || undefined;
        
        const newCustomer = {
          firstName,
          lastName,
          documentType,
          documentNumber: sanitizedDocument,
          registrationDate: serverTimestamp(),
          totalVisits: 1,
          totalSpent: total,
          loyaltyPoints: 0,
        };

        const createdCustomerRef = await addDoc(collection(firestore, 'customers'), newCustomer);
        resolvedCustomerId = createdCustomerRef.id;
        toast({
          title: 'Cliente guardado',
          description: `${customerName.trim()} fue añadido a tu lista de clientes.`,
        });
      }

      await onSuccess({
        paymentMethod,
        customer: {
          customerId: resolvedCustomerId,
          name: customerName.trim() || 'Cliente Mostrador',
          documentType,
          documentNumber: sanitizedDocument || (documentType === '0' ? '00000000' : ''),
        },
      });
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
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 py-3 flex-shrink-0 border-b">
          <DialogTitle className="font-headline text-xl">Procesar Pago</DialogTitle>
          <DialogDescription className="text-sm">
            Total a cobrar: <span className="font-bold text-primary text-lg">S/ {(total ?? 0).toFixed(2)}</span>
            {' • '}
            <span className="capitalize">{paymentMethod === 'cash' ? 'Efectivo' : paymentMethod === 'card' ? 'Tarjeta' : paymentMethod === 'yape' ? 'Yape' : paymentMethod === 'plin' ? 'Plin' : 'Pedidos Ya'}</span>
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 px-5 py-3">
          <div className="grid gap-4 pb-4">
            
            {/* Payment Methods Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Método de pago</Label>
              <RadioGroup
                value={paymentMethod}
                onValueChange={setPaymentMethod}
                disabled={isProcessing}
                className="grid grid-cols-2 sm:grid-cols-3 gap-2"
              >
                {paymentOptions.map((option) => {
                  const Icon = option.icon;
                  const isActive = paymentMethod === option.id;
                  return (
                    <Label
                      key={option.id}
                      htmlFor={`payment-${option.id}`}
                      className={cn(
                        'flex flex-col rounded-xl border-2 p-3 cursor-pointer transition-all h-20',
                        isActive
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:border-primary/40 bg-card'
                      )}
                    >
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <Icon className={cn('h-5 w-5 mb-1', isActive ? 'text-primary' : 'text-muted-foreground')} />
                        <p className="font-semibold text-xs leading-tight">{option.label}</p>
                      </div>
                      <RadioGroupItem value={option.id} id={`payment-${option.id}`} className="sr-only" />
                    </Label>
                  );
                })}
              </RadioGroup>
            </div>

            {/* Cash Amount Section */}
            {paymentMethod === 'cash' && (
              <div className="space-y-2 animate-in slide-in-from-top-4 fade-in">
                <Label htmlFor="amount" className="text-sm font-medium">
                  Monto Recibido
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-bold text-muted-foreground">S/</span>
                  <Input
                    id="amount"
                    type="number"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                    className="h-12 pl-9 text-xl font-bold"
                    placeholder='0.00'
                    disabled={isProcessing}
                    autoFocus
                    step="0.01"
                  />
                </div>

                {/* Sugerencias de pago */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Exacto', value: total },
                    { label: Math.ceil(total / 10) * 10, value: Math.ceil(total / 10) * 10 },
                    { label: Math.ceil(total / 50) * 50, value: Math.ceil(total / 50) * 50 },
                    { label: Math.ceil(total / 100) * 100, value: Math.ceil(total / 100) * 100 },
                  ].filter((item, index, arr) => index === 0 || item.value !== arr[index-1].value).slice(0, 4).map((item, index) => (
                    <Button
                      key={index}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs h-8"
                      onClick={() => setAmountReceived((item.value ?? 0).toFixed(2))}
                      disabled={isProcessing}
                    >
                      S/ {item.label}
                    </Button>
                  ))}
                </div>

                {/* Vuelto */}
                {amountReceived && (
                  <div className={cn(
                    "flex items-center justify-between p-4 rounded-lg border-2 transition-colors",
                    isInsufficientCash ? "bg-destructive/10 border-destructive/20 animate-pulse" :
                    roundedAmount >= roundedTotal ? "bg-green-500/10 border-green-500/20" : "bg-amber-500/10 border-amber-500/20"
                  )}>
                    <div className="space-y-1">
                      <span className="font-medium text-sm text-muted-foreground">Vuelto</span>
                      {isInsufficientCash && (
                        <p className="text-xs text-destructive">Falta S/ {((roundedTotal ?? 0) - (roundedAmount ?? 0)).toFixed(2)}</p>
                      )}
                    </div>
                    <span className={cn(
                      "text-3xl font-bold",
                      isInsufficientCash ? "text-destructive" :
                      roundedAmount >= roundedTotal ? "text-green-600" : "text-amber-600"
                    )}>
                      {isInsufficientCash ? '-' : `S/ ${(change ?? 0).toFixed(2)}`}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Advertencia efectivo insuficiente */}
            {isInsufficientCash && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <div className="h-4 w-4 rounded-full bg-destructive flex items-center justify-center flex-shrink-0">
                  <span className="text-destructive-foreground text-xs font-bold">!</span>
                </div>
                <p className="text-sm font-medium text-destructive">
                  El efectivo recibido no cubre el total. Recibido: S/ {(roundedAmount ?? 0).toFixed(2)}, Falta: S/ {((roundedTotal ?? 0) - (roundedAmount ?? 0)).toFixed(2)}
                </p>
              </div>
            )}

            {/* Customer Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4" /> Datos del cliente
                </Label>
                <Tabs value={customerSearchMode} onValueChange={(v) => setCustomerSearchMode(v as 'search' | 'manual')} className="w-auto">
                  <TabsList className="h-7">
                    <TabsTrigger value="manual" className="text-xs h-5 px-2">Manual</TabsTrigger>
                    <TabsTrigger value="search" className="text-xs h-5 px-2">Buscar</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {customerSearchMode === 'search' ? (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Nombre, DNI o RUC..." 
                      className="pl-9 h-9"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      autoFocus
                    />
                  </div>
                  {searchTerm && (
                    <div className="rounded-md border bg-popover text-popover-foreground shadow-md max-h-32 overflow-auto">
                      {filteredCustomers.length > 0 ? (
                        <div className="p-1">
                          {filteredCustomers.map((customer) => (
                            <div 
                              key={customer.id}
                              className="flex items-center justify-between p-2 hover:bg-accent rounded-sm cursor-pointer"
                              onClick={() => handleSelectCustomer(customer)}
                            >
                              <div>
                                <p className="font-medium text-sm">{customer.firstName} {customer.lastName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {customer.documentNumber ? `${customer.documentType === '1' ? 'DNI' : 'RUC'}: ${customer.documentNumber}` : (customer.phone || 'Sin documento')}
                                </p>
                              </div>
                              <Check className={cn("h-4 w-4 opacity-0", selectedCustomerId === customer.id && "opacity-100")} />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 text-center text-sm text-muted-foreground">
                          No se encontraron clientes.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid gap-3 p-3 border rounded-lg bg-muted/10 animate-in fade-in slide-in-from-top-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-muted-foreground">Tipo Doc.</Label>
                      <Select
                        value={documentType}
                        onValueChange={(value) => {
                          setDocumentType(value as DocumentType);
                          setSelectedCustomerId(null);
                        }}
                        disabled={isProcessing}
                      >
                        <SelectTrigger className="h-9 bg-background text-sm">
                          <SelectValue placeholder="Selecciona" />
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
                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-muted-foreground">Número</Label>
                        <Input
                          value={documentNumber}
                          onChange={(e) => {
                            setDocumentNumber(e.target.value);
                            setSelectedCustomerId(null);
                          }}
                          placeholder={documentType === '1' ? 'DNI (8)' : 'RUC (11)'}
                          inputMode="numeric"
                          maxLength={documentType === '1' ? 8 : 11}
                          disabled={isProcessing}
                          className="h-9 bg-background"
                        />
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-muted-foreground">Nombre / Razón Social</Label>
                    <Input
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Nombre del cliente"
                      disabled={isProcessing}
                      className="h-9 bg-background"
                    />
                  </div>
                  {documentError && (
                    <p className="text-xs text-destructive font-medium flex items-center gap-1">
                      ⚠️ {documentError}
                    </p>
                  )}
                  
                  {/* Save Customer Option */}
                  {documentType !== '0' && !documentError && sanitizedDocument && customerName.trim() && !selectedCustomerId && (
                    existingCustomerWithDocument ? (
                      <div className="flex items-center gap-2 p-2 rounded-md bg-blue-500/10 border border-blue-500/20 text-xs">
                        <Check className="h-4 w-4 text-blue-500 shrink-0" />
                        <span className="text-blue-600">Este cliente ya está guardado: <strong>{existingCustomerWithDocument.firstName} {existingCustomerWithDocument.lastName}</strong></span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                        <div className="flex items-center gap-2">
                          <UserPlus className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs font-medium">Guardar como cliente</span>
                        </div>
                        <Switch 
                          checked={saveCustomer} 
                          onCheckedChange={setSaveCustomer} 
                          disabled={isProcessing}
                        />
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="px-5 py-3 border-t bg-background flex-shrink-0 gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isProcessing} size="default" className="h-10 text-sm w-full sm:w-auto">
            Cancelar
          </Button>
          <Button 
            onClick={handlePayment} 
            disabled={isProcessing || (paymentMethod === 'cash' && (!amountReceived || roundedAmount < roundedTotal)) || isDocumentInvalid} 
            size="default" 
            className="h-10 text-sm w-full sm:w-auto font-bold shadow-md"
          >
            {isProcessing ? 'Procesando...' : `Cobrar S/ ${(total ?? 0).toFixed(2)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
