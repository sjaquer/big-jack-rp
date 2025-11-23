'use client';
import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import type { Product, Supplier, Ingredient, ProductIngredient } from '@/lib/types';
import { PlusCircle, Trash2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';

const ingredientSchema = z.object({
  ingredientId: z.string().min(1, 'El ingrediente es requerido.'),
  quantity: z.coerce.number().min(0.01, 'La cantidad debe ser mayor a 0.'),
  unit: z.string().min(1, 'La unidad es requerida.'),
});

const formSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido.'),
  sku: z.string().min(1, 'El SKU es requerido.'),
  salePrice: z.coerce.number().min(0, 'El precio de venta debe ser positivo.'),
  quantity: z.coerce.number().int().min(0, 'El stock debe ser un número entero positivo.'),
  supplierId: z.string().min(1, 'Debe seleccionar un proveedor.'),
  ingredients: z.array(ingredientSchema).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  suppliers: Supplier[];
  ingredients: Ingredient[];
}

export function ProductForm({ isOpen, onClose, product, suppliers, ingredients }: ProductFormProps) {
  const firestore = useFirestore();
  const [selectedIngredient, setSelectedIngredient] = useState('');


  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      sku: '',
      salePrice: 0,
      quantity: 0,
      supplierId: '',
      ingredients: [],
    },
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "ingredients"
  });

  useEffect(() => {
    if (product) {
      form.reset({
        name: product.name,
        sku: product.sku,
        salePrice: product.salePrice,
        quantity: product.quantity,
        supplierId: product.supplierId,
        ingredients: product.ingredients || [],
      });
    } else {
      form.reset({
        name: '',
        sku: '',
        salePrice: 0,
        quantity: 0,
        supplierId: '',
        ingredients: [],
      });
    }
  }, [product, form]);

  const handleAddIngredient = () => {
    const ingredient = ingredients.find(i => i.id === selectedIngredient);
    if (ingredient) {
        append({ ingredientId: ingredient.id, quantity: 1, unit: ingredient.unit });
        setSelectedIngredient('');
    }
  }

  async function onSubmit(values: FormValues) {
    const data = { 
        ...values,
        // Fields not in the form but required by the type
        price: values.salePrice * 0.5, // placeholder calculation
        purchaseDate: new Date().toISOString(),
        ingredients: values.ingredients || []
    };

    if (product) {
      const productDocRef = doc(firestore, 'products', product.id);
      updateDocumentNonBlocking(productDocRef, data);
    } else {
      const productsCollectionRef = collection(firestore, 'products');
      addDocumentNonBlocking(productsCollectionRef, data);
    }
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle className="font-headline">{product ? 'Editar Producto' : 'Añadir Nuevo Producto'}</DialogTitle>
          <DialogDescription>
            {product ? 'Actualiza los detalles y la receta del producto.' : 'Completa los detalles para añadir un nuevo producto al inventario.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Producto</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Big Jack Clásica" {...field} />
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
                  <FormLabel>SKU</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., BJ-001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="salePrice"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Precio de Venta (S/)</FormLabel>
                    <FormControl>
                        <Input type="number" step="0.01" placeholder="e.g., 25.00" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Stock Actual</FormLabel>
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
              name="supplierId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Proveedor</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un proveedor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Separator />
            <div>
              <h3 className="text-lg font-medium">Receta / Ingredientes</h3>
                 {fields.map((field, index) => {
                    const ingredient = ingredients.find(i => i.id === field.ingredientId);
                    return (
                        <div key={field.id} className="flex items-end gap-2 my-2 p-2 rounded-md border">
                            <div className="flex-grow font-medium">{ingredient?.name}</div>
                            <FormField
                                control={form.control}
                                name={`ingredients.${index}.quantity`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs">Cantidad</FormLabel>
                                        <Input type="number" step="0.1" {...field} className="h-8" />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name={`ingredients.${index}.unit`}
                                render={({ field }) => (
                                    <FormItem>
                                         <FormLabel className="text-xs">Unidad</FormLabel>
                                        <Input {...field} className="h-8" />
                                    </FormItem>
                                )}
                            />
                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    )
                 })}
                 <div className="flex items-end gap-2 mt-4">
                     <div className="flex-grow">
                        <Label>Añadir Ingrediente</Label>
                        <Select onValueChange={setSelectedIngredient} value={selectedIngredient}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecciona un ingrediente" />
                            </SelectTrigger>
                            <SelectContent>
                                {ingredients.filter(i => !fields.some(f => f.ingredientId === i.id)).map((ingredient) => (
                                <SelectItem key={ingredient.id} value={ingredient.id}>
                                    {ingredient.name}
                                </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                     </div>
                    <Button type="button" variant="outline" size="icon" onClick={handleAddIngredient} disabled={!selectedIngredient}>
                        <PlusCircle className="h-5 w-5"/>
                    </Button>
                 </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit">Guardar Producto</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
