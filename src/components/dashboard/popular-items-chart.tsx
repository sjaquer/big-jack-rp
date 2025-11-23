'use client';
import type { Product } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

interface PopularItemsChartProps {
  data: Product[];
  isLoading: boolean;
}

export function PopularItemsChart({ data, isLoading }: PopularItemsChartProps) {
  // Mocking popularity based on stock (lower stock = more sold)
  const sortedData = [...data]
    .filter(p => p.id && !['6','7','8'].includes(p.id)) // Exclude sides/drinks
    .sort((a, b) => a.quantity - b.quantity)
    .slice(0, 5);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-3/4 ml-2" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {sortedData.map((item, index) => (
        <div key={item.id} className="flex items-center">
          <div className="text-sm font-medium">
            {index + 1}. {item.name}
          </div>
          <div className="ml-auto text-sm font-semibold">
            {100 - item.quantity} vendidos
          </div>
        </div>
      ))}
    </div>
  );
}
