
'use client'

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import type { Product, Ingredient } from '@/lib/types';
import { X, Plus, Minus, CheckCircle } from 'lucide-react';
import { PaymentModal } from '@/components/pos/payment-modal';
import { useCollection, useFirestore, useUser, addDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp, doc, runTransaction, Timestamp } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { placeholderImages } from '@/lib/placeholder-images.json';


interface OrderItem extends Product {
  quantity: number;
}

export default function POSPage() {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    
    const [order, setOrder] = useState<OrderItem[]>([]);
    const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);
    const [recentlyAdded, setRecentlyAdded] = useState<string | null>(null);

    const productsQuery = useMemoFirebase(() => {
      if (!firestore) return null;
      return collection(firestore, 'products');
    }, [firestore]);
    const { data: products, isLoading } = useCollection<Product>(productsQuery);

    const getProductImage = (product: Product) => {
      if (product.imageUrl) return product.imageUrl;
      const placeholder = placeholderImages.find(p => p.imageHint === product.imageHint);
      return placeholder?.imageUrl || 'https://picsum.photos/seed/placeholder/150/150';
    }

    const addToOrder = (product: Product) => {
        setOrder((prevOrder) => {
            const existingItem = prevOrder.find((item) => item.id === product.id);
            if (existingItem) {
                return prevOrder.map((item) =>
                item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prevOrder, { ...product, quantity: 1 }];
        });

        setRecentlyAdded(product.id);
        setTimeout(() => setRecentlyAdded(null), 1000);
    };

    const updateQuantity = (productId: string, amount: number) => {
        setOrder(prevOrder => {
            return prevOrder.map(item => {
                if(item.id === productId) {
                    const newQuantity = item.quantity + amount;
                    return newQuantity > 0 ? {...item, quantity: newQuantity} : null;
                }
                return item;
            }).filter((item): item is OrderItem => item !== null);
        });
    }

    const subtotal = order.reduce((acc, item) => acc + item.salePrice * item.quantity, 0);
    const total = subtotal; // Assuming no tax for now

    const handleSuccessfulPayment = async (paymentMethod: string) => {
      if (!firestore || !user) {
        toast({ variant: "destructive", title: "Error", description: "No se pudo conectar a la base de datos o no hay usuario."});
        return;
      }

      try {
        await runTransaction(firestore, async (transaction) => {
          const newSaleRef = doc(collection(firestore, 'sales'));

          // --- READS first: gather all product and ingredient documents needed ---
          const productRefs = order.map(item => doc(firestore, 'products', item.id));
          const productDocs = await Promise.all(productRefs.map(ref => transaction.get(ref)));

          // Verify products exist and build a map
          const productsMap = new Map<string, Product>();
          productDocs.forEach((pDoc, idx) => {
            if (!pDoc.exists()) {
              const missing = order[idx];
              throw new Error(`Producto ${missing?.name || missing?.id || productRefs[idx].id} no encontrado.`);
            }
            productsMap.set(productRefs[idx].id, pDoc.data() as Product);
          });

          // Collect unique ingredient ids that will be touched
          const ingredientIdSet = new Set<string>();
          productsMap.forEach((prod) => {
            if (prod.ingredients) {
              for (const ri of prod.ingredients) {
                if (ri?.ingredientId) ingredientIdSet.add(ri.ingredientId);
              }
            }
          });

          const ingredientIds = Array.from(ingredientIdSet);
          const ingredientRefs = ingredientIds.map(id => doc(firestore, 'ingredients', id));
          const ingredientDocs = await Promise.all(ingredientRefs.map(ref => transaction.get(ref)));

          const ingredientMap = new Map<string, Ingredient>();
          ingredientDocs.forEach((iDoc, idx) => {
            if (!iDoc.exists()) {
              throw new Error(`Ingrediente con ID ${ingredientIds[idx]} no encontrado.`);
            }
            ingredientMap.set(ingredientIds[idx], iDoc.data() as Ingredient);
          });

          // --- All reads done. Perform writes now ---
          const saleData = {
            saleDate: serverTimestamp(),
            totalAmount: total,
            cashierId: user.uid,
            cashierEmail: user.email || 'unknown',
            paymentMethod: paymentMethod,
            itemsCount: order.reduce((sum, item) => sum + item.quantity, 0),
            uniqueProductsCount: order.length,
            source: 'pos',
            deviceType: typeof window !== 'undefined' ? (window.innerWidth < 768 ? 'mobile' : window.innerWidth < 1024 ? 'tablet' : 'desktop') : 'unknown',
            createdAt: Timestamp.now(),
          };
          transaction.set(newSaleRef, saleData);

          for (const item of order) {
            const saleItemRef = doc(collection(firestore, `sales/${newSaleRef.id}/sale_items`));
            const productData = productsMap.get(item.id)!;
            const saleItemData = {
              saleId: newSaleRef.id,
              productId: item.id,
              quantity: item.quantity,
              unitPrice: item.salePrice,
              profit: item.price ? (item.salePrice - item.price) * item.quantity : 0,
            };
            transaction.set(saleItemRef, saleItemData);

            // Update product stock
            const productRef = doc(firestore, 'products', item.id);
            const newProductStock = (productData.quantity ?? 0) - item.quantity;
            transaction.update(productRef, { quantity: newProductStock });

            // Update ingredient stocks (if any)
            if (productData.ingredients) {
              for (const recipeIngredient of productData.ingredients) {
                const ingredientRef = doc(firestore, 'ingredients', recipeIngredient.ingredientId);
                const currentIngredient = ingredientMap.get(recipeIngredient.ingredientId)!;
                const newIngredientStock = (currentIngredient.quantity ?? 0) - (recipeIngredient.quantity * item.quantity);
                transaction.update(ingredientRef, { quantity: newIngredientStock });
              }
            }
          }
        });
        
        // Create a corresponding online_order for the kitchen
        const onlineOrderRef = collection(firestore, 'online_orders');
        const newOrderData = {
            orderDate: Timestamp.now(),
            customerId: user.uid,
            customerName: `POS Venta (${paymentMethod})`,
            status: 'processing',
            totalAmount: total,
            paymentMethod: paymentMethod,
            source: 'pos',
            itemsCount: order.reduce((sum, item) => sum + item.quantity, 0),
            items: order.map(item => ({
                productId: item.id,
                productName: item.name,
                quantity: item.quantity,
                unitPrice: item.salePrice,
                subtotal: item.salePrice * item.quantity,
            }))
        };
        await addDocumentNonBlocking(onlineOrderRef, newOrderData);

        toast({
          title: "Venta registrada",
          description: "La venta se ha guardado, el stock se ha actualizado y el pedido fue enviado a cocina.",
        });
        handleResetOrder();

      } catch (error) {
        console.error("Error creating sale:", error);
        toast({
          variant: "destructive",
          title: "Error al registrar la venta",
          description: (error as Error).message || "No se pudo guardar la venta. Inténtalo de nuevo.",
        });
      }
    };

    const handleResetOrder = () => {
        setOrder([]);
        setPaymentModalOpen(false);
    }

  return (
    <div className="grid md:grid-cols-3 gap-6 h-[calc(100vh-8rem)]">
        <PaymentModal 
            isOpen={isPaymentModalOpen}
            onClose={() => setPaymentModalOpen(false)}
            total={total}
            onSuccess={handleSuccessfulPayment}
        />
      <div className="md:col-span-2">
        <Card className="h-full">
          <CardContent className="p-4 md:p-6">
            {isLoading && <p className="text-center text-lg py-8">Cargando productos...</p>}
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {products?.map((product) => (
                <Card
                  key={product.id}
                  className="cursor-pointer hover:shadow-xl hover:scale-105 transition-all active:scale-95 relative overflow-hidden touch-manipulation"
                  onClick={() => addToOrder(product)}
                >
                    {recentlyAdded === product.id && (
                       <div className="absolute inset-0 bg-primary/80 flex items-center justify-center z-10 animate-in fade-in-0 zoom-in-95">
                           <CheckCircle className="h-12 w-12 text-primary-foreground" />
                       </div>
                    )}
                  <CardContent className="p-0 flex flex-col items-center text-center">
                    <Image
                      alt={product.name}
                      className={cn(
                        "aspect-square w-full rounded-t-lg object-cover transition-transform duration-300",
                        recentlyAdded === product.id ? "scale-105" : ""
                      )}
                      data-ai-hint={product.imageHint}
                      height="200"
                      src={getProductImage(product)}
                      width="200"
                    />
                    <div className="p-3 sm:p-4 w-full">
                      <p className="text-sm sm:text-base font-semibold line-clamp-2">{product.name}</p>
                      <p className="text-base sm:text-lg font-bold text-primary mt-1">S/ {product.salePrice.toFixed(2)}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="md:col-span-1">
        <Card className="h-full flex flex-col">
          <CardContent className="p-4 flex-grow overflow-y-auto">
            <h2 className="text-xl font-headline font-semibold mb-4">Pedido Actual</h2>
            {order.length === 0 ? (
                <p className="text-muted-foreground text-center mt-8">Selecciona productos para empezar un pedido.</p>
            ) : (
            <div className="space-y-3">
              {order.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                  <div className="flex-grow min-w-0">
                    <p className="font-semibold text-sm sm:text-base truncate">{item.name}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">S/ {item.salePrice.toFixed(2)} c/u</p>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <Button size="icon" variant="outline" className="h-9 w-9 sm:h-10 sm:w-10 touch-manipulation" onClick={() => updateQuantity(item.id, -1)}>
                      <Minus className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                    <span className="font-bold text-base sm:text-lg min-w-[2rem] text-center">{item.quantity}</span>
                    <Button size="icon" variant="outline" className="h-9 w-9 sm:h-10 sm:w-10 touch-manipulation" onClick={() => updateQuantity(item.id, 1)}>
                      <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                  </div>
                  <p className="font-bold text-sm sm:text-base w-16 sm:w-20 text-right">S/ {(item.salePrice * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>
            )}
          </CardContent>
          {order.length > 0 && (
            <div className="p-4 border-t">
                <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>S/ {subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg">
                        <span>Total:</span>
                        <span>S/ {total.toFixed(2)}</span>
                    </div>
                </div>
                <Button className="w-full h-14 sm:h-16 text-lg sm:text-xl font-bold" size="lg" onClick={() => setPaymentModalOpen(true)}>
                    Procesar Pago
                </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
