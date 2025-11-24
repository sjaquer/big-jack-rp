
'use client';
import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import Image from 'next/image';
import { useCollection, useFirestore } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import type { Product, Supplier, Ingredient } from '@/lib/types';
import { ProductForm } from '@/components/products/product-form';

export default function ProductsPage() {
  const firestore = useFirestore();
  const [isFormOpen, setFormOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const productsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'products');
  }, [firestore]);
  const { data: products, isLoading: productsLoading } = useCollection<Product>(productsQuery);

  const suppliersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'suppliers');
  }, [firestore]);
  const { data: suppliers, isLoading: suppliersLoading } = useCollection<Supplier>(suppliersQuery);
  
  const ingredientsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'ingredients');
  }, [firestore]);
  const { data: ingredients, isLoading: ingredientsLoading } = useCollection<Ingredient>(ingredientsQuery);

  const handleAddProduct = () => {
    setSelectedProduct(null);
    setFormOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setFormOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setSelectedProduct(null);
  };
  
  const calculateProducibleQuantity = (product: Product, allIngredients: Ingredient[]): number | string => {
    if (!product.ingredients || product.ingredients.length === 0) {
      return 'N/A';
    }
    if (!allIngredients || allIngredients.length === 0) {
      return 0;
    }

    let maxProducible = Infinity;

    for (const recipeIngredient of product.ingredients) {
      const inventoryIngredient = allIngredients.find(i => i.id === recipeIngredient.ingredientId);

      if (!inventoryIngredient) {
        return 0; // Required ingredient is not in inventory
      }
      
      const producibleWithThisIngredient = Math.floor(inventoryIngredient.quantity / recipeIngredient.quantity);
      if (producibleWithThisIngredient < maxProducible) {
        maxProducible = producibleWithThisIngredient;
      }
    }

    return maxProducible === Infinity ? 0 : maxProducible;
  };

  const isLoading = productsLoading || suppliersLoading || ingredientsLoading;

  return (
    <>
      <ProductForm 
        isOpen={isFormOpen}
        onClose={handleFormClose}
        product={selectedProduct}
        suppliers={suppliers ?? []}
        ingredients={ingredients ?? []}
      />
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
              <div>
                  <CardTitle className="font-headline">Registro de Productos</CardTitle>
                  <CardDescription>Gestiona todos los productos de tu inventario.</CardDescription>
              </div>
              <Button onClick={handleAddProduct}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Añadir Producto
              </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="hidden w-[100px] sm:table-cell">
                  <span className="sr-only">Imagen</span>
                </TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Precio de Venta</TableHead>
                <TableHead>Stock Actual</TableHead>
                <TableHead>Stock Producible</TableHead>
                <TableHead>
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={7}>Cargando...</TableCell></TableRow>}
              {products?.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="hidden sm:table-cell">
                    <Image
                      alt={product.name}
                      className="aspect-square rounded-md object-cover"
                      data-ai-hint={product.imageHint}
                      height="64"
                      src={product.imageUrl || 'https://picsum.photos/seed/placeholder/64/64'}
                      width="64"
                    />
                  </TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{product.sku}</Badge>
                  </TableCell>
                  <TableCell>S/ {product.salePrice.toFixed(2)}</TableCell>
                  <TableCell>{product.quantity}</TableCell>
                  <TableCell>
                    {calculateProducibleQuantity(product, ingredients ?? [])}
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => handleEditProduct(product)}>
                      Editar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
