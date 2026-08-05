import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { FilterBar } from '@/components/common/FilterBar';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Pagination } from '@/components/common/Pagination';
import { usersApi } from '@/api/dashboard';
import { departmentService, locationService } from '@/services/master.service';
import { toast } from '@/hooks/useToast';
import { buildPagination } from '@/utils/buildPagination';
import { useAuth } from '@/contexts/AuthContext';

const emptyForm = {
  email: '',
  firstName: '',
  lastName: '',
  phone: '',
  roleId: '',
  departmentId: '',
  password: '',
  departmentIds: [] as string[],
  locationIds: [] as string[],
  status: 'ACTIVE',
};

export default function UsersPage() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);

  const params = useMemo(() => ({
    page,
    limit: 10,
    search: search || undefined,
    status: filters.status || undefined,
    roleId: filters.roleId || undefined,
    departmentId: filters.departmentId || undefined,
  }), [page, search, filters]);

  const { data, isLoading } = useQuery({
    queryKey: ['users', params],
    queryFn: () => usersApi.getAll(params),
  });

  const { data: rolesRes } = useQuery({
    queryKey: ['user-roles'],
    queryFn: () => usersApi.getRoles(),
  });

  const { data: departments = [] } = useQuery({ queryKey: ['dept-active'], queryFn: () => departmentService.getAllActive() });
  const { data: locations = [] } = useQuery({ queryKey: ['loc-active'], queryFn: () => locationService.getAllActive() });

  const rows = data?.data ?? [];
  const pagination = data?.pagination ?? buildPagination(data?.total ?? rows.length, page, 10);
  const roles = rolesRes?.data ?? [];

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone || undefined,
        roleId: form.roleId,
        departmentId: form.departmentId || undefined,
        departmentIds: form.departmentIds,
        locationIds: form.locationIds,
      };
      if (editing) {
        payload.status = form.status;
        return usersApi.update(editing.id, payload);
      }
      payload.email = form.email;
      if (form.password) payload.password = form.password;
      return usersApi.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: editing ? 'User updated' : 'User created', variant: 'success' });
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
    },
    onError: (e: any) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  });

  const toggleStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => usersApi.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: 'User status updated', variant: 'success' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (user: any) => {
    setEditing(user);
    setForm({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone ?? '',
      roleId: user.role?.id ?? '',
      departmentId: user.departmentId ?? '',
      password: '',
      departmentIds: user.departmentAssignments?.map((d: any) => d.departmentId ?? d.department?.id) ?? [],
      locationIds: user.locationAssignments?.map((l: any) => l.locationId ?? l.location?.id) ?? [],
      status: user.status,
    });
    setOpen(true);
  };

  const toggleMulti = (key: 'departmentIds' | 'locationIds', id: string) => {
    setForm((prev) => {
      const set = new Set(prev[key]);
      set.has(id) ? set.delete(id) : set.add(id);
      return { ...prev, [key]: Array.from(set) };
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-muted-foreground mt-1">Create HR users, assign departments/locations, and manage access.</p>
        </div>
        {hasPermission('users:create') && (
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Add User</Button>
        )}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Users</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <FilterBar
            search={search}
            onSearchChange={(v) => { setPage(1); setSearch(v); }}
            values={filters}
            onChange={(k, v) => { setPage(1); setFilters((p) => ({ ...p, [k]: v })); }}
            onClear={() => { setFilters({}); setSearch(''); setPage(1); }}
            filters={[
              { key: 'roleId', label: 'Role', options: roles.map((r: any) => ({ value: r.id, label: r.displayName ?? r.name })) },
              { key: 'departmentId', label: 'Department', options: departments.map((d) => ({ value: d.id, label: d.name })) },
              { key: 'status', label: 'Status', options: [
                { value: 'ACTIVE', label: 'Active' },
                { value: 'INACTIVE', label: 'Inactive' },
                { value: 'SUSPENDED', label: 'Suspended' },
              ]},
            ]}
          />

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Primary Dept</TableHead>
                  <TableHead>Assigned Depts</TableHead>
                  <TableHead>Locations</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : rows.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No users found</TableCell></TableRow>
                ) : rows.map((user: any) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.firstName} {user.lastName}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.role?.displayName ?? user.role?.name}</TableCell>
                    <TableCell>{user.department?.name ?? '—'}</TableCell>
                    <TableCell className="text-xs max-w-[180px]">
                      {user.departmentAssignments?.map((d: any) => d.department?.name).filter(Boolean).join(', ') || '—'}
                    </TableCell>
                    <TableCell className="text-xs max-w-[180px]">
                      {user.locationAssignments?.map((l: any) => l.location?.name).filter(Boolean).join(', ') || '—'}
                    </TableCell>
                    <TableCell><StatusBadge status={user.status} /></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {hasPermission('users:update') && (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => openEdit(user)}><Pencil className="h-3 w-3" /></Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleStatus.mutate({
                                id: user.id,
                                status: user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
                              })}
                            >
                              {user.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Pagination pagination={pagination} onPageChange={setPage} />
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit User' : 'Create HR User'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {!editing && (
              <div>
                <Label>Email</Label>
                <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>First Name</Label>
                <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
              </div>
              <div>
                <Label>Last Name</Label>
                <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <Label>Role</Label>
              <select
                className="w-full h-9 rounded-md border px-3 text-sm"
                value={form.roleId}
                onChange={(e) => setForm({ ...form, roleId: e.target.value })}
              >
                <option value="">Select role</option>
                {roles.map((r: any) => (
                  <option key={r.id} value={r.id}>{r.displayName ?? r.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Primary Department</Label>
              <select
                className="w-full h-9 rounded-md border px-3 text-sm"
                value={form.departmentId}
                onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
              >
                <option value="">None</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Assigned Departments</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {departments.map((d) => {
                  const active = form.departmentIds.includes(d.id);
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => toggleMulti('departmentIds', d.id)}
                      className={`text-xs px-2 py-1 rounded-full border ${active ? 'bg-blue-600 text-white border-blue-600' : 'bg-background'}`}
                    >
                      {d.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <Label>Assigned Locations</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {locations.map((l) => {
                  const active = form.locationIds.includes(l.id);
                  return (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => toggleMulti('locationIds', l.id)}
                      className={`text-xs px-2 py-1 rounded-full border ${active ? 'bg-blue-600 text-white border-blue-600' : 'bg-background'}`}
                    >
                      {l.name}
                    </button>
                  );
                })}
              </div>
            </div>
            {!editing && (
              <div>
                <Label>Password (optional — auto-generated if empty)</Label>
                <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
            )}
            {editing && (
              <div>
                <Label>Status</Label>
                <select
                  className="w-full h-9 rounded-md border px-3 text-sm"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}><X className="h-4 w-4 mr-1" /> Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
