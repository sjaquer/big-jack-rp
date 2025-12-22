'use client';

import { useState, useMemo } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Download, 
  ChevronLeft, 
  ChevronRight,
  FileSpreadsheet,
  ChevronDown
} from 'lucide-react';
import { 
  startOfMonth, 
  endOfMonth, 
  format, 
  addMonths, 
  subMonths,
  isSameDay
} from 'date-fns';
import { es } from 'date-fns/locale';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, Timestamp } from 'firebase/firestore';
import type { Sale, SaleItem } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface SalesListProps {
  allSaleItems?: SaleItem[];
}

export function SalesList({ allSaleItems = [] }: SalesListProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const firestore = useFirestore();
  const { toast } = useToast();

  const monthStart = useMemo(() => startOfMonth(currentMonth), [currentMonth]);
  const monthEnd = useMemo(() => endOfMonth(currentMonth), [currentMonth]);

  const salesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'sales'),
      where('saleDate', '>=', Timestamp.fromDate(monthStart)),
      where('saleDate', '<=', Timestamp.fromDate(monthEnd)),
      orderBy('saleDate', 'desc')
    );
  }, [firestore, monthStart, monthEnd]);

  const { data: sales, isLoading } = useCollection<Sale>(salesQuery);

  const handlePreviousMonth = () => {
    setCurrentMonth(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => addMonths(prev, 1));
  };

  const copyToClipboard = (content: string, title: string) => {
    navigator.clipboard.writeText(content).then(() => {
      toast({
        title: "Copiado al portapapeles",
        description: `${title} han sido copiados en formato CSV.`,
      });
    }).catch(err => {
      console.error('Error al copiar: ', err);
      toast({
        title: "Error",
        description: "No se pudo copiar al portapapeles.",
        variant: "destructive",
      });
    });
  };

  const handleExportSalesCSV = () => {
    if (!sales || sales.length === 0) {
      toast({ title: "No hay datos", description: "No hay ventas para exportar.", variant: "destructive" });
      return;
    }

    const headers = [
      'ID', 'Fecha', 'Hora', 'Cliente', 'Documento Cliente', 
      'Método Pago', 'Total', 'Estado SUNAT', 'Items', 'Fuente'
    ];

    const csvContent = [
      headers.join(','),
      ...sales.map(sale => {
        const date = sale.saleDate.toDate();
        return [
          sale.id,
          format(date, 'dd/MM/yyyy'),
          format(date, 'HH:mm:ss'),
          `"${sale.customerName || 'Público General'}"`,
          sale.customerDocumentNumber || '',
          sale.paymentMethod,
          sale.totalAmount.toFixed(2),
          sale.sunatStatus || 'pending',
          sale.itemsCount || 0,
          sale.source || 'pos'
        ].join(',');
      })
    ].join('\n');

    copyToClipboard(csvContent, "Las ventas");
  };

  const handleExportDailyCSV = () => {
    if (!sales || sales.length === 0) {
      toast({ title: "No hay datos", description: "No hay ventas para exportar.", variant: "destructive" });
      return;
    }

    // Group by day
    const dailyData = new Map<string, { 
      date: Date, 
      total: number, 
      count: number, 
      cash: number, 
      card: number, 
      yape: number,
      otros: number
    }>();

    sales.forEach(sale => {
      const date = sale.saleDate.toDate();
      const dateKey = format(date, 'yyyy-MM-dd');
      
      if (!dailyData.has(dateKey)) {
        dailyData.set(dateKey, { 
          date, 
          total: 0, 
          count: 0, 
          cash: 0, 
          card: 0, 
          yape: 0,
          otros: 0
        });
      }
      
      const day = dailyData.get(dateKey)!;
      day.total += sale.totalAmount;
      day.count += 1;
      
      const method = sale.paymentMethod?.toLowerCase() || '';
      if (method.includes('efectivo') || method === 'cash') {
        day.cash += sale.totalAmount;
      } else if (method.includes('tarjeta') || method.includes('card')) {
        day.card += sale.totalAmount;
      } else if (method.includes('yape') || method.includes('plin') || method.includes('digital')) {
        day.yape += sale.totalAmount;
      } else {
        day.otros += sale.totalAmount;
      }
    });

    // Sort by date
    const sortedDays = Array.from(dailyData.values()).sort((a, b) => a.date.getTime() - b.date.getTime());

    // Calcular totales
    const totals = sortedDays.reduce((acc, day) => ({
      total: acc.total + day.total,
      count: acc.count + day.count,
      cash: acc.cash + day.cash,
      card: acc.card + day.card,
      yape: acc.yape + day.yape,
      otros: acc.otros + day.otros
    }), { total: 0, count: 0, cash: 0, card: 0, yape: 0, otros: 0 });

    const headers = [
      'Fecha',
      'Dia Semana',
      'Total Ventas',
      'Nro Pedidos',
      'Ticket Promedio',
      'Efectivo',
      'Tarjeta',
      'Yape/Plin',
      'Otros',
      'Mes',
      'Año'
    ];

    const csvContent = [
      headers.join('\t'),
      ...sortedDays.map(day => [
        format(day.date, 'dd/MM/yyyy'),
        format(day.date, 'EEEE', { locale: es }),
        day.total.toFixed(2),
        day.count.toString(),
        (day.total / day.count).toFixed(2),
        day.cash.toFixed(2),
        day.card.toFixed(2),
        day.yape.toFixed(2),
        day.otros.toFixed(2),
        format(day.date, 'MMMM', { locale: es }),
        format(day.date, 'yyyy')
      ].join('\t')),
      '',
      // Fila de totales
      [
        'TOTAL',
        '',
        totals.total.toFixed(2),
        totals.count.toString(),
        (totals.total / totals.count).toFixed(2),
        totals.cash.toFixed(2),
        totals.card.toFixed(2),
        totals.yape.toFixed(2),
        totals.otros.toFixed(2),
        '',
        ''
      ].join('\t'),
      '',
      // Estadísticas adicionales
      ['ESTADISTICAS'].join('\t'),
      ['Promedio Diario', '', (totals.total / sortedDays.length).toFixed(2)].join('\t'),
      ['Promedio Pedidos/Dia', '', (totals.count / sortedDays.length).toFixed(2)].join('\t'),
      ['% Efectivo', '', ((totals.cash / totals.total) * 100).toFixed(1) + '%'].join('\t'),
      ['% Tarjeta', '', ((totals.card / totals.total) * 100).toFixed(1) + '%'].join('\t'),
      ['% Digital', '', ((totals.yape / totals.total) * 100).toFixed(1) + '%'].join('\t')
    ].join('\n');

    copyToClipboard(csvContent, "El desglose diario");
  };

  const handleExportItemsCSV = () => {
    if (!sales || sales.length === 0) {
      toast({ title: "No hay datos", description: "No hay ventas para exportar.", variant: "destructive" });
      return;
    }

    if (!allSaleItems || allSaleItems.length === 0) {
      toast({ title: "Sin items", description: "No se encontraron detalles de items para exportar.", variant: "destructive" });
      return;
    }

    const salesIds = new Set(sales.map(s => s.id));
    const relevantItems = allSaleItems.filter(item => salesIds.has(item.saleId));

    if (relevantItems.length === 0) {
      toast({ title: "Sin items", description: "No hay items asociados a las ventas de este mes.", variant: "destructive" });
      return;
    }

    const headers = [
      'ID Venta', 'Fecha', 'Producto', 'Cantidad', 'Precio Unit.', 'Total Línea', 'Cliente'
    ];

    const csvContent = [
      headers.join(','),
      ...relevantItems.map(item => {
        const sale = sales.find(s => s.id === item.saleId);
        const date = sale?.saleDate.toDate();
        
        return [
          item.saleId,
          date ? format(date, 'dd/MM/yyyy HH:mm') : '',
          `"${item.productName || 'Producto'}"`,
          item.quantity,
          item.unitPrice.toFixed(2),
          (item.quantity * item.unitPrice).toFixed(2),
          `"${sale?.customerName || 'Público General'}"`
        ].join(',');
      })
    ].join('\n');

    copyToClipboard(csvContent, "El detalle de productos");
  };

  const currencyFormatter = new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
  });

  return (
    <Card className="col-span-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Historial de Ventas</CardTitle>
            <CardDescription>
              Lista detallada de ventas del mes
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center border rounded-md">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handlePreviousMonth}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-4 font-medium min-w-[140px] text-center capitalize">
                {format(currentMonth, 'MMMM yyyy', { locale: es })}
              </span>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleNextMonth}
                disabled={currentMonth > new Date()}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Exportar
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Opciones de Exportación</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleExportSalesCSV}>
                  Exportar Lista de Ventas
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportDailyCSV}>
                  Exportar Desglose Diario
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportItemsCSV}>
                  Exportar Detalle de Productos
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Método</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    Cargando ventas...
                  </TableCell>
                </TableRow>
              ) : sales?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    No hay ventas registradas en este periodo
                  </TableCell>
                </TableRow>
              ) : (
                sales?.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {format(sale.saleDate.toDate(), 'dd MMM yyyy', { locale: es })}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(sale.saleDate.toDate(), 'HH:mm')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{sale.customerName || 'Público General'}</span>
                        {sale.customerDocumentNumber && (
                          <span className="text-xs text-muted-foreground">
                            {sale.customerDocumentNumber}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">
                      {sale.paymentMethod}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        sale.sunatStatus === 'accepted' ? 'bg-green-100 text-green-800' :
                        sale.sunatStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {sale.sunatStatus === 'accepted' ? 'Aceptado' :
                         sale.sunatStatus === 'rejected' ? 'Rechazado' :
                         sale.sunatStatus === 'sent' ? 'Enviado' : 'Pendiente'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {currencyFormatter.format(sale.totalAmount)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
