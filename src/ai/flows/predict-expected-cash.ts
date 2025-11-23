'use server';

/**
 * @fileOverview Predicts expected cash levels in Peruvian Soles (PEN) for efficient closing and opening procedures.
 *
 * - predictExpectedCash - A function that handles the cash prediction process.
 * - PredictExpectedCashInput - The input type for the predictExpectedCash function.
 * - PredictExpectedCashOutput - The return type for the predictExpectedCash function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PredictExpectedCashInputSchema = z.object({
  dailySales: z
    .number()
    .describe('The total sales in Peruvian Soles (PEN) for the day.'),
  previousDayCashBalance: z
    .number()
    .describe(
      'The total cash balance in Peruvian Soles (PEN) at the end of the previous day.'
    ),
  expectedOnlineOrders: z
    .number()
    .describe(
      'The expected value of online orders to be paid in cash, in Peruvian Soles (PEN).'
    ),
  expectedCashExpenses: z
    .number()
    .describe(
      'The expected cash expenses for the day, in Peruvian Soles (PEN).'
    ),
});
export type PredictExpectedCashInput = z.infer<typeof PredictExpectedCashInputSchema>;

const PredictExpectedCashOutputSchema = z.object({
  predictedCashBalance: z
    .number()
    .describe(
      'The predicted cash balance in Peruvian Soles (PEN) at the end of the day.'
    ),
  recommendations: z
    .string()
    .describe(
      'Recommendations for managing cash based on the prediction (e.g., deposit excess cash, prepare change).'
    ),
});
export type PredictExpectedCashOutput = z.infer<typeof PredictExpectedCashOutputSchema>;

export async function predictExpectedCash(
  input: PredictExpectedCashInput
): Promise<PredictExpectedCashOutput> {
  return predictExpectedCashFlow(input);
}

const prompt = ai.definePrompt({
  name: 'predictExpectedCashPrompt',
  input: {schema: PredictExpectedCashInputSchema},
  output: {schema: PredictExpectedCashOutputSchema},
  prompt: `You are an expert financial advisor for a Peruvian business. Based on the following information, predict the expected cash balance at the end of the day in Peruvian Soles (PEN) and provide recommendations for cash management. Consider factors like daily sales, previous day\'s cash balance, expected online orders paid in cash, and expected cash expenses.

Daily Sales (PEN): {{{dailySales}}}
Previous Day Cash Balance (PEN): {{{previousDayCashBalance}}}
Expected Online Orders (PEN): {{{expectedOnlineOrders}}}
Expected Cash Expenses (PEN): {{{expectedCashExpenses}}}

Provide a predicted cash balance and recommendations for managing the cash. The prediction should take into account all monetary values provided. Be precise with the calculations. The recommendation should include actions such as whether to deposit excess cash or prepare change for the next day.

Predicted Cash Balance (PEN):
Recommendations: `,
});

const predictExpectedCashFlow = ai.defineFlow(
  {
    name: 'predictExpectedCashFlow',
    inputSchema: PredictExpectedCashInputSchema,
    outputSchema: PredictExpectedCashOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
