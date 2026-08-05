import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/utils/cn';
import type { LucideIcon } from 'lucide-react';

export interface SummaryCardItem {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  color?: string;
  bg?: string;
  trend?: string;
  onClick?: () => void;
}

interface SummaryCardsProps {
  items: SummaryCardItem[];
  columns?: string;
}

export function SummaryCards({ items, columns = 'sm:grid-cols-2 lg:grid-cols-3' }: SummaryCardsProps) {
  return (
    <div className={cn('grid grid-cols-1 gap-4', columns)}>
      {items.map((card) => (
        <Card
          key={card.label}
          className={cn(
            'transition-shadow',
            card.onClick && 'cursor-pointer hover:shadow-md hover:border-blue-200'
          )}
          onClick={card.onClick}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
                <p className="text-3xl font-bold mt-1">{card.value}</p>
                {card.trend && (
                  <p className="text-xs text-muted-foreground mt-1">{card.trend}</p>
                )}
              </div>
              {card.icon && (
                <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl', card.bg ?? 'bg-slate-50')}>
                  <card.icon className={cn('h-6 w-6', card.color ?? 'text-slate-600')} />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
