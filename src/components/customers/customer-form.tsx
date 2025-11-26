'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useFirestore } from '@/firebase';
import { collection, addDoc, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserPlus, Save } from 'lucide-react';
import type { Customer } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { useState } from 'react';

const customerSchema = z.object({
  firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  lastName: z.string().optional(),
  nickname: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  allergies: z.string().optional(),
  preferences: z.string().optional(),
  notes: z.string().optional(),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

interface CustomerFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer | null;
  onSuccess?: () => void;
}

export function CustomerForm({ open, onOpenChange, customer, onSuccess }: CustomerFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [allergyInput, setAllergyInput] = useState('');
  const [allergies, setAllergies] = useState<string[]>(customer?.allergies || []);

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      firstName: customer?.firstName || '',
      lastName: customer?.lastName || '',
      nickname: customer?.nickname || '',
      phone: customer?.phone || '',
      email: customer?.email || '',
      allergies: customer?.allergies?.join(', ') || '',
      preferences: customer?.preferences || '',
      notes: customer?.notes || '',
    },
  });

  const handleAddAllergy = () => {
    if (allergyInput.trim() && !allergies.includes(allergyInput.trim())) {
      setAllergies([...allergies, allergyInput.trim()]);
      setAllergyInput('');
    }
  };

  const handleRemoveAllergy = (allergy: string) => {
    setAllergies(allergies.filter(a => a !== allergy));
  };

  const onSubmit = async (values: CustomerFormValues) => {
    if (!firestore) {
      toast({
        title: 'Error',
        description: 'No se pudo conectar con la base de datos',
        variant: 'destructive',
      });
      return;
    }

    try {
      const customerData = {
        firstName: values.firstName,
        lastName: values.lastName || null,
        nickname: values.nickname || null,
        phone: values.phone || null,
        email: values.email || null,
        allergies: allergies.length > 0 ? allergies : null,
        preferences: values.preferences || null,
        notes: values.notes || null,
      };

      if (customer) {
        // Actualizar cliente existente
        const customerRef = doc(firestore, 'customers', customer.id);
        await updateDoc(customerRef, {
          ...customerData,
          lastVisit: Timestamp.now(),
        });
        
        toast({
          title: 'Cliente actualizado',
          description: 'La información del cliente se actualizó correctamente.',
        });
      } else {
        // Crear nuevo cliente
        await addDoc(collection(firestore, 'customers'), {
          ...customerData,
          registrationDate: Timestamp.now(),
          lastVisit: Timestamp.now(),
          totalVisits: 0,
          totalSpent: 0,
          loyaltyPoints: 0,
        });
        
        toast({
          title: 'Cliente registrado',
          description: 'El nuevo cliente se registró correctamente.',
        });
      }

      form.reset();
      setAllergies([]);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error saving customer:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar la información del cliente.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-headline">
            {customer ? 'Editar Cliente' : 'Nuevo Cliente'}
          </DialogTitle>
          <DialogDescription>
            {customer 
              ? 'Actualiza la información del cliente.' 
              : 'Registra un nuevo cliente en el sistema de lealtad.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Información básica */}
            <div className="space-y-4">
              <h3 className="font-semibold text-base">Información Básica</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base">Nombre *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Juan" 
                          className="h-12 text-base" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base">Apellido</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Pérez" 
                          className="h-12 text-base" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="nickname"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm sm:text-base">Apodo</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Juancho" 
                        className="h-12 text-base" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription className="text-xs sm:text-sm">
                      Nombre con el que se identifica comúnmente
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Contacto */}
            <div className="space-y-4">
              <h3 className="font-semibold text-base">Contacto</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base">Teléfono</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="999 999 999" 
                          className="h-12 text-base" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base">Email</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="juan@ejemplo.com" 
                          className="h-12 text-base" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Alergias y preferencias */}
            <div className="space-y-4">
              <h3 className="font-semibold text-base">Preferencias y Restricciones</h3>
              
              <div className="space-y-2">
                <FormLabel className="text-sm sm:text-base">Alergias</FormLabel>
                <div className="flex gap-2">
                  <Input
                    value={allergyInput}
                    onChange={(e) => setAllergyInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddAllergy();
                      }
                    }}
                    placeholder="Ej: Maní, Gluten, Lactosa..."
                    className="h-11 text-base"
                  />
                  <Button
                    type="button"
                    onClick={handleAddAllergy}
                    variant="outline"
                    className="h-11 px-4"
                  >
                    Agregar
                  </Button>
                </div>
                {allergies.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {allergies.map((allergy, idx) => (
                      <Badge key={idx} variant="secondary" className="text-sm py-1.5 px-3">
                        {allergy}
                        <button
                          type="button"
                          onClick={() => handleRemoveAllergy(allergy)}
                          className="ml-2 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <FormField
                control={form.control}
                name="preferences"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm sm:text-base">Preferencias</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Ej: Sin cebolla, extra queso, punto medio..."
                        className="min-h-20 text-base" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription className="text-xs sm:text-sm">
                      Preferencias alimenticias del cliente
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Notas adicionales */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm sm:text-base">Notas Adicionales</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Información adicional sobre el cliente..."
                      className="min-h-20 text-base" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset();
                  setAllergies([]);
                  onOpenChange(false);
                }}
                className="h-12 text-base touch-manipulation"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="h-12 text-base touch-manipulation"
              >
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Guardando...
                  </>
                ) : customer ? (
                  <>
                    <Save className="mr-2 h-5 w-5" />
                    Actualizar Cliente
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-5 w-5" />
                    Registrar Cliente
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
