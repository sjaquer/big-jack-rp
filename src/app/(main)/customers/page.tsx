'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCollection, useFirestore } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import type { Customer } from '@/lib/types';
import { CustomerForm } from '@/components/customers/customer-form';
import { Search, UserPlus, Edit, Users, TrendingUp, Award, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function CustomersPage() {
  const firestore = useFirestore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const customersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'customers');
  }, [firestore]);

  const { data: customers, isLoading } = useCollection<Customer>(customersQuery);

  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    if (!searchQuery.trim()) return customers;

    const query = searchQuery.toLowerCase();
    return customers.filter((customer) =>
      customer.firstName.toLowerCase().includes(query) ||
      customer.lastName?.toLowerCase().includes(query) ||
      customer.nickname?.toLowerCase().includes(query) ||
      customer.phone?.includes(query) ||
      customer.email?.toLowerCase().includes(query)
    );
  }, [customers, searchQuery]);

  const stats = useMemo(() => {
    if (!customers) return { totalCustomers: 0, totalSpent: 0, totalVisits: 0, avgPoints: 0 };

    const totalCustomers = customers.length;
    const totalSpent = customers.reduce((sum, c) => sum + c.totalSpent, 0);
    const totalVisits = customers.reduce((sum, c) => sum + c.totalVisits, 0);
    const avgPoints = totalCustomers > 0 ? customers.reduce((sum, c) => sum + c.loyaltyPoints, 0) / totalCustomers : 0;

    return { totalCustomers, totalSpent, totalVisits, avgPoints };
  }, [customers]);

  const topCustomers = useMemo(() => {
    if (!customers) return [];
    return [...customers]
      .sort((a, b) => b.loyaltyPoints - a.loyaltyPoints)
      .slice(0, 5);
  }, [customers]);

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowCustomerForm(true);
  };

  const handleCloseForm = () => {
    setShowCustomerForm(false);
    setSelectedCustomer(null);
  };

  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 to-purple-50/20">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto w-full px-3 sm:px-6 py-4 sm:py-6 space-y-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl lg:text-4xl font-headline font-bold text-slate-900 tracking-tight">Gestión de Clientes</h1>
              <p className="text-base text-slate-600 mt-1">Sistema de lealtad y base de datos de clientes</p>
            </div>
            <Button
              onClick={() => {
                setSelectedCustomer(null);
                setShowCustomerForm(true);
              }}
              className="h-12 px-6 text-base w-full sm:w-auto touch-manipulation font-semibold shadow-sm hover:shadow-md transition-shadow"
            >
              <UserPlus className="mr-2 h-5 w-5" />
              Nuevo Cliente
            </Button>
          </div>

        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="shadow-md border-slate-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalCustomers}</div>
                <p className="text-xs text-muted-foreground">Clientes registrados</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">S/ {stats.totalSpent.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">De clientes registrados</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Visitas Totales</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalVisits}</div>
                <p className="text-xs text-muted-foreground">Visitas acumuladas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Puntos Promedio</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.avgPoints.toFixed(0)}</div>
                <p className="text-xs text-muted-foreground">Puntos por cliente</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="font-headline">Clientes Registrados</CardTitle>
                <CardDescription>Lista completa de clientes y su información</CardDescription>
                <div className="pt-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nombre, teléfono, email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 h-12 text-base"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-center text-muted-foreground py-8">Cargando clientes...</p>
                ) : filteredCustomers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>{searchQuery ? 'No se encontraron clientes' : 'No hay clientes registrados'}</p>
                    {!searchQuery && (
                      <Button variant="link" onClick={() => setShowCustomerForm(true)} className="mt-2">
                        Registrar primer cliente
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="rounded-md border overflow-x-auto">
                    <Table className="min-w-[600px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cliente</TableHead>
                          <TableHead className="hidden sm:table-cell">Contacto</TableHead>
                          <TableHead className="text-center">Visitas</TableHead>
                          <TableHead className="text-center">Puntos</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCustomers.map((customer) => (
                          <TableRow key={customer.id}>
                            <TableCell>
                              <div className="space-y-1">
                                <p className="font-medium">
                                  {customer.nickname || `${customer.firstName} ${customer.lastName || ''}`.trim()}
                                </p>
                                {customer.allergies && customer.allergies.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {customer.allergies.map((allergy, idx) => (
                                      <Badge key={idx} variant="destructive" className="text-xs">
                                        {allergy}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <div className="text-sm space-y-0.5">
                                {customer.phone && <p>{customer.phone}</p>}
                                {customer.email && <p className="text-muted-foreground">{customer.email}</p>}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline">{customer.totalVisits}</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary">{customer.loyaltyPoints}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditCustomer(customer)}
                                className="h-10 sm:h-9 touch-manipulation"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-headline">Top Clientes</CardTitle>
                <CardDescription>Clientes con más puntos de lealtad</CardDescription>
              </CardHeader>
              <CardContent>
                {topCustomers.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-4">No hay datos disponibles</p>
                ) : (
                  <div className="space-y-4">
                    {topCustomers.map((customer, idx) => (
                      <div key={customer.id} className="flex items-start gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
                          {idx + 1}
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="font-medium text-sm leading-none">
                            {customer.nickname || `${customer.firstName} ${customer.lastName || ''}`.trim()}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{customer.totalVisits} visitas</span>
                            <span>•</span>
                            <span>S/ {customer.totalSpent.toFixed(0)}</span>
                          </div>
                          {customer.lastVisit && (
                            <p className="text-xs text-muted-foreground">
                              Última visita: {format(customer.lastVisit.toDate(), 'dd/MM/yyyy', { locale: es })}
                            </p>
                          )}
                        </div>
                        <Badge variant="secondary" className="font-semibold">
                          {customer.loyaltyPoints} pts
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          </div>
        </div>
      </div>

      <CustomerForm open={showCustomerForm} onOpenChange={handleCloseForm} customer={selectedCustomer} onSuccess={handleCloseForm} />
    </div>
  );
}
