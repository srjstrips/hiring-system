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
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium uppercase tracking-wide text-[#64748B]">{card.label}</p>
                <p className="mt-1 text-2xl font-bold tracking-tight text-[#111827] leading-none">{card.value}</p>
                {card.trend && (
                  <p className="mt-1.5 text-xs font-medium text-[#FF6B00]">{card.trend}</p>
                )}
              </div>
              {card.icon && (
                <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', card.bg ?? 'bg-slate-50')}>
                  <card.icon className={cn('h-4 w-4', card.color ?? 'text-slate-600')} />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
