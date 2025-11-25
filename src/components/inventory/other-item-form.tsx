'use client';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import type { InventoryItem } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';

const formSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido.'),
  type: z.string().min(1, 'El tipo es requerido.'),
  quantity: z.coerce.number().min(0, 'La cantidad debe ser un número positivo.'),
  minimumStock: z.coerce.number().min(0, 'El stock mínimo debe ser un número positivo.'),
  location: z.string().min(1, 'La ubicación es requerida.'),
  supplier: z.string().optional(),
  costPerUnit: z.coerce.number().min(0, 'El costo debe ser positivo.').optional(),
  notes: z.string().max(400, 'Máximo 400 caracteres.').optional(),
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
      location: 'almacen-principal',
      supplier: '',
      costPerUnit: undefined,
      notes: '',
    },
  });

  useEffect(() => {
    if (item) {
      form.reset({
        name: item.name,
        type: item.type,
        quantity: item.quantity,
        minimumStock: item.minimumStock,
        location: item.location ?? 'almacen-principal',
        supplier: item.supplier ?? '',
        costPerUnit: item.costPerUnit,
        notes: item.notes ?? '',
      });
    } else {
      form.reset({
        name: '',
        type: 'packaging',
        quantity: 0,
        minimumStock: 0,
        location: 'almacen-principal',
        supplier: '',
        costPerUnit: undefined,
        notes: '',
      });
    }
  }, [item, form, isOpen]);

  async function onSubmit(values: FormValues) {
    // Preparar todos los datos asegurando que los campos opcionales se guarden correctamente
    const data = {
      name: values.name,
      type: values.type,
      quantity: values.quantity,
      minimumStock: values.minimumStock,
      location: values.location,
      supplier: values.supplier || null,
      costPerUnit: values.costPerUnit || null,
      notes: values.notes || null,
    };

    if (item) {
      const itemDocRef = doc(firestore, 'inventory_items', item.id);
      updateDocumentNonBlocking(itemDocRef, data);
    } else {
      const itemsCollectionRef = collection(firestore, 'inventory_items');
      addDocumentNonBlocking(itemsCollectionRef, data);
    }
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-[100vw] h-[100dvh] sm:h-[65vh] sm:max-w-lg p-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-4 pt-4 sm:px-6 sm:pt-6 flex-shrink-0">
          <DialogTitle className="font-headline text-lg sm:text-xl">{item ? 'Editar Artículo' : 'Añadir Nuevo Artículo'}</DialogTitle>
          <DialogDescription className="text-sm">
            {item ? 'Actualiza los detalles del artículo.' : 'Completa los detalles para añadir un nuevo artículo al inventario.'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-hidden min-h-0 sm:min-h-[150px]">
          <ScrollArea className="h-full px-4 sm:px-6" type="always">
            <ScrollBar className="z-50" />
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4 pr-3">
            <section className="space-y-4 rounded-lg border p-3 sm:p-4">
              <div>
                <h3 className="font-semibold text-base sm:text-lg">Detalles del artículo</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">Mantén tu stock de empaques y desechables bajo control.</p>
              </div>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base">Nombre del artículo</FormLabel>
                      <FormControl>
                        <Input className="h-11 sm:h-10 text-base" placeholder="Ej.: Caja para burger mediana (50 unidades)" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">Nombre claro del artículo tal como aparecerá en órdenes de compra y en almacén. Incluye tamaño o unidades si aplica.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base">Categoría</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-11 sm:h-10 text-base">
                            <SelectValue placeholder="Selecciona un tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="packaging" className="py-3 sm:py-2">Empaquetado</SelectItem>
                          <SelectItem value="utensils" className="py-3 sm:py-2">Utensilios</SelectItem>
                          <SelectItem value="cleaning" className="py-3 sm:py-2">Limpieza</SelectItem>
                          <SelectItem value="marketing" className="py-3 sm:py-2">Material POP</SelectItem>
                          <SelectItem value="other" className="py-3 sm:py-2">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-xs">Selecciona la categoría que mejor describa el artículo para agruparlo en el inventario.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid gap-4 grid-cols-2 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base">Cantidad en stock</FormLabel>
                      <FormControl>
                        <Input className="h-11 sm:h-10 text-base" type="number" placeholder="Cantidad disponible actualmente (ej.: 200)" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">Indica cuántas unidades hay físicamente en almacén. Para items empaquetados, registra el número de paquetes.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="minimumStock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base">Stock mínimo</FormLabel>
                      <FormControl>
                        <Input className="h-11 sm:h-10 text-base" type="number" placeholder="e.g., 50" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">Cantidad mínima a partir de la cual deberías reponer. El sistema puede avisarte si cae por debajo de este valor.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="costPerUnit"
                  render={({ field }) => (
                    <FormItem className="col-span-2 sm:col-span-1">
                      <FormLabel className="text-sm sm:text-base">Costo por unidad (S/)</FormLabel>
                      <FormControl>
                        <Input className="h-11 sm:h-10 text-base" type="number" step="0.01" placeholder="e.g., 0.45" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">Costo de compra por unidad o paquete. Útil para calcular el coste total del inventario y compararlo entre proveedores.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            <section className="space-y-4 rounded-lg border p-3 sm:p-4">
              <div>
                <h3 className="font-semibold text-base sm:text-lg">Logística y notas</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">Información útil para el equipo de compras y almacén.</p>
              </div>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base">Ubicación</FormLabel>
                      <FormControl>
                        <Input className="h-11 sm:h-10 text-base" placeholder="e.g., Almacén principal" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">Lugar físico donde se guarda el artículo (p.ej., Almacén principal, Estante A4).</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="supplier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base">Proveedor habitual</FormLabel>
                      <FormControl>
                        <Input className="h-11 sm:h-10 text-base" placeholder="e.g., Empaques Lima" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">Indica el proveedor habitual para facilitar nuevas órdenes y comparar precios.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm sm:text-base">Notas internas</FormLabel>
                    <FormControl>
                      <Textarea className="text-base min-h-[100px]" rows={3} placeholder="e.g., Usar solo para delivery, revisar cada sábado" {...field} />
                    </FormControl>
                    <FormDescription className="text-xs">Notas para el equipo: condiciones especiales, frecuencia de uso, instrucciones de almacenamiento o restricciones.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </section>
              </form>
            </Form>
            <div className="h-4" />
          </ScrollArea>
        </div>

        <DialogFooter className="flex-shrink-0 px-4 pb-5 sm:px-6 sm:pb-6 pt-4 border-t bg-background shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] gap-3 sm:gap-2">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1 sm:flex-none h-12 sm:h-10 text-base font-medium">
            Cancelar
          </Button>
          <Button type="submit" onClick={form.handleSubmit(onSubmit)} className="flex-1 sm:flex-none h-12 sm:h-10 text-base font-semibold bg-primary hover:bg-primary/90">
            Guardar Artículo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
