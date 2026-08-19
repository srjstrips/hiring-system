import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Eye, Search, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pagination } from '@/components/common/Pagination';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { toast } from '@/hooks/useToast';
import { departmentService, type MasterRecord } from '@/services/master.service';

const createSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required').max(10),
  description: z.string().optional(),
});
const updateSchema = createSchema.partial();

function DepartmentSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [local, setLocal] = useState(value);

  useEffect(() => setLocal(value), [value]);

  useEffect(() => {
    const t = window.setTimeout(() => onChange(local), 300);
    return () => window.clearTimeout(t);
  }, [local, onChange]);

  return (
    <div className="relative w-[320px]">
      <Search
        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]"
        aria-hidden
      />
      <input
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder="Search department..."
        className="h-[44px] w-full rounded-[8px] border border-[#E5E7EB] bg-white pl-10 pr-9 text-sm text-[#0F172A] outline-none placeholder:text-[#94A3B8] focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20"
      />
      {local ? (
        <button
          type="button"
          aria-label="Clear search"
          className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-[#64748B] hover:bg-[#F1F5F9]"
          onClick={() => {
            setLocal('');
            onChange('');
          }}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}

function StatusPill({ active }: { active: boolean }) {
  if (!active) {
    return (
      <span className="inline-flex items-center rounded-full bg-[#F1F5F9] px-3 py-0.5 text-xs font-semibold text-[#64748B]">
        Inactive
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full bg-[#DCFCE7] px-3 py-0.5 text-xs font-semibold text-[#16A34A]">
      Active
    </span>
  );
}

function IconSquareButton({
  variant,
  title,
  ariaLabel,
  onClick,
  children,
}: {
  variant: 'view' | 'edit' | 'delete';
  title: string;
  ariaLabel: string;
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
    <button type="button" title={title} aria-label={ariaLabel} className={cls} onClick={onClick}>
      {children}
    </button>
  );
}

export function DepartmentsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MasterRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MasterRecord | null>(null);

  const schema = editing ? updateSchema : createSchema;

  const { data, isLoading } = useQuery({
    queryKey: ['departments', page, search],
    queryFn: () => departmentService.getAll({ page, limit: 10, search: search || undefined }),
  });

  // NOTE: When `editing`, we swap the resolver to `updateSchema` (partial),
  // which makes `name`/`code` optional from TypeScript's perspective.
  // Using `any` here avoids TS resolver type conflicts while keeping runtime validation.
  const { register, handleSubmit, reset, formState, clearErrors } = useForm<any>({
    resolver: zodResolver(schema),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['departments'] });

  const createMutation = useMutation({
    mutationFn: (d: any) => departmentService.create(d as any),
    onSuccess: () => {
      toast({ title: 'Department created', variant: 'success' });
      invalidate();
      closeDialog();
    },
    onError: (e: any) =>
      toast({
        title: 'Error',
        description: e?.response?.data?.message ?? 'Failed',
        variant: 'destructive',
      }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data: payload }: { id: string; data: any }) =>
      departmentService.update(id, payload as any),
    onSuccess: () => {
      toast({ title: 'Department updated', variant: 'success' });
      invalidate();
      closeDialog();
    },
    onError: (e: any) =>
      toast({
        title: 'Error',
        description: e?.response?.data?.message ?? 'Failed',
        variant: 'destructive',
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => departmentService.delete(id),
    onSuccess: () => {
      toast({ title: 'Department deleted' });
      invalidate();
      setDeleteTarget(null);
    },
    onError: (e: any) =>
      toast({
        title: 'Error',
        description: e?.response?.data?.message ?? 'Failed',
        variant: 'destructive',
      }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      departmentService.toggleActive(id, isActive),
    onSuccess: () => invalidate(),
    onError: (e: any) =>
      toast({
        title: 'Error',
        description: e?.response?.data?.message ?? 'Failed',
        variant: 'destructive',
      }),
  });

  const { errors, isSubmitting } = formState;

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
    reset({});
    clearErrors();
  };

  const openCreate = () => {
    setEditing(null);
    reset({});
    clearErrors();
    setDialogOpen(true);
  };

  const openEdit = (row: MasterRecord) => {
    setEditing(row);
    reset({
      name: String(row.name ?? ''),
      code: String(row.code ?? ''),
      description: String((row as any).description ?? ''),
    } as any);
    clearErrors();
    setDialogOpen(true);
  };

  const onSubmit = (values: any) => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const rows = data?.data ?? [];
  const pagination = data?.pagination;

  const shouldLockScroll = dialogOpen;
  useEffect(() => {
    if (!shouldLockScroll) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [shouldLockScroll]);

  useEffect(() => {
    if (!dialogOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDialog();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [dialogOpen]);

  const title = useMemo(() => (editing ? 'Edit Department' : 'Add Department'), [editing]);

  return (
    <div className="relative bg-[#F7F9FC] px-4 pb-6 pt-6 sm:px-6 sm:pb-8 sm:pt-8 lg:px-8">
      <div className="mx-auto w-full max-w-[1280px] space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-[22px] font-bold leading-tight text-[#0F172A]">Department</h1>
            <p className="text-sm text-[#64748B]">Manage company departments</p>
          </div>

          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-[44px] items-center gap-2 rounded-[8px] bg-[#F97316] px-5 text-sm font-semibold text-white shadow-none transition-colors hover:bg-[#EA580C]"
          >
            <Plus className="h-4 w-4" strokeWidth={2.25} />
            Add Department
          </button>
        </div>

        {/* Card */}
        <div className="w-full rounded-[12px] border border-[#E5E7EB] bg-white px-0 shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
          {/* Search strip */}
          <div className="border-b border-[#E5E7EB] px-6 py-5">
            <DepartmentSearch
              value={search}
              onChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
            />
          </div>

          {/* Table */}
          <div className="px-6 py-5">
            <div className="overflow-hidden rounded-[10px] border border-[#E5E7EB]">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-[#F8FAFC]">
                    <th className="h-[44px] px-6 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">
                      NAME
                    </th>
                    <th className="h-[44px] px-6 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">
                      CODE
                    </th>
                    <th className="h-[44px] px-6 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">
                      STATUS
                    </th>
                    <th className="h-[44px] px-6 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">
                      ACTIONS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="h-[64px]">
                        <td colSpan={4} className="px-6 py-4">
                          <div className="h-[12px] w-full animate-pulse rounded bg-[#F1F5F9]" />
                        </td>
                      </tr>
                    ))
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-14 text-center">
                        <div className="text-sm font-semibold text-[#0F172A]">No departments found</div>
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                      <tr key={row.id} className="border-b border-[#E5E7EB] last:border-b-0">
                        <td className="h-[64px] px-6 align-middle">
                          <span className="text-sm font-semibold text-[#0F172A]">
                            {String(row.name ?? '—')}
                          </span>
                        </td>
                        <td className="h-[64px] px-6 align-middle">
                          <span className="text-sm font-medium text-[#64748B] uppercase">
                            {String(row.code ?? '—')}
                          </span>
                        </td>
                        <td className="h-[64px] px-6 align-middle">
                          <StatusPill active={!!row.isActive} />
                        </td>
                        <td className="h-[64px] px-6 align-middle">
                          <div className="flex items-center justify-end gap-2">
                            <IconSquareButton
                              variant="view"
                              title={row.isActive ? 'Deactivate' : 'Activate'}
                              ariaLabel={row.isActive ? 'Deactivate' : 'Activate'}
                              onClick={() =>
                                toggleMutation.mutate({ id: row.id, isActive: !row.isActive })
                              }
                            >
                              <Eye className="h-[18px] w-[18px]" />
                            </IconSquareButton>

                            <IconSquareButton
                              variant="edit"
                              title="Edit"
                              ariaLabel="Edit"
                              onClick={() => openEdit(row)}
                            >
                              <Pencil className="h-[18px] w-[18px]" />
                            </IconSquareButton>

                            <IconSquareButton
                              variant="delete"
                              title="Delete"
                              ariaLabel="Delete"
                              onClick={() => setDeleteTarget(row)}
                            >
                              <Trash2 className="h-[18px] w-[18px]" />
                            </IconSquareButton>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
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

        {/* Add Department Modal */}
        {dialogOpen ? (
          <div
            className="fixed inset-0 z-[9999]"
            aria-hidden={false}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closeDialog();
            }}
          >
            <div className="absolute inset-0 bg-[rgba(0,0,0,0.45)]" />

            <div
              className="relative mx-auto mt-[5vh] w-[calc(100%-2rem)] max-w-[600px] rounded-[14px] bg-white shadow-[0_24px_64px_rgba(15,23,42,0.22)]"
              role="dialog"
              aria-modal="true"
              aria-labelledby="dept-modal-title"
            >
              <div className="flex items-center justify-between border-b border-[#E5E7EB] px-[28px] py-[20px]">
                <h2 id="dept-modal-title" className="text-[18px] font-semibold text-[#0F172A]">
                  {title}
                </h2>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={closeDialog}
                  className="flex h-[36px] w-[36px] items-center justify-center rounded-[8px] text-[#64748B] hover:bg-[#F1F5F9]"
                >
                  <X className="h-[18px] w-[18px]" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit as any)} className="flex flex-col">
                <div className="space-y-6 px-[28px] py-[28px]">
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label htmlFor="name" className="mb-2 block text-sm font-medium text-[#334155]">
                        Department Name <span className="text-[#EF4444]">*</span>
                      </label>
                      <input
                        id="name"
                        type="text"
                        placeholder="e.g. Engineering"
                        className="h-[44px] w-full rounded-[8px] border border-[#E5E7EB] bg-white px-3 text-sm text-[#0F172A] outline-none placeholder:text-[#94A3B8] focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20"
                        {...register('name')}
                      />
                      {errors.name ? (
                        <p className="mt-1.5 text-xs text-[#EF4444]">
                          {(errors.name as any)?.message}
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <label htmlFor="code" className="mb-2 block text-sm font-medium text-[#334155]">
                        Code <span className="text-[#EF4444]">*</span>
                      </label>
                      <input
                        id="code"
                        type="text"
                        placeholder="e.g. ENG"
                        className="h-[44px] w-full rounded-[8px] border border-[#E5E7EB] bg-white px-3 text-sm text-[#0F172A] outline-none placeholder:text-[#94A3B8] focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20"
                        {...register('code')}
                      />
                      {errors.code ? (
                        <p className="mt-1.5 text-xs text-[#EF4444]">
                          {(errors.code as any)?.message}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="description"
                      className="mb-2 block text-sm font-medium text-[#334155]"
                    >
                      Description
                    </label>
                    <textarea
                      id="description"
                      placeholder="Optional description"
                      className="h-[110px] w-full resize-none rounded-[8px] border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm text-[#0F172A] outline-none placeholder:text-[#94A3B8] focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20"
                      {...register('description')}
                    />
                    {errors.description ? (
                      <p className="mt-1.5 text-xs text-[#EF4444]">
                        {(errors.description as any)?.message}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 border-t border-[#E5E7EB] px-[28px] py-[20px]">
                  <button
                    type="button"
                    onClick={closeDialog}
                    className="inline-flex h-[44px] items-center justify-center rounded-[8px] border border-[#E5E7EB] bg-white px-5 text-sm font-medium text-[#111827] hover:bg-[#F8FAFC]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex h-[44px] items-center justify-center rounded-[8px] bg-[#F97316] px-5 text-sm font-semibold text-white hover:bg-[#EA580C] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? 'Creating...' : editing ? 'Update' : 'Create Department'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

        <ConfirmDialog
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
          loading={deleteMutation.isPending}
          title="Delete Department"
          description={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
          confirmLabel="Delete"
        />
      </div>
    </div>
  );
}
