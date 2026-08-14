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
            'rounded-xl border-[#E2E8F0] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-shadow',
            card.onClick && 'cursor-pointer hover:border-[#FF6B00]/25 hover:shadow-md'
          )}
          onClick={card.onClick}
        >
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#64748B]">{card.label}</p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-[#111827]">{card.value}</p>
                {card.trend && (
                  <p className="mt-2 text-sm font-medium text-[#FF6B00]">{card.trend}</p>
                )}
              </div>
              {card.icon && (
                <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', card.bg ?? 'bg-slate-50')}>
                  <card.icon className={cn('h-5 w-5', card.color ?? 'text-slate-600')} />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
