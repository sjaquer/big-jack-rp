'use client';
import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle,
  DollarSign,
  ArrowDownCircle,
  ArrowUpCircle,
  Clock,
  Calculator
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger 
} from '@/components/ui/dialog';
import { useFirestore, useCollection, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, where, Timestamp, orderBy, limit, doc } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface CashRegisterData {
  id: string;
  openingBalance: number;
  currentBalance: number;
  totalIncome: number;
  totalExpense: number;
  openedAt: Timestamp;
  closedAt?: Timestamp;
  status: 'open' | 'closed';
  cashier: string;
  notes?: string;
}

interface CashMovement {
  id: string;
  registerId: string;
  type: 'income' | 'expense' | 'sale' | 'change';
  amount: number;
  description: string;
  createdAt: Timestamp;
  cashier: string;
}

const currencyFormatter = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  minimumFractionDigits: 2,
});

interface CashRegisterProps {
  onBalanceUpdate?: (balance: number) => void;
  userEmail: string | null;
}

export function CashRegister({ onBalanceUpdate, userEmail }: CashRegisterProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [openingAmount, setOpeningAmount] = useState('100.00');
  const [isOpenDialogOpen, setIsOpenDialogOpen] = useState(false);
  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false);
  const [isMovementDialogOpen, setIsMovementDialogOpen] = useState(false);
  const [movementType, setMovementType] = useState<'income' | 'expense'>('income');
  const [movementAmount, setMovementAmount] = useState('');
  const [movementDescription, setMovementDescription] = useState('');

  // Query para la caja actual (abierta)
  const currentRegisterQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'cash_registers'),
      where('status', '==', 'open'),
      orderBy('openedAt', 'desc'),
      limit(1)
    );
  }, [firestore]);

  const { data: currentRegisterData } = useCollection<CashRegisterData>(currentRegisterQuery);
  const currentRegister = currentRegisterData?.[0];

  // Query para movimientos de la caja actual
  const movementsQuery = useMemoFirebase(() => {
    if (!firestore || !currentRegister) return null;
    return query(
      collection(firestore, 'cash_movements'),
      where('registerId', '==', currentRegister.id),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
  }, [firestore, currentRegister?.id]);

  const { data: movements } = useCollection<CashMovement>(movementsQuery);

  // Actualizar balance cuando cambia
  useEffect(() => {
    if (currentRegister && onBalanceUpdate) {
      onBalanceUpdate(currentRegister.currentBalance);
    }
  }, [currentRegister?.currentBalance, onBalanceUpdate]);

  const handleOpenRegister = async () => {
    if (!firestore || !userEmail) {
      toast({ variant: 'destructive', title: 'Error', description: 'No hay usuario autenticado' });
      return;
    }

    const amount = parseFloat(openingAmount);
    if (isNaN(amount) || amount < 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'Ingresa un monto válido' });
      return;
    }

    try {
      const cashRegistersCol = collection(firestore, 'cash_registers');
      await addDocumentNonBlocking(cashRegistersCol, {
        openingBalance: amount,
        currentBalance: amount,
        totalIncome: 0,
        totalExpense: 0,
        openedAt: Timestamp.now(),
        status: 'open',
        cashier: userEmail,
        notes: '',
      });

      toast({ title: 'Caja abierta', description: `Saldo inicial: ${currencyFormatter.format(amount)}` });
      setIsOpenDialogOpen(false);
      setOpeningAmount('100.00');
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo abrir la caja' });
    }
  };

  const handleCloseRegister = async () => {
    if (!firestore || !currentRegister) return;

    try {
      const registerDoc = doc(firestore, 'cash_registers', currentRegister.id);
      await updateDocumentNonBlocking(registerDoc, {
        closedAt: Timestamp.now(),
        status: 'closed',
      });

      toast({ title: 'Caja cerrada', description: `Saldo final: ${currencyFormatter.format(currentRegister.currentBalance)}` });
      setIsCloseDialogOpen(false);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cerrar la caja' });
    }
  };

  const handleAddMovement = async () => {
    if (!firestore || !currentRegister || !userEmail) return;

    const amount = parseFloat(movementAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'Ingresa un monto válido' });
      return;
    }

    if (!movementDescription.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Ingresa una descripción' });
      return;
    }

    try {
      // Crear movimiento
      const cashMovementsCol = collection(firestore, 'cash_movements');
      await addDocumentNonBlocking(cashMovementsCol, {
        registerId: currentRegister.id,
        type: movementType,
        amount: amount,
        description: movementDescription,
        createdAt: Timestamp.now(),
        cashier: userEmail,
      });

      // Actualizar balance de la caja
      const newBalance = movementType === 'income' 
        ? currentRegister.currentBalance + amount
        : currentRegister.currentBalance - amount;

      const newTotalIncome = movementType === 'income'
        ? currentRegister.totalIncome + amount
        : currentRegister.totalIncome;

      const newTotalExpense = movementType === 'expense'
        ? currentRegister.totalExpense + amount
        : currentRegister.totalExpense;

      const registerDoc = doc(firestore, 'cash_registers', currentRegister.id);
      await updateDocumentNonBlocking(registerDoc, {
        currentBalance: newBalance,
        totalIncome: newTotalIncome,
        totalExpense: newTotalExpense,
      });

      toast({ 
        title: movementType === 'income' ? 'Ingreso registrado' : 'Egreso registrado', 
        description: currencyFormatter.format(amount) 
      });

      setIsMovementDialogOpen(false);
      setMovementAmount('');
      setMovementDescription('');
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo registrar el movimiento' });
    }
  };

  const stats = useMemo(() => {
    if (!currentRegister) return null;

    const salesMovements = (movements ?? []).filter(m => m.type === 'sale');
    const totalSales = salesMovements.reduce((sum, m) => sum + m.amount, 0);
    const salesCount = salesMovements.length;

    return {
      openingBalance: currentRegister.openingBalance,
      currentBalance: currentRegister.currentBalance,
      totalIncome: currentRegister.totalIncome,
      totalExpense: currentRegister.totalExpense,
      totalSales,
      salesCount,
      netChange: currentRegister.currentBalance - currentRegister.openingBalance,
      openedAt: currentRegister.openedAt.toDate(),
    };
  }, [currentRegister, movements]);

  if (!currentRegister) {
    return (
      <Card className="border-orange-200 bg-gradient-to-br from-white to-orange-50/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-orange-600" />
            <CardTitle className="font-headline">Caja Chica</CardTitle>
          </div>
          <CardDescription>La caja está cerrada. Ábrela para empezar a vender.</CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog open={isOpenDialogOpen} onOpenChange={setIsOpenDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full" size="lg">
                <Wallet className="mr-2 h-5 w-5" />
                Abrir Caja
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Abrir Caja Chica</DialogTitle>
                <DialogDescription>Ingresa el monto inicial en efectivo con el que inicias el turno</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="opening-amount">Monto Inicial (S/)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="opening-amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={openingAmount}
                      onChange={(e) => setOpeningAmount(e.target.value)}
                      className="pl-10"
                      placeholder="100.00"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Este será tu saldo inicial para dar vueltos</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsOpenDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleOpenRegister}>Abrir Caja</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Card principal */}
      <Card className="border-green-200 bg-gradient-to-br from-white to-green-50/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-green-600" />
              <CardTitle className="font-headline">Caja Chica</CardTitle>
            </div>
            <Badge variant="default" className="bg-green-600">Abierta</Badge>
          </div>
          <CardDescription>
            Abierta: {stats && format(stats.openedAt, "dd MMM, HH:mm", { locale: es })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Saldo actual */}
          <div className="p-4 rounded-lg bg-white border-2 border-green-200">
            <p className="text-sm text-muted-foreground mb-1">Efectivo en Caja</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-green-600">
                {stats && currencyFormatter.format(stats.currentBalance)}
              </p>
              {stats && stats.netChange !== 0 && (
                <Badge variant={stats.netChange > 0 ? 'default' : 'destructive'} className="text-xs">
                  {stats.netChange > 0 ? '+' : ''}{currencyFormatter.format(stats.netChange)}
                </Badge>
              )}
            </div>
          </div>

          {/* Resumen */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-2 mb-1">
                <ArrowUpCircle className="h-4 w-4 text-green-600" />
                <p className="text-xs text-muted-foreground">Ingresos</p>
              </div>
              <p className="text-lg font-semibold">{stats && currencyFormatter.format(stats.totalIncome)}</p>
            </div>

            <div className="p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-2 mb-1">
                <ArrowDownCircle className="h-4 w-4 text-red-600" />
                <p className="text-xs text-muted-foreground">Egresos</p>
              </div>
              <p className="text-lg font-semibold">{stats && currencyFormatter.format(stats.totalExpense)}</p>
            </div>

            <div className="p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-blue-600" />
                <p className="text-xs text-muted-foreground">Ventas</p>
              </div>
              <p className="text-lg font-semibold">{stats && currencyFormatter.format(stats.totalSales)}</p>
              <p className="text-xs text-muted-foreground">{stats?.salesCount} pedidos</p>
            </div>

            <div className="p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-2 mb-1">
                <Calculator className="h-4 w-4 text-purple-600" />
                <p className="text-xs text-muted-foreground">Apertura</p>
              </div>
              <p className="text-lg font-semibold">{stats && currencyFormatter.format(stats.openingBalance)}</p>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="grid grid-cols-2 gap-2">
            <Dialog open={isMovementDialogOpen} onOpenChange={setIsMovementDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => setMovementType('income')}>
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Ingreso
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Registrar {movementType === 'income' ? 'Ingreso' : 'Egreso'}</DialogTitle>
                  <DialogDescription>
                    {movementType === 'income' ? 'Dinero que entra a la caja' : 'Dinero que sale de la caja'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={movementType === 'income' ? 'default' : 'outline'}
                        onClick={() => setMovementType('income')}
                      >
                        <TrendingUp className="mr-2 h-4 w-4" />
                        Ingreso
                      </Button>
                      <Button
                        variant={movementType === 'expense' ? 'default' : 'outline'}
                        onClick={() => setMovementType('expense')}
                      >
                        <TrendingDown className="mr-2 h-4 w-4" />
                        Egreso
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="movement-amount">Monto (S/)</Label>
                    <Input
                      id="movement-amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={movementAmount}
                      onChange={(e) => setMovementAmount(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="movement-desc">Descripción</Label>
                    <Input
                      id="movement-desc"
                      value={movementDescription}
                      onChange={(e) => setMovementDescription(e.target.value)}
                      placeholder="Ej. Compra de insumos"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsMovementDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={handleAddMovement}>Registrar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isCloseDialogOpen} onOpenChange={setIsCloseDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <AlertCircle className="mr-2 h-4 w-4" />
                  Cerrar Caja
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Cerrar Caja</DialogTitle>
                  <DialogDescription>
                    ¿Estás seguro de cerrar la caja? Verifica que el efectivo coincida con el saldo.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-4">
                  <div className="p-4 rounded-lg bg-muted">
                    <p className="text-sm font-medium mb-2">Resumen Final</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Apertura:</span>
                        <span className="font-medium">{stats && currencyFormatter.format(stats.openingBalance)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Ingresos:</span>
                        <span className="font-medium text-green-600">+{stats && currencyFormatter.format(stats.totalIncome)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Egresos:</span>
                        <span className="font-medium text-red-600">-{stats && currencyFormatter.format(stats.totalExpense)}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t">
                        <span className="font-semibold">Saldo Final:</span>
                        <span className="font-bold text-lg">{stats && currencyFormatter.format(stats.currentBalance)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCloseDialogOpen(false)}>Cancelar</Button>
                  <Button variant="destructive" onClick={handleCloseRegister}>Cerrar Caja</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Últimos movimientos */}
      {movements && movements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-headline">Últimos Movimientos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {movements.slice(0, 5).map((movement) => (
                <div key={movement.id} className="flex items-center justify-between p-2 rounded border bg-muted/20">
                  <div className="flex items-center gap-2">
                    {movement.type === 'income' || movement.type === 'sale' ? (
                      <ArrowUpCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <ArrowDownCircle className="h-4 w-4 text-red-600" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{movement.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(movement.createdAt.toDate(), "HH:mm", { locale: es })}
                      </p>
                    </div>
                  </div>
                  <p className={`text-sm font-semibold ${
                    movement.type === 'income' || movement.type === 'sale' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {movement.type === 'income' || movement.type === 'sale' ? '+' : '-'}
                    {currencyFormatter.format(movement.amount)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
