import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Building2, Briefcase, FileText,
  Calendar, Gift, UserPlus, BarChart3, Settings,
  ChevronDown, Layers, ClipboardList, ChevronsLeft,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';

interface NavItem {
  label: string;
  icon: React.ElementType;
  to?: string;
  permission?: string;
  children?: { label: string; to: string; permission?: string }[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
  { label: 'Requisitions', icon: UserPlus, to: '/requisitions', permission: 'requisitions:read' },
  { label: 'Jobs', icon: Briefcase, to: '/jobs', permission: 'jobs:read' },
  { label: 'Applications', icon: FileText, to: '/applications', permission: 'applications:read' },
  { label: 'Candidates', icon: Users, to: '/candidates', permission: 'candidates:read' },
  { label: 'Interviews', icon: Calendar, to: '/interviews', permission: 'interviews:read' },
  { label: 'Assessments', icon: ClipboardList, to: '/assessments', permission: 'assessments:read' },
  { label: 'Offers', icon: Gift, to: '/offers', permission: 'offers:read' },
  { label: 'Insights', icon: BarChart3, to: '/insights', permission: 'reports:read' },
  {
    label: 'Masters',
    icon: Layers,
    permission: 'masters:read',
    children: [
      { label: 'Departments', to: '/masters/departments' },
      { label: 'Sub Departments', to: '/masters/sub-departments' },
      { label: 'Designations', to: '/masters/designations' },
      { label: 'Locations', to: '/masters/locations' },
      { label: 'Skills', to: '/masters/skills' },
      { label: 'Employment Types', to: '/masters/employment-types' },
      { label: 'Experience Levels', to: '/masters/experience-levels' },
      { label: 'Interview Types', to: '/masters/interview-types' },
      { label: 'Education', to: '/masters/education' },
      { label: 'Sources', to: '/masters/recruitment-sources' },
    ],
  },
  {
    label: 'Administration',
    icon: Settings,
    permission: 'users:read',
    children: [
      { label: 'Users', to: '/users', permission: 'users:read' },
      { label: 'Roles', to: '/roles', permission: 'roles:read' },
      { label: 'Email Templates', to: '/settings/email-templates', permission: 'email-templates:read' },
      { label: 'Email Branding', to: '/settings/email-branding', permission: 'email-templates:read' },
      { label: 'Pipeline Stages', to: '/settings/pipeline-stages', permission: 'email-templates:read' },
    ],
  },
];

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
}

const navIdle =
  'text-[#64748B] hover:bg-[#FFF7ED] hover:text-[#111827]';
const navActive =
  'bg-[#FFF7ED] text-[#FF6B00] hover:bg-[#FFF7ED] hover:text-[#FF6B00]';

export function Sidebar({ open, onToggle }: SidebarProps) {
  const { hasPermission } = useAuth();
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(['Masters']));

  const toggleExpand = (label: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  };

  const canShow = (item: NavItem) => !item.permission || hasPermission(item.permission);

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-30 flex h-full flex-col border-r border-[#E2E8F0] bg-white text-[#111827] transition-all duration-300',
        open ? 'w-[260px]' : 'w-[72px]'
      )}
    >
      <div
        className={cn(
          'flex h-[72px] items-center border-b border-[#E2E8F0]',
          open ? 'justify-between gap-2 px-3' : 'justify-center px-2'
        )}
      >
        {open ? (
          <>
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <img
                src="/career-assets/srj-logo-dark.png"
                alt="SRJ — World of Steel"
                className="h-11 w-auto max-w-[88px] shrink-0 object-contain object-left"
              />
              <span className="h-8 w-px shrink-0 bg-[#E2E8F0]" aria-hidden />
              <span className="truncate text-[13px] font-bold uppercase tracking-[0.06em] text-[#111827]">
                SRJ Group
              </span>
            </div>
            <button
              type="button"
              onClick={onToggle}
              title="Close sidebar"
              className="shrink-0 rounded-full border border-[#E2E8F0] p-1.5 text-[#64748B] transition-colors hover:bg-[#FFF7ED] hover:text-[#FF6B00]"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onToggle}
            title="Open sidebar"
            className="flex items-center justify-center rounded-lg p-1 transition-colors hover:bg-[#FFF7ED]"
          >
            <img
              src="/career-assets/srj-logo-dark.png"
              alt="SRJ"
              className="h-9 w-9 object-contain"
            />
          </button>
        )}
      </div>

      <nav className={cn('flex-1 overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] py-4 [&::-webkit-scrollbar]:hidden', open ? 'px-3' : 'px-2')}>
        {NAV_ITEMS.filter(canShow).map((item) => {
          if (item.children) {
            const isExpanded = expandedItems.has(item.label);
            const isActive = item.children.some((c) => location.pathname.startsWith(c.to));

            if (!open) {
              return (
                <button
                  key={item.label}
                  type="button"
                  title={item.label}
                  onClick={() => {
                    onToggle();
                    setExpandedItems((prev) => new Set(prev).add(item.label));
                  }}
                  className={cn(
                    'mb-0.5 flex w-full items-center justify-center rounded-lg py-2.5 transition-colors',
                    navIdle,
                    isActive && navActive
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                </button>
              );
            }

            return (
              <div key={item.label}>
                <button
                  type="button"
                  onClick={() => toggleExpand(item.label)}
                  className={cn(
                    'mb-0.5 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    navIdle,
                    isActive && 'text-[#FF6B00]'
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                  <ChevronDown
                    className={cn('h-4 w-4 transition-transform', isExpanded && 'rotate-180')}
                  />
                </button>
                {isExpanded && (
                  <div className="mb-1 ml-7 border-l border-[#E2E8F0] pl-3">
                    {item.children.map((child) => (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        className={({ isActive: childActive }) =>
                          cn(
                            'mb-0.5 flex items-center rounded-md px-2 py-2 text-sm text-[#64748B] transition-colors hover:bg-[#FFF7ED] hover:text-[#111827]',
                            childActive && 'bg-[#FFF7ED] font-medium text-[#FF6B00]'
                          )
                        }
                      >
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <NavLink
              key={item.to}
              to={item.to!}
              title={item.label}
              className={({ isActive }) =>
                cn(
                  'mb-0.5 flex items-center rounded-lg text-sm font-medium transition-colors',
                  open ? 'gap-3 px-3 py-2.5' : 'justify-center py-2.5',
                  navIdle,
                  isActive && navActive
                )
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {open && item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-[#E2E8F0] p-3">
        <div
          className={cn(
            'flex items-start py-2 text-xs text-[#64748B]',
            open ? 'gap-2 px-3' : 'justify-center'
          )}
          title="SRJ Group ATS"
        >
          <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#FF6B00]" />
          {open && (
            <div className="min-w-0 leading-tight">
              <p className="font-medium text-[#475569]">SRJ Group ATS</p>
              <p className="mt-0.5 text-[10px] text-[#94A3B8]">Powered by SRJ Group</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
