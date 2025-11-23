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
import { PlusCircle } from 'lucide-react';
import Image from 'next/image';
import { useCollection, useFirestore } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import type { Product, Supplier } from '@/lib/types';
import { ProductForm } from '@/components/products/product-form';

export default function ProductsPage() {
  const firestore = useFirestore();
  const [isFormOpen, setFormOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const productsQuery = useMemoFirebase(() => collection(firestore, 'products'), [firestore]);
  const { data: products, isLoading: productsLoading } = useCollection<Product>(productsQuery);

  const suppliersQuery = useMemoFirebase(() => collection(firestore, 'suppliers'), [firestore]);
  const { data: suppliers, isLoading: suppliersLoading } = useCollection<Supplier>(suppliersQuery);


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

  return (
    <>
      <ProductForm 
        isOpen={isFormOpen}
        onClose={handleFormClose}
        product={selectedProduct}
        suppliers={suppliers ?? []}
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
                <TableHead className="hidden md:table-cell">Precio de Venta</TableHead>
                <TableHead className="hidden md:table-cell">Stock</TableHead>
                <TableHead>
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(productsLoading || suppliersLoading) && <TableRow><TableCell colSpan={6}>Cargando...</TableCell></TableRow>}
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
                  <TableCell className="hidden md:table-cell">S/ {product.salePrice.toFixed(2)}</TableCell>
                  <TableCell className="hidden md:table-cell">{product.quantity}</TableCell>
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
