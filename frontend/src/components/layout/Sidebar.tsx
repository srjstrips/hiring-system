import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Building2, Briefcase, FileText,
  UserCheck, Calendar, Gift, UserPlus, BarChart3, Settings,
  ChevronDown, X, Layers, Menu,
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
  { label: 'Offers', icon: Gift, to: '/offers', permission: 'offers:read' },
  { label: 'Insights', icon: BarChart3, to: '/insights', permission: 'reports:read' },
  {
    label: 'Masters',
    icon: Layers,
    permission: 'masters:read',
    children: [
      { label: 'Departments', to: '/masters/departments' },
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
    ],
  },
];

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
}

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
        'fixed left-0 top-0 z-30 flex h-full flex-col bg-slate-900 text-white transition-all duration-300',
        open ? 'w-[260px]' : 'w-[72px]'
      )}
    >
      {/* Logo + toggle */}
      <div
        className={cn(
          'flex h-16 items-center border-b border-slate-700',
          open ? 'justify-between px-4' : 'justify-center px-2'
        )}
      >
        {open ? (
          <>
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600">
                <UserCheck className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-lg tracking-tight truncate">HireFlow</span>
            </div>
            <button
              type="button"
              onClick={onToggle}
              title="Close sidebar"
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onToggle}
            title="Open sidebar"
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className={cn('flex-1 overflow-y-auto py-4', open ? 'px-3' : 'px-2')}>
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
                    'mb-0.5 flex w-full items-center justify-center rounded-lg py-2.5 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors',
                    isActive && 'bg-blue-600 text-white hover:bg-blue-700'
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
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors mb-0.5',
                    isActive && 'text-white'
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                  <ChevronDown
                    className={cn('h-4 w-4 transition-transform', isExpanded && 'rotate-180')}
                  />
                </button>
                {isExpanded && (
                  <div className="ml-7 mb-1 border-l border-slate-700 pl-3">
                    {item.children.map((child) => (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        className={({ isActive }) =>
                          cn(
                            'flex items-center py-2 px-2 text-sm rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors mb-0.5',
                            isActive && 'text-white bg-slate-800'
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
                  'mb-0.5 flex items-center rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors',
                  open ? 'gap-3 px-3 py-2.5' : 'justify-center py-2.5',
                  isActive && 'bg-blue-600 text-white hover:bg-blue-700'
                )
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {open && item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-700 p-3">
        <div
          className={cn(
            'flex items-center py-2 text-xs text-slate-500',
            open ? 'gap-2 px-3' : 'justify-center'
          )}
          title="HireFlow ATS v1.0"
        >
          <Building2 className="h-3 w-3 shrink-0" />
          {open && <span>HireFlow ATS v1.0</span>}
        </div>
      </div>
    </aside>
  );
}
