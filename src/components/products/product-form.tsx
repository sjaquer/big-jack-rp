
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
import type { Product, Ingredient, ProductIngredient } from '@/lib/types';
import { PlusCircle, Trash2, Upload, X, Image as ImageIcon } from 'lucide-react';
import { Label } from '@/components/ui/label';
import Image from 'next/image';

const ingredientSchema = z.object({
  ingredientId: z.string().min(1, 'El ingrediente es requerido.'),
  quantity: z.coerce.number().min(0.01, 'La cantidad debe ser mayor a 0.'),
  unit: z.string().min(1, 'La unidad es requerida.'),
});

const formSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido.'),
  sku: z.string().optional(),
  salePrice: z.coerce.number().min(0, 'El precio de venta debe ser positivo.'),
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
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);


  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      sku: '',
      salePrice: 0,
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
            ingredients: product.ingredients || [],
        });
        setImageUrl(product.imageUrl || null);
        } else {
        const defaultSKU = generateProductSKU('');
        form.reset({
            name: '',
            sku: defaultSKU,
            salePrice: 0,
            ingredients: [],
        });
        setImageUrl(null);
        }
        setSelectedIngredient('');
        setImageError(null);
    }
  }, [product, form, isOpen]);

  const handleAddIngredient = () => {
    const ingredient = ingredients.find(i => i.id === selectedIngredient);
    if (ingredient) {
        append({ ingredientId: ingredient.id, quantity: 1, unit: ingredient.unit });
        setSelectedIngredient('');
    }
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    setImageError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al subir la imagen');
      }

      setImageUrl(data.imageUrl);
    } catch (error) {
      console.error('Error al subir imagen:', error);
      setImageError(error instanceof Error ? error.message : 'Error al subir la imagen');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setImageUrl(null);
    setImageError(null);
  };

  async function onSubmit(values: FormValues) {
    const data = { 
        name: values.name,
        sku: values.sku || null,
        salePrice: values.salePrice,
        ingredients: values.ingredients || [],
        imageUrl: imageUrl || null,
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
      <DialogContent className="w-full max-w-[100vw] h-[100dvh] sm:h-[75vh] sm:max-w-2xl p-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-4 pt-4 sm:px-6 sm:pt-6 flex-shrink-0">
          <DialogTitle className="font-headline text-lg sm:text-xl">{product ? 'Editar Producto' : 'Añadir Nuevo Producto'}</DialogTitle>
          <DialogDescription className="text-sm">
            {product ? 'Actualiza los detalles y la receta del producto.' : 'Completa los detalles para añadir un nuevo producto al inventario.'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-hidden min-h-0 sm:min-h-[200px]">
          <ScrollArea className="h-full px-4 sm:px-6" type="always">
            <ScrollBar className="z-50" />
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4 pr-3">
                <section className="space-y-4 rounded-lg border p-3 sm:p-4">
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
                          <FormLabel className="text-sm sm:text-base">Nombre del Producto</FormLabel>
                          <FormControl>
                            <Input className="h-11 sm:h-10 text-base" placeholder="e.g., Big Jack Clásica" {...field} />
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
                          <FormLabel className="text-sm sm:text-base">Código SKU</FormLabel>
                          <FormControl>
                            <Input className="h-11 sm:h-10 text-base bg-muted" placeholder="e.g., PRD-BIG-A1B2" {...field} disabled />
                          </FormControl>
                          <p className="text-xs text-muted-foreground mt-1">Generado automáticamente al escribir el nombre</p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="salePrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm sm:text-base">Precio de Venta (S/)</FormLabel>
                          <FormControl>
                            <Input className="h-11 sm:h-10 text-base" type="number" step="0.01" placeholder="e.g., 25.00" {...field} />
                          </FormControl>
                          <p className="text-xs text-muted-foreground mt-1">Precio que aparecerá en el menú para los clientes</p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* Sección de imagen */}
                    <div className="space-y-3">
                      <Label className="text-sm sm:text-base">Imagen del Producto</Label>
                      <p className="text-xs text-muted-foreground">Sube una imagen del producto para mostrar en el menú (opcional)</p>
                      
                      {imageUrl ? (
                        <div className="relative w-full aspect-video max-w-sm rounded-lg border overflow-hidden bg-muted">
                          <Image
                            src={imageUrl}
                            alt="Imagen del producto"
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, 384px"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 h-8 w-8"
                            onClick={handleRemoveImage}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="w-full">
                          <label
                            htmlFor="image-upload"
                            className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              {isUploadingImage ? (
                                <div className="text-sm text-muted-foreground">Subiendo imagen...</div>
                              ) : (
                                <>
                                  <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                                  <p className="text-sm text-muted-foreground">
                                    <span className="font-semibold">Click para subir</span> o arrastra la imagen
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WebP o GIF (máx. 5MB)</p>
                                </>
                              )}
                            </div>
                            <input
                              id="image-upload"
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={handleImageUpload}
                              disabled={isUploadingImage}
                            />
                          </label>
                        </div>
                      )}
                      
                      {imageError && (
                        <p className="text-sm text-destructive">{imageError}</p>
                      )}
                    </div>
                  </div>
                </section>
                <section className="space-y-4 rounded-lg border p-3 sm:p-4">
                  <div>
                    <h3 className="font-semibold text-base sm:text-lg">Receta / Ingredientes</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">Define los ingredientes que componen este producto para calcular costos. (Opcional)</p>
                  </div>
                  
                  {fields.length > 0 && (
                    <div className="space-y-2">
                      {fields.map((field, index) => {
                        const ingredient = ingredients.find(i => i.id === field.ingredientId);
                        return (
                          <div key={field.id} className="flex items-center gap-2 p-3 rounded-md border bg-muted/30">
                            <div className="flex-grow">
                              <p className="font-medium text-sm sm:text-base">{ingredient?.name}</p>
                              <p className="text-xs text-muted-foreground">Stock: {ingredient?.quantity || 0} {ingredient?.unit}</p>
                            </div>
                            <FormField
                              control={form.control}
                              name={`ingredients.${index}.quantity`}
                              render={({ field }) => (
                                <FormItem className="w-20 sm:w-24">
                                  <FormLabel className="text-xs">Cantidad</FormLabel>
                                  <Input type="number" step="0.1" {...field} className="h-9 sm:h-10 text-sm" />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`ingredients.${index}.unit`}
                              render={({ field }) => (
                                <FormItem className="w-20 sm:w-24">
                                  <FormLabel className="text-xs">Unidad</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger className="h-9 sm:h-10 text-sm">
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
                              className="text-destructive hover:text-destructive h-9 w-9 sm:h-10 sm:w-10 mt-5"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  
                  {fields.length === 0 && (
                    <div className="text-center py-6 border-2 border-dashed rounded-lg">
                      <p className="text-sm text-muted-foreground">No hay ingredientes agregados</p>
                      <p className="text-xs text-muted-foreground mt-1">Agrega ingredientes para definir la receta</p>
                    </div>
                  )}
                  
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
                    <div className="flex-grow">
                      <Label className="text-sm mb-1.5 block">Añadir Ingrediente</Label>
                      <Select onValueChange={setSelectedIngredient} value={selectedIngredient}>
                        <SelectTrigger className="h-11 sm:h-10">
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
                      className="h-11 sm:h-10 w-full sm:w-auto"
                    >
                      <PlusCircle className="mr-2 h-4 w-4"/>
                      Agregar
                    </Button>
                  </div>
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
            Guardar Producto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
