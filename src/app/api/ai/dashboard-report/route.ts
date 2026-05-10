import { NextResponse } from 'next/server';
import { z } from 'zod';
import { generateDashboardReport } from '@/ai/flows/generate-dashboard-report';

const MetricItemSchema = z.object({
  label: z.string(),
  value: z.number(),
  trend: z.number().optional(),
});

const RequestSchema = z.object({
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
  metrics: z.array(MetricItemSchema).default([]),
});

function buildTraditionalInsights(input: z.infer<typeof RequestSchema>): string[] {
  const insights: string[] = [];

  insights.push(`Turno actual: ${input.shiftOrders} pedidos y S/ ${input.shiftRevenue.toFixed(2)}.`);

  if (input.growthRate >= 10) {
    insights.push(`Crecimiento mensual fuerte de ${input.growthRate.toFixed(1)}%. Conviene sostener inventario y atención.`);
  } else if (input.growthRate <= -5) {
    insights.push(`Caída mensual de ${Math.abs(input.growthRate).toFixed(1)}%. Conviene revisar promociones y conversión.`);
  } else {
    insights.push(`Crecimiento mensual estable de ${input.growthRate.toFixed(1)}%.`);
  }

  if (input.shiftAvgTicket < 15) {
    insights.push(`Ticket promedio bajo en S/ ${input.shiftAvgTicket.toFixed(2)}. Hay margen para upselling.`);
  } else {
    insights.push(`Ticket promedio saludable en S/ ${input.shiftAvgTicket.toFixed(2)}.`);
  }

  if (input.lowStockIngredients > 0 || input.lowStockProducts > 0) {
    insights.push(`Atención de stock: ${input.lowStockIngredients} ingredientes y ${input.lowStockProducts} productos con inventario bajo.`);
  } else {
    insights.push('Inventario estable sin alertas de stock bajo.');
  }

  return insights;
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.json();
    const parsed = RequestSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Payload inválido para generar el reporte IA.' },
        { status: 400 }
      );
    }

    const input = parsed.data;
    const traditionalInsights = buildTraditionalInsights(input);

    const generativeReport = await generateDashboardReport({
      ...input,
      traditionalInsights,
    });

    return NextResponse.json({
      traditionalInsights,
      generativeReport,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error generating dashboard report:', error);
    return NextResponse.json(
      { error: 'No se pudo generar el reporte IA.' },
      { status: 500 }
    );
  }
}