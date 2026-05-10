import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  description?: string;
  className?: string;
}

export default function StatCard({ title, value, icon: Icon, description, className }: StatCardProps) {
  return (
    <Card className={cn("card-touch h-full border-border/70", className)}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-1 sm:pb-1.5">
        <CardTitle className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground leading-snug">{title}</CardTitle>
        <div className="rounded-lg bg-primary/10 p-1.5 sm:p-2">
          <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-base sm:text-2xl font-bold tracking-tight truncate">{value}</div>
        {description && <p className="text-[10px] sm:text-xs text-muted-foreground leading-snug mt-0.5 line-clamp-2">{description}</p>}
      </CardContent>
    </Card>
  );
}
