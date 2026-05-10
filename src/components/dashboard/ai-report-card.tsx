'use client';

import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Sparkles, ShieldCheck, AlertTriangle, Lightbulb } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type AIReportResponse = {
  traditionalInsights: string[];
  generativeReport: {
    title: string;
    executiveSummary: string;
    keyFindings: string[];
    risks: string[];
    opportunities: string[];
    actionPlan: string[];
    closingNote: string;
  } | null;
  generatedAt: string | null;
  error?: string;
};

interface AIReportCardProps {
  shiftRevenue: number;
  shiftOrders: number;
  shiftAvgTicket: number;
  monthRevenue: number;
  monthOrders: number;
  growthRate: number;
  lowStockIngredients: number;
  lowStockProducts: number;
  lowStockIngredientNames: string[];
  lowStockProductNames: string[];
}

export function AIReportCard(props: AIReportCardProps) {
  const [report, setReport] = useState<AIReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestBody = useMemo(() => ({
    reportDate: new Date().toISOString(),
    shiftRevenue: props.shiftRevenue,
    shiftOrders: props.shiftOrders,
    shiftAvgTicket: props.shiftAvgTicket,
    monthRevenue: props.monthRevenue,
    monthOrders: props.monthOrders,
    growthRate: props.growthRate,
    lowStockIngredients: props.lowStockIngredients,
    lowStockProducts: props.lowStockProducts,
    lowStockIngredientNames: props.lowStockIngredientNames,
    lowStockProductNames: props.lowStockProductNames,
    metrics: [
      { label: 'Ventas del turno', value: props.shiftRevenue },
      { label: 'Pedidos del turno', value: props.shiftOrders },
      { label: 'Ticket promedio', value: props.shiftAvgTicket },
      { label: 'Ventas del mes', value: props.monthRevenue },
      { label: 'Pedidos del mes', value: props.monthOrders },
      { label: 'Crecimiento mensual', value: props.growthRate },
    ],
  }), [props]);

  const loadReport = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/dashboard-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const payload = (await response.json()) as AIReportResponse;

      if (!response.ok) {
        throw new Error(payload.error || 'No se pudo generar el reporte IA.');
      }

      setReport(payload);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo generar el reporte IA.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestBody.shiftRevenue, requestBody.shiftOrders, requestBody.monthRevenue, requestBody.monthOrders, requestBody.growthRate, requestBody.lowStockIngredients, requestBody.lowStockProducts]);

  return (
    <Card className="border-teal-200/70 bg-gradient-to-br from-white to-teal-50/35 dark:from-slate-900 dark:to-slate-800">
      <CardHeader className="space-y-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-teal-700" />
            <CardTitle className="font-headline">Reporte automático IA</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Tradicional + Gemini</Badge>
            <Button variant="outline" size="sm" onClick={loadReport} disabled={isLoading}>
              <RefreshCw className={isLoading ? 'mr-2 h-4 w-4 animate-spin' : 'mr-2 h-4 w-4'} />
              Actualizar
            </Button>
          </div>
        </div>
        <CardDescription>
          Resumen ejecutivo generado con reglas de negocio y Gemini para decisiones rápidas.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3 rounded-2xl border border-border/70 bg-background/80 p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <h3 className="font-semibold">IA tradicional</h3>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {report?.traditionalInsights?.length ? report.traditionalInsights.map((item, index) => (
                <li key={index} className="rounded-lg border border-border/60 bg-muted/20 p-2.5">{item}</li>
              )) : (
                <li className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
                  {isLoading ? 'Analizando métricas...' : 'Sin análisis disponible todavía.'}
                </li>
              )}
            </ul>
          </div>

          <div className="space-y-3 rounded-2xl border border-border/70 bg-background/80 p-4">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-teal-700" />
              <h3 className="font-semibold">IA generativa</h3>
            </div>
            {report?.generativeReport ? (
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Título</p>
                  <p className="font-semibold text-foreground">{report.generativeReport.title}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Resumen</p>
                  <p className="text-muted-foreground leading-relaxed">{report.generativeReport.executiveSummary}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Acciones</p>
                  <ul className="mt-2 space-y-2">
                    {report.generativeReport.actionPlan.map((item, index) => (
                      <li key={index} className="rounded-lg border border-border/60 bg-muted/20 p-2.5">{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {isLoading ? 'Generando reporte con Gemini...' : 'El reporte aparecerá aquí al finalizar el análisis.'}
              </p>
            )}
          </div>
        </div>

        {report?.generativeReport && (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Hallazgos</p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {report.generativeReport.keyFindings.slice(0, 3).map((item, index) => <li key={index}>• {item}</li>)}
              </ul>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Riesgos</p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {report.generativeReport.risks.slice(0, 3).map((item, index) => <li key={index}>• {item}</li>)}
              </ul>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Oportunidades</p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {report.generativeReport.opportunities.slice(0, 3).map((item, index) => <li key={index}>• {item}</li>)}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}