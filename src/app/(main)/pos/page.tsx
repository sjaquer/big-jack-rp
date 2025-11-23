
'use client'

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import type { Product } from '@/lib/types';
import { X, Plus, Minus } from 'lucide-react';
import { PaymentModal } from '@/components/pos/payment-modal';
import { useCollection, useFirestore, addDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp, doc, writeBatch } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';


interface OrderItem extends Product {
  quantity: number;
}

export default function POSPage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const productsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'products') : null, [firestore]);
    const { data: products, isLoading } = useCollection<Product>(productsQuery);
    
    const [order, setOrder] = useState<OrderItem[]>([]);
    const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);

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
      if (!firestore) return;

      const saleData = {
        saleDate: serverTimestamp(),
        totalAmount: total,
        cashierId: 'cashier-01', // Replace with actual logged-in cashier
        paymentMethod: paymentMethod,
      };

      try {
        const newSaleRef = doc(collection(firestore, 'sales'));
        const batch = writeBatch(firestore);

        batch.set(newSaleRef, saleData);

        order.forEach(item => {
            const saleItemRef = doc(collection(firestore, `sales/${newSaleRef.id}/sale_items`));
            const saleItemData = {
                saleId: newSaleRef.id,
                productId: item.id,
                quantity: item.quantity,
                unitPrice: item.salePrice
            };
            batch.set(saleItemRef, saleItemData);
        });

        await batch.commit();

        toast({
          title: "Venta registrada",
          description: "La venta se ha guardado correctamente.",
        });

      } catch (error) {
        console.error("Error creating sale:", error);
        toast({
          variant: "destructive",
          title: "Error al registrar la venta",
          description: "No se pudo guardar la venta. Inténtalo de nuevo.",
        });
      }

      handleResetOrder();
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
          <CardContent className="p-4">
            {isLoading && <p>Cargando productos...</p>}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {products?.map((product) => (
                <Card
                  key={product.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => addToOrder(product)}
                >
                  <CardContent className="p-0 flex flex-col items-center text-center">
                    <Image
                      alt={product.name}
                      className="aspect-square w-full rounded-t-lg object-cover"
                      data-ai-hint={product.imageHint}
                      height="150"
                      src={product.imageUrl || 'https://picsum.photos/seed/placeholder/150/150'}
                      width="150"
                    />
                    <div className="p-2">
                      <p className="text-sm font-medium">{product.name}</p>
                      <p className="text-xs font-semibold text-primary">S/ {product.salePrice.toFixed(2)}</p>
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
            <div className="space-y-4">
              {order.map((item) => (
                <div key={item.id} className="flex items-center gap-4">
                  <div className="flex-grow">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">S/ {item.salePrice.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateQuantity(item.id, -1)}><Minus className="h-4 w-4" /></Button>
                    <span>{item.quantity}</span>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateQuantity(item.id, 1)}><Plus className="h-4 w-4" /></Button>
                  </div>
                  <p className="font-semibold w-16 text-right">S/ {(item.salePrice * item.quantity).toFixed(2)}</p>
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
                <Button className="w-full" size="lg" onClick={() => setPaymentModalOpen(true)}>
                    Pagar
                </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
