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
    pricePerUnit: z.coerce.number().min(0, 'El precio unitario debe ser positivo.'),
  });const ingredientUnits = ['kg', 'g', 'l', 'ml', 'unidad', 'paquete'];
const ingredientCategories = [
  { value: 'protein', label: 'Proteína', prefix: 'PRO' },
  { value: 'vegetable', label: 'Vegetales Frescos', prefix: 'VEG' },
  { value: 'dairy', label: 'Lácteos', prefix: 'LAC' },
  { value: 'sauce', label: 'Salsas y Aderezos', prefix: 'SAL' },
  { value: 'bakery', label: 'Panadería', prefix: 'PAN' },
  { value: 'additional', label: 'Adicionales', prefix: 'ADD' },
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
  category: z.enum(['protein', 'vegetable', 'dairy', 'sauce', 'bakery', 'additional', 'other']).optional(),
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
      providers: [{ name: '', pricePerUnit: 0 }],
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
        
        if (currentName && (!currentSKU || currentSKU === '' || currentSKU.startsWith('ING-') || currentSKU.startsWith('PRO-') || currentSKU.startsWith('VEG-') || currentSKU.startsWith('LAC-') || currentSKU.startsWith('SAL-') || currentSKU.startsWith('PAN-') || currentSKU.startsWith('ADD-') || currentSKU.startsWith('OTR-'))) {
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
        providers: ingredient.providers?.length ? ingredient.providers.map(p => ({
          name: p.name,
          pricePerUnit: p.pricePerUnit,
        })) : [{ name: '', pricePerUnit: 0 }],
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
        providers: [{ name: '', pricePerUnit: 0 }],
      });
    }
  }, [ingredient, form, isOpen]);

  async function onSubmit(values: FormValues) {
    // Preparar todos los datos asegurando que los campos opcionales se guarden correctamente
    const data = { 
        name: values.name,
        sku: values.sku || null,
        category: values.category || null,
        quantity: values.quantity,
        unit: values.unit,
        cost: values.cost,
        minimumStock: values.minimumStock || 0,
        storageLocation: values.storageLocation || null,
        reorderLeadTimeDays: values.reorderLeadTimeDays || null,
        notes: values.notes || null,
        expiryDate: values.expiryDate ? values.expiryDate.toISOString() : null,
        providers: values.providers || [],
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
      <DialogContent className="w-full max-w-[100vw] h-[100dvh] sm:h-[75vh] sm:max-w-2xl p-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-4 pt-4 sm:px-6 sm:pt-6 flex-shrink-0">
          <DialogTitle className="font-headline text-lg sm:text-xl">{ingredient ? 'Editar Ingrediente' : 'Añadir Nuevo Ingrediente'}</DialogTitle>
          <DialogDescription className="text-sm">
            {ingredient ? 'Actualiza los detalles del ingrediente.' : 'Completa los detalles para añadir un nuevo ingrediente.'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-hidden min-h-0 sm:min-h-[200px]">
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
                        <Input className="h-11 sm:h-10 text-base" placeholder="Se genera automáticamente al escribir el nombre" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">Identificador interno único. Se genera automáticamente, pero puedes editarlo para usar un código específico del negocio.</FormDescription>
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
                        <Input className="h-11 sm:h-10 text-base" placeholder="e.g., Cámara fría #2, Estante 3" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">Indica exactamente dónde se guarda (ej.: cámara fría #2, estante 3). Facilita el acceso rápido por parte del equipo.</FormDescription>
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
                        <Input className="h-11 sm:h-10 text-base" type="number" placeholder="Cantidad disponible actualmente (ej.: 50)" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">Cantidad disponible en inventario. Para ingredientes a granel, utiliza la unidad seleccionada en 'Unidad'.</FormDescription>
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
                      <FormDescription className="text-xs">Unidad en la que se registra la cantidad (kg, g, l, ml, unidad, paquete). Usa la misma unidad que usas al comprar al proveedor.</FormDescription>
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
                        <Input className="h-11 sm:h-10 text-base" type="number" placeholder="Cantidad mínima para operar (ej.: 5)" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">Nivel mínimo operativo. Cuando el inventario baje de este valor, deberías programar una reposición.</FormDescription>
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
                      <FormLabel className="text-sm sm:text-base">Costo objetivo por unidad (S/)</FormLabel>
                      <FormControl>
                        <Input className="h-11 sm:h-10 text-base" type="number" step="0.01" placeholder="Precio estimado por unidad (ej.: 2.50)" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">Precio promedio esperado por unidad. Sirve como referencia para calcular márgenes y comparar con los proveedores.</FormDescription>
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
                        <Input className="h-11 sm:h-10 text-base" type="number" placeholder="Tiempo en días para recibir nuevo stock (ej.: 2)" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">Número de días que suele tardar el proveedor en entregar desde que se realiza el pedido. Útil para planificar compras.</FormDescription>
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
                      onClick={() => appendProvider({ name: '', pricePerUnit: 0 })}
                    >
                      <Plus className="mr-2 h-5 w-5 sm:h-4 sm:w-4" /> Añadir proveedor
                    </Button>
                  </div>
                  <div className="space-y-3 mt-4">
                    {providerFields.map((provider, index) => (
                      <div
                        key={provider.id}
                        className="rounded-md border p-3 sm:p-4 space-y-3"
                      >
                        <div className="grid gap-3 grid-cols-1">
                          <div className="flex items-start justify-between gap-2">
                            <FormField
                              control={form.control}
                              name={`providers.${index}.name`}
                              render={({ field }) => (
                                <FormItem className="flex-1">
                                  <FormLabel className="text-sm">Proveedor</FormLabel>
                                  <FormControl>
                                    <Input className="h-11 sm:h-10 text-base" placeholder="e.g., Distribuidora S.A." {...field} />
                                  </FormControl>
                                  <FormDescription className="text-xs">Nombre del proveedor o distribuidor. Útil para comparar tarifas y tiempos de entrega.</FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-11 w-11 sm:h-10 sm:w-10 mt-7"
                              onClick={() => removeProvider(index)}
                              disabled={providerFields.length === 1}
                              aria-label="Eliminar proveedor"
                            >
                              <Trash2 className="h-5 w-5 sm:h-4 sm:w-4" />
                            </Button>
                          </div>
                          <FormField
                            control={form.control}
                            name={`providers.${index}.pricePerUnit`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm">Precio Unitario (S/ por {form.watch('unit')})</FormLabel>
                                <FormControl>
                                  <Input className="h-11 sm:h-10 text-base" type="number" step="0.01" placeholder="e.g., 2.40" {...field} />
                                </FormControl>
                                <FormDescription className="text-xs">Precio que cobra el proveedor por cada unidad</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          {form.watch(`providers.${index}.pricePerUnit`) > 0 && form.watch('quantity') > 0 && (
                            <div className="p-3 bg-muted/50 rounded-md border">
                              <p className="text-sm text-muted-foreground">
                                <span className="font-medium">Costo total por {form.watch('quantity')} {form.watch('unit')}:</span>{' '}
                                <span className="text-foreground font-semibold text-base">
                                  S/ {(form.watch(`providers.${index}.pricePerUnit`) * form.watch('quantity')).toFixed(2)}
                                </span>
                              </p>
                            </div>
                          )}
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
            <div className="h-4" />
          </ScrollArea>
        </div>

        <DialogFooter className="flex-shrink-0 px-4 pb-5 sm:px-6 sm:pb-6 pt-4 border-t bg-background shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] gap-3 sm:gap-2">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1 sm:flex-none h-12 sm:h-10 text-base font-medium">
            Cancelar
          </Button>
          <Button type="submit" onClick={form.handleSubmit(onSubmit)} className="flex-1 sm:flex-none h-12 sm:h-10 text-base font-semibold bg-primary hover:bg-primary/90">
            Guardar Ingrediente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
