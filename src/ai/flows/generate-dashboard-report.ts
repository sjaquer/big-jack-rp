'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const DashboardMetricItemSchema = z.object({
  label: z.string(),
  value: z.number(),
  trend: z.number().optional(),
});

const GenerateDashboardReportInputSchema = z.object({
  reportDate: z.string(),
  shiftRevenue: z.number(),
  shiftOrders: z.number(),
  shiftAvgTicket: z.number(),
  monthRevenue: z.number(),
  monthOrders: z.number(),
  growthRate: z.number(),
  lowStockIngredients: z.number(),
  lowStockProducts: z.number(),
  lowStockIngredientNames: z.array(z.string()).default([]),
  lowStockProductNames: z.array(z.string()).default([]),
  traditionalInsights: z.array(z.string()).default([]),
  metrics: z.array(DashboardMetricItemSchema).default([]),
});

export type GenerateDashboardReportInput = z.infer<typeof GenerateDashboardReportInputSchema>;

const GenerateDashboardReportOutputSchema = z.object({
  title: z.string(),
  executiveSummary: z.string(),
  keyFindings: z.array(z.string()),
  risks: z.array(z.string()),
  opportunities: z.array(z.string()),
  actionPlan: z.array(z.string()),
  closingNote: z.string(),
});

export type GenerateDashboardReportOutput = z.infer<typeof GenerateDashboardReportOutputSchema>;

export async function generateDashboardReport(
  input: GenerateDashboardReportInput
): Promise<GenerateDashboardReportOutput> {
  return generateDashboardReportFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateDashboardReportPrompt',
  input: { schema: GenerateDashboardReportInputSchema },
  output: { schema: GenerateDashboardReportOutputSchema },
  prompt: `Eres un analista senior de operaciones para una hamburguesería. Genera un reporte ejecutivo claro, breve y accionable en español.

Fecha del reporte: {{{reportDate}}}

KPIs:
- Ventas del turno: S/ {{{shiftRevenue}}}
- Pedidos del turno: {{{shiftOrders}}}
- Ticket promedio del turno: S/ {{{shiftAvgTicket}}}
- Ventas del mes: S/ {{{monthRevenue}}}
- Pedidos del mes: {{{monthOrders}}}
- Crecimiento mensual: {{{growthRate}}}%
- Ingredientes con stock bajo: {{{lowStockIngredients}}}
- Productos con stock bajo: {{{lowStockProducts}}}

Ingredientes con stock bajo: {{#each lowStockIngredientNames}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
Productos con stock bajo: {{#each lowStockProductNames}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}

Contexto de análisis tradicional ya calculado:
{{#each traditionalInsights}}- {{{this}}}
{{/each}}

Métricas adicionales:
{{#each metrics}}- {{{label}}}: {{{value}}}{{#if trend}} (tendencia {{{trend}}}%){{/if}}
{{/each}}

Devuelve:
- Un título ejecutivo corto.
- Un resumen de 2 o 3 frases.
- Hallazgos clave en lista.
- Riesgos en lista.
- Oportunidades en lista.
- Un plan de acción en 3 a 5 pasos.
- Una nota de cierre breve.

No menciones que eres una IA. Mantén el lenguaje práctico y orientado a negocio.
`,
});

const generateDashboardReportFlow = ai.defineFlow(
  {
    name: 'generateDashboardReportFlow',
    inputSchema: GenerateDashboardReportInputSchema,
    outputSchema: GenerateDashboardReportOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);