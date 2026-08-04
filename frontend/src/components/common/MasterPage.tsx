import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ZodSchema } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { SearchInput } from './SearchInput';
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
  columns?: { key: string; label: string; render?: (row: MasterRecord) => React.ReactNode }[];
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
    onSuccess: () => { toast({ title: `${title} deleted`}); invalidate(); setDeleteTarget(null); },
    onError: (e: any) => toast({ title: 'Error', description: e?.response?.data?.message ?? 'Failed', variant: 'destructive' }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => service.toggleActive(id, isActive),
    onSuccess: () => { invalidate(); },
    onError: (e: any) => toast({ title: 'Error', description: e?.response?.data?.message ?? 'Failed', variant: 'destructive' }),
  });

  const openCreate = () => { reset({}); setEditing(null); setDialogOpen(true); };
  const openEdit = (row: MasterRecord) => { reset(row); setEditing(row); setDialogOpen(true); };
  const closeDialog = () => { setDialogOpen(false); setEditing(null); reset({}); };

  const onSubmit = (values: Record<string, unknown>) => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const defaultColumns = [
    { key: 'name', label: 'Name' },
    ...fields.filter(f => f.name !== 'name' && f.name !== 'description').map(f => ({ key: f.name, label: f.label })),
  ];
  const displayColumns = columns ?? defaultColumns;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add {title}
        </Button>
      </div>

      {/* Table card */}
      <Card>
        <CardHeader className="pb-0">
          <div className="flex items-center gap-3">
            <SearchInput
              value={search}
              onChange={(v) => { setSearch(v); setPage(1); }}
              placeholder={`Search ${title.toLowerCase()}...`}
              className="max-w-xs"
            />
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {isLoading ? (
            <TableSkeleton cols={displayColumns.length + 2} />
          ) : !data?.data.length ? (
            <EmptyState title={title} onAdd={openCreate} />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    {displayColumns.map(col => (
                      <TableHead key={col.key}>{col.label}</TableHead>
                    ))}
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((row) => (
                    <TableRow key={row.id}>
                      {displayColumns.map(col => (
                        <TableCell key={col.key}>
                          {col.render ? col.render(row) : String(row[col.key] ?? '—')}
                        </TableCell>
                      ))}
                      <TableCell>
                        <Badge variant={row.isActive ? 'success' : 'secondary'}>
                          {row.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost" size="icon" className="h-8 w-8"
                            title={row.isActive ? 'Deactivate' : 'Activate'}
                            onClick={() => toggleMutation.mutate({ id: row.id, isActive: !row.isActive })}
                          >
                            {row.isActive
                              ? <ToggleRight className="h-4 w-4 text-green-600" />
                              : <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                            }
                          </Button>
                          <Button
                            variant="ghost" size="icon" className="h-8 w-8"
                            onClick={() => openEdit(row)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(row)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {data.pagination && (
                <div className="border-t mt-2">
                  <Pagination pagination={data.pagination} onPageChange={setPage} />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${title}` : `Add ${title}`}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {fields.map(field => (
                <div key={field.name} className={`space-y-2 ${field.colSpan ? 'col-span-2' : ''}`}>
                  <Label htmlFor={field.name}>
                    {field.label}
                    {field.required && <span className="text-destructive ml-1">*</span>}
                  </Label>
                  {field.type === 'textarea' ? (
                    <textarea
                      id={field.name}
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder={field.placeholder}
                      {...register(field.name)}
                    />
                  ) : (
                    <Input
                      id={field.name}
                      type={field.type ?? 'text'}
                      placeholder={field.placeholder}
                      {...register(field.name, { valueAsNumber: field.type === 'number' })}
                    />
                  )}
                  {errors[field.name] && (
                    <p className="text-xs text-destructive">
                      {(errors[field.name] as any)?.message}
                    </p>
                  )}
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" loading={isSubmitting}>
                {editing ? 'Save Changes' : `Create ${title}`}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
  );
}

function TableSkeleton({ cols }: { cols: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="h-10 flex-1 rounded-md bg-muted animate-pulse" />
          ))}
        </div>
      ))}
    </div>
  );
}

function EmptyState({ title, onAdd }: { title: string; onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-4xl mb-3">📋</div>
      <p className="text-sm font-medium text-foreground">No {title.toLowerCase()} found</p>
      <p className="text-xs text-muted-foreground mt-1 mb-4">
        Get started by adding your first {title.toLowerCase()}.
      </p>
      <Button size="sm" onClick={onAdd}>
        <Plus className="mr-2 h-4 w-4" />
        Add {title}
      </Button>
    </div>
  );
}
