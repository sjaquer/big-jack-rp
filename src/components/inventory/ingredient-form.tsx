'use client';
import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import type { Ingredient } from '@/lib/types';
import { CalendarIcon, Plus, Trash2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';

const providerSchema = z.object({
  name: z.string().min(1, 'El nombre del proveedor es requerido.'),
  price: z.coerce.number().min(0, 'El precio debe ser positivo.'),
});

const ingredientUnits = ['kg', 'g', 'l', 'ml', 'unidad', 'paquete'];
const ingredientCategories = [
  { value: 'protein', label: 'Proteína', prefix: 'PRO' },
  { value: 'vegetable', label: 'Vegetales Frescos', prefix: 'VEG' },
  { value: 'dairy', label: 'Lácteos', prefix: 'LAC' },
  { value: 'sauce', label: 'Salsas y Aderezos', prefix: 'SAL' },
  { value: 'bakery', label: 'Panadería', prefix: 'PAN' },
  { value: 'other', label: 'Otros', prefix: 'OTR' },
];

function generateSKU(name: string, category?: string): string {
  if (!name) return '';
  const categoryPrefix = ingredientCategories.find(c => c.value === category)?.prefix ?? 'ING';
  const namePart = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 3)
    .padEnd(3, 'X');
  const timestamp = Date.now().toString(36).slice(-4).toUpperCase();
  return `${categoryPrefix}-${namePart}-${timestamp}`;
}

const formSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido.'),
  sku: z.string().optional(),
  category: z.enum(['protein', 'vegetable', 'dairy', 'sauce', 'bakery', 'other']).optional(),
  quantity: z.coerce.number().min(0, 'La cantidad debe ser un número positivo.'),
  unit: z.string().min(1, 'La unidad es requerida.'),
  cost: z.coerce.number().min(0, 'El costo debe ser un número positivo.'),
  minimumStock: z.coerce.number().min(0, 'El stock mínimo debe ser positivo.').optional(),
  storageLocation: z.string().optional(),
  reorderLeadTimeDays: z.coerce.number().min(0, 'Los días de reposición deben ser positivos.').optional(),
  notes: z.string().max(400, 'Máximo 400 caracteres.').optional(),
  expiryDate: z.date().optional(),
  providers: z.array(providerSchema).min(1, 'Agrega al menos un proveedor.'),
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
      sku: '',
      category: 'protein',
      quantity: 0,
      unit: ingredientUnits[0],
      cost: 0,
      minimumStock: 0,
      storageLocation: '',
      reorderLeadTimeDays: 2,
      notes: '',
      providers: [{ name: '', price: 0 }],
    },
  });

  const { fields: providerFields, append: appendProvider, remove: removeProvider } = useFieldArray({
    control: form.control,
    name: 'providers',
  });

  useEffect(() => {
    const subscription = form.watch((value, { name: fieldName }) => {
      if (!ingredient && (fieldName === 'name' || fieldName === 'category')) {
        const currentSKU = form.getValues('sku');
        const currentName = form.getValues('name');
        const currentCategory = form.getValues('category');
        
        if (currentName && (!currentSKU || currentSKU === '' || currentSKU.startsWith('ING-') || currentSKU.startsWith('PRO-') || currentSKU.startsWith('VEG-') || currentSKU.startsWith('LAC-') || currentSKU.startsWith('SAL-') || currentSKU.startsWith('PAN-') || currentSKU.startsWith('OTR-'))) {
          const newSKU = generateSKU(currentName, currentCategory);
          form.setValue('sku', newSKU, { shouldValidate: false });
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [ingredient, form]);

  useEffect(() => {
    if (ingredient) {
      form.reset({
        name: ingredient.name,
        sku: ingredient.sku ?? '',
        category: ingredient.category ?? 'protein',
        quantity: ingredient.quantity,
        unit: ingredient.unit ?? ingredientUnits[0],
        cost: ingredient.cost,
        minimumStock: ingredient.minimumStock,
        storageLocation: ingredient.storageLocation ?? '',
        reorderLeadTimeDays: ingredient.reorderLeadTimeDays ?? 2,
        notes: ingredient.notes ?? '',
        expiryDate: ingredient.expiryDate ? new Date(ingredient.expiryDate) : undefined,
        providers: ingredient.providers?.length ? ingredient.providers : [{ name: '', price: 0 }],
      });
    } else {
      const defaultSKU = generateSKU('', 'protein');
      form.reset({
        name: '',
        sku: defaultSKU,
        category: 'protein',
        quantity: 0,
        unit: ingredientUnits[0],
        cost: 0,
        minimumStock: 0,
        expiryDate: undefined,
        storageLocation: '',
        reorderLeadTimeDays: 2,
        notes: '',
        providers: [{ name: '', price: 0 }],
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
      <DialogContent className="w-full max-w-[100vw] h-[100dvh] sm:h-[80vh] sm:max-w-2xl p-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-4 pt-4 sm:px-6 sm:pt-6 flex-shrink-0">
          <DialogTitle className="font-headline text-lg sm:text-xl">{ingredient ? 'Editar Ingrediente' : 'Añadir Nuevo Ingrediente'}</DialogTitle>
          <DialogDescription className="text-sm">
            {ingredient ? 'Actualiza los detalles del ingrediente.' : 'Completa los detalles para añadir un nuevo ingrediente.'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-hidden min-h-0 sm:min-h-[400px]">
          <ScrollArea className="h-full px-4 sm:px-6" type="always">
            <ScrollBar className="z-50" />
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4 pr-3">
            <section className="space-y-4 rounded-lg border p-3 sm:p-4">
              <div>
                <h3 className="font-semibold text-base sm:text-lg">Información del ingrediente</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">Define cómo identificarás este insumo dentro del inventario de la hamburguesería.</p>
              </div>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base">Nombre del Ingrediente</FormLabel>
                      <FormControl>
                        <Input className="h-11 sm:h-10 text-base" placeholder="e.g., Tomate Roma" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">Usa el mismo nombre que figura en tus fichas técnicas.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base">Código interno / SKU</FormLabel>
                      <FormControl>
                        <Input className="h-11 sm:h-10 text-base" placeholder="e.g., ING-TMT-001" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">Facilita conciliaciones rápidas entre proveedores y almacén.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base">Familia</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? 'protein'}>
                        <FormControl>
                          <SelectTrigger className="h-11 sm:h-10 text-base">
                            <SelectValue placeholder="Selecciona una categoría" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ingredientCategories.map((option) => (
                            <SelectItem key={option.value} value={option.value} className="py-3 sm:py-2">
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="storageLocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base">Ubicación de almacenamiento</FormLabel>
                      <FormControl>
                        <Input className="h-11 sm:h-10 text-base" placeholder="e.g., Cámara fría #2" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">Describe dónde encontrarlo (cámara, congelador, despensa).</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            <section className="space-y-4 rounded-lg border p-3 sm:p-4">
              <div>
                <h3 className="font-semibold text-base sm:text-lg">Control de inventario</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">Establece las cantidades con las que operas día a día.</p>
              </div>
              <div className="grid gap-4 grid-cols-2 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base">Cantidad en stock</FormLabel>
                      <FormControl>
                        <Input className="h-11 sm:h-10 text-base" type="number" placeholder="e.g., 50" {...field} />
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
                      <FormLabel className="text-sm sm:text-base">Unidad</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-11 sm:h-10 text-base">
                            <SelectValue placeholder="Selecciona una unidad" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ingredientUnits.map((unit) => (
                            <SelectItem key={unit} value={unit} className="py-3 sm:py-2">
                              {unit.toUpperCase()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="minimumStock"
                  render={({ field }) => (
                    <FormItem className="col-span-2 sm:col-span-1">
                      <FormLabel className="text-sm sm:text-base">Stock mínimo</FormLabel>
                      <FormControl>
                        <Input className="h-11 sm:h-10 text-base" type="number" placeholder="e.g., 5" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">Recibirás alertas visuales cuando el stock baje de este valor.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid gap-4 grid-cols-2 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base">Costo objetivo (S/)</FormLabel>
                      <FormControl>
                        <Input className="h-11 sm:h-10 text-base" type="number" step="0.01" placeholder="e.g., 2.50" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">Utiliza el costo promedio que esperas pagar.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="reorderLeadTimeDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base">Días de reposición</FormLabel>
                      <FormControl>
                        <Input className="h-11 sm:h-10 text-base" type="number" placeholder="e.g., 2" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">Tiempo habitual para recibir el pedido desde la compra.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="expiryDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col col-span-2 sm:col-span-1">
                      <FormLabel className="text-sm sm:text-base">Fecha de vencimiento</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full h-11 sm:h-10 justify-between pl-3 text-left font-normal text-base",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Elige una fecha</span>
                              )}
                              <CalendarIcon className="ml-2 h-5 w-5 sm:h-4 sm:w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription className="text-xs">Ideal para perecibles como vegetales o pan.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            <section className="space-y-4 rounded-lg border p-3 sm:p-4">
            <FormField
              control={form.control}
              name="providers"
              render={() => (
                <FormItem>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <FormLabel className="mb-0 text-base sm:text-lg font-semibold">Proveedores y tarifas</FormLabel>
                      <FormDescription className="text-xs">Registra varios proveedores para comparar precios rápidamente.</FormDescription>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="default"
                      className="h-11 sm:h-10 w-full sm:w-auto text-base"
                      onClick={() => appendProvider({ name: '', price: 0 })}
                    >
                      <Plus className="mr-2 h-5 w-5 sm:h-4 sm:w-4" /> Añadir proveedor
                    </Button>
                  </div>
                  <div className="space-y-3 mt-4">
                    {providerFields.map((provider, index) => (
                      <div
                        key={provider.id}
                        className="grid gap-3 rounded-md border p-3 sm:p-4 grid-cols-1 sm:grid-cols-[1fr_140px_auto]"
                      >
                        <FormField
                          control={form.control}
                          name={`providers.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm">Nombre del Proveedor</FormLabel>
                              <FormControl>
                                <Input className="h-11 sm:h-10 text-base" placeholder="e.g., Proveedor A" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`providers.${index}.price`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm">Precio (S/)</FormLabel>
                              <FormControl>
                                <Input className="h-11 sm:h-10 text-base" type="number" step="0.01" placeholder="e.g., 2.40" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex items-end justify-end sm:justify-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-11 w-11 sm:h-10 sm:w-10"
                            onClick={() => removeProvider(index)}
                            disabled={providerFields.length === 1}
                            aria-label="Eliminar proveedor"
                          >
                            <Trash2 className="h-5 w-5 sm:h-4 sm:w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            </section>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm sm:text-base">Notas internas</FormLabel>
                  <FormControl>
                    <Textarea className="text-base min-h-[100px]" rows={3} placeholder="e.g., Usar solo para la burger premium, rotar cada 48h" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
              </form>
            </Form>
          </ScrollArea>
        </div>

        <DialogFooter className="flex-shrink-0 px-4 pb-4 sm:px-6 sm:pb-6 pt-4 border-t gap-3 sm:gap-2">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1 sm:flex-none h-12 sm:h-10 text-base">
            Cancelar
          </Button>
          <Button type="submit" onClick={form.handleSubmit(onSubmit)} className="flex-1 sm:flex-none h-12 sm:h-10 text-base">
            Guardar Ingrediente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
