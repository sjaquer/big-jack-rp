import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { mockIngredients, mockProducts, mockOtherItems } from '@/lib/data';
import { format } from 'date-fns';

export default function InventoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-headline font-bold">Gestión de Inventario</h1>
        <p className="text-muted-foreground">Supervisa los niveles de stock de todos los artículos.</p>
      </div>

      <Tabs defaultValue="ingredients">
        <TabsList>
          <TabsTrigger value="ingredients">Ingredientes</TabsTrigger>
          <TabsTrigger value="products">Productos</TabsTrigger>
          <TabsTrigger value="other">Otros Artículos</TabsTrigger>
        </TabsList>

        <TabsContent value="ingredients">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Inventario de Ingredientes</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Stock Mínimo</TableHead>
                    <TableHead>Fecha de Vencimiento</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockIngredients.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.stock} {item.unit}</TableCell>
                      <TableCell>{item.minStock} {item.unit}</TableCell>
                      <TableCell>{format(new Date(item.expiryDate), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>
                        {item.stock <= item.minStock ? (
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
        </TabsContent>
        
        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Inventario de Productos Terminados</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Stock Actual</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockProducts.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell><Badge variant="outline">{item.sku}</Badge></TableCell>
                      <TableCell>{item.stock}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="other">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Inventario de Otros Artículos</CardTitle>
            </CardHeader>
            <CardContent>
               <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Stock Mínimo</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockOtherItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.stock}</TableCell>
                      <TableCell>{item.minStock}</TableCell>
                      <TableCell>
                        {item.stock <= item.minStock ? (
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
