"use client";

import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirestore, addDocumentNonBlocking, useUser } from '@/firebase';
import { collection, orderBy, query, Timestamp } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import type { CashFlowEntry } from '@/lib/types';
import { startOfMonth, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

const cashFlowSchema = z.object({
  type: z.enum(['income', 'expense'], { required_error: 'Selecciona un tipo.' }),
  category: z.string().min(1, 'La categoría es obligatoria.'),
  amount: z.coerce.number().positive('El monto debe ser mayor a 0.'),
  paymentMethod: z.string().min(1, 'Selecciona un medio de pago.'),
  entryDate: z.string().min(1, 'La fecha es obligatoria.'),
  note: z.string().optional(),
});

type CashFlowFormValues = z.infer<typeof cashFlowSchema>;

const paymentMethods = ['Efectivo', 'Tarjeta', 'Transferencia', 'Yape', 'Plin', 'Caja chica'];
const expenseCategories = ['Insumos', 'Servicios', 'Alquiler', 'Marketing', 'Personal', 'Logística', 'Otros'];

const currencyFormatter = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  minimumFractionDigits: 2,
});

export default function CashFlowPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cashFlowQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'cash_flows'), orderBy('entryDate', 'desc'));
  }, [firestore]);
  const { data: cashFlowEntries, isLoading } = useCollection<CashFlowEntry>(cashFlowQuery);

  const monthStart = startOfMonth(new Date());

  const monthSummary = useMemo(() => {
    const summary = { incomes: 0, expenses: 0, net: 0 };
    (cashFlowEntries ?? []).forEach((entry) => {
      if (!entry.entryDate) return;
      const entryDate = entry.entryDate.toDate();
      if (entryDate < monthStart) return;
      if (entry.type === 'expense') {
        summary.expenses += entry.amount;
      } else {
        summary.incomes += entry.amount;
      }
    });
    summary.net = summary.incomes - summary.expenses;
    return summary;
  }, [cashFlowEntries, monthStart]);

  const orderedEntries = useMemo(() => {
    if (!cashFlowEntries) return [];
    return [...cashFlowEntries].sort((a, b) => {
      const aTime = a.entryDate ? a.entryDate.toMillis() : 0;
      const bTime = b.entryDate ? b.entryDate.toMillis() : 0;
      return bTime - aTime;
    });
  }, [cashFlowEntries]);

  const form = useForm<CashFlowFormValues>({
    resolver: zodResolver(cashFlowSchema),
    defaultValues: {
      type: 'expense',
      category: 'Insumos',
      amount: 0,
      paymentMethod: 'Efectivo',
      entryDate: new Date().toISOString().slice(0, 10),
      note: '',
    },
  });

  const onSubmit = async (values: CashFlowFormValues) => {
    if (!firestore) return;
    setIsSubmitting(true);
    try {
      const entryDate = Timestamp.fromDate(new Date(values.entryDate));
      const payload = {
        type: values.type,
        category: values.category,
        amount: values.amount,
        paymentMethod: values.paymentMethod,
        note: values.note || null,
        entryDate,
        createdBy: user?.uid || null,
        createdAt: Timestamp.now(),
      };
      await addDocumentNonBlocking(collection(firestore, 'cash_flows'), payload);
      toast({ title: 'Movimiento registrado', description: 'Actualizamos el flujo de caja con tu registro.' });
      form.reset({
        type: values.type,
        category: values.category,
        amount: 0,
        paymentMethod: values.paymentMethod,
        entryDate: new Date().toISOString().slice(0, 10),
        note: '',
      });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar el movimiento. Intenta nuevamente.' });
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0 pb-3">
        <h1 className="text-2xl lg:text-3xl font-headline font-bold">Flujo de Caja</h1>
        <p className="text-sm text-muted-foreground">Control de ingresos y gastos operativos de la empresa.</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-4 pb-2">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Ingresos del Mes</CardTitle>
                <CardDescription>Entradas registradas desde el 1 del mes.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-emerald-600">{currencyFormatter.format(monthSummary.incomes)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Gastos del Mes</CardTitle>
                <CardDescription>Salidas operativas registradas.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-destructive">{currencyFormatter.format(monthSummary.expenses)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Neto del Mes</CardTitle>
                <CardDescription>Ingresos menos gastos.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-primary">{currencyFormatter.format(monthSummary.net)}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle>Historial de movimientos</CardTitle>
                <CardDescription>Últimos registros de caja.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[420px]">
                  <div className="overflow-x-auto">
                    <Table className="min-w-[600px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Categoría</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead>Método</TableHead>
                        <TableHead>Nota</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading && (
                        <TableRow>
                          <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                            Cargando movimientos...
                          </TableCell>
                        </TableRow>
                      )}
                      {!isLoading && orderedEntries.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                            Aún no hay registros de caja.
                          </TableCell>
                        </TableRow>
                      )}
                      {orderedEntries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>{entry.entryDate ? format(entry.entryDate.toDate(), 'dd MMM', { locale: es }) : '-'}</TableCell>
                          <TableCell>
                            <Badge variant={entry.type === 'income' ? 'default' : 'destructive'}>
                              {entry.type === 'income' ? 'Ingreso' : 'Gasto'}
                            </Badge>
                          </TableCell>
                          <TableCell>{entry.category}</TableCell>
                          <TableCell className={entry.type === 'expense' ? 'text-destructive font-semibold' : 'text-emerald-600 font-semibold'}>
                            {currencyFormatter.format(entry.amount)}
                          </TableCell>
                          <TableCell>{entry.paymentMethod}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{entry.note ?? '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Registrar movimiento</CardTitle>
                <CardDescription>Controla los gastos diarios de tu operación.</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-11">
                                <SelectValue placeholder="Selecciona un tipo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="income">Ingreso</SelectItem>
                              <SelectItem value="expense">Gasto</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Categoría</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-11">
                                <SelectValue placeholder="Selecciona una categoría" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {expenseCategories.map((category) => (
                                <SelectItem key={category} value={category}>
                                  {category}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Monto (S/)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" className="h-11" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="paymentMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Método de pago</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-11">
                                <SelectValue placeholder="Selecciona un método" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {paymentMethods.map((method) => (
                                <SelectItem key={method} value={method}>
                                  {method}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="entryDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fecha</FormLabel>
                          <FormControl>
                            <Input type="date" className="h-11" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="note"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nota</FormLabel>
                          <FormControl>
                            <Textarea rows={3} className="resize-none" placeholder="Ej. Pago de servicios" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" className="w-full h-12" disabled={isSubmitting}>
                      {isSubmitting ? 'Guardando...' : 'Registrar movimiento'}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
