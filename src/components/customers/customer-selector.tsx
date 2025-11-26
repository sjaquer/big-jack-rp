'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useCollection, useFirestore } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import type { Customer } from '@/lib/types';
import { Search, UserPlus, User, X } from 'lucide-react';
import { CustomerForm } from './customer-form';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface CustomerSelectorProps {
  onSelectCustomer: (customer: Customer | null) => void;
  selectedCustomer: Customer | null;
}

export function CustomerSelector({ onSelectCustomer, selectedCustomer }: CustomerSelectorProps) {
  const firestore = useFirestore();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);

  const customersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'customers');
  }, [firestore]);

  const { data: customers, isLoading } = useCollection<Customer>(customersQuery);

  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    if (!searchQuery.trim()) return customers;

    const query = searchQuery.toLowerCase();
    return customers.filter(customer => 
      customer.firstName.toLowerCase().includes(query) ||
      customer.lastName?.toLowerCase().includes(query) ||
      customer.nickname?.toLowerCase().includes(query) ||
      customer.phone?.includes(query) ||
      customer.email?.toLowerCase().includes(query)
    );
  }, [customers, searchQuery]);

  const handleSelectCustomer = (customer: Customer) => {
    onSelectCustomer(customer);
    setOpen(false);
    setSearchQuery('');
  };

  const handleClearCustomer = () => {
    onSelectCustomer(null);
  };

  return (
    <>
      <div className="space-y-2">
        <label className="text-sm font-medium">Cliente</label>
        {selectedCustomer ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 p-3 rounded-md border bg-muted/30">
              <User className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="font-medium text-base">
                  {selectedCustomer.nickname || `${selectedCustomer.firstName} ${selectedCustomer.lastName || ''}`.trim()}
                </p>
                {selectedCustomer.phone && (
                  <p className="text-sm text-muted-foreground">{selectedCustomer.phone}</p>
                )}
              </div>
              <Badge variant="secondary">
                {selectedCustomer.loyaltyPoints} pts
              </Badge>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleClearCustomer}
              className="h-12 w-12 touch-manipulation"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        ) : (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 text-base touch-manipulation justify-start"
              >
                <Search className="mr-2 h-5 w-5" />
                Seleccionar o buscar cliente...
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle className="text-2xl font-headline">Seleccionar Cliente</DialogTitle>
                <DialogDescription>
                  Busca un cliente existente o registra uno nuevo
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nombre, teléfono, email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 h-12 text-base"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={() => setShowNewCustomerForm(true)}
                    className="h-12 text-base touch-manipulation"
                  >
                    <UserPlus className="mr-2 h-5 w-5" />
                    Nuevo
                  </Button>
                </div>

                {isLoading ? (
                  <p className="text-center text-muted-foreground py-8">Cargando clientes...</p>
                ) : filteredCustomers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No se encontraron clientes</p>
                    <Button
                      type="button"
                      variant="link"
                      onClick={() => setShowNewCustomerForm(true)}
                      className="mt-2"
                    >
                      Registrar nuevo cliente
                    </Button>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px] rounded-md border">
                    <div className="p-2 space-y-2">
                      {filteredCustomers.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => handleSelectCustomer(customer)}
                          className="w-full text-left p-4 rounded-lg border hover:bg-muted/50 transition-colors touch-manipulation"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-base">
                                {customer.nickname || `${customer.firstName} ${customer.lastName || ''}`.trim()}
                              </p>
                              {customer.phone && (
                                <p className="text-sm text-muted-foreground">{customer.phone}</p>
                              )}
                              {customer.email && (
                                <p className="text-sm text-muted-foreground">{customer.email}</p>
                              )}
                              {customer.allergies && customer.allergies.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {customer.allergies.map((allergy, idx) => (
                                    <Badge key={idx} variant="destructive" className="text-xs">
                                      {allergy}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="text-right space-y-1">
                              <Badge variant="secondary" className="text-xs">
                                {customer.loyaltyPoints} pts
                              </Badge>
                              <p className="text-xs text-muted-foreground">
                                {customer.totalVisits} visitas
                              </p>
                              {customer.lastVisit && (
                                <p className="text-xs text-muted-foreground">
                                  {format(customer.lastVisit.toDate(), 'dd/MM/yy', { locale: es })}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <CustomerForm
        open={showNewCustomerForm}
        onOpenChange={setShowNewCustomerForm}
        onSuccess={() => {
          setShowNewCustomerForm(false);
          // Opcionalmente, podrías seleccionar automáticamente al cliente recién creado
        }}
      />
    </>
  );
}
