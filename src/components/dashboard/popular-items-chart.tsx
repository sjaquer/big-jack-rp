import type { Product } from '@/lib/types';

interface PopularItemsChartProps {
  data: Product[];
}

export function PopularItemsChart({ data }: PopularItemsChartProps) {
  // Mocking popularity based on stock (lower stock = more sold)
  const sortedData = [...data]
    .filter(p => p.id && !['6','7','8'].includes(p.id)) // Exclude sides/drinks
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 5);

  return (
    <div className="space-y-4">
      {sortedData.map((item, index) => (
        <div key={item.id} className="flex items-center">
          <div className="text-sm font-medium">
            {index + 1}. {item.name}
          </div>
          <div className="ml-auto text-sm font-semibold">
            {100 - item.stock} vendidos
          </div>
        </div>
      ))}
    </div>
  );
}
