import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PredictionForm } from "@/components/cash-prediction/prediction-form"
import { BrainCircuit } from "lucide-react"

export default function CashPredictionPage() {
  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto pb-4">
          <div className="flex flex-col items-center text-center mb-6">
            <BrainCircuit className="w-12 h-12 lg:w-14 lg:h-14 mb-3 text-primary"/>
            <h1 className="text-2xl lg:text-3xl font-headline font-bold">Predicción de Efectivo con IA</h1>
            <p className="text-sm text-muted-foreground mt-2">
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
      </div>
    </div>
  )
}
