'use client';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import type { InventoryItem } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const formSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido.'),
  type: z.string().min(1, 'El tipo es requerido.'),
  quantity: z.coerce.number().min(0, 'La cantidad debe ser un número positivo.'),
  minimumStock: z.coerce.number().min(0, 'El stock mínimo debe ser un número positivo.'),
  location: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface OtherItemFormProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
}

export function OtherItemForm({ isOpen, onClose, item }: OtherItemFormProps) {
  const firestore = useFirestore();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      type: 'packaging',
      quantity: 0,
      minimumStock: 0,
      location: '',
    },
  });

  useEffect(() => {
    if (item) {
      form.reset({
        name: item.name,
        type: item.type,
        quantity: item.quantity,
        minimumStock: item.minimumStock,
        location: item.location,
      });
    } else {
      form.reset({
        name: '',
        type: 'packaging',
        quantity: 0,
        minimumStock: 0,
        location: '',
      });
    }
  }, [item, form, isOpen]);

  async function onSubmit(values: FormValues) {
    if (item) {
      const itemDocRef = doc(firestore, 'inventory_items', item.id);
      updateDocumentNonBlocking(itemDocRef, values);
    } else {
      const itemsCollectionRef = collection(firestore, 'inventory_items');
      addDocumentNonBlocking(itemsCollectionRef, values);
    }
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-headline">{item ? 'Editar Artículo' : 'Añadir Nuevo Artículo'}</DialogTitle>
          <DialogDescription>
            {item ? 'Actualiza los detalles del artículo.' : 'Completa los detalles para añadir un nuevo artículo al inventario.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Artículo</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Cajas de hamburguesa" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                   <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="packaging">Empaquetado</SelectItem>
                      <SelectItem value="utensils">Utensilios</SelectItem>
                      <SelectItem value="cleaning">Limpieza</SelectItem>
                      <SelectItem value="other">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cantidad en Stock</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 200" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="minimumStock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock Mínimo</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 50" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
             <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ubicación</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Almacén principal" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit">Guardar Artículo</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
