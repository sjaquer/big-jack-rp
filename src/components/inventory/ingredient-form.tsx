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
    totalPrice: z.coerce.number().optional(),
    purchaseQuantity: z.coerce.number().optional(),
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

function toFiniteNumber(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  const parsed = Number.parseFloat(String(value ?? ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value: unknown, maxDecimals: number, minDecimals: number = 2): string {
  const num = toFiniteNumber(value);
  return num.toLocaleString('en-US', {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
  });
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
      providers: [{ name: '', pricePerUnit: 0, totalPrice: 0, purchaseQuantity: 0 }],
    },
  });

  const { fields: providerFields, append: appendProvider, remove: removeProvider } = useFieldArray({
    control: form.control,
    name: 'providers',
  });

  useEffect(() => {
    // Actualizar cantidad inicial y costo cuando se agrega el primer proveedor (solo para ingredientes nuevos)
    if (!ingredient) {
      const subscription = form.watch((value, { name: fieldName }) => {
        // Actualizar cantidad inicial con la cantidad comprada del primer proveedor
        if (fieldName === 'providers.0.purchaseQuantity') {
          const purchaseQty = value.providers?.[0]?.purchaseQuantity;
          if (purchaseQty && purchaseQty > 0) {
            form.setValue('quantity', purchaseQty, { shouldValidate: false });
          }
        }
        // Actualizar costo con el precio del primer proveedor
        if (fieldName === 'providers.0.pricePerUnit') {
          const pricePerUnit = value.providers?.[0]?.pricePerUnit;
          if (pricePerUnit && pricePerUnit > 0) {
            form.setValue('cost', pricePerUnit, { shouldValidate: false });
          }
        }
      });
      return () => subscription.unsubscribe();
    }
  }, [ingredient, form]);

  useEffect(() => {
    // Actualizar costo promedio automáticamente cuando cambia el precio del primer proveedor (solo para ediciones)
    if (ingredient) {
      const subscription = form.watch((value, { name: fieldName }) => {
        if (fieldName?.startsWith('providers.0.pricePerUnit')) {
          const pricePerUnit = value.providers?.[0]?.pricePerUnit;
          if (pricePerUnit && pricePerUnit > 0) {
            form.setValue('cost', pricePerUnit, { shouldValidate: false });
          }
        }
      });
      return () => subscription.unsubscribe();
    }
  }, [ingredient, form]);

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
          totalPrice: (p as any).totalPrice || 0,
          purchaseQuantity: (p as any).purchaseQuantity || 0,
        })) : [{ name: '', pricePerUnit: 0, totalPrice: 0, purchaseQuantity: 0 }],
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
        providers: [{ name: '', pricePerUnit: 0, totalPrice: 0, purchaseQuantity: 0 }],
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
      <DialogContent className="w-full max-w-[min(100vw,1100px)] h-[100dvh] sm:h-[min(92vh,900px)] p-0 flex flex-col overflow-hidden rounded-none sm:rounded-2xl shadow-2xl border-0 sm:border">
        <DialogHeader className="px-4 pt-5 sm:px-6 sm:pt-6 pb-4 flex-shrink-0 border-b bg-white dark:bg-slate-900/70">
          <DialogTitle className="font-headline text-xl sm:text-2xl font-bold text-foreground">{ingredient ? 'Editar Ingrediente' : 'Añadir Nuevo Ingrediente'}</DialogTitle>
          <DialogDescription className="text-sm">
            {ingredient ? 'Actualiza los detalles del ingrediente.' : 'Completa los detalles para añadir un nuevo ingrediente.'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-hidden min-h-0">
          <ScrollArea className="h-full px-4 sm:px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))]" type="always">
            <ScrollBar className="z-50" />
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 sm:space-y-6 py-4 pr-2 sm:pr-2">
            <section className="space-y-4 rounded-xl border bg-muted/30 p-3 sm:p-5 shadow-sm">
              <div>
                <h3 className="font-semibold text-base sm:text-lg">Información del ingrediente</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">Define cómo identificarás este insumo dentro del inventario de la hamburguesería.</p>
              </div>
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base font-medium">Nombre del Ingrediente</FormLabel>
                      <FormControl>
                        <Input className="h-12 sm:h-11 text-base rounded-lg" placeholder="e.g., Tomate Roma" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs sm:text-xs leading-relaxed text-slate-600">Usa el mismo nombre que figura en tus fichas técnicas.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base font-medium">Código interno / SKU</FormLabel>
                      <FormControl>
                        <Input 
                          className="h-12 sm:h-11 text-base rounded-lg bg-muted/50" 
                          placeholder="Se genera automáticamente" 
                          readOnly
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription className="text-xs sm:text-xs leading-relaxed text-slate-600">Identificador único generado automáticamente.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base">Familia</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? 'protein'}>
                        <FormControl>
                          <SelectTrigger className="h-12 sm:h-11 text-base rounded-lg">
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
                      <FormLabel className="text-sm sm:text-base font-medium">Ubicación de almacenamiento</FormLabel>
                      <FormControl>
                        <Input className="h-12 sm:h-11 text-base rounded-lg" placeholder="Ej. Cámara fría #2" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs sm:text-xs leading-relaxed text-slate-600">Dónde se guarda este ingrediente para acceso rápido del equipo.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            <section className="space-y-4 rounded-xl border bg-muted/30 p-3 sm:p-5 shadow-sm">
              <div>
                <h3 className="font-semibold text-base sm:text-lg">Control de inventario</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">Establece las cantidades con las que operas día a día.</p>
              </div>
              <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base font-medium">
                        {ingredient ? 'Cantidad en stock actual' : 'Cantidad inicial'}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          className={cn(
                            "h-12 sm:h-11 text-base rounded-lg font-semibold",
                            !ingredient && "bg-muted/50"
                          )}
                          type="number" 
                          placeholder={ingredient ? "Ej. 50" : "Se completa automáticamente"}
                          readOnly={!ingredient}
                          value={field.value ?? ''}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormDescription className="text-xs sm:text-xs leading-relaxed text-slate-600">
                        {ingredient 
                          ? 'Stock actual. Usa el botón "Añadir al stock" en proveedores para actualizar.' 
                          : '✓ Se establece automáticamente con la cantidad comprada.'}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base font-medium">Unidad</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ingredientUnits[0]}>
                        <FormControl>
                          <SelectTrigger className="h-12 sm:h-11 text-base rounded-lg">
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
                      <FormDescription className="text-xs sm:text-xs leading-relaxed text-slate-600">Unidad en la que se registra la cantidad (Kg, g, L, ml, unidad, paquete). Usa la misma unidad que usas al comprar al proveedor.</FormDescription>
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
                        <Input className="h-12 sm:h-11 text-base rounded-lg" type="number" placeholder="Ej. 5" value={field.value ?? ''} onChange={field.onChange} />
                      </FormControl>
                      <FormDescription className="text-xs sm:text-xs leading-relaxed text-slate-600">Nivel mínimo operativo. Cuando el inventario baje de este valor, deberías programar una reposición.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base font-medium">Costo promedio por unidad (S/)</FormLabel>
                      <FormControl>
                        <Input 
                          className="h-12 sm:h-11 text-base rounded-lg font-semibold bg-muted/50" 
                          type="number" 
                          step="0.0001" 
                          placeholder="Se calcula automáticamente" 
                          readOnly
                          value={field.value ?? ''}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormDescription className="text-xs sm:text-xs leading-relaxed text-slate-600">
                        Se actualiza automáticamente con el precio del proveedor. Usado para calcular márgenes.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="reorderLeadTimeDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base font-medium">Días de reposición</FormLabel>
                      <FormControl>
                        <Input className="h-12 sm:h-11 text-base rounded-lg" type="number" placeholder="Ej. 2" value={field.value ?? ''} onChange={field.onChange} />
                      </FormControl>
                      <FormDescription className="text-xs sm:text-xs leading-relaxed text-slate-600">Número de días que suele tardar el proveedor en entregar desde que se realiza el pedido. Útil para planificar compras.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="expiryDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-sm sm:text-base font-medium">Fecha de vencimiento</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full h-12 sm:h-11 justify-between pl-3 text-left font-normal text-base rounded-lg",
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
                      <FormDescription className="text-xs sm:text-xs leading-relaxed text-slate-600">Ideal para perecibles como vegetales o pan.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            <section className="space-y-4 rounded-xl border bg-muted/30 p-3 sm:p-5 shadow-sm">
            <FormField
              control={form.control}
              name="providers"
              render={() => (
                <FormItem>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <FormLabel className="mb-0 text-base sm:text-lg font-semibold">Proveedores y tarifas</FormLabel>
                      <FormDescription className="text-xs sm:text-xs leading-relaxed text-slate-600">Registra varios proveedores para comparar precios rápidamente.</FormDescription>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="default"
                      className="h-12 sm:h-11 w-full sm:w-auto text-base rounded-lg"
                      onClick={() => appendProvider({ name: '', pricePerUnit: 0, totalPrice: 0, purchaseQuantity: 0 })}
                    >
                      <Plus className="mr-2 h-5 w-5 sm:h-4 sm:w-4" /> Añadir proveedor
                    </Button>
                  </div>
                  <div className="space-y-3 mt-4">
                    {providerFields.map((provider, index) => {
                      const watchedPricePerUnit = toFiniteNumber(form.watch(`providers.${index}.pricePerUnit`));
                      const watchedTotalPrice = toFiniteNumber(form.watch(`providers.${index}.totalPrice`));
                      const watchedPurchaseQuantity = toFiniteNumber(form.watch(`providers.${index}.purchaseQuantity`));
                      const watchedQuantity = toFiniteNumber(form.watch('quantity'));
                      const watchedUnit = form.watch('unit');

                      return (
                      <div
                        key={provider.id}
                        className="rounded-lg border bg-background p-3 sm:p-4 space-y-3"
                      >
                        <div className="grid gap-3 grid-cols-1">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <FormField
                              control={form.control}
                              name={`providers.${index}.name`}
                              render={({ field }) => (
                                <FormItem className="flex-1">
                                  <FormLabel className="text-sm font-medium">Proveedor</FormLabel>
                                  <FormControl>
                                    <Input className="h-12 sm:h-11 text-base rounded-lg" placeholder="Ej. Distribuidora S.A." {...field} />
                                  </FormControl>
                                  <FormDescription className="text-xs leading-relaxed text-slate-600">Nombre del proveedor o distribuidor.</FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-11 w-11 sm:h-10 sm:w-10 sm:mt-6 self-end"
                              onClick={() => removeProvider(index)}
                              disabled={providerFields.length === 1}
                              aria-label="Eliminar proveedor"
                            >
                              <Trash2 className="h-5 w-5 sm:h-4 sm:w-4" />
                            </Button>
                          </div>

                          {/* Datos de compra al proveedor */}
                          <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
                            <FormField
                              control={form.control}
                              name={`providers.${index}.totalPrice`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-sm font-medium"> Precio Total Pagado (S/)</FormLabel>
                                  <FormControl>
                                    <Input 
                                      className="h-12 sm:h-11 text-base rounded-lg" 
                                      type="number" 
                                      step="0.01" 
                                      placeholder="Ej. 120.00" 
                                      value={field.value ?? ''}
                                      onChange={(e) => {
                                        field.onChange(e);
                                        // Calcular precio unitario automáticamente
                                        const totalPrice = parseFloat(e.target.value) || 0;
                                        const purchaseQuantity = toFiniteNumber(form.watch(`providers.${index}.purchaseQuantity`));
                                        if (totalPrice > 0 && purchaseQuantity > 0) {
                                          const pricePerUnit = totalPrice / purchaseQuantity;
                                          form.setValue(`providers.${index}.pricePerUnit`, Number(pricePerUnit.toFixed(6)));
                                        }
                                      }}
                                    />
                                  </FormControl>
                                  <FormDescription className="text-xs leading-relaxed text-slate-600">¿Cuánto pagaste en total?</FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`providers.${index}.purchaseQuantity`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-sm font-medium"> Cantidad Recibida ({watchedUnit})</FormLabel>
                                  <FormControl>
                                    <Input 
                                      className="h-12 sm:h-11 text-base rounded-lg" 
                                      type="number" 
                                      step="0.01" 
                                      placeholder="Ej. 50" 
                                      value={field.value ?? ''}
                                      onChange={(e) => {
                                        field.onChange(e);
                                        // Calcular precio unitario automáticamente
                                        const purchaseQuantity = parseFloat(e.target.value) || 0;
                                        const totalPrice = toFiniteNumber(form.watch(`providers.${index}.totalPrice`));
                                        if (totalPrice > 0 && purchaseQuantity > 0) {
                                          const pricePerUnit = totalPrice / purchaseQuantity;
                                          form.setValue(`providers.${index}.pricePerUnit`, Number(pricePerUnit.toFixed(6)));
                                        }
                                      }}
                                    />
                                  </FormControl>
                                  <FormDescription className="text-xs leading-relaxed text-slate-600">¿Cuántas unidades compraste?</FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          {/* Precio unitario calculado automáticamente (solo lectura visual) */}
                          {watchedPricePerUnit > 0 && (
                            <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border-2 border-green-200 dark:border-green-800">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-green-900 dark:text-green-100">
                                    ✓ Precio Unitario
                                  </p>
                                  <p className="text-xs text-green-700 dark:text-green-300 mt-0.5">
                                    Calculado automáticamente
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                                    S/ {formatNumber(watchedPricePerUnit, 6, 2)}
                                    <span className="text-sm font-normal ml-1">por {watchedUnit}</span>
                                  </p>
                                  {(watchedUnit === 'g' || watchedUnit === 'ml') && (
                                    <p className="text-xs font-semibold text-green-600 dark:text-green-400 mt-1 bg-green-100 dark:bg-green-900/30 inline-block px-2 py-0.5 rounded">
                                      (Equivale a S/ {formatNumber(watchedPricePerUnit * 1000, 2)} por {watchedUnit === 'g' ? 'kg' : 'L'})
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Botón para añadir al stock */}
                          {ingredient && watchedPurchaseQuantity > 0 && (
                            <Button
                              type="button"
                              variant="default"
                              className="w-full h-12 text-base font-semibold"
                              onClick={() => {
                                const currentStock = watchedQuantity;
                                const purchaseQty = watchedPurchaseQuantity;
                                const newStock = currentStock + purchaseQty;
                                form.setValue('quantity', newStock);
                                
                                // Actualizar el costo promedio
                                const purchasePrice = watchedPricePerUnit;
                                if (purchasePrice > 0) {
                                  form.setValue('cost', purchasePrice);
                                }
                              }}
                            >
                              <Plus className="mr-2 h-5 w-5" />
                              Añadir {watchedPurchaseQuantity} {watchedUnit} al stock
                            </Button>
                          )}

                          {/* Resumen de la compra y stock */}
                          {watchedPricePerUnit > 0 && (
                            <div className="space-y-2">
                              {/* Resumen de la compra actual */}
                              {watchedTotalPrice > 0 && watchedPurchaseQuantity > 0 && (
                                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-800">
                                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                                     Resumen de esta compra:
                                  </p>
                                  <div className="text-xs text-blue-700 dark:text-blue-300 space-y-0.5">
                                    <p>• Cantidad: {watchedPurchaseQuantity} {watchedUnit}</p>
                                    <p>• Total pagado: S/ {formatNumber(watchedTotalPrice, 2)}</p>
                                    <p>• Precio unitario: S/ {formatNumber(watchedPricePerUnit, 4)} por {watchedUnit}</p>
                                  </div>
                                </div>
                              )}
                              
                              {/* Valor del stock total */}
                              {watchedQuantity > 0 && (
                                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-md border border-amber-200 dark:border-amber-800">
                                  <p className="text-sm text-amber-900 dark:text-amber-100">
                                    <span className="font-medium"> Valor total del inventario ({watchedQuantity} {watchedUnit}):</span>{' '}
                                    <span className="font-bold text-base">
                                      S/ {formatNumber(watchedPricePerUnit * watchedQuantity, 2)}
                                    </span>
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      );
                    })}
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
                  <FormLabel className="text-sm sm:text-base font-medium">Notas internas</FormLabel>
                  <FormControl>
                    <Textarea className="text-base min-h-[100px] rounded-lg" rows={3} placeholder="Ej. Usar solo para la burger premium, rotar cada 48h" {...field} />
                  </FormControl>
                  <FormDescription className="text-xs sm:text-xs leading-relaxed text-slate-600">Observaciones o instrucciones adicionales para el equipo.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
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
            Guardar Ingrediente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
