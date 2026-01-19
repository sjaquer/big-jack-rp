
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
import { PlusCircle, Trash2 } from 'lucide-react';
// Images removed for touch-first POS: product list shows text only
import { useCollection, useFirestore } from '@/firebase';
import { deleteDoc, doc, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useMemoFirebase } from '@/firebase/provider';
import type { Product, Supplier, Ingredient } from '@/lib/types';
import { PRODUCT_CATEGORY_LABELS } from '@/lib/types';
import { ProductForm } from '@/components/products/product-form';
// placeholderImages removed; images are no longer used in product listing

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

  const { toast } = useToast();

  const handleDeleteProduct = async (productId: string) => {
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'Firestore no disponible' });
      return;
    }

    const confirmed = confirm('¿Eliminar este producto? Esta acción no se puede deshacer.');
    if (!confirmed) return;

    try {
      await deleteDoc(doc(firestore, 'products', productId));
      toast({ title: 'Producto eliminado', description: 'El producto se eliminó correctamente.' });
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar el producto.' });
    }
  };

  // Image handling removed: products show textual info only.
  
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
    <div className="h-full w-full flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 to-orange-50/20">
      <ProductForm 
        isOpen={isFormOpen}
        onClose={handleFormClose}
        product={selectedProduct}
        ingredients={ingredients ?? []}
      />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto w-full px-3 sm:px-6 py-4 sm:py-6 space-y-5">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div>
                  <h1 className="font-headline text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">Registro de Productos</h1>
                  <p className="text-base text-slate-600 mt-1">Gestiona todos los productos de tu inventario y menú.</p>
              </div>
              <Button onClick={handleAddProduct} size="default" className="h-12 px-6 text-base w-full sm:w-auto touch-manipulation font-semibold shadow-sm hover:shadow-md transition-shadow">
                  <PlusCircle className="mr-2 h-5 w-5" />
                  Añadir Producto
              </Button>
          </div>
          <Card className="flex flex-col overflow-hidden shadow-lg border-slate-200">
            <CardHeader className="flex-shrink-0">
              <CardTitle className="font-headline text-base sm:text-lg">Listado</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Consulta y edita los productos disponibles.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-0">
              <div className="overflow-x-auto">
                <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Precio de Venta</TableHead>
                    <TableHead>Stock Actual</TableHead>
                    <TableHead>Stock Producible</TableHead>
                    <TableHead>
                      <span className="sr-only">Acciones</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && <TableRow><TableCell colSpan={6}>Cargando...</TableCell></TableRow>}
                  {products?.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{product.sku}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {PRODUCT_CATEGORY_LABELS[product.category ?? 'otros']}
                        </Badge>
                      </TableCell>
                      <TableCell>S/ {product.salePrice.toFixed(2)}</TableCell>
                      <TableCell>{product.quantity}</TableCell>
                      <TableCell>
                        {calculateProducibleQuantity(product, ingredients ?? [])}
                      </TableCell>
                      <TableCell className="flex gap-2">
                        <Button size="default" variant="outline" className="h-10 sm:h-9 text-sm sm:text-xs touch-manipulation" onClick={() => handleEditProduct(product)}>
                          Editar
                        </Button>
                        <Button size="default" variant="destructive" className="h-10 sm:h-9 text-sm sm:text-xs touch-manipulation" onClick={() => handleDeleteProduct(product.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
