"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { users, userById } from "@/lib/seed/users";
import { departmentById } from "@/lib/seed/org";
import { roleLabel, lensesFor } from "@/lib/ems";
import { navFor, mobileNavFor, workspaceLabel } from "./nav";
import { Avatar } from "@/components/ui/primitives";
import { AppShellSkeleton } from "@/components/ui/skeleton";
import { ClockGate } from "@/components/ems/ClockGate";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { cn } from "@/lib/utils";
import { ChevronsUpDown, Sparkles, Check, Bell, ChevronDown, Menu, KeyRound, LogOut } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";

// routes only managers/admin may open; employees are bounced to /my
// /overview is a management landing (renders "Your team overview" for managers,
// "Organisation overview" for admin) — manager+admin, not admin-only.
const MGR_ROUTES = ["/overview", "/employees", "/leaves", "/attendance", "/payroll", "/approvals", "/reports", "/audit"];
const ADMIN_ROUTES = ["/departments", "/settings"];

// Explicit ordering for the management-lens (admin/manager) workspace section, so
// it reads: My Dashboard · My Tasks · Meetings · Who's In · Announcements · Helpdesk.
// (Managers additionally see Overview, kept at the top.) Items not listed here
// keep their natural order after these.
const MGMT_WORKSPACE_ORDER = ["/overview", "/my", "/tasks", "/meetings", "/clock", "/announcements", "/tickets"];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const actingUserId = useApp((s) => s.actingUserId);
  const viewLens = useApp((s) => s.viewLens);
  const departments = useApp((s) => s.departments);
  const employees = useApp((s) => s.employees);
  const authReady = useApp((s) => s.authReady);
  const authUserId = useApp((s) => s.authUserId);
  const hydrateAuth = useApp((s) => s.hydrateAuth);
  const user = userById(actingUserId)!;

  // Sidebar collapsed-group state is restored per user by the store's hydrateNav()
  // (called from hydrateAuth / login / setActingUser) and persists across
  // navigation because this Shell stays mounted. No extra effect needed here.

  // ── portal session guard — bounce to /login when signed out, and force a
  // first-login password change before the app is usable ──
  useEffect(() => {
    hydrateAuth();
  }, [hydrateAuth]);
  useEffect(() => {
    if (!authReady) return;
    if (!authUserId) { router.replace("/login"); return; }
    const acct = employees.find((e) => e.id === authUserId);
    if (acct?.mustChangePassword) router.replace("/account/password?forced=1");
  }, [authReady, authUserId, employees, router]);

  // access guard — keep people out of screens above their tier.
  // Wait for the session to resolve first, otherwise a hard reload onto a
  // manager route bounces on the default acting user before auth hydrates.
  useEffect(() => {
    if (!authReady || !authUserId) return;
    const hit = (list: string[]) => list.some((r) => pathname === r || pathname.startsWith(r + "/"));
    if (user.accessLevel === "employee" && (hit(MGR_ROUTES) || hit(ADMIN_ROUTES))) router.replace("/my");
    else if (user.accessLevel === "manager" && hit(ADMIN_ROUTES)) router.replace("/my");
  }, [pathname, user.accessLevel, router, authReady, authUserId]);
  // effective department drives the workspace nav: own dept for employees,
  // the selected lens for managers/admin (undefined = the "Management" lens)
  const effectiveDept =
    user.accessLevel === "employee"
      ? departments.find((d) => d.id === user.departmentId)
      : viewLens === "management"
        ? undefined
        : departments.find((d) => d.id === viewLens);
  const nav = navFor(user, effectiveDept);
  const mNav = mobileNavFor(user, effectiveDept);
  const workLabel = workspaceLabel(user, effectiveDept);
  const overview = nav.filter((n) => n.group === "overview");
  const work = nav.filter((n) => n.group === "work");
  const people = nav.filter((n) => n.group === "people");
  const oversight = nav.filter((n) => n.group === "oversight");
  const isEmployee = user.accessLevel === "employee";

  // One merged workspace section per role. Employees lead with personal items;
  // dept-lens views lead with workspace items. In the management lens we apply an
  // explicit order (MGMT_WORKSPACE_ORDER) so admin/manager get a consistent list.
  const isMgmtLens = !isEmployee && !effectiveDept;
  const rank = (href: string) => {
    const i = MGMT_WORKSPACE_ORDER.indexOf(href);
    return i === -1 ? MGMT_WORKSPACE_ORDER.length : i;
  };
  const workspaceItems = isMgmtLens
    ? [...work, ...overview].sort((a, b) => rank(a.href) - rank(b.href))
    : isEmployee
      ? [...overview, ...work]
      : [...work, ...overview];

  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  // close drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Group the nav items once; passed to the (stable, module-level) SidebarContent.
  // SidebarContent MUST NOT be defined inline here — an inline component gets a new
  // identity on every Shell re-render (i.e. every navigation), which remounts the
  // whole sidebar and makes collapsed groups flash open. Keeping it top-level lets
  // React reconcile the sidebar in place across route changes.
  const sidebarProps = { workspaceItems, people, oversight, workLabel, pathname };

  // hold the app behind a skeleton until the session is resolved / redirect fires
  if (!authReady || !authUserId || employees.find((e) => e.id === authUserId)?.mustChangePassword) {
    return <AppShellSkeleton />;
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <ClockGate />
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-[var(--border)] bg-[var(--surface)] lg:flex">
        <SidebarContent {...sidebarProps} />
      </aside>

      {/* Mobile drawer backdrop */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden" onClick={closeMobile} />
      )}

      {/* Mobile drawer sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-[var(--border)] bg-[var(--surface)] transition-transform duration-300 ease-in-out lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent {...sidebarProps} onNavClick={closeMobile} />
      </aside>

      {/* Main */}
      <div className="lg:pl-60">
        <TopBar onMenuClick={() => setMobileOpen(true)} />
        <main className="mx-auto max-w-7xl px-4 pb-24 pt-5 sm:px-6 lg:pb-10">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur lg:hidden">
        {mNav.map((n) => {
          const active = pathname === n.href || pathname.startsWith(n.href + "/");
          const Icon = n.icon;
          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium",
                active ? "text-[var(--primary)]" : "text-[var(--muted-2)]"
              )}
            >
              <Icon size={20} />
              {n.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

// Stable, top-level sidebar body — see the note in Shell about why this must not
// be defined inline. Reconciles in place across navigation, so collapsed nav
// groups stay collapsed without any remount flicker.
function SidebarContent({
  workspaceItems, people, oversight, workLabel, pathname, onNavClick,
}: {
  workspaceItems: ReturnType<typeof navFor>;
  people: ReturnType<typeof navFor>;
  oversight: ReturnType<typeof navFor>;
  workLabel: string;
  pathname: string;
  onNavClick?: () => void;
}) {
  return (
    <>
      <div className="flex h-16 items-center gap-2 border-b border-[var(--border)] px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)] text-white">
          <Sparkles size={18} />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-bold">PixelForge</div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted-2)]">Sales OS · HR</div>
        </div>
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {/* One merged workspace section per role — ordering is decided in Shell
            (see workspaceItems / MGMT_WORKSPACE_ORDER). */}
        <NavGroup
          label={workLabel}
          items={workspaceItems}
          pathname={pathname}
          onNavClick={onNavClick}
        />
        {people.length > 0 && <NavGroup label="People" items={people} pathname={pathname} collapsible onNavClick={onNavClick} />}
        {oversight.length > 0 && <NavGroup label="Oversight" items={oversight} pathname={pathname} collapsible onNavClick={onNavClick} />}
      </nav>
      <div className="border-t border-[var(--border)] px-3 py-3 lg:hidden">
        <MobileLensDropdown />
      </div>
      <RoleSwitcher />
    </>
  );
}

function NavGroup({ label, items, pathname, collapsible, onNavClick }: { label: string; items: ReturnType<typeof navFor>; pathname: string; collapsible?: boolean; onNavClick?: () => void }) {
  // Collapsible groups (Overview / People / Oversight) remember their open/closed
  // state in the store, so navigating between pages keeps a collapsed group
  // collapsed (local state would reset on every re-render of the shell).
  const collapsed = useApp((s) => s.navCollapsed[label] ?? false);
  const toggleNavGroup = useApp((s) => s.toggleNavGroup);
  const expanded = !collapsible || !collapsed;

  return (
    <div>
      {collapsible ? (
        <button
          onClick={() => toggleNavGroup(label)}
          className="mb-1 flex w-full items-center justify-between px-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-2)] hover:text-[var(--foreground)]"
        >
          {label}
          <ChevronDown size={13} className={cn("transition-transform", expanded ? "" : "-rotate-90")} />
        </button>
      ) : (
        <div className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-2)]">{label}</div>
      )}
      <div className={cn("space-y-0.5", expanded ? "" : "hidden")}>
        {items.map((n) => {
          const active = pathname === n.href || pathname.startsWith(n.href + "/");
          const Icon = n.icon;
          return (
            <Link
              key={n.href}
              href={n.href}
              onClick={onNavClick}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-[var(--primary-soft)] text-[var(--primary)]" : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
              )}
            >
              <Icon size={18} />
              {n.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function RoleSwitcher() {
  const router = useRouter();
  const actingUserId = useApp((s) => s.actingUserId);
  const setActingUser = useApp((s) => s.setActingUser);
  const logout = useApp((s) => s.logout);
  const user = userById(actingUserId)!;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const dept = departmentById(user.departmentId);
  return (
    <div ref={ref} className="relative border-t border-[var(--border)] p-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded-lg p-2 text-left hover:bg-[var(--surface-2)]"
      >
        <Avatar name={user.name} size={34} />
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-sm font-semibold">{user.name}</div>
          <div className="truncate text-xs text-[var(--muted)]">{roleLabel(user, dept)}</div>
        </div>
        <ChevronsUpDown size={16} className="text-[var(--muted-2)]" />
      </button>
      {open && (
        <div className="absolute bottom-full left-3 right-3 mb-1 max-h-[70vh] overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)] animate-in">
          <div className="border-b border-[var(--border)] p-1">
            <button
              onClick={() => { setOpen(false); router.push("/account/password"); }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-[var(--surface-2)]"
            >
              <KeyRound size={16} className="text-[var(--muted)]" /> Change password
            </button>
            <button
              onClick={() => { setOpen(false); logout(); router.replace("/login"); }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-[var(--danger)] hover:bg-[var(--surface-2)]"
            >
              <LogOut size={16} /> Sign out
            </button>
          </div>
          <div className="sticky top-0 border-b border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            Demo — switch account
          </div>
          {users.map((u) => {
            const ud = departmentById(u.departmentId);
            return (
              <button
                key={u.id}
                onClick={() => {
                  setActingUser(u.id);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[var(--surface-2)]"
              >
                <Avatar name={u.name} size={28} />
                <div className="min-w-0 flex-1 leading-tight">
                  <div className="truncate text-sm font-medium">{u.name}</div>
                  <div className="truncate text-[11px] text-[var(--muted)]">{roleLabel(u, ud)}</div>
                </div>
                {u.id === actingUserId && <Check size={16} className="shrink-0 text-[var(--primary)]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const user = userById(useApp((s) => s.actingUserId))!;
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-[var(--border)] bg-[var(--surface)]/90 px-4 backdrop-blur sm:px-6">
      <button onClick={onMenuClick} className="flex items-center gap-2 lg:hidden">
        <Menu size={20} />
      </button>
      <div className="flex items-center gap-2 lg:hidden">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)] text-white">
          <Sparkles size={18} />
        </div>
        <span className="text-sm font-bold">PixelForge</span>
      </div>
      <div className="hidden lg:flex">
        <LensSwitcher />
      </div>
      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <ThemeToggle />
        <NotificationBell />
        <div className="lg:hidden">
          <Avatar name={user.name} size={32} />
        </div>
      </div>
    </header>
  );
}

function LensSwitcher() {
  const router = useRouter();
  const actingUserId = useApp((s) => s.actingUserId);
  const viewLens = useApp((s) => s.viewLens);
  const setViewLens = useApp((s) => s.setViewLens);
  const departments = useApp((s) => s.departments);
  const user = userById(actingUserId)!;
  const lenses = lensesFor(user, departments);
  if (lenses.length < 2) return null;

  return (
    <div className="flex items-center gap-1 overflow-x-auto rounded-lg bg-[var(--surface-2)] p-1">
      {lenses.map((l) => (
        <button
          key={l.key}
          onClick={() => {
            setViewLens(l.key);
            router.push(l.home);
          }}
          className={cn(
            "shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            viewLens === l.key ? "bg-[var(--surface)] text-[var(--foreground)] shadow-[var(--shadow-sm)]" : "text-[var(--muted)] hover:text-[var(--foreground)]"
          )}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

function MobileLensDropdown() {
  const router = useRouter();
  const actingUserId = useApp((s) => s.actingUserId);
  const viewLens = useApp((s) => s.viewLens);
  const setViewLens = useApp((s) => s.setViewLens);
  const departments = useApp((s) => s.departments);
  const user = userById(actingUserId)!;
  const lenses = lensesFor(user, departments);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = lenses.find((l) => l.key === viewLens);

  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  if (lenses.length < 2) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-lg bg-[var(--surface-2)] px-3 py-2 text-sm font-medium text-[var(--foreground)]"
      >
        <span>{current?.label ?? "Workspace"}</span>
        <ChevronDown size={14} className={cn("text-[var(--muted-2)] transition-transform", open ? "" : "-rotate-90")} />
      </button>
      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-1 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)] animate-in">
          <div className="border-b border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            Switch workspace
          </div>
          {lenses.map((l) => (
            <button
              key={l.key}
              onClick={() => {
                setViewLens(l.key);
                router.push(l.home);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--surface-2)]"
            >
              <div className={cn("flex h-2 w-2 shrink-0 rounded-full", viewLens === l.key ? "bg-[var(--primary)]" : "bg-transparent")} />
              <span className={cn("font-medium", viewLens === l.key ? "text-[var(--primary)]" : "text-[var(--muted)]")}>{l.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function NotificationBell() {
  const actingUserId = useApp((s) => s.actingUserId);
  const notifications = useApp((s) => s.notifications);
  const unread = notifications.filter((n) => n.userId === actingUserId && !n.read).length;
  return (
    <Link
      href="/notifications"
      className="relative flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-2)]"
      aria-label="Notifications"
    >
      <Bell size={18} />
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--danger)] px-1 text-[10px] font-bold text-white">
          {unread}
        </span>
      )}
    </Link>
  );
}
