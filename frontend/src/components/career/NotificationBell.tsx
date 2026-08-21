import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { candidateNotificationsApi, type CandidateNotification } from '@/api/candidateNotifications';

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: unreadData } = useQuery({
    queryKey: ['candidate-notifications-unread-count'],
    queryFn: () => candidateNotificationsApi.getUnreadCount().then((r) => r.data.data as { count: number }),
    refetchInterval: 30000,
  });
  const unreadCount = unreadData?.count ?? 0;

  const { data: listData, isLoading } = useQuery({
    queryKey: ['candidate-notifications'],
    queryFn: () => candidateNotificationsApi.getAll({ limit: 20 }).then((r) => r.data.data as CandidateNotification[]),
    enabled: open,
  });
  const notifications = listData ?? [];

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => candidateNotificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['candidate-notifications-unread-count'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => candidateNotificationsApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['candidate-notifications-unread-count'] });
    },
  });

  const handleSelect = (n: CandidateNotification) => {
    if (!n.isRead) markAsReadMutation.mutate(n.id);
    setOpen(false);
    if (n.jobSlug) navigate(`/careers/jobs/${n.jobSlug}`);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex h-10 w-10 items-center justify-center rounded-full text-[#475569] transition-colors hover:bg-[#FFF7ED] hover:text-[#F97316]"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#F97316] px-1 text-[10px] font-semibold leading-none text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[360px] max-w-[90vw] rounded-xl border-[#E5E7EB] p-0 shadow-lg">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] px-4 py-3">
          <p className="text-sm font-semibold text-[#111827]">Notifications</p>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
              className="flex items-center gap-1 text-xs font-medium text-[#F97316] transition-colors hover:text-[#EA580C] disabled:opacity-50"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all as read
            </button>
          )}
        </div>

        <div className="max-h-[360px] overflow-y-auto">
          {isLoading ? (
            <p className="px-4 py-8 text-center text-sm text-[#64748B]">Loading...</p>
          ) : notifications.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-[#64748B]">No notifications yet</p>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => handleSelect(n)}
                className={`flex w-full items-start gap-3 border-b border-[#F1F5F9] px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-[#FFF7ED] ${
                  n.isRead ? '' : 'bg-[#FFF7ED]/60'
                }`}
              >
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.isRead ? 'bg-transparent' : 'bg-[#F97316]'}`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-[#111827]">{n.title}</span>
                  <span className="mt-0.5 block text-xs text-[#64748B]">{n.message}</span>
                  <span className="mt-1 block text-[11px] text-[#94A3B8]">{timeAgo(n.createdAt)}</span>
                </span>
              </button>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
