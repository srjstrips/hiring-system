import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, X } from 'lucide-react';
import { z } from 'zod';
import { designationService, skillService, type MasterRecord } from '@/services/master.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { SearchInput } from '@/components/common/SearchInput';
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
  name: '',
  code: '',
  level: '',
  description: '',
  defaultDescription: '',
  defaultResponsibilities: '',
  defaultRequirements: '',
  defaultBenefits: '',
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

export function DesignationsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
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
    onSuccess: () => {
      toast({ title: 'Designation created', variant: 'success' });
      invalidate();
      closeDialog();
    },
    onError: (e: any) => toast({ title: 'Error', description: e?.response?.data?.message ?? 'Failed', variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      designationService.update(id, payload),
    onSuccess: () => {
      toast({ title: 'Designation updated', variant: 'success' });
      invalidate();
      closeDialog();
    },
    onError: (e: any) => toast({ title: 'Error', description: e?.response?.data?.message ?? 'Failed', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => designationService.delete(id),
    onSuccess: () => {
      toast({ title: 'Designation deleted', variant: 'success' });
      invalidate();
      setDeleteTarget(null);
    },
    onError: (e: any) => toast({ title: 'Error', description: e?.response?.data?.message ?? 'Failed', variant: 'destructive' }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      designationService.toggleActive(id, isActive),
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
    if (exists) {
      setSelectedSkills(selectedSkills.filter((s) => s.skillId !== skill.id));
    } else {
      setSelectedSkills([...selectedSkills, { skillId: skill.id, name: skill.name, isRequired: true }]);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const parsed = createSchema.safeParse({
      name: form.name,
      code: form.code,
      level: form.level ? Number(form.level) : undefined,
      description: form.description || undefined,
      defaultDescription: form.defaultDescription,
      defaultResponsibilities: form.defaultResponsibilities || undefined,
      defaultRequirements: form.defaultRequirements || undefined,
      defaultBenefits: form.defaultBenefits || undefined,
    });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'Validation failed');
      return;
    }

    const payload = {
      ...parsed.data,
      level: parsed.data.level ?? undefined,
      skillIds: selectedSkills.map((s) => ({ skillId: s.skillId, isRequired: s.isRequired })),
    };

    if (editing) {
      updateMutation.mutate({ id: editing.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const rows = data?.data ?? [];
  const pagination = data?.pagination;
  const saving = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    setPage(1);
  }, [search]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Designation</h1>
          <p className="text-sm text-muted-foreground">Manage job designations, levels, and Job Description templates</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Add Designation
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Search designations..." />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-10 text-center text-muted-foreground">Loading...</div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No designations found
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell>{String(row.code ?? '—')}</TableCell>
                        <TableCell>{row.level ? `L${row.level}` : '—'}</TableCell>
                        <TableCell>
                          {(row as any).defaultDescription ? (
                            <Badge variant="secondary">Configured</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={row.isActive ? 'default' : 'secondary'}>
                            {row.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(row)} title="Edit">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title={row.isActive ? 'Deactivate' : 'Activate'}
                              onClick={() => toggleMutation.mutate({ id: row.id, isActive: !row.isActive })}
                            >
                              {row.isActive ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                            </Button>
                            <Button variant="ghost" size="icon" title="Delete" onClick={() => setDeleteTarget(row)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {pagination && (
            <div className="mt-4">
              <Pagination pagination={pagination} onPageChange={setPage} />
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Designation' : 'Create Designation'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Designation Name *</Label>
                <Input required value={form.name} onChange={setField('name')} placeholder="e.g. Senior Engineer" />
              </div>
              <div>
                <Label>Code *</Label>
                <Input required value={form.code} onChange={setField('code')} placeholder="e.g. SSE" />
              </div>
              <div>
                <Label>Level (1–20)</Label>
                <Input type="number" min={1} max={20} value={form.level} onChange={setField('level')} placeholder="e.g. 4" />
              </div>
              <div className="sm:col-span-2">
                <Label>Description</Label>
                <textarea
                  rows={2}
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none"
                  value={form.description}
                  onChange={setField('description')}
                  placeholder="Short designation summary"
                />
              </div>
            </div>

            <div className="border-t pt-4 space-y-4">
              <div>
                <h3 className="font-semibold text-base">Job Description Template</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Defaults used when creating a new Job for this designation. Existing jobs are not affected when you update this template.
                </p>
              </div>

              <div>
                <Label>Overview *</Label>
                <textarea
                  required
                  rows={5}
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none"
                  value={form.defaultDescription}
                  onChange={setField('defaultDescription')}
                  placeholder="Brief overview of the role..."
                />
              </div>
              <div>
                <Label>Responsibilities</Label>
                <textarea
                  rows={5}
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none"
                  value={form.defaultResponsibilities}
                  onChange={setField('defaultResponsibilities')}
                  placeholder="• Lead hiring operations&#10;• Coordinate interviews..."
                />
              </div>
              <div>
                <Label>Requirements</Label>
                <textarea
                  rows={5}
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none"
                  value={form.defaultRequirements}
                  onChange={setField('defaultRequirements')}
                  placeholder="• Graduate with HR experience&#10;• Strong communication..."
                />
              </div>
              <div>
                <Label>Benefits & Perks</Label>
                <textarea
                  rows={4}
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none"
                  value={form.defaultBenefits}
                  onChange={setField('defaultBenefits')}
                  placeholder="• Health insurance&#10;• Performance bonus..."
                />
              </div>

              <div>
                <Label>Required Skills</Label>
                <p className="text-xs text-muted-foreground mb-2">Click to add. Toggle * to mark as required.</p>
                {selectedSkills.length > 0 && (
                  <div className="flex gap-2 flex-wrap mb-3">
                    {selectedSkills.map((s) => (
                      <Badge key={s.skillId} variant="default" className="gap-1.5 cursor-pointer pr-1">
                        <span
                          onClick={() =>
                            setSelectedSkills(selectedSkills.map((sk) =>
                              sk.skillId === s.skillId ? { ...sk, isRequired: !sk.isRequired } : sk,
                            ))
                          }
                        >
                          {s.name}{s.isRequired ? ' *' : ''}
                        </span>
                        <X className="h-3 w-3" onClick={() => toggleSkill({ id: s.skillId, name: s.name })} />
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 flex-wrap max-h-40 overflow-y-auto rounded-md border p-2">
                  {allSkills
                    .filter((sk) => !selectedSkills.find((s) => s.skillId === sk.id))
                    .map((skill) => (
                      <Badge
                        key={skill.id}
                        variant="outline"
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                        onClick={() => toggleSkill({ id: skill.id, name: skill.name })}
                      >
                        + {skill.name}
                      </Badge>
                    ))}
                  {allSkills.length === 0 && (
                    <p className="text-xs text-muted-foreground">No skills in master data.</p>
                  )}
                </div>
              </div>
            </div>

            {formError && <p className="text-sm text-destructive">{formError}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : editing ? 'Update Designation' : 'Create Designation'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete designation?"
        description={`This will delete "${deleteTarget?.name}". This action cannot be undone.`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
