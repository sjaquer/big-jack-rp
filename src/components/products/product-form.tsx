
'use client';
import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import type { Product, Ingredient, ProductIngredient, ProductCategory } from '@/lib/types';
import { PRODUCT_CATEGORY_LABELS } from '@/lib/types';
import { PlusCircle, Trash2 } from 'lucide-react';
import { Label } from '@/components/ui/label';


const ingredientSchema = z.object({
  ingredientId: z.string().min(1, 'El ingrediente es requerido.'),
  quantity: z.coerce.number().min(0.01, 'La cantidad debe ser mayor a 0.'),
  unit: z.string().min(1, 'La unidad es requerida.'),
});

const formSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido.'),
  sku: z.string().optional(),
  salePrice: z.coerce.number().min(0, 'El precio de venta debe ser positivo.'),
  category: z.string().min(1, 'La categoría es obligatoria.'),
  ingredients: z.array(ingredientSchema).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  ingredients: Ingredient[];
}

const ingredientUnits = ['g', 'ml', 'unidad'];
const categoryOptions = Object.entries(PRODUCT_CATEGORY_LABELS) as Array<[
  ProductCategory,
  string
]>;

function generateProductSKU(name: string): string {
  if (!name) return '';
  const namePart = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 3)
    .padEnd(3, 'X');
  const timestamp = Date.now().toString(36).slice(-4).toUpperCase();
  return `PRD-${namePart}-${timestamp}`;
}

export function ProductForm({ isOpen, onClose, product, ingredients }: ProductFormProps) {
  const firestore = useFirestore();
  const [selectedIngredient, setSelectedIngredient] = useState('');
  // Image fields removed: POS no longer uses product images.


  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      sku: '',
      salePrice: 0,
      category: 'otros',
      ingredients: [],
    },
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "ingredients"
  });

  useEffect(() => {
    const subscription = form.watch((value, { name: fieldName }) => {
      if (!product && fieldName === 'name') {
        const currentSKU = form.getValues('sku');
        const currentName = form.getValues('name');
        
        if (currentName && (!currentSKU || currentSKU === '' || currentSKU.startsWith('PRD-'))) {
          const newSKU = generateProductSKU(currentName);
          form.setValue('sku', newSKU, { shouldValidate: false });
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [product, form]);

  useEffect(() => {
        if (isOpen) {
        if (product) {
        form.reset({
          name: product.name,
          sku: product.sku,
          salePrice: product.salePrice,
          category: product.category ?? 'otros',
          ingredients: product.ingredients || [],
        });
        } else {
        const defaultSKU = generateProductSKU('');
        form.reset({
            name: '',
            sku: defaultSKU,
            salePrice: 0,
            category: 'otros',
            ingredients: [],
        });
        }
        setSelectedIngredient('');
    }
  }, [product, form, isOpen]);

  const handleAddIngredient = () => {
    const ingredient = ingredients.find(i => i.id === selectedIngredient);
    if (ingredient) {
        append({ ingredientId: ingredient.id, quantity: 1, unit: ingredient.unit });
        setSelectedIngredient('');
    }
  }

  // image upload handlers removed

  async function onSubmit(values: FormValues) {
    const data = { 
      name: values.name,
      sku: values.sku || null,
      salePrice: values.salePrice,
      category: values.category as ProductCategory,
      ingredients: values.ingredients || [],
      updatedAt: new Date().toISOString(),
    };

    if (product) {
      const productDocRef = doc(firestore, 'products', product.id);
      updateDocumentNonBlocking(productDocRef, data);
    } else {
      const productsCollectionRef = collection(firestore, 'products');
      addDocumentNonBlocking(productsCollectionRef, { ...data, createdAt: new Date().toISOString() });
    }
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-[min(100vw,1100px)] h-[100dvh] sm:h-[min(92vh,820px)] p-0 flex flex-col overflow-hidden rounded-none sm:rounded-2xl shadow-2xl border-0 sm:border">
        <DialogHeader className="px-4 pt-5 sm:px-6 sm:pt-6 pb-4 flex-shrink-0 border-b bg-white dark:bg-slate-900/70">
          <DialogTitle className="font-headline text-xl sm:text-2xl font-bold text-foreground">{product ? 'Editar Producto' : 'Añadir Nuevo Producto'}</DialogTitle>
          <DialogDescription className="text-sm">
            {product ? 'Actualiza los detalles y la receta del producto.' : 'Completa los detalles para añadir un nuevo producto al inventario.'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-hidden min-h-0">
          <ScrollArea className="h-full px-4 sm:px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))]" type="always">
            <ScrollBar className="z-50" />
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 sm:space-y-6 py-4 pr-2 sm:pr-2">
                <section className="space-y-4 rounded-xl border bg-muted/30 p-3 sm:p-5 shadow-sm">
                  <div>
                    <h3 className="font-semibold text-base sm:text-lg">Información del producto</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">Define los detalles básicos de tu producto para el menú.</p>
                  </div>
                  <div className="grid gap-4 grid-cols-1">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm sm:text-base font-medium">Nombre del Producto</FormLabel>
                          <FormControl>
                            <Input className="h-12 sm:h-11 text-base rounded-lg" placeholder="Ej. Big Jack Clásica" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="sku"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm sm:text-base font-medium">Código SKU</FormLabel>
                          <FormControl>
                            <Input className="h-12 sm:h-11 text-base bg-muted rounded-lg" placeholder="Ej. PRD-BIG-A1B2" {...field} readOnly />
                          </FormControl>
                          <p className="text-xs leading-relaxed text-muted-foreground mt-1">Generado automáticamente al escribir el nombre</p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="salePrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm sm:text-base font-medium">Precio de Venta (S/)</FormLabel>
                          <FormControl>
                            <Input className="h-12 sm:h-11 text-base rounded-lg" type="number" step="0.01" placeholder="Ej. 25.00" {...field} />
                          </FormControl>
                          <p className="text-xs leading-relaxed text-muted-foreground mt-1">Precio que aparecerá en el menú para los clientes</p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm sm:text-base font-medium">Categoría</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-12 sm:h-11 text-base rounded-lg">
                                <SelectValue placeholder="Selecciona una categoría" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categoryOptions.map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* Imagen eliminada: POS ahora muestra solo nombre y precio */}
                  </div>
                </section>
                <section className="space-y-4 rounded-xl border bg-muted/30 p-3 sm:p-5 shadow-sm">
                  <div>
                    <h3 className="font-semibold text-base sm:text-lg">Receta / Ingredientes</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">Define los ingredientes que componen este producto para calcular costos. (Opcional)</p>
                  </div>
                  
                  {fields.length > 0 && (
                    <div className="space-y-3">
                      {fields.map((field, index) => {
                        const ingredient = ingredients.find(i => i.id === field.ingredientId);
                        return (
                          <div key={field.id} className="grid gap-3 sm:grid-cols-[1.2fr_auto_auto_auto] items-start p-3 rounded-lg border bg-muted/30">
                            <div className="min-w-0">
                              <p className="font-medium text-sm sm:text-base leading-tight">{ingredient?.name}</p>
                              <p className="text-xs text-muted-foreground">Stock: {ingredient?.quantity || 0} {ingredient?.unit}</p>
                            </div>
                            <FormField
                              control={form.control}
                              name={`ingredients.${index}.quantity`}
                              render={({ field }) => (
                                <FormItem className="w-full sm:w-24">
                                  <FormLabel className="text-xs font-medium">Cantidad</FormLabel>
                                  <Input type="number" step="0.1" {...field} className="h-12 sm:h-10 text-base rounded-lg" />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`ingredients.${index}.unit`}
                              render={({ field }) => (
                                <FormItem className="w-full sm:w-24">
                                  <FormLabel className="text-xs font-medium">Unidad</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger className="h-12 sm:h-10 text-base rounded-lg">
                                        <SelectValue placeholder="Unidad"/>
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {ingredientUnits.map(unit => <SelectItem key={unit} value={unit}>{unit.toUpperCase()}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                </FormItem>
                              )}
                            />
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => remove(index)} 
                              className="text-destructive hover:text-destructive h-12 w-12 sm:h-10 sm:w-10 sm:mt-6"
                              aria-label="Eliminar ingrediente"
                            >
                              <Trash2 className="h-5 w-5 sm:h-4 sm:w-4" />
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  
                  {fields.length === 0 && (
                    <div className="text-center py-6 border-2 border-dashed rounded-lg bg-muted/20">
                      <p className="text-sm text-muted-foreground">No hay ingredientes agregados</p>
                      <p className="text-xs text-muted-foreground mt-1">Agrega ingredientes para definir la receta</p>
                    </div>
                  )}
                  
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
                    <div className="flex-grow">
                      <Label className="text-sm font-medium mb-1.5 block">Añadir Ingrediente</Label>
                      <Select onValueChange={setSelectedIngredient} value={selectedIngredient}>
                        <SelectTrigger className="h-12 sm:h-10 text-base rounded-lg">
                          <SelectValue placeholder="Selecciona un ingrediente" />
                        </SelectTrigger>
                        <SelectContent>
                          {ingredients.filter(i => !fields.some(f => f.ingredientId === i.id)).map((ingredient) => (
                            <SelectItem key={ingredient.id} value={ingredient.id}>
                              {ingredient.name} ({ingredient.quantity} {ingredient.unit})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleAddIngredient} 
                      disabled={!selectedIngredient}
                      className="h-12 sm:h-10 w-full sm:w-auto rounded-lg"
                    >
                      <PlusCircle className="mr-2 h-5 w-5 sm:h-4 sm:w-4"/>
                      Agregar
                    </Button>
                  </div>
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
            Guardar Producto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
