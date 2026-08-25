import { Bell, LogOut, User, Settings, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/useToast';
import { api } from '@/api/axios';

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [bellOpen, setBellOpen] = useState(false);

  // Recent applications as HR notifications (last 10 updated)
  const { data: recentApps } = useQuery({
    queryKey: ['hr-notifications'],
    queryFn: () => api.get('/applications', { params: { limit: 10 } }).then((r) => r.data.data as any[]),
    refetchInterval: 60000,
  });
  const notifications = recentApps ?? [];

  const handleLogout = async () => {
    await logout();
    toast({ title: 'Logged out', description: 'See you next time!', variant: 'default' });
    navigate('/careers/login');
  };

  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : '??';

  return (
    <header className="flex h-16 items-center justify-end border-b border-[#E2E8F0] bg-white px-4 sm:px-6">
      <div className="flex items-center gap-1 sm:gap-2">
        <DropdownMenu open={bellOpen} onOpenChange={setBellOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative text-[#64748B] hover:bg-[#FFF7ED] hover:text-[#111827]">
              <Bell className="h-5 w-5" />
              {notifications.length > 0 && (
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#FF6B00]" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[340px] max-w-[90vw] rounded-xl border-[#E2E8F0] p-0 shadow-lg">
            <div className="border-b border-[#E2E8F0] px-4 py-3">
              <p className="text-sm font-semibold text-[#111827]">Recent Applications</p>
            </div>
            <div className="max-h-[360px] overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-[#64748B]">No recent activity</p>
              ) : (
                notifications.map((app: any) => (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => { setBellOpen(false); navigate(`/applications/${app.id}`); }}
                    className="flex w-full items-start gap-3 border-b border-[#F1F5F9] px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-[#FFF7ED]"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FFF7ED] text-xs font-bold text-[#FF6B00]">
                      {app.candidate?.firstName?.[0]}{app.candidate?.lastName?.[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#111827]">
                        {app.candidate?.firstName} {app.candidate?.lastName}
                      </p>
                      <p className="text-xs text-[#64748B]">{app.job?.title} · {app.status.replace(/_/g, ' ')}</p>
                      <p className="mt-0.5 text-[11px] text-[#94A3B8]">{timeAgo(app.appliedAt)}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
            <div className="border-t border-[#E2E8F0] px-4 py-2">
              <button
                type="button"
                onClick={() => { setBellOpen(false); navigate('/applications'); }}
                className="text-xs font-medium text-[#FF6B00] hover:underline"
              >
                View all applications →
              </button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2 hover:bg-[#FFF7ED]">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.avatar} />
                <AvatarFallback className="bg-[#FF6B00] text-xs text-white">{initials}</AvatarFallback>
              </Avatar>
              <div className="hidden text-left md:block">
                <p className="text-sm font-semibold leading-none text-[#111827]">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="mt-0.5 text-xs text-[#64748B]">{user?.roleName}</p>
              </div>
              <ChevronDown className="hidden h-4 w-4 text-[#64748B] md:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="font-medium">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs font-normal text-muted-foreground">{user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/profile')}>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
