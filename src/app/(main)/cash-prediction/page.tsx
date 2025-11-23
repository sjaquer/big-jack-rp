import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PredictionForm } from "@/components/cash-prediction/prediction-form"
import { BrainCircuit } from "lucide-react"

export default function CashPredictionPage() {
  return (
    <div className="container mx-auto max-w-2xl py-8">
      <div className="flex flex-col items-center text-center mb-8">
        <BrainCircuit className="w-16 h-16 mb-4 text-primary"/>
        <h1 className="text-3xl font-headline font-bold">Predicción de Efectivo con IA</h1>
        <p className="text-muted-foreground mt-2">
          Utiliza IA para predecir los niveles de efectivo esperados y optimizar la gestión de tu caja.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Ingresar Datos para Predicción</CardTitle>
          <CardDescription>
            Completa los siguientes campos para obtener una predicción del saldo de caja al final del día.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PredictionForm />
        </CardContent>
      </Card>
    </div>
  )
}
