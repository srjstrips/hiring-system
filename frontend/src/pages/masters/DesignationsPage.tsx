import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Eye, Search, X } from 'lucide-react';
import { z } from 'zod';
import { designationService, skillService, type MasterRecord } from '@/services/master.service';
import { Pagination } from '@/components/common/Pagination';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { toast } from '@/hooks/useToast';

type SkillPick = { skillId: string; name: string; isRequired: boolean };

type DesignationForm = {
  name: string;
  code: string;
  level: string;
  description: string;
  defaultDescription: string;
  defaultResponsibilities: string;
  defaultRequirements: string;
  defaultBenefits: string;
};

const EMPTY_FORM: DesignationForm = {
  name: '', code: '', level: '', description: '',
  defaultDescription: '', defaultResponsibilities: '',
  defaultRequirements: '', defaultBenefits: '',
};

const createSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required').max(10),
  level: z.coerce.number().int().min(1).max(20).optional().nullable(),
  description: z.string().optional(),
  defaultDescription: z.string().min(1, 'Overview is required'),
  defaultResponsibilities: z.string().optional(),
  defaultRequirements: z.string().optional(),
  defaultBenefits: z.string().optional(),
});

function mapSkillsFromRecord(row: MasterRecord): SkillPick[] {
  const skills = (row as any).skills as Array<{ skillId?: string; isRequired?: boolean; skill?: { id: string; name: string } }> | undefined;
  if (!skills?.length) return [];
  return skills.map((s) => ({
    skillId: s.skill?.id ?? s.skillId!,
    name: s.skill?.name ?? '',
    isRequired: s.isRequired ?? true,
  }));
}

const inputCls = 'h-[44px] w-full rounded-[8px] border border-[#E5E7EB] bg-white px-3 text-sm text-[#0F172A] outline-none placeholder:text-[#94A3B8] focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20';
const textareaCls = 'w-full resize-none rounded-[8px] border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm text-[#0F172A] outline-none placeholder:text-[#94A3B8] focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20';
const labelCls = 'mb-2 block text-sm font-medium text-[#334155]';

function IconBtn({ variant, title, onClick, children }: { variant: 'view' | 'edit' | 'delete'; title: string; onClick: () => void; children: React.ReactNode }) {
  const base = 'flex h-[36px] w-[36px] items-center justify-center rounded-[8px] border border-[#E5E7EB] bg-white transition-colors';
  const cls = variant === 'delete'
    ? `${base} text-[#EF4444] hover:bg-[#FEF2F2] hover:text-[#DC2626]`
    : `${base} text-[#334155] hover:bg-[#F8FAFC] hover:text-[#111827]`;
  return (
    <button type="button" title={title} aria-label={title} className={cls} onClick={onClick}>{children}</button>
  );
}

export function DesignationsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchLocal, setSearchLocal] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MasterRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MasterRecord | null>(null);
  const [form, setForm] = useState<DesignationForm>(EMPTY_FORM);
  const [selectedSkills, setSelectedSkills] = useState<SkillPick[]>([]);
  const [formError, setFormError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['designations', page, search],
    queryFn: () => designationService.getAll({ page, limit: 10, search: search || undefined }),
  });

  const { data: allSkills = [] } = useQuery({
    queryKey: ['skill-active'],
    queryFn: () => skillService.getAllActive(),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['designations'] });
    queryClient.invalidateQueries({ queryKey: ['desig-active'] });
    queryClient.invalidateQueries({ queryKey: ['masters-for-job'] });
  };

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => designationService.create(payload),
    onSuccess: () => { toast({ title: 'Designation created', variant: 'success' }); invalidate(); closeDialog(); },
    onError: (e: any) => toast({ title: 'Error', description: e?.response?.data?.message ?? 'Failed', variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) => designationService.update(id, payload),
    onSuccess: () => { toast({ title: 'Designation updated', variant: 'success' }); invalidate(); closeDialog(); },
    onError: (e: any) => toast({ title: 'Error', description: e?.response?.data?.message ?? 'Failed', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => designationService.delete(id),
    onSuccess: () => { toast({ title: 'Designation deleted', variant: 'success' }); invalidate(); setDeleteTarget(null); },
    onError: (e: any) => toast({ title: 'Error', description: e?.response?.data?.message ?? 'Failed', variant: 'destructive' }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => designationService.toggleActive(id, isActive),
    onSuccess: () => invalidate(),
    onError: (e: any) => toast({ title: 'Error', description: e?.response?.data?.message ?? 'Failed', variant: 'destructive' }),
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    setSelectedSkills([]);
    setFormError('');
  };

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setSelectedSkills([]);
    setFormError('');
    setDialogOpen(true);
  };

  const openEdit = (row: MasterRecord) => {
    setEditing(row);
    setForm({
      name: String(row.name ?? ''),
      code: String(row.code ?? ''),
      level: row.level != null ? String(row.level) : '',
      description: String(row.description ?? ''),
      defaultDescription: String((row as any).defaultDescription ?? ''),
      defaultResponsibilities: String((row as any).defaultResponsibilities ?? ''),
      defaultRequirements: String((row as any).defaultRequirements ?? ''),
      defaultBenefits: String((row as any).defaultBenefits ?? ''),
    });
    setSelectedSkills(mapSkillsFromRecord(row));
    setFormError('');
    setDialogOpen(true);
  };

  const setField = (key: keyof DesignationForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const toggleSkill = (skill: { id: string; name: string }) => {
    const exists = selectedSkills.find((s) => s.skillId === skill.id);
    if (exists) setSelectedSkills(selectedSkills.filter((s) => s.skillId !== skill.id));
    else setSelectedSkills([...selectedSkills, { skillId: skill.id, name: skill.name, isRequired: true }]);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const parsed = createSchema.safeParse({
      name: form.name, code: form.code,
      level: form.level ? Number(form.level) : undefined,
      description: form.description || undefined,
      defaultDescription: form.defaultDescription,
      defaultResponsibilities: form.defaultResponsibilities || undefined,
      defaultRequirements: form.defaultRequirements || undefined,
      defaultBenefits: form.defaultBenefits || undefined,
    });
    if (!parsed.success) { setFormError(parsed.error.issues[0]?.message ?? 'Validation failed'); return; }
    const payload = {
      ...parsed.data,
      level: parsed.data.level ?? undefined,
      skillIds: selectedSkills.map((s) => ({ skillId: s.skillId, isRequired: s.isRequired })),
    };
    if (editing) updateMutation.mutate({ id: editing.id, payload });
    else createMutation.mutate(payload);
  };

  const rows = data?.data ?? [];
  const pagination = data?.pagination;
  const saving = createMutation.isPending || updateMutation.isPending;

  useEffect(() => { setPage(1); }, [search]);

  useEffect(() => {
    const t = window.setTimeout(() => setSearch(searchLocal), 300);
    return () => window.clearTimeout(t);
  }, [searchLocal]);

  useEffect(() => {
    if (!dialogOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeDialog(); };
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey); };
  }, [dialogOpen]);

  return (
    <div className="relative bg-[#F7F9FC] px-4 pb-6 pt-6 sm:px-6 sm:pb-8 sm:pt-8 lg:px-8">
      <div className="mx-auto w-full max-w-[1280px] space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-[22px] font-bold leading-tight text-[#0F172A]">Designation</h1>
            <p className="text-sm text-[#64748B]">Manage job designations, levels, and Job Description templates</p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-[44px] items-center gap-2 rounded-[8px] bg-[#F97316] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#EA580C]"
          >
            <Plus className="h-4 w-4" strokeWidth={2.25} />
            Add Designation
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
                placeholder="Search designations..."
                className="h-[44px] w-full rounded-[8px] border border-[#E5E7EB] bg-white pl-10 pr-9 text-sm text-[#0F172A] outline-none placeholder:text-[#94A3B8] focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20"
              />
              {searchLocal ? (
                <button type="button" aria-label="Clear" className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-[#64748B] hover:bg-[#F1F5F9]" onClick={() => setSearchLocal('')}>
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
                    {['NAME', 'CODE', 'LEVEL', 'TEMPLATE', 'STATUS', 'ACTIONS'].map((h) => (
                      <th key={h} className={`h-[44px] px-5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748B]${h === 'ACTIONS' ? ' text-right' : ''}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="h-[64px]">
                        <td colSpan={6} className="px-5 py-4">
                          <div className="h-[12px] w-full animate-pulse rounded bg-[#F1F5F9]" />
                        </td>
                      </tr>
                    ))
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={6} className="px-5 py-14 text-center text-sm font-semibold text-[#0F172A]">No designations found</td></tr>
                  ) : rows.map((row) => (
                    <tr key={row.id} className="border-b border-[#E5E7EB] last:border-b-0">
                      <td className="h-[64px] px-5 align-middle">
                        <span className="text-sm font-semibold text-[#0F172A]">{String(row.name ?? '—')}</span>
                      </td>
                      <td className="h-[64px] px-5 align-middle">
                        <span className="text-sm font-medium uppercase text-[#64748B]">{String(row.code ?? '—')}</span>
                      </td>
                      <td className="h-[64px] px-5 align-middle">
                        <span className="text-sm text-[#64748B]">{row.level ? `L${row.level}` : '—'}</span>
                      </td>
                      <td className="h-[64px] px-5 align-middle">
                        {(row as any).defaultDescription ? (
                          <span className="inline-flex items-center rounded-full bg-[#F1F5F9] px-3 py-0.5 text-xs font-medium text-[#64748B]">Configured</span>
                        ) : (
                          <span className="text-sm text-[#94A3B8]">—</span>
                        )}
                      </td>
                      <td className="h-[64px] px-5 align-middle">
                        <span className={row.isActive
                          ? 'inline-flex items-center rounded-full bg-[#DCFCE7] px-3 py-0.5 text-xs font-semibold text-[#16A34A]'
                          : 'inline-flex items-center rounded-full bg-[#F1F5F9] px-3 py-0.5 text-xs font-semibold text-[#64748B]'}>
                          {row.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="h-[64px] px-5 align-middle">
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

        {/* Designation Modal */}
        {dialogOpen ? (
          <div
            className="fixed inset-0 z-[9999]"
            onMouseDown={(e) => { if (e.target === e.currentTarget) closeDialog(); }}
          >
            <div className="absolute inset-0 bg-[rgba(0,0,0,0.45)]" />
            <div className="relative mx-auto mt-[3vh] flex h-[94vh] w-[calc(100%-2rem)] max-w-[720px] flex-col rounded-[14px] bg-white shadow-[0_24px_64px_rgba(15,23,42,0.22)]" role="dialog" aria-modal="true">
              {/* Modal header */}
              <div className="flex shrink-0 items-center justify-between border-b border-[#E5E7EB] px-7 py-5">
                <h2 className="text-[18px] font-semibold text-[#0F172A]">
                  {editing ? 'Edit Designation' : 'Create Designation'}
                </h2>
                <button type="button" aria-label="Close" onClick={closeDialog} className="flex h-9 w-9 items-center justify-center rounded-[8px] text-[#64748B] hover:bg-[#F1F5F9]">
                  <X className="h-[18px] w-[18px]" />
                </button>
              </div>

              <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
                {/* Scrollable body */}
                <div className="flex-1 space-y-5 overflow-y-auto px-7 py-6">
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      <label className={labelCls}>Designation Name <span className="text-[#EF4444]">*</span></label>
                      <input required type="text" value={form.name} onChange={setField('name')} placeholder="e.g. Senior Engineer" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Code <span className="text-[#EF4444]">*</span></label>
                      <input required type="text" value={form.code} onChange={setField('code')} placeholder="e.g. SSE" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Level (1–20)</label>
                      <input type="number" min={1} max={20} value={form.level} onChange={setField('level')} placeholder="e.g. 4" className={inputCls} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelCls}>Description</label>
                      <textarea rows={2} value={form.description} onChange={setField('description')} placeholder="Short designation summary" className={`${textareaCls} h-[72px]`} />
                    </div>
                  </div>

                  <div className="space-y-4 border-t border-[#E5E7EB] pt-4">
                    <div>
                      <h3 className="text-sm font-semibold text-[#0F172A]">Job Description Template</h3>
                      <p className="mt-0.5 text-xs text-[#64748B]">Defaults used when creating a new Job for this designation. Existing jobs are not affected when you update this template.</p>
                    </div>
                    <div>
                      <label className={labelCls}>Overview <span className="text-[#EF4444]">*</span></label>
                      <textarea required rows={5} value={form.defaultDescription} onChange={setField('defaultDescription')} placeholder="Brief overview of the role..." className={`${textareaCls} h-[110px]`} />
                    </div>
                    <div>
                      <label className={labelCls}>Responsibilities</label>
                      <textarea rows={5} value={form.defaultResponsibilities} onChange={setField('defaultResponsibilities')} placeholder="• Lead hiring operations&#10;• Coordinate interviews..." className={`${textareaCls} h-[110px]`} />
                    </div>
                    <div>
                      <label className={labelCls}>Requirements</label>
                      <textarea rows={5} value={form.defaultRequirements} onChange={setField('defaultRequirements')} placeholder="• Graduate with HR experience&#10;• Strong communication..." className={`${textareaCls} h-[110px]`} />
                    </div>
                    <div>
                      <label className={labelCls}>Benefits & Perks</label>
                      <textarea rows={4} value={form.defaultBenefits} onChange={setField('defaultBenefits')} placeholder="• Health insurance&#10;• Performance bonus..." className={`${textareaCls} h-[90px]`} />
                    </div>

                    <div>
                      <label className={labelCls}>Required Skills</label>
                      <p className="mb-2 text-xs text-[#64748B]">Click to add. Toggle * to mark as required.</p>
                      {selectedSkills.length > 0 && (
                        <div className="mb-3 flex flex-wrap gap-2">
                          {selectedSkills.map((s) => (
                            <span key={s.skillId} className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF7ED] px-3 py-1 text-xs font-medium text-[#EA580C]">
                              <span className="cursor-pointer" onClick={() => setSelectedSkills(selectedSkills.map((sk) => sk.skillId === s.skillId ? { ...sk, isRequired: !sk.isRequired } : sk))}>
                                {s.name}{s.isRequired ? ' *' : ''}
                              </span>
                              <X className="h-3 w-3 cursor-pointer" onClick={() => toggleSkill({ id: s.skillId, name: s.name })} />
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto rounded-[8px] border border-[#E5E7EB] bg-[#F8FAFC] p-3">
                        {allSkills.filter((sk) => !selectedSkills.find((s) => s.skillId === sk.id)).map((skill) => (
                          <span
                            key={skill.id}
                            onClick={() => toggleSkill({ id: skill.id, name: skill.name })}
                            className="inline-flex cursor-pointer items-center rounded-full border border-[#E5E7EB] bg-white px-3 py-0.5 text-xs font-medium text-[#334155] hover:border-[#F97316] hover:bg-[#FFF7ED] hover:text-[#EA580C]"
                          >
                            + {skill.name}
                          </span>
                        ))}
                        {allSkills.length === 0 && <p className="text-xs text-[#64748B]">No skills in master data.</p>}
                      </div>
                    </div>
                  </div>

                  {formError && <p className="text-sm text-[#EF4444]">{formError}</p>}
                </div>

                {/* Footer */}
                <div className="flex shrink-0 items-center justify-between gap-4 border-t border-[#E5E7EB] px-7 py-5">
                  <button type="button" onClick={closeDialog} className="inline-flex h-[44px] items-center justify-center rounded-[8px] border border-[#E5E7EB] bg-white px-5 text-sm font-medium text-[#111827] hover:bg-[#F8FAFC]">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving} className="inline-flex h-[44px] items-center justify-center rounded-[8px] bg-[#F97316] px-5 text-sm font-semibold text-white hover:bg-[#EA580C] disabled:opacity-60">
                    {saving ? 'Saving...' : editing ? 'Update Designation' : 'Create Designation'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

        <ConfirmDialog
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          title="Delete designation?"
          description={`This will delete "${deleteTarget?.name}". This action cannot be undone.`}
          onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
          loading={deleteMutation.isPending}
        />
      </div>
    </div>
  );
}
