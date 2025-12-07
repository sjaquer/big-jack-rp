
'use client';
import { useState } from 'react';
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
import { useCollection, useFirestore } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import type { Ingredient, Product, InventoryItem } from '@/lib/types';
import { PlusCircle } from 'lucide-react';
import { IngredientForm } from '@/components/inventory/ingredient-form';
import { OtherItemForm } from '@/components/inventory/other-item-form';

export default function InventoryPage() {
  const firestore = useFirestore();

  const [isIngredientFormOpen, setIngredientFormOpen] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  
  const [isOtherItemFormOpen, setOtherItemFormOpen] = useState(false);
  const [selectedOtherItem, setSelectedOtherItem] = useState<InventoryItem | null>(null);

  const ingredientsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'ingredients');
  }, [firestore]);
  const { data: ingredients, isLoading: ingredientsLoading } = useCollection<Ingredient>(ingredientsQuery);
  
  const productsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'products');
  }, [firestore]);
  const { data: products, isLoading: productsLoading } = useCollection<Product>(productsQuery);

  const inventoryQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'inventory_items');
  }, [firestore]);
  const { data: otherItems, isLoading: otherItemsLoading } = useCollection<InventoryItem>(inventoryQuery);

  const handleAddIngredient = () => {
    setSelectedIngredient(null);
    setIngredientFormOpen(true);
  };
  const handleEditIngredient = (ingredient: Ingredient) => {
    setSelectedIngredient(ingredient);
    setIngredientFormOpen(true);
  };

  const handleAddOtherItem = () => {
    setSelectedOtherItem(null);
    setOtherItemFormOpen(true);
  };
  const handleEditOtherItem = (item: InventoryItem) => {
    setSelectedOtherItem(item);
    setOtherItemFormOpen(true);
  };
  
  const isLoading = ingredientsLoading || productsLoading || otherItemsLoading;

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      <IngredientForm 
        isOpen={isIngredientFormOpen}
        onClose={() => setIngredientFormOpen(false)}
        ingredient={selectedIngredient}
      />
      <OtherItemForm
        isOpen={isOtherItemFormOpen}
        onClose={() => setOtherItemFormOpen(false)}
        item={selectedOtherItem}
      />
      <div className="flex-shrink-0 pb-3">
        <h1 className="text-2xl lg:text-3xl font-headline font-bold">Gestión de Inventario</h1>
        <p className="text-sm text-muted-foreground">Supervisa y gestiona los niveles de stock de todos los artículos.</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-2">
          <Card className="lg:col-span-2 flex flex-col">
            <CardHeader className="flex-shrink-0 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div>
                    <CardTitle className="font-headline text-base sm:text-lg">Inventario de Ingredientes</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Materias primas para tus productos.</CardDescription>
                </div>
                <Button onClick={handleAddIngredient} size="default" className="h-9 text-sm w-full sm:w-auto touch-manipulation">
                    <PlusCircle className="h-4 w-4 mr-2"/>
                    Añadir Ingrediente
                </Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-0">
              <div className="overflow-x-auto">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ingredientsLoading && <TableRow><TableCell colSpan={4}>Cargando...</TableCell></TableRow>}
                  {ingredients?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.quantity} {item.unit}</TableCell>
                      <TableCell>
                        {item.quantity <= (item.minimumStock ?? 0) ? (
                          <Badge variant="destructive">Bajo Stock</Badge>
                        ) : (
                          <Badge variant="secondary">En Stock</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="default" className="h-10 sm:h-9 text-sm sm:text-xs touch-manipulation" onClick={() => handleEditIngredient(item)}>Editar</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
          <Card className="flex flex-col">
            <CardHeader className="flex-shrink-0">
              <CardTitle className="font-headline text-base sm:text-lg">Productos Terminados</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Productos listos para la venta.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-0">
              <div className="overflow-x-auto">
                <Table>ent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productsLoading && <TableRow><TableCell colSpan={4}>Cargando...</TableCell></TableRow>}
                  {products?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell><Badge variant="outline">{item.sku}</Badge></TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>
                         {item.quantity <= 10 ? (
                          <Badge variant="destructive">Bajo Stock</Badge>
                        ) : (
                          <Badge variant="secondary">En Stock</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader className="flex-shrink-0 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div>
                  <CardTitle className="font-headline text-base sm:text-lg">Otros Artículos</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Empaques, utensilios, etc.</CardDescription>
                </div>
                 <Button onClick={handleAddOtherItem} size="default" className="h-9 text-sm w-full sm:w-auto touch-manipulation">
                    <PlusCircle className="h-4 w-4 mr-2"/>
                    Añadir Artículo
                </Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-0">
              <div className="overflow-x-auto">
                <Table>nt>
               <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Estado</TableHead>
                     <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {otherItemsLoading && <TableRow><TableCell colSpan={4}>Cargando...</TableCell></TableRow>}
                  {otherItems?.filter(item => item.type !== 'product' && item.type !== 'ingredient').map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>
                        {item.quantity <= (item.minimumStock ?? 0) ? (
                          <Badge variant="destructive">Bajo Stock</Badge>
                        ) : (
                          <Badge variant="secondary">En Stock</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="default" className="h-10 sm:h-9 text-sm sm:text-xs touch-manipulation" onClick={() => handleEditOtherItem(item)}>Editar</Button>
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
