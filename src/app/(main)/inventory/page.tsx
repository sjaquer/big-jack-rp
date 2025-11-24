
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
    <>
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
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-headline font-bold">Gestión de Inventario</h1>
          <p className="text-muted-foreground">Supervisa y gestiona los niveles de stock de todos los artículos.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="font-headline">Inventario de Ingredientes</CardTitle>
                    <CardDescription>Materias primas para tus productos.</CardDescription>
                </div>
                <Button onClick={handleAddIngredient} size="sm">
                    <PlusCircle className="h-4 w-4 mr-2"/>
                    Añadir Ingrediente
                </Button>
            </CardHeader>
            <CardContent>
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
                        <Button variant="outline" size="sm" onClick={() => handleEditIngredient(item)}>Editar</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Productos Terminados</CardTitle>
              <CardDescription>Productos listos para la venta.</CardDescription>
            </CardHeader>
            <CardContent>
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
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="font-headline">Otros Artículos</CardTitle>
                  <CardDescription>Empaques, utensilios, etc.</CardDescription>
                </div>
                 <Button onClick={handleAddOtherItem} size="sm">
                    <PlusCircle className="h-4 w-4 mr-2"/>
                    Añadir Artículo
                </Button>
            </CardHeader>
            <CardContent>
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
                        <Button variant="outline" size="sm" onClick={() => handleEditOtherItem(item)}>Editar</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
