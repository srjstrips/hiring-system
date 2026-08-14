import { SearchInput } from './SearchInput';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';

export interface FilterField {
  key: string;
  label: string;
  type?: 'select' | 'date' | 'text';
  options?: { value: string; label: string }[];
  placeholder?: string;
}

interface FilterBarProps {
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters: FilterField[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onClear?: () => void;
  onExport?: () => void;
}

export function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters,
  values,
  onChange,
  onClear,
  onExport,
}: FilterBarProps) {
  const hasActive = Object.values(values).some(Boolean) || !!search;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        {onSearchChange && (
          <div className="w-full sm:min-w-[200px] sm:flex-1">
            <SearchInput
              value={search ?? ''}
              onChange={onSearchChange}
              placeholder={searchPlaceholder}
              className="w-full"
            />
          </div>
        )}
        {filters.map((f) => {
          if (f.type === 'date') {
            return (
              <div key={f.key} className="flex min-w-[140px] flex-1 flex-col gap-1 sm:flex-none">
                <label className="text-xs font-medium text-[#64748B]">{f.label}</label>
                <input
                  type="date"
                  className="h-10 rounded-xl border border-[#E2E8F0] bg-white px-3 text-sm text-[#111827] focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/25"
                  value={values[f.key] ?? ''}
                  onChange={(e) => onChange(f.key, e.target.value)}
                />
              </div>
            );
          }
          return (
            <div key={f.key} className="flex min-w-[140px] flex-1 flex-col gap-1 sm:flex-none">
              <label className="text-xs font-medium text-[#64748B]">{f.label}</label>
              <select
                className="h-10 min-w-[140px] rounded-xl border border-[#E2E8F0] bg-white px-3 text-sm text-[#111827] focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/25"
                value={values[f.key] ?? ''}
                onChange={(e) => onChange(f.key, e.target.value)}
              >
                <option value="">{f.placeholder ?? `All ${f.label}`}</option>
                {(f.options ?? []).map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          );
        })}
        <div className="ml-auto flex items-end gap-2">
          {hasActive && onClear && (
            <Button type="button" variant="ghost" size="sm" className="h-10 rounded-xl text-[#64748B]" onClick={onClear}>
              <X className="mr-1 h-4 w-4" /> Clear
            </Button>
          )}
          {onExport && (
            <Button type="button" variant="outline" size="sm" className="h-10 rounded-xl border-[#E2E8F0]" onClick={onExport}>
              <Download className="mr-1 h-4 w-4" /> Export
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
