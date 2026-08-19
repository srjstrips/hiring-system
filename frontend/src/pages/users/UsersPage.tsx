import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Search, X } from 'lucide-react';
import { Pagination } from '@/components/common/Pagination';
import { StatusBadge } from '@/components/common/StatusBadge';
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

const inputCls =
  'h-[44px] w-full rounded-[8px] border border-[#E5E7EB] bg-white px-3 text-sm text-[#0F172A] outline-none placeholder:text-[#94A3B8] focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20';
const selectCls =
  'h-[44px] w-full rounded-[8px] border border-[#E5E7EB] bg-white px-3 text-sm text-[#0F172A] outline-none focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20';
const labelCls = 'mb-2 block text-sm font-medium text-[#334155]';

export default function UsersPage() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchLocal, setSearchLocal] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);

  const params = useMemo(() => ({
    page,
    limit: 10,
    search: search || undefined,
    status: statusFilter || undefined,
    roleId: roleFilter || undefined,
    departmentId: deptFilter || undefined,
  }), [page, search, statusFilter, roleFilter, deptFilter]);

  const { data, isLoading } = useQuery({ queryKey: ['users', params], queryFn: () => usersApi.getAll(params) });
  const { data: rolesRes } = useQuery({ queryKey: ['user-roles'], queryFn: () => usersApi.getRoles() });
  const { data: departments = [] } = useQuery({ queryKey: ['dept-active'], queryFn: () => departmentService.getAllActive() });
  const { data: locations = [] } = useQuery({ queryKey: ['loc-active'], queryFn: () => locationService.getAllActive() });

  const rows = data?.data ?? [];
  const pagination = data?.pagination ?? buildPagination(data?.total ?? rows.length, page, 10);
  const roles = rolesRes?.data ?? [];

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        firstName: form.firstName, lastName: form.lastName,
        phone: form.phone || undefined, roleId: form.roleId,
        departmentId: form.departmentId || undefined,
        departmentIds: form.departmentIds, locationIds: form.locationIds,
      };
      if (editing) { payload.status = form.status; return usersApi.update(editing.id, payload); }
      payload.email = form.email;
      if (form.password) payload.password = form.password;
      return usersApi.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: editing ? 'User updated' : 'User created', variant: 'success' });
      setOpen(false); setEditing(null); setForm(emptyForm);
    },
    onError: (e: any) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  });

  const toggleStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => usersApi.update(id, { status }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); toast({ title: 'User status updated', variant: 'success' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  });

  const openCreate = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (user: any) => {
    setEditing(user);
    setForm({
      email: user.email, firstName: user.firstName, lastName: user.lastName,
      phone: user.phone ?? '', roleId: user.role?.id ?? '',
      departmentId: user.departmentId ?? '', password: '',
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

  // debounce
  useEffect(() => {
    const t = window.setTimeout(() => { setSearch(searchLocal); setPage(1); }, 300);
    return () => window.clearTimeout(t);
  }, [searchLocal]);

  // modal scroll lock
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <div className="relative bg-[#F7F9FC] px-4 pb-6 pt-6 sm:px-6 sm:pb-8 sm:pt-8 lg:px-8">
      <div className="mx-auto w-full max-w-[1280px] space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-[22px] font-bold leading-tight text-[#0F172A]">User Management</h1>
            <p className="text-sm text-[#64748B]">Create HR users, assign departments/locations, and manage access.</p>
          </div>
          {hasPermission('users:create') && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex h-[44px] items-center gap-2 rounded-[8px] bg-[#F97316] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#EA580C]"
            >
              <Plus className="h-4 w-4" strokeWidth={2.25} />
              Add User
            </button>
          )}
        </div>

        {/* Card */}
        <div className="w-full rounded-[12px] border border-[#E5E7EB] bg-white shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
          {/* Filter strip */}
          <div className="flex flex-wrap items-center gap-3 border-b border-[#E5E7EB] px-6 py-5">
            <div className="relative w-[260px] max-w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
              <input
                value={searchLocal}
                onChange={(e) => setSearchLocal(e.target.value)}
                placeholder="Search..."
                className="h-[44px] w-full rounded-[8px] border border-[#E5E7EB] bg-white pl-10 pr-9 text-sm text-[#0F172A] outline-none placeholder:text-[#94A3B8] focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20"
              />
              {searchLocal && (
                <button type="button" className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-[#64748B] hover:bg-[#F1F5F9]" onClick={() => setSearchLocal('')}>
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <select className="h-[44px] rounded-[8px] border border-[#E5E7EB] bg-white px-3 text-sm text-[#0F172A] outline-none focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20" value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}>
              <option value="">All Role</option>
              {roles.map((r: any) => <option key={r.id} value={r.id}>{r.displayName ?? r.name}</option>)}
            </select>
            <select className="h-[44px] rounded-[8px] border border-[#E5E7EB] bg-white px-3 text-sm text-[#0F172A] outline-none focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20" value={deptFilter} onChange={(e) => { setDeptFilter(e.target.value); setPage(1); }}>
              <option value="">All Department</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <select className="h-[44px] rounded-[8px] border border-[#E5E7EB] bg-white px-3 text-sm text-[#0F172A] outline-none focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>

          {/* Table */}
          <div className="px-6 py-5">
            <div className="overflow-x-auto overflow-hidden rounded-[10px] border border-[#E5E7EB]">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-[#F8FAFC]">
                    {['NAME', 'EMAIL', 'ROLE', 'PRIMARY DEPT', 'ASSIGNED DEPTS', 'LOCATIONS', 'STATUS', 'ACTIONS'].map((h) => (
                      <th key={h} className="h-[44px] whitespace-nowrap px-5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="h-[64px]">
                        <td colSpan={8} className="px-5 py-4"><div className="h-[12px] w-full animate-pulse rounded bg-[#F1F5F9]" /></td>
                      </tr>
                    ))
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={8} className="px-5 py-14 text-center text-sm font-semibold text-[#0F172A]">No users found</td></tr>
                  ) : rows.map((user: any) => (
                    <tr key={user.id} className="border-b border-[#E5E7EB] last:border-b-0">
                      <td className="h-[64px] px-5 align-middle"><span className="text-sm font-semibold text-[#0F172A]">{user.firstName} {user.lastName}</span></td>
                      <td className="h-[64px] px-5 align-middle"><span className="text-sm text-[#64748B]">{user.email}</span></td>
                      <td className="h-[64px] px-5 align-middle"><span className="text-sm text-[#64748B]">{user.role?.displayName ?? user.role?.name ?? '—'}</span></td>
                      <td className="h-[64px] px-5 align-middle"><span className="text-sm text-[#64748B]">{user.department?.name ?? '—'}</span></td>
                      <td className="h-[64px] max-w-[160px] px-5 align-middle"><span className="text-xs text-[#64748B]">{user.departmentAssignments?.map((d: any) => d.department?.name).filter(Boolean).join(', ') || '—'}</span></td>
                      <td className="h-[64px] max-w-[140px] px-5 align-middle"><span className="text-xs text-[#64748B]">{user.locationAssignments?.map((l: any) => l.location?.name).filter(Boolean).join(', ') || '—'}</span></td>
                      <td className="h-[64px] px-5 align-middle"><StatusBadge status={user.status} /></td>
                      <td className="h-[64px] px-5 align-middle">
                        {hasPermission('users:update') && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              title="Edit"
                              onClick={() => openEdit(user)}
                              className="flex h-[36px] w-[36px] items-center justify-center rounded-[8px] border border-[#E5E7EB] bg-white text-[#334155] transition-colors hover:bg-[#F8FAFC]"
                            >
                              <Pencil className="h-[16px] w-[16px]" />
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleStatus.mutate({ id: user.id, status: user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })}
                              className={`inline-flex h-[32px] items-center rounded-[6px] border px-3 text-xs font-medium transition-colors ${user.status === 'ACTIVE' ? 'border-[#E5E7EB] bg-white text-[#64748B] hover:bg-[#F8FAFC]' : 'border-[#F97316]/30 bg-[#FFF7ED] text-[#EA580C] hover:bg-[#FFEDD5]'}`}
                            >
                              {user.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pagination && (
              <div className="mt-5 border-t border-[#E5E7EB] pt-4">
                <Pagination pagination={pagination} onPageChange={setPage} />
              </div>
            )}
          </div>
        </div>

        {/* Modal */}
        {open && (
          <div className="fixed inset-0 z-[9999]" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
            <div className="absolute inset-0 bg-[rgba(0,0,0,0.45)]" />
            <div className="relative mx-auto mt-[3vh] flex h-[94vh] w-[calc(100%-2rem)] max-w-[520px] flex-col rounded-[14px] bg-white shadow-[0_24px_64px_rgba(15,23,42,0.22)]" role="dialog" aria-modal="true">
              <div className="flex shrink-0 items-center justify-between border-b border-[#E5E7EB] px-7 py-5">
                <h2 className="text-[18px] font-semibold text-[#0F172A]">{editing ? 'Edit User' : 'Create HR User'}</h2>
                <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-[8px] text-[#64748B] hover:bg-[#F1F5F9]">
                  <X className="h-[18px] w-[18px]" />
                </button>
              </div>

              <div className="flex-1 space-y-5 overflow-y-auto px-7 py-6">
                {!editing && (
                  <div>
                    <label className={labelCls}>Email</label>
                    <input type="email" className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>First Name</label>
                    <input type="text" className={inputCls} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                  </div>
                  <div>
                    <label className={labelCls}>Last Name</label>
                    <input type="text" className={inputCls} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Phone</label>
                  <input type="text" className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls}>Role</label>
                  <select className={selectCls} value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })}>
                    <option value="">Select role</option>
                    {roles.map((r: any) => <option key={r.id} value={r.id}>{r.displayName ?? r.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Primary Department</label>
                  <select className={selectCls} value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
                    <option value="">None</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Assigned Departments</label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {departments.map((d) => {
                      const active = form.departmentIds.includes(d.id);
                      return (
                        <button key={d.id} type="button" onClick={() => toggleMulti('departmentIds', d.id)}
                          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${active ? 'border-[#F97316] bg-[#FFF7ED] text-[#EA580C]' : 'border-[#E5E7EB] bg-white text-[#64748B] hover:border-[#F97316] hover:bg-[#FFF7ED] hover:text-[#EA580C]'}`}>
                          {d.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Assigned Locations</label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {locations.map((l) => {
                      const active = form.locationIds.includes(l.id);
                      return (
                        <button key={l.id} type="button" onClick={() => toggleMulti('locationIds', l.id)}
                          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${active ? 'border-[#F97316] bg-[#FFF7ED] text-[#EA580C]' : 'border-[#E5E7EB] bg-white text-[#64748B] hover:border-[#F97316] hover:bg-[#FFF7ED] hover:text-[#EA580C]'}`}>
                          {l.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {!editing && (
                  <div>
                    <label className={labelCls}>Password (optional — auto-generated if empty)</label>
                    <input type="password" className={inputCls} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                  </div>
                )}
                {editing && (
                  <div>
                    <label className={labelCls}>Status</label>
                    <select className={selectCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                      <option value="SUSPENDED">Suspended</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="flex shrink-0 items-center justify-between gap-4 border-t border-[#E5E7EB] px-7 py-5">
                <button type="button" onClick={() => setOpen(false)} className="inline-flex h-[44px] items-center justify-center rounded-[8px] border border-[#E5E7EB] bg-white px-5 text-sm font-medium text-[#111827] hover:bg-[#F8FAFC]">
                  Cancel
                </button>
                <button type="button" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()} className="inline-flex h-[44px] items-center justify-center rounded-[8px] bg-[#F97316] px-5 text-sm font-semibold text-white hover:bg-[#EA580C] disabled:opacity-60">
                  {saveMutation.isPending ? 'Saving...' : editing ? 'Save' : 'Create User'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
