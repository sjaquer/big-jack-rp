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
import type { Ingredient } from '@/lib/types';
import { CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const formSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido.'),
  quantity: z.coerce.number().min(0, 'La cantidad debe ser un número positivo.'),
  unit: z.string().min(1, 'La unidad es requerida.'),
  cost: z.coerce.number().min(0, 'El costo debe ser un número positivo.'),
  minimumStock: z.coerce.number().min(0, 'El stock mínimo debe ser positivo.').optional(),
  expiryDate: z.date().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface IngredientFormProps {
  isOpen: boolean;
  onClose: () => void;
  ingredient: Ingredient | null;
}

export function IngredientForm({ isOpen, onClose, ingredient }: IngredientFormProps) {
  const firestore = useFirestore();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      quantity: 0,
      unit: '',
      cost: 0,
      minimumStock: 0,
    },
  });

  useEffect(() => {
    if (ingredient) {
      form.reset({
        name: ingredient.name,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        cost: ingredient.cost,
        minimumStock: ingredient.minimumStock,
        expiryDate: ingredient.expiryDate ? new Date(ingredient.expiryDate) : undefined,
      });
    } else {
      form.reset({
        name: '',
        quantity: 0,
        unit: '',
        cost: 0,
        minimumStock: 0,
        expiryDate: undefined,
      });
    }
  }, [ingredient, form, isOpen]);

  async function onSubmit(values: FormValues) {
    const data = { 
        ...values,
        expiryDate: values.expiryDate ? values.expiryDate.toISOString() : null,
    };

    if (ingredient) {
      const ingredientDocRef = doc(firestore, 'ingredients', ingredient.id);
      updateDocumentNonBlocking(ingredientDocRef, data);
    } else {
      const ingredientsCollectionRef = collection(firestore, 'ingredients');
      addDocumentNonBlocking(ingredientsCollectionRef, data);
    }
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-headline">{ingredient ? 'Editar Ingrediente' : 'Añadir Nuevo Ingrediente'}</DialogTitle>
          <DialogDescription>
            {ingredient ? 'Actualiza los detalles del ingrediente.' : 'Completa los detalles para añadir un nuevo ingrediente.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Ingrediente</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Tomate" {...field} />
                  </FormControl>
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
                      <Input type="number" placeholder="e.g., 50" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidad</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., kg, L, unidades" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Costo por Unidad (S/)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="e.g., 2.50" {...field} />
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
                      <Input type="number" placeholder="e.g., 5" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="expiryDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha de Vencimiento</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-[240px] pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Elige una fecha</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date < new Date()
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit">Guardar Ingrediente</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
