import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
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
import { departmentService, subDepartmentService, type MasterRecord } from '@/services/master.service';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().max(10).optional(),
  description: z.string().optional(),
  departmentId: z.string().min(1, 'Department is required'),
});

type FormValues = z.infer<typeof schema>;

export function SubDepartmentsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
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

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

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

  useEffect(() => {
    setPage(1);
  }, [search, departmentFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Sub Departments</h1>
          <p className="text-sm text-muted-foreground">Manage sub departments under each department</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Add Sub Department</Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <SearchInput value={search} onChange={setSearch} placeholder="Search sub departments..." />
            </div>
            <select
              className="border rounded-md px-3 py-2 text-sm bg-background"
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
            >
              <option value="">All Departments</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : rows.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No sub departments found</TableCell></TableRow>
                ) : rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell>{String(row.code ?? '—')}</TableCell>
                    <TableCell>
                      {(row.department as { name?: string } | undefined)?.name
                        ?? deptNameById[String(row.departmentId)]
                        ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.isActive ? 'default' : 'secondary'}>
                        {row.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(row)}><Pencil className="h-4 w-4" /></Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleMutation.mutate({ id: row.id, isActive: !row.isActive })}
                      >
                        {row.isActive ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(row)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {pagination && <div className="mt-4"><Pagination pagination={pagination} onPageChange={setPage} /></div>}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Sub Department' : 'Add Sub Department'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label>Department *</Label>
              <select className="w-full border rounded-md px-3 py-2 text-sm bg-background mt-1" {...register('departmentId')}>
                <option value="">Select...</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              {errors.departmentId && <p className="text-xs text-red-600 mt-1">{errors.departmentId.message}</p>}
            </div>
            <div>
              <Label>Name *</Label>
              <Input className="mt-1" {...register('name')} placeholder="e.g. Backend" />
              {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <Label>Code</Label>
              <Input className="mt-1" {...register('code')} placeholder="e.g. BE" />
            </div>
            <div>
              <Label>Description</Label>
              <textarea rows={3} className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none mt-1" {...register('description')} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}>
                {editing ? 'Save' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Sub Department"
        description={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </div>
  );
}
