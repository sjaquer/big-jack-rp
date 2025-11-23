'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { predictExpectedCash, PredictExpectedCashOutput } from '@/ai/flows/predict-expected-cash';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Wand2, Lightbulb } from 'lucide-react';
import { useState } from 'react';

const formSchema = z.object({
  dailySales: z.coerce.number().min(0, 'Debe ser un número positivo.'),
  previousDayCashBalance: z.coerce.number().min(0, 'Debe ser un número positivo.'),
  expectedOnlineOrders: z.coerce.number().min(0, 'Debe ser un número positivo.'),
  expectedCashExpenses: z.coerce.number().min(0, 'Debe ser un número positivo.'),
});

type FormValues = z.infer<typeof formSchema>;

export function PredictionForm() {
  const [prediction, setPrediction] = useState<PredictExpectedCashOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      dailySales: 0,
      previousDayCashBalance: 0,
      expectedOnlineOrders: 0,
      expectedCashExpenses: 0,
    },
  });

  async function onSubmit(values: FormValues) {
    setIsLoading(true);
    setError(null);
    setPrediction(null);
    try {
      const result = await predictExpectedCash(values);
      setPrediction(result);
    } catch (e) {
      setError('Ocurrió un error al generar la predicción. Inténtalo de nuevo.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="dailySales"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ventas del Día (PEN)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 1500" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="previousDayCashBalance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Saldo de Caja Anterior (PEN)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 350" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="expectedOnlineOrders"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pedidos en Línea (Efectivo, PEN)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 200" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="expectedCashExpenses"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gastos en Efectivo (PEN)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 100" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generando...
              </>
            ) : (
               <>
                <Wand2 className="mr-2 h-4 w-4" />
                Predecir Saldo de Caja
               </>
            )}
          </Button>
        </form>
      </Form>
      {error && <p className="text-sm font-medium text-destructive">{error}</p>}
      {prediction && (
        <Card className="mt-6 bg-secondary animate-in fade-in-50">
          <CardHeader>
            <CardTitle className="font-headline flex items-center gap-2">
              <Lightbulb className="text-primary"/>
              Resultado de la Predicción
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Saldo de caja predicho</p>
              <p className="text-2xl font-bold text-primary">
                S/ {prediction.predictedCashBalance.toLocaleString('es-PE')}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Recomendaciones</p>
              <p className="text-base whitespace-pre-wrap">{prediction.recommendations}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
