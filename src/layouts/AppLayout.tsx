import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Activity, Banknote, BarChart3, Bell, BookOpen, CreditCard, Gauge, KeyRound, LayoutDashboard, Landmark, LogOut, Menu, Moon,
  PanelLeftClose, PanelLeftOpen, ReceiptText, ScrollText, Search, Settings, ShieldAlert, Sun, Users, X,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';
import { cn } from '../lib/utils';

interface NavItem { to: string; label: string; icon: ReactNode; end?: boolean }
interface NavGroup { title: string; items: NavItem[] }
const I = 'h-[18px] w-[18px] shrink-0';

const merchantNav: NavGroup[] = [
  { title: 'Workspace', items: [
    { to: '/dashboard', label: 'Overview', icon: <LayoutDashboard className={I} />, end: true },
    { to: '/dashboard/payments', label: 'Payments', icon: <CreditCard className={I} /> },
    { to: '/dashboard/transactions', label: 'Transactions', icon: <ReceiptText className={I} /> },
    { to: '/dashboard/withdrawals', label: 'Withdrawals', icon: <Banknote className={I} /> },
    { to: '/dashboard/analytics', label: 'Analytics', icon: <BarChart3 className={I} /> },
  ] },
  { title: 'Developers', items: [
    { to: '/dashboard/api-keys', label: 'API Keys', icon: <KeyRound className={I} /> },
    { to: '/dashboard/docs', label: 'API Documentation', icon: <BookOpen className={I} /> },
  ] },
  { title: 'Account', items: [{ to: '/dashboard/settings', label: 'Settings', icon: <Settings className={I} /> }] },
];
const adminNav: NavGroup[] = [
  { title: 'Operations', items: [
    { to: '/admin', label: 'Overview', icon: <LayoutDashboard className={I} />, end: true },
    { to: '/admin/merchants', label: 'Merchants', icon: <Users className={I} /> },
    { to: '/admin/payments', label: 'Payments', icon: <ReceiptText className={I} /> },
    { to: '/admin/withdrawals', label: 'Withdrawals', icon: <Banknote className={I} /> },
  ] },
  { title: 'Security & audit', items: [
    { to: '/admin/api-keys', label: 'API Keys', icon: <KeyRound className={I} /> },
    { to: '/admin/security', label: 'Security', icon: <ShieldAlert className={I} /> },
    { to: '/admin/api-logs', label: 'API Logs', icon: <Activity className={I} /> },
    { to: '/admin/audit-logs', label: 'Audit Logs', icon: <ScrollText className={I} /> },
  ] },
  { title: 'Platform', items: [{ to: '/admin/settings', label: 'Settings', icon: <Gauge className={I} /> }] },
];

export function Logo({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-fg shadow-sm"><Landmark className="h-[18px] w-[18px]" /></span>
      {!compact && <span className="text-[17px] font-semibold tracking-tight">ShreePay</span>}
    </div>
  );
}

function Nav({ groups, collapsed, onNavigate }: { groups: NavGroup[]; collapsed: boolean; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-1 flex-col gap-5 overflow-y-auto overflow-x-hidden" aria-label="Main">
      {groups.map((g) => (
        <div key={g.title} className="flex flex-col gap-0.5">
          {collapsed
            ? <div className="mx-auto mb-1 h-px w-6 bg-line" aria-hidden />
            : <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted/80">{g.title}</p>}
          {g.items.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} onClick={onNavigate} title={collapsed ? n.label : undefined} aria-label={n.label}
              className={({ isActive }) => cn(
                'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-subtle hover:text-fg',
                collapsed && 'justify-center px-0',
                isActive && 'bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary',
              )}>
              {({ isActive }) => (<>
                {isActive && <span className="absolute -left-4 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary" aria-hidden />}
                {n.icon}
                {!collapsed && <span className="truncate">{n.label}</span>}
              </>)}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );
}

const STORE_KEY = 'shreepay-sidebar';

export default function AppLayout({ variant }: { variant: 'merchant' | 'admin' }) {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(STORE_KEY) === 'collapsed'; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem(STORE_KEY, collapsed ? 'collapsed' : 'open'); } catch { /* storage may be blocked */ }
  }, [collapsed]);
  // Keyboard shortcut: press "[" to collapse/expand (ignored while typing).
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key === '[' && !(t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable))) setCollapsed((c) => !c);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const groups = variant === 'admin' ? adminNav : merchantNav;
  const initials = (user?.name ?? '?').split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();
  const doLogout = async () => { await logout(); nav('/login'); };

  const sidebar = (compact: boolean, mobile = false) => (
    <div className={cn('flex h-full flex-col gap-6 p-4', compact && 'items-stretch px-3')}>
      <div className={cn('flex items-center pt-1', compact ? 'justify-center' : 'justify-between px-1')}>
        <div>
          <Logo compact={compact} />
          {variant === 'admin' && !compact && <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">Admin console</p>}
        </div>
        {mobile && <button className="rounded-md p-1.5 text-muted hover:bg-subtle" onClick={() => setOpen(false)} aria-label="Close menu"><X className="h-5 w-5" /></button>}
      </div>
      <Nav groups={groups} collapsed={compact} onNavigate={() => setOpen(false)} />
      <div className={cn('rounded-xl border border-line bg-subtle/50', compact ? 'p-2' : 'p-3')}>
        <div className={cn('flex items-center gap-2.5', compact && 'flex-col')}>
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-fg" title={compact ? user?.name : undefined}>{initials}</span>
          {!compact && <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium leading-tight">{user?.name}</p><p className="truncate text-[11px] text-muted">{user?.email}</p></div>}
          <button onClick={doLogout} aria-label="Log out" title="Log out" className="rounded-md p-1.5 text-muted hover:bg-card hover:text-danger"><LogOut className="h-4 w-4" /></button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:grid transition-[grid-template-columns] duration-200 ease-out" style={{ gridTemplateColumns: collapsed ? '76px 1fr' : '264px 1fr' }}>
      <aside className="sticky top-0 hidden h-screen border-r border-line bg-card/90 backdrop-blur lg:block" aria-label="Sidebar">{sidebar(collapsed)}</aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] animate-fade-in border-r border-line bg-card shadow-2xl">{sidebar(false, true)}</aside>
        </div>
      )}

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-line bg-bg/75 px-3 backdrop-blur-xl sm:gap-3 sm:px-6">
          <button className="rounded-lg p-2 text-muted hover:bg-subtle lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
          <button className="hidden rounded-lg p-2 text-muted hover:bg-subtle hover:text-fg lg:block" onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-pressed={collapsed} title={`${collapsed ? 'Expand' : 'Collapse'} sidebar  ( [ )`}>
            {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </button>
          <form className="relative hidden max-w-sm flex-1 sm:block" role="search" onSubmit={(e) => { e.preventDefault(); const q = String(new FormData(e.currentTarget).get('q') ?? '').trim(); nav(`${variant === 'admin' ? '/admin/payments' : '/dashboard/transactions'}?q=${encodeURIComponent(q)}`); }}>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input name="q" aria-label="Search by order ID" placeholder="Search by order ID…" className="h-9 w-full rounded-lg border border-line bg-card/80 pl-9 pr-3 text-sm placeholder:text-muted/70 focus:border-primary" />
          </form>
          <div className="ml-auto flex items-center gap-1">
            <button className="rounded-lg p-2 text-muted hover:bg-subtle" aria-label="Notifications" onClick={() => nav(variant === 'admin' ? '/admin/withdrawals' : '/dashboard/withdrawals')}><Bell className="h-[18px] w-[18px]" /></button>
            <button className="rounded-lg p-2 text-muted hover:bg-subtle" onClick={toggle} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>{theme === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}</button>
            <div className="relative">
              <button onClick={() => setMenu((m) => !m)} className="ml-1 flex items-center gap-2 rounded-full border border-line bg-card py-1 pl-1 pr-3 hover:bg-subtle" aria-haspopup="menu" aria-expanded={menu}>
                <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-fg">{initials}</span>
                <span className="hidden max-w-[120px] truncate text-sm font-medium sm:block">{user?.name}</span>
              </button>
              {menu && (
                <div role="menu" className="absolute right-0 mt-2 w-56 animate-fade-in rounded-xl border border-line bg-card p-1.5 shadow-card" onMouseLeave={() => setMenu(false)}>
                  <div className="px-3 py-2"><p className="truncate text-sm font-medium">{user?.name}</p><p className="truncate text-xs text-muted">{user?.email}</p></div>
                  {variant === 'merchant' && <button role="menuitem" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-subtle" onClick={() => { setMenu(false); nav('/dashboard/settings'); }}><Settings className="h-4 w-4" />Settings</button>}
                  <button role="menuitem" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-danger hover:bg-subtle" onClick={doLogout}><LogOut className="h-4 w-4" />Log out</button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl animate-fade-in p-4 sm:p-6 lg:p-8"><Outlet /></main>
      </div>
    </div>
  );
}
