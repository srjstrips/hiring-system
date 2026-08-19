import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Pencil, Trash2, Eye, Search, X } from 'lucide-react';
import { Pagination } from '@/components/common/Pagination';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { toast } from '@/hooks/useToast';
import { departmentService, subDepartmentService, type MasterRecord } from '@/services/master.service';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().max(10).optional(),
  description: z.string().optional(),
  departmentId: z.string().min(1, 'Department is required'),
});

type FormValues = z.infer<typeof schema>;

const inputCls =
  'h-[44px] w-full rounded-[8px] border border-[#E5E7EB] bg-white px-3 text-sm text-[#0F172A] outline-none placeholder:text-[#94A3B8] focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20';
const selectCls =
  'h-[44px] w-full rounded-[8px] border border-[#E5E7EB] bg-white px-3 text-sm text-[#0F172A] outline-none focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20';
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

export function SubDepartmentsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchLocal, setSearchLocal] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MasterRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MasterRecord | null>(null);

  const { data: departments = [] } = useQuery({
    queryKey: ['dept-active-sub'],
    queryFn: () => departmentService.getAllActive(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['sub-departments', page, search, departmentFilter],
    queryFn: () =>
      subDepartmentService.getAll({
        page,
        limit: 10,
        search: search || undefined,
        departmentId: departmentFilter || undefined,
      } as any),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['sub-departments'] });

  const createMutation = useMutation({
    mutationFn: (d: FormValues) => subDepartmentService.create(d),
    onSuccess: () => { toast({ title: 'Sub Department created', variant: 'success' }); invalidate(); closeDialog(); },
    onError: (e: any) => toast({ title: 'Error', description: e?.response?.data?.message ?? 'Failed', variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormValues }) => subDepartmentService.update(id, data),
    onSuccess: () => { toast({ title: 'Sub Department updated', variant: 'success' }); invalidate(); closeDialog(); },
    onError: (e: any) => toast({ title: 'Error', description: e?.response?.data?.message ?? 'Failed', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => subDepartmentService.delete(id),
    onSuccess: () => { toast({ title: 'Sub Department deleted' }); invalidate(); setDeleteTarget(null); },
    onError: (e: any) => toast({ title: 'Error', description: e?.response?.data?.message ?? 'Failed', variant: 'destructive' }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => subDepartmentService.toggleActive(id, isActive),
    onSuccess: () => invalidate(),
    onError: (e: any) => toast({ title: 'Error', description: e?.response?.data?.message ?? 'Failed', variant: 'destructive' }),
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
    reset({ name: '', code: '', description: '', departmentId: '' });
  };

  const openCreate = () => {
    setEditing(null);
    reset({ name: '', code: '', description: '', departmentId: departmentFilter || '' });
    setDialogOpen(true);
  };

  const openEdit = (row: MasterRecord) => {
    setEditing(row);
    reset({
      name: String(row.name ?? ''),
      code: String(row.code ?? ''),
      description: String(row.description ?? ''),
      departmentId: String(row.departmentId ?? ''),
    });
    setDialogOpen(true);
  };

  const onSubmit = (values: FormValues) => {
    if (editing) updateMutation.mutate({ id: editing.id, data: values });
    else createMutation.mutate(values);
  };

  const rows = data?.data ?? [];
  const pagination = data?.pagination;
  const deptNameById = useMemo(
    () => Object.fromEntries(departments.map((d) => [d.id, d.name])),
    [departments]
  );

  useEffect(() => { setPage(1); }, [search, departmentFilter]);

  // debounce search
  useEffect(() => {
    const t = window.setTimeout(() => setSearch(searchLocal), 300);
    return () => window.clearTimeout(t);
  }, [searchLocal]);

  // scroll lock + esc
  useEffect(() => {
    if (!dialogOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeDialog(); };
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey); };
  }, [dialogOpen]);

  const modalTitle = editing ? 'Edit Sub Department' : 'Add Sub Department';

  return (
    <div className="relative bg-[#F7F9FC] px-4 pb-6 pt-6 sm:px-6 sm:pb-8 sm:pt-8 lg:px-8">
      <div className="mx-auto w-full max-w-[1280px] space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-[22px] font-bold leading-tight text-[#0F172A]">Sub Departments</h1>
            <p className="text-sm text-[#64748B]">Manage sub departments under each department</p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-[44px] items-center gap-2 rounded-[8px] bg-[#F97316] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#EA580C]"
          >
            <Plus className="h-4 w-4" strokeWidth={2.25} />
            Add Sub Department
          </button>
        </div>

        {/* Card */}
        <div className="w-full rounded-[12px] border border-[#E5E7EB] bg-white shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
          {/* Filter strip */}
          <div className="flex flex-wrap items-center gap-3 border-b border-[#E5E7EB] px-6 py-5">
            <div className="relative w-[320px] max-w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" aria-hidden />
              <input
                value={searchLocal}
                onChange={(e) => setSearchLocal(e.target.value)}
                placeholder="Search sub departments..."
                className="h-[44px] w-full rounded-[8px] border border-[#E5E7EB] bg-white pl-10 pr-9 text-sm text-[#0F172A] outline-none placeholder:text-[#94A3B8] focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20"
              />
              {searchLocal ? (
                <button
                  type="button"
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-[#64748B] hover:bg-[#F1F5F9]"
                  onClick={() => setSearchLocal('')}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
            <select
              className="h-[44px] rounded-[8px] border border-[#E5E7EB] bg-white px-3 text-sm text-[#0F172A] outline-none focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20"
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
            >
              <option value="">All Departments</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          {/* Table */}
          <div className="px-6 py-5">
            <div className="overflow-hidden rounded-[10px] border border-[#E5E7EB]">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-[#F8FAFC]">
                    {['NAME', 'CODE', 'DEPARTMENT', 'STATUS', 'ACTIONS'].map((h) => (
                      <th
                        key={h}
                        className={`h-[44px] px-6 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748B]${h === 'ACTIONS' ? ' text-right' : ''}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="h-[64px]">
                        <td colSpan={5} className="px-6 py-4">
                          <div className="h-[12px] w-full animate-pulse rounded bg-[#F1F5F9]" />
                        </td>
                      </tr>
                    ))
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-14 text-center text-sm font-semibold text-[#0F172A]">
                        No sub departments found
                      </td>
                    </tr>
                  ) : rows.map((row) => (
                    <tr key={row.id} className="border-b border-[#E5E7EB] last:border-b-0">
                      <td className="h-[64px] px-6 align-middle">
                        <span className="text-sm font-semibold text-[#0F172A]">{String(row.name ?? '—')}</span>
                      </td>
                      <td className="h-[64px] px-6 align-middle">
                        <span className="text-sm font-medium uppercase text-[#64748B]">{String(row.code ?? '—')}</span>
                      </td>
                      <td className="h-[64px] px-6 align-middle">
                        <span className="text-sm text-[#64748B]">
                          {(row.department as { name?: string } | undefined)?.name ?? deptNameById[String(row.departmentId)] ?? '—'}
                        </span>
                      </td>
                      <td className="h-[64px] px-6 align-middle">
                        <span className={row.isActive
                          ? 'inline-flex items-center rounded-full bg-[#DCFCE7] px-3 py-0.5 text-xs font-semibold text-[#16A34A]'
                          : 'inline-flex items-center rounded-full bg-[#F1F5F9] px-3 py-0.5 text-xs font-semibold text-[#64748B]'}>
                          {row.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="h-[64px] px-6 align-middle">
                        <div className="flex items-center justify-end gap-2">
                          <IconBtn variant="view" title={row.isActive ? 'Deactivate' : 'Activate'} onClick={() => toggleMutation.mutate({ id: row.id, isActive: !row.isActive })}>
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
              className="relative mx-auto mt-[5vh] w-[calc(100%-2rem)] max-w-[580px] rounded-[14px] bg-white shadow-[0_24px_64px_rgba(15,23,42,0.22)]"
              role="dialog" aria-modal="true"
            >
              <div className="flex items-center justify-between border-b border-[#E5E7EB] px-7 py-5">
                <h2 className="text-[18px] font-semibold text-[#0F172A]">{modalTitle}</h2>
                <button type="button" aria-label="Close" onClick={closeDialog} className="flex h-9 w-9 items-center justify-center rounded-[8px] text-[#64748B] hover:bg-[#F1F5F9]">
                  <X className="h-[18px] w-[18px]" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col">
                <div className="space-y-5 px-7 py-7">
                  <div>
                    <label className={labelCls}>Department <span className="text-[#EF4444]">*</span></label>
                    <select className={selectCls} {...register('departmentId')}>
                      <option value="">Select...</option>
                      {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                    {errors.departmentId && <p className={errCls}>{errors.departmentId.message}</p>}
                  </div>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      <label className={labelCls}>Name <span className="text-[#EF4444]">*</span></label>
                      <input type="text" placeholder="e.g. Backend" className={inputCls} {...register('name')} />
                      {errors.name && <p className={errCls}>{errors.name.message}</p>}
                    </div>
                    <div>
                      <label className={labelCls}>Code</label>
                      <input type="text" placeholder="e.g. BE" className={inputCls} {...register('code')} />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Description</label>
                    <textarea
                      rows={4}
                      placeholder="Optional description"
                      className="h-[100px] w-full resize-none rounded-[8px] border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm text-[#0F172A] outline-none placeholder:text-[#94A3B8] focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20"
                      {...register('description')}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-[#E5E7EB] px-7 py-5">
                  <button type="button" onClick={closeDialog} className="inline-flex h-[44px] items-center justify-center rounded-[8px] border border-[#E5E7EB] bg-white px-5 text-sm font-medium text-[#111827] hover:bg-[#F8FAFC]">
                    Cancel
                  </button>
                  <button type="submit" disabled={isSubmitting || createMutation.isPending || updateMutation.isPending} className="inline-flex h-[44px] items-center justify-center rounded-[8px] bg-[#F97316] px-5 text-sm font-semibold text-white hover:bg-[#EA580C] disabled:opacity-60">
                    {editing ? 'Save Changes' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

        <ConfirmDialog
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          title="Delete Sub Department"
          description={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
          onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        />
      </div>
    </div>
  );
}
