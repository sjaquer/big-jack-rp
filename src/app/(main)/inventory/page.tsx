"use client";

import { useState } from 'react';
import { collection } from 'firebase/firestore';
import { PlusCircle, Package, Plus, Minus, AlertTriangle, ShoppingBag } from 'lucide-react';
import { IngredientForm } from '@/components/inventory/ingredient-form';
import { OtherItemForm } from '@/components/inventory/other-item-form';
import { QuickStockModal } from '@/components/inventory/quick-stock-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCollection, useFirestore } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import type { Ingredient, InventoryItem, Product } from '@/lib/types';

export default function InventoryPage() {
  const firestore = useFirestore();

  const [isIngredientFormOpen, setIngredientFormOpen] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [isOtherItemFormOpen, setOtherItemFormOpen] = useState(false);
  const [selectedOtherItem, setSelectedOtherItem] = useState<InventoryItem | null>(null);
  
  // Estado para el modal de stock rápido
  const [quickStockModalOpen, setQuickStockModalOpen] = useState(false);
  const [quickStockItem, setQuickStockItem] = useState<{
    id: string;
    name: string;
    quantity: number;
    unit?: string;
    cost?: number;
  } | null>(null);
  const [quickStockType, setQuickStockType] = useState<'ingredient' | 'other_item'>('ingredient');

  const ingredientsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'ingredients') : null),
    [firestore]
  );
  const { data: ingredients, isLoading: ingredientsLoading } = useCollection<Ingredient>(ingredientsQuery);

  const productsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'products') : null), [firestore]);
  const { data: products, isLoading: productsLoading } = useCollection<Product>(productsQuery);

  const inventoryQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'inventory_items') : null),
    [firestore]
  );
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

  // Funciones para el modal de stock rápido
  const handleQuickStockIngredient = (item: Ingredient) => {
    setQuickStockItem({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      cost: item.cost,
    });
    setQuickStockType('ingredient');
    setQuickStockModalOpen(true);
  };

  const handleQuickStockOtherItem = (item: InventoryItem) => {
    setQuickStockItem({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      unit: undefined,
      cost: item.costPerUnit,
    });
    setQuickStockType('other_item');
    setQuickStockModalOpen(true);
  };

  // Contar items con bajo stock
  const lowStockIngredients = ingredients?.filter(i => i.quantity <= (i.minimumStock ?? 0)).length ?? 0;
  const lowStockOtherItems = otherItems?.filter(i => i.quantity <= (i.minimumStock ?? 0)).length ?? 0;

  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-slate-900 dark:to-slate-800">
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
      <QuickStockModal
        isOpen={quickStockModalOpen}
        onClose={() => setQuickStockModalOpen(false)}
        item={quickStockItem}
        itemType={quickStockType}
      />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto w-full space-y-5 px-3 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl lg:text-4xl font-headline font-bold text-slate-900 tracking-tight">Gestión de Inventario</h1>
            <p className="text-base text-slate-600 max-w-2xl">Supervisa y gestiona los niveles de stock de todos los artículos de tu negocio.</p>
          </div>

          {/* Alerta de bajo stock */}
          {(lowStockIngredients > 0 || lowStockOtherItems > 0) && (
            <div className="p-4 sm:p-5 rounded-xl bg-red-50 border-2 border-red-200 flex items-center gap-4 shadow-sm">
              <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-red-700">
                  {lowStockIngredients + lowStockOtherItems} artículo{lowStockIngredients + lowStockOtherItems > 1 ? 's' : ''} con bajo stock
                </p>
                <p className="text-xs text-slate-600">
                  {lowStockIngredients > 0 && `${lowStockIngredients} ingrediente${lowStockIngredients > 1 ? 's' : ''}`}
                  {lowStockIngredients > 0 && lowStockOtherItems > 0 && ' • '}
                  {lowStockOtherItems > 0 && `${lowStockOtherItems} artículo${lowStockOtherItems > 1 ? 's' : ''}`}
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pb-4">
          <Card className="lg:col-span-2 flex flex-col shadow-md border-slate-200">
            <CardHeader className="flex-shrink-0 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between pb-4">
              <div>
                <CardTitle className="font-headline text-base sm:text-lg flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Inventario de Ingredientes
                  {lowStockIngredients > 0 && (
                    <Badge variant="destructive" className="ml-2">{lowStockIngredients} bajo</Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">Materias primas para tus productos.</CardDescription>
              </div>
              <Button onClick={handleAddIngredient} size="default" className="h-12 px-6 text-base w-full sm:w-auto touch-manipulation font-semibold shadow-sm hover:shadow-md transition-shadow">
                <PlusCircle className="h-5 w-5 mr-2" />
                Nuevo Ingrediente
              </Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-0">
              <div className="overflow-x-auto">
                <Table className="min-w-[600px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-center">Stock Rápido</TableHead>
                      <TableHead className="text-right">Editar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ingredientsLoading && (
                      <TableRow>
                        <TableCell colSpan={5}>Cargando...</TableCell>
                      </TableRow>
                    )}
                    {ingredients?.map((item) => (
                      <TableRow key={item.id} className={item.quantity <= (item.minimumStock ?? 0) ? 'bg-destructive/5' : ''}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>
                          <span className="font-semibold">{item.quantity}</span> {item.unit}
                        </TableCell>
                        <TableCell>
                          {item.quantity <= (item.minimumStock ?? 0) ? (
                            <Badge variant="destructive">Bajo Stock</Badge>
                          ) : (
                            <Badge variant="secondary">En Stock</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-10 w-10 sm:h-9 sm:w-9 touch-manipulation bg-green-50 hover:bg-green-100 border-green-200 text-green-700 dark:bg-green-950/30 dark:hover:bg-green-900/50 dark:border-green-800 dark:text-green-400"
                              onClick={() => handleQuickStockIngredient(item)}
                              title="Agregar stock"
                            >
                              <Plus className="h-5 w-5" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 text-xs touch-manipulation"
                            onClick={() => handleEditIngredient(item)}
                          >
                            Editar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card className="flex flex-col shadow-md border-slate-200">
            <CardHeader className="flex-shrink-0 pb-4">
              <CardTitle className="font-headline text-lg sm:text-xl font-bold">Productos Terminados</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Productos listos para la venta.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-0">
              <div className="overflow-x-auto">
                <Table className="min-w-[600px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productsLoading && (
                      <TableRow>
                        <TableCell colSpan={4}>Cargando...</TableCell>
                      </TableRow>
                    )}
                    {products?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.sku}</Badge>
                        </TableCell>
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
              </div>
            </CardContent>
          </Card>

          <Card className="flex flex-col shadow-md border-slate-200">
            <CardHeader className="flex-shrink-0 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between pb-4">
              <div>
                <CardTitle className="font-headline text-lg sm:text-xl font-bold flex items-center gap-2">
                  <ShoppingBag className="h-6 w-6" />
                  Otros Artículos
                  {lowStockOtherItems > 0 && (
                    <Badge variant="destructive" className="ml-2 text-sm">{lowStockOtherItems} bajo</Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-sm">Empaques, utensilios, etc.</CardDescription>
              </div>
              <Button onClick={handleAddOtherItem} size="default" className="h-12 px-6 text-base w-full sm:w-auto touch-manipulation font-semibold shadow-sm hover:shadow-md transition-shadow">
                <PlusCircle className="h-5 w-5 mr-2" />
                Nuevo Artículo
              </Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-0">
              <div className="overflow-x-auto">
                <Table className="min-w-[600px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-center">Stock Rápido</TableHead>
                      <TableHead className="text-right">Editar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {otherItemsLoading && (
                      <TableRow>
                        <TableCell colSpan={5}>Cargando...</TableCell>
                      </TableRow>
                    )}
                    {otherItems
                      ?.filter((item) => item.type !== 'product' && item.type !== 'ingredient')
                      .map((item) => (
                        <TableRow key={item.id} className={item.quantity <= (item.minimumStock ?? 0) ? 'bg-destructive/5' : ''}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>
                            <span className="font-semibold">{item.quantity}</span> uds
                          </TableCell>
                          <TableCell>
                            {item.quantity <= (item.minimumStock ?? 0) ? (
                              <Badge variant="destructive">Bajo Stock</Badge>
                            ) : (
                              <Badge variant="secondary">En Stock</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-10 w-10 sm:h-9 sm:w-9 touch-manipulation bg-green-50 hover:bg-green-100 border-green-200 text-green-700 dark:bg-green-950/30 dark:hover:bg-green-900/50 dark:border-green-800 dark:text-green-400"
                                onClick={() => handleQuickStockOtherItem(item)}
                                title="Agregar stock"
                              >
                                <Plus className="h-5 w-5" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-9 text-xs touch-manipulation"
                              onClick={() => handleEditOtherItem(item)}
                            >
                              Editar
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
    </div>
  );
}