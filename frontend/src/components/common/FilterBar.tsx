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
      <div className="flex flex-wrap items-center gap-3">
        {onSearchChange && (
          <div className="w-full sm:w-64">
            <SearchInput
              value={search ?? ''}
              onChange={onSearchChange}
              placeholder={searchPlaceholder}
            />
          </div>
        )}
        {filters.map((f) => {
          if (f.type === 'date') {
            return (
              <div key={f.key} className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">{f.label}</label>
                <input
                  type="date"
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={values[f.key] ?? ''}
                  onChange={(e) => onChange(f.key, e.target.value)}
                />
              </div>
            );
          }
          return (
            <div key={f.key} className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">{f.label}</label>
              <select
                className="h-9 min-w-[140px] rounded-md border border-input bg-background px-3 text-sm"
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
        <div className="flex items-end gap-2 ml-auto">
          {hasActive && onClear && (
            <Button type="button" variant="ghost" size="sm" onClick={onClear}>
              <X className="h-4 w-4 mr-1" /> Clear
            </Button>
          )}
          {onExport && (
            <Button type="button" variant="outline" size="sm" onClick={onExport}>
              <Download className="h-4 w-4 mr-1" /> Export
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
