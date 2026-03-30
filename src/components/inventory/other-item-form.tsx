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
      <DialogContent className="w-full max-w-[min(100vw,900px)] h-[100dvh] sm:h-[min(92vh,760px)] p-0 flex flex-col overflow-hidden rounded-none sm:rounded-2xl shadow-2xl border-0 sm:border">
        <DialogHeader className="px-4 pt-5 sm:px-6 sm:pt-6 pb-4 flex-shrink-0 border-b bg-white dark:bg-slate-900/70">
          <DialogTitle className="font-headline text-xl sm:text-2xl font-bold text-foreground">{item ? 'Editar Artículo' : 'Añadir Nuevo Artículo'}</DialogTitle>
          <DialogDescription className="text-sm">
            {item ? 'Actualiza los detalles del artículo.' : 'Completa los detalles para añadir un nuevo artículo al inventario.'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-hidden min-h-0">
          <ScrollArea className="h-full px-4 sm:px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))]" type="always">
            <ScrollBar className="z-50" />
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 sm:space-y-6 py-4 pr-2 sm:pr-2">
            <section className="space-y-4 rounded-xl border bg-muted/30 p-3 sm:p-5 shadow-sm">
              <div>
                <h3 className="font-semibold text-base sm:text-lg">Detalles del artículo</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">Mantén tu stock de empaques y desechables bajo control.</p>
              </div>
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base font-medium">Nombre del artículo</FormLabel>
                      <FormControl>
                        <Input className="h-12 sm:h-11 text-base rounded-lg" placeholder="Ej. Caja para burger mediana (50 unid.)" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs sm:text-xs leading-relaxed text-slate-600">Nombre claro del artículo tal como aparecerá en órdenes de compra y en almacén.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base font-medium">Categoría</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12 sm:h-11 text-base rounded-lg">
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
                      <FormDescription className="text-xs sm:text-xs leading-relaxed text-slate-600">Selecciona la categoría para agrupar el artículo en el inventario.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base font-medium">Cantidad en stock</FormLabel>
                      <FormControl>
                        <Input className="h-12 sm:h-11 text-base rounded-lg" type="number" placeholder="Ej. 200" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs sm:text-xs leading-relaxed text-slate-600">Indica cuántas unidades hay físicamente en almacén.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="minimumStock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base font-medium">Stock mínimo</FormLabel>
                      <FormControl>
                        <Input className="h-12 sm:h-11 text-base rounded-lg" type="number" placeholder="Ej. 50" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs sm:text-xs leading-relaxed text-slate-600">Cantidad mínima a partir de la cual deberías reponer.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="costPerUnit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base font-medium">Costo por unidad (S/)</FormLabel>
                      <FormControl>
                        <Input className="h-12 sm:h-11 text-base rounded-lg" type="number" step="0.01" placeholder="Ej. 0.45" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs sm:text-xs leading-relaxed text-slate-600">Costo de compra por unidad o paquete. Útil para calcular el coste total del inventario.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            <section className="space-y-4 rounded-xl border bg-muted/30 p-3 sm:p-5 shadow-sm">
              <div>
                <h3 className="font-semibold text-base sm:text-lg">Logística y notas</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">Información útil para el equipo de compras y almacén.</p>
              </div>
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base font-medium">Ubicación</FormLabel>
                      <FormControl>
                        <Input className="h-12 sm:h-11 text-base rounded-lg" placeholder="Ej. Almacén principal" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs sm:text-xs leading-relaxed text-slate-600">Lugar físico donde se guarda el artículo.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="supplier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base font-medium">Proveedor habitual</FormLabel>
                      <FormControl>
                        <Input className="h-12 sm:h-11 text-base rounded-lg" placeholder="Ej. Empaques Lima" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs sm:text-xs leading-relaxed text-slate-600">Indica el proveedor habitual para facilitar nuevas órdenes.</FormDescription>
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
                    <FormLabel className="text-sm sm:text-base font-medium">Notas internas</FormLabel>
                    <FormControl>
                      <Textarea className="text-base min-h-[100px] rounded-lg" rows={3} placeholder="Ej. Usar solo para delivery, revisar cada sábado" {...field} />
                    </FormControl>
                    <FormDescription className="text-xs sm:text-xs leading-relaxed text-slate-600">Notas para el equipo: condiciones especiales, frecuencia de uso, instrucciones de almacenamiento.</FormDescription>
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

        <DialogFooter className="flex-shrink-0 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-6 sm:px-6 pt-4 border-t bg-white dark:bg-slate-900/70 shadow-[0_-4px_12px_-2px_rgba(0,0,0,0.08)] gap-3 flex-col-reverse sm:flex-row">
          <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto h-12 text-base font-semibold rounded-xl">
            Cancelar
          </Button>
          <Button type="submit" onClick={form.handleSubmit(onSubmit)} className="w-full sm:w-auto h-12 text-base font-bold rounded-xl bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg">
            Guardar Artículo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
