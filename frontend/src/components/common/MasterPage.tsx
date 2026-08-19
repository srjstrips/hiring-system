import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Eye, Search, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ZodSchema } from 'zod';
import { Pagination } from './Pagination';
import { ConfirmDialog } from './ConfirmDialog';
import { toast } from '@/hooks/useToast';
import type { MasterRecord } from '@/services/master.service';
import type { PaginationMeta } from '@/types';

export interface FieldDef {
  name: string;
  label: string;
  type?: 'text' | 'number' | 'textarea';
  required?: boolean;
  placeholder?: string;
  colSpan?: boolean;
}

export interface ColumnDef {
  key: string;
  label: string;
  render?: (row: MasterRecord) => React.ReactNode;
}

interface MasterPageProps {
  title: string;
  description?: string;
  queryKey: string;
  service: {
    getAll: (params: Record<string, unknown>) => Promise<{ data: MasterRecord[]; pagination: PaginationMeta }>;
    create: (data: Record<string, unknown>) => Promise<MasterRecord>;
    update: (id: string, data: Record<string, unknown>) => Promise<MasterRecord>;
    delete: (id: string) => Promise<void>;
    toggleActive: (id: string, isActive: boolean) => Promise<MasterRecord>;
  };
  fields: FieldDef[];
  createSchema: ZodSchema;
  updateSchema: ZodSchema;
  columns?: ColumnDef[];
}

const inputCls =
  'h-[44px] w-full rounded-[8px] border border-[#E5E7EB] bg-white px-3 text-sm text-[#0F172A] outline-none placeholder:text-[#94A3B8] focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20';
const textareaCls =
  'w-full resize-none rounded-[8px] border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm text-[#0F172A] outline-none placeholder:text-[#94A3B8] focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20';
const labelCls = 'mb-2 block text-sm font-medium text-[#334155]';
const errCls = 'mt-1.5 text-xs text-[#EF4444]';

function IconBtn({
  variant,
  title,
  onClick,
  children,
}: {
  variant: 'view' | 'edit' | 'delete';
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const base =
    'flex h-[36px] w-[36px] items-center justify-center rounded-[8px] border border-[#E5E7EB] bg-white transition-colors';
  const cls =
    variant === 'delete'
      ? `${base} text-[#EF4444] hover:bg-[#FEF2F2] hover:text-[#DC2626]`
      : `${base} text-[#334155] hover:bg-[#F8FAFC] hover:text-[#111827]`;
  return (
    <button type="button" title={title} aria-label={title} className={cls} onClick={onClick}>
      {children}
    </button>
  );
}

export function MasterPage({
  title,
  description,
  queryKey,
  service,
  fields,
  createSchema,
  updateSchema,
  columns,
}: MasterPageProps) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchLocal, setSearchLocal] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MasterRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MasterRecord | null>(null);

  const schema = editing ? updateSchema : createSchema;

  const { data, isLoading } = useQuery({
    queryKey: [queryKey, page, search],
    queryFn: () => service.getAll({ page, limit: 10, search: search || undefined }),
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: [queryKey] });

  const createMutation = useMutation({
    mutationFn: (d: Record<string, unknown>) => service.create(d),
    onSuccess: () => { toast({ title: `${title} created`, variant: 'success' }); invalidate(); closeDialog(); },
    onError: (e: any) => toast({ title: 'Error', description: e?.response?.data?.message ?? 'Failed', variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => service.update(id, data),
    onSuccess: () => { toast({ title: `${title} updated`, variant: 'success' }); invalidate(); closeDialog(); },
    onError: (e: any) => toast({ title: 'Error', description: e?.response?.data?.message ?? 'Failed', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => service.delete(id),
    onSuccess: () => { toast({ title: `${title} deleted` }); invalidate(); setDeleteTarget(null); },
    onError: (e: any) => toast({ title: 'Error', description: e?.response?.data?.message ?? 'Failed', variant: 'destructive' }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => service.toggleActive(id, isActive),
    onSuccess: () => invalidate(),
    onError: (e: any) => toast({ title: 'Error', description: e?.response?.data?.message ?? 'Failed', variant: 'destructive' }),
  });

  const openCreate = () => { reset({}); setEditing(null); setDialogOpen(true); };
  const openEdit = (row: MasterRecord) => { reset(row); setEditing(row); setDialogOpen(true); };
  const closeDialog = () => { setDialogOpen(false); setEditing(null); reset({}); };

  const onSubmit = (values: Record<string, unknown>) => {
    if (editing) updateMutation.mutate({ id: editing.id, data: values });
    else createMutation.mutate(values);
  };

  const defaultColumns: ColumnDef[] = [
    { key: 'name', label: 'Name' },
    ...fields.filter(f => f.name !== 'name' && f.name !== 'description').map(f => ({ key: f.name, label: f.label })),
  ];
  const displayColumns = columns ?? defaultColumns;

  // debounce search
  useEffect(() => {
    const t = window.setTimeout(() => { setSearch(searchLocal); setPage(1); }, 300);
    return () => window.clearTimeout(t);
  }, [searchLocal]);

  // scroll lock + esc for modal
  useEffect(() => {
    if (!dialogOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeDialog(); };
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey); };
  }, [dialogOpen]);

  const rows = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <div className="relative bg-[#F7F9FC] px-4 pb-6 pt-6 sm:px-6 sm:pb-8 sm:pt-8 lg:px-8">
      <div className="mx-auto w-full max-w-[1280px] space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-[22px] font-bold leading-tight text-[#0F172A]">{title}</h1>
            {description && <p className="text-sm text-[#64748B]">{description}</p>}
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-[44px] items-center gap-2 rounded-[8px] bg-[#F97316] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#EA580C]"
          >
            <Plus className="h-4 w-4" strokeWidth={2.25} />
            Add {title}
          </button>
        </div>

        {/* Card */}
        <div className="w-full rounded-[12px] border border-[#E5E7EB] bg-white shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
          {/* Search strip */}
          <div className="border-b border-[#E5E7EB] px-6 py-5">
            <div className="relative w-[320px] max-w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" aria-hidden />
              <input
                value={searchLocal}
                onChange={(e) => setSearchLocal(e.target.value)}
                placeholder={`Search ${title.toLowerCase()}...`}
                className="h-[44px] w-full rounded-[8px] border border-[#E5E7EB] bg-white pl-10 pr-9 text-sm text-[#0F172A] outline-none placeholder:text-[#94A3B8] focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20"
              />
              {searchLocal ? (
                <button
                  type="button"
                  aria-label="Clear"
                  className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-[#64748B] hover:bg-[#F1F5F9]"
                  onClick={() => setSearchLocal('')}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          </div>

          {/* Table */}
          <div className="px-6 py-5">
            <div className="overflow-hidden rounded-[10px] border border-[#E5E7EB]">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-[#F8FAFC]">
                    {displayColumns.map((col) => (
                      <th key={col.key} className="h-[44px] px-6 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">
                        {col.label}
                      </th>
                    ))}
                    <th className="h-[44px] px-6 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">STATUS</th>
                    <th className="h-[44px] px-6 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="h-[64px]">
                        <td colSpan={displayColumns.length + 2} className="px-6 py-4">
                          <div className="h-[12px] w-full animate-pulse rounded bg-[#F1F5F9]" />
                        </td>
                      </tr>
                    ))
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={displayColumns.length + 2} className="px-6 py-14 text-center text-sm font-semibold text-[#0F172A]">
                        No {title.toLowerCase()} found
                      </td>
                    </tr>
                  ) : rows.map((row) => (
                    <tr key={row.id} className="border-b border-[#E5E7EB] last:border-b-0">
                      {displayColumns.map((col, i) => (
                        <td key={col.key} className="h-[64px] px-6 align-middle">
                          {i === 0 ? (
                            <span className="text-sm font-semibold text-[#0F172A]">
                              {col.render ? col.render(row) : String(row[col.key] ?? '—')}
                            </span>
                          ) : (
                            <span className="text-sm text-[#64748B]">
                              {col.render ? col.render(row) : String(row[col.key] ?? '—')}
                            </span>
                          )}
                        </td>
                      ))}
                      <td className="h-[64px] px-6 align-middle">
                        <span className={row.isActive
                          ? 'inline-flex items-center rounded-full bg-[#DCFCE7] px-3 py-0.5 text-xs font-semibold text-[#16A34A]'
                          : 'inline-flex items-center rounded-full bg-[#F1F5F9] px-3 py-0.5 text-xs font-semibold text-[#64748B]'}>
                          {row.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="h-[64px] px-6 align-middle">
                        <div className="flex items-center justify-end gap-2">
                          <IconBtn
                            variant="view"
                            title={row.isActive ? 'Deactivate' : 'Activate'}
                            onClick={() => toggleMutation.mutate({ id: row.id, isActive: !row.isActive })}
                          >
                            <Eye className="h-[18px] w-[18px]" />
                          </IconBtn>
                          <IconBtn variant="edit" title="Edit" onClick={() => openEdit(row)}>
                            <Pencil className="h-[18px] w-[18px]" />
                          </IconBtn>
                          <IconBtn variant="delete" title="Delete" onClick={() => setDeleteTarget(row)}>
                            <Trash2 className="h-[18px] w-[18px]" />
                          </IconBtn>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination ? (
              <div className="mt-5 border-t border-[#E5E7EB] pt-4">
                <Pagination pagination={pagination} onPageChange={setPage} />
              </div>
            ) : null}
          </div>
        </div>

        {/* Modal */}
        {dialogOpen ? (
          <div
            className="fixed inset-0 z-[9999]"
            onMouseDown={(e) => { if (e.target === e.currentTarget) closeDialog(); }}
          >
            <div className="absolute inset-0 bg-[rgba(0,0,0,0.45)]" />
            <div
              className="relative mx-auto mt-[5vh] w-[calc(100%-2rem)] max-w-[600px] rounded-[14px] bg-white shadow-[0_24px_64px_rgba(15,23,42,0.22)]"
              role="dialog"
              aria-modal="true"
            >
              {/* Modal header */}
              <div className="flex items-center justify-between border-b border-[#E5E7EB] px-7 py-5">
                <h2 className="text-[18px] font-semibold text-[#0F172A]">
                  {editing ? `Edit ${title}` : `Add ${title}`}
                </h2>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={closeDialog}
                  className="flex h-9 w-9 items-center justify-center rounded-[8px] text-[#64748B] hover:bg-[#F1F5F9]"
                >
                  <X className="h-[18px] w-[18px]" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit as any)} className="flex flex-col">
                <div className="space-y-5 px-7 py-6">
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    {fields.map((field) => (
                      <div key={field.name} className={field.colSpan ? 'sm:col-span-2' : ''}>
                        <label htmlFor={field.name} className={labelCls}>
                          {field.label}
                          {field.required && <span className="text-[#EF4444]"> *</span>}
                        </label>
                        {field.type === 'textarea' ? (
                          <textarea
                            id={field.name}
                            placeholder={field.placeholder}
                            className={`${textareaCls} h-[100px]`}
                            {...register(field.name)}
                          />
                        ) : (
                          <input
                            id={field.name}
                            type={field.type ?? 'text'}
                            placeholder={field.placeholder}
                            className={inputCls}
                            {...register(field.name, { valueAsNumber: field.type === 'number' })}
                          />
                        )}
                        {errors[field.name] && (
                          <p className={errCls}>{(errors[field.name] as any)?.message}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Modal footer */}
                <div className="flex items-center justify-between gap-4 border-t border-[#E5E7EB] px-7 py-5">
                  <button
                    type="button"
                    onClick={closeDialog}
                    className="inline-flex h-[44px] items-center justify-center rounded-[8px] border border-[#E5E7EB] bg-white px-5 text-sm font-medium text-[#111827] hover:bg-[#F8FAFC]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}
                    className="inline-flex h-[44px] items-center justify-center rounded-[8px] bg-[#F97316] px-5 text-sm font-semibold text-white hover:bg-[#EA580C] disabled:opacity-60"
                  >
                    {isSubmitting || createMutation.isPending || updateMutation.isPending
                      ? 'Saving...'
                      : editing ? `Save Changes` : `Create ${title}`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

        {/* Delete confirm */}
        <ConfirmDialog
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
          loading={deleteMutation.isPending}
          title={`Delete ${title}`}
          description={`Are you sure you want to delete "${(deleteTarget as any)?.name}"? This cannot be undone.`}
          confirmLabel="Delete"
        />
      </div>
    </div>
  );
}
