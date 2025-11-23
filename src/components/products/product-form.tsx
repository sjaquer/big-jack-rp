'use client';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import type { Product, Supplier } from '@/lib/types';

const formSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido.'),
  sku: z.string().min(1, 'El SKU es requerido.'),
  salePrice: z.coerce.number().min(0, 'El precio de venta debe ser positivo.'),
  quantity: z.coerce.number().int().min(0, 'El stock debe ser un número entero positivo.'),
  supplierId: z.string().min(1, 'Debe seleccionar un proveedor.'),
});

type FormValues = z.infer<typeof formSchema>;

interface ProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  suppliers: Supplier[];
}

export function ProductForm({ isOpen, onClose, product, suppliers }: ProductFormProps) {
  const firestore = useFirestore();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      sku: '',
      salePrice: 0,
      quantity: 0,
      supplierId: '',
    },
  });

  useEffect(() => {
    if (product) {
      form.reset({
        name: product.name,
        sku: product.sku,
        salePrice: product.salePrice,
        quantity: product.quantity,
        supplierId: product.supplierId,
      });
    } else {
      form.reset({
        name: '',
        sku: '',
        salePrice: 0,
        quantity: 0,
        supplierId: '',
      });
    }
  }, [product, form]);

  async function onSubmit(values: FormValues) {
    const data = { 
        ...values,
        // Fields not in the form but required by the type
        price: values.salePrice * 0.5, // placeholder calculation
        purchaseDate: new Date().toISOString(),
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
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-headline">{product ? 'Editar Producto' : 'Añadir Nuevo Producto'}</DialogTitle>
          <DialogDescription>
            {product ? 'Actualiza los detalles del producto.' : 'Completa los detalles para añadir un nuevo producto al inventario.'}
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
                        <Input type="number" placeholder="e.g., 25.00" {...field} />
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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
