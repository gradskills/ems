"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { users, userById } from "@/lib/seed/users";
import { departmentById } from "@/lib/seed/org";
import { roleLabel, lensesFor } from "@/lib/ems";
import { navFor, mobileNavFor, workspaceLabel } from "./nav";
import { Avatar } from "@/components/ui/primitives";
import { AppLogo } from "@/components/layout/AppLogo";
import { AppShellSkeleton } from "@/components/ui/skeleton";
import { ClockGate } from "@/components/ems/ClockGate";
import { ClockReminderRunner } from "@/components/ems/ClockReminderRunner";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { cn } from "@/lib/utils";
import { ALL_MODULES, pathEnabled } from "@/lib/workspace";
import { appIconComponent } from "@/lib/branding";
import type { User } from "@/lib/types";
import { ChevronsUpDown, Check, Bell, ChevronDown, Menu, KeyRound, LogOut, Hourglass, Settings as SettingsIcon, CircleUser, Plus, Building2 } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";

// routes only managers/admin may open; employees are bounced to /my
// /overview is a management landing (renders "Your team overview" for managers,
// "Organisation overview" for admin) — manager+admin, not admin-only.
const MGR_ROUTES = ["/overview", "/employees", "/leaves", "/attendance", "/payroll", "/approvals", "/reports", "/audit"];
const ADMIN_ROUTES = ["/departments", "/settings", "/shifts", "/workspaces"];

// Explicit ordering for the management-lens (admin/manager) workspace section, so
// it reads: My Dashboard · My Tasks · Meetings · Who's In · Announcements · Helpdesk.
// (Managers additionally see Overview, kept at the top.) Items not listed here
// keep their natural order after these.
const MGMT_WORKSPACE_ORDER = ["/overview", "/my", "/tasks", "/meetings", "/clock", "/announcements", "/tickets"];

// Harmless stand-in used only while the acting user hasn't hydrated into the
// roster yet (login / workspace switch). The shell renders a skeleton in that
// window, so this is never actually shown — it just keeps render + hooks stable.
const SHELL_FALLBACK_USER: User = {
  id: "", name: "", email: "", phone: "", role: "bda", accessLevel: "employee", departmentId: "",
};

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
  // active workspace drives which top-level modules are available
  const workspaces = useApp((s) => s.workspaces);
  const activeWorkspaceId = useApp((s) => s.activeWorkspaceId);
  const workspacesReady = useApp((s) => s.workspacesReady);
  const activeWs = workspaces.find((w) => w.id === activeWorkspaceId);
  const modules = activeWs?.modules ?? ALL_MODULES;
  // The acting user may not be in the in-memory registry yet — right after login
  // or a workspace switch, before the roster hydrates. Fall back to a harmless
  // placeholder so render + hooks stay stable; the skeleton below holds the UI
  // until `realUser` resolves, so the placeholder is never actually shown.
  const realUser = userById(actingUserId);
  const user = realUser ?? SHELL_FALLBACK_USER;

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
    if (!realUser) return; // wait for the acting user to resolve
    const hit = (list: string[]) => list.some((r) => pathname === r || pathname.startsWith(r + "/"));
    if (realUser.accessLevel === "employee" && (hit(MGR_ROUTES) || hit(ADMIN_ROUTES))) router.replace("/my");
    else if (realUser.accessLevel === "manager" && hit(ADMIN_ROUTES)) router.replace("/my");
  }, [pathname, realUser, router, authReady, authUserId]);

  // module guard — keep people out of screens whose module the active workspace
  // has turned off. Only enforced once the workspace list is known, so the
  // default (all modules) during load never triggers a false redirect.
  useEffect(() => {
    if (!authReady || !authUserId || !workspacesReady) return;
    if (!pathEnabled(pathname, modules)) router.replace("/my");
  }, [pathname, modules, workspacesReady, authReady, authUserId, router]);
  // effective department drives the workspace nav: own dept for employees,
  // the selected lens for managers/admin (undefined = the "Management" lens)
  const effectiveDept =
    user.accessLevel === "employee"
      ? departments.find((d) => d.id === user.departmentId)
      : viewLens === "management"
        ? undefined
        : departments.find((d) => d.id === viewLens);
  const mobileNavPref = useApp((s) => s.mobileNav);
  const nav = navFor(user, effectiveDept, modules);
  const mNav = mobileNavFor(user, effectiveDept, mobileNavPref, modules);
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
    : [...work, ...overview];

  // Sidebar sections. Employees get two independently-collapsible splits —
  // "Personal" (self-service: dashboard, tasks, performance, helpdesk,
  // announcements) and their department workspace (leads, pipeline, …).
  // Managers/admin keep a single merged workspace section (People / Oversight
  // stay as their own collapsible groups below).
  const sections: { label: string; items: typeof nav; collapsible: boolean }[] = isEmployee
    ? [
        { label: "Personal", items: overview, collapsible: true },
        { label: workLabel, items: work, collapsible: true },
      ].filter((s) => s.items.length > 0)
    : [{ label: workLabel, items: workspaceItems, collapsible: false }];

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
  const sidebarProps = { sections, people, oversight, pathname };
  const mActiveHref = bestActiveHref(pathname, mNav.map((n) => n.href));

  // hold the app behind a skeleton until the session is resolved / redirect fires,
  // and until the acting user is present in the roster (post-login / post-switch)
  if (!authReady || !authUserId || !realUser || employees.find((e) => e.id === authUserId)?.mustChangePassword) {
    return <AppShellSkeleton />;
  }

  // ── access-approval gate — a manager-onboarded joiner can sign in but has no
  // feature access until an admin approves them. Admins are never gated. ──
  if (user.accessLevel !== "admin" && user.approvalStatus === "pending") {
    return <PendingApprovalScreen name={user.name} />;
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <ClockGate />
      <ClockReminderRunner />
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-[var(--border)] bg-[var(--surface)] lg:flex">
        <SidebarContent {...sidebarProps} />
      </aside>

      {/* Mobile drawer backdrop */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-[var(--overlay)] backdrop-blur-[2px] lg:hidden" onClick={closeMobile} />
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
        <main key={pathname} className="page-enter mx-auto max-w-7xl px-4 pb-24 pt-5 sm:px-6 lg:pb-10">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur lg:hidden">
        {mNav.map((n) => {
          const active = n.href === mActiveHref;
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

// Picks the single active nav item: the href that most specifically matches the
// current path. A plain prefix test lights up parent routes too (e.g. "/my"
// would also match while on "/my/profile"), so the longest matching href wins.
function bestActiveHref(pathname: string, hrefs: string[]): string | undefined {
  let best: string | undefined;
  for (const h of hrefs) {
    if (pathname === h || pathname.startsWith(h + "/")) {
      if (best === undefined || h.length > best.length) best = h;
    }
  }
  return best;
}

// Stable, top-level sidebar body — see the note in Shell about why this must not
// be defined inline. Reconciles in place across navigation, so collapsed nav
// groups stay collapsed without any remount flicker.
function SidebarContent({
  sections, people, oversight, pathname, onNavClick,
}: {
  sections: { label: string; items: ReturnType<typeof navFor>; collapsible: boolean }[];
  people: ReturnType<typeof navFor>;
  oversight: ReturnType<typeof navFor>;
  pathname: string;
  onNavClick?: () => void;
}) {
  // resolve the single active item across every group, so a parent route never
  // co-highlights with its more specific child (e.g. /my vs /my/profile)
  const activeHref = bestActiveHref(pathname, [
    ...sections.flatMap((s) => s.items.map((i) => i.href)),
    ...people.map((i) => i.href),
    ...oversight.map((i) => i.href),
  ]);
  return (
    <>
      <div className="flex h-16 items-center border-b border-[var(--border)] px-3">
        <WorkspaceSwitcher onNavClick={onNavClick} />
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {/* Workspace sections — employees get "Personal" + their dept workspace
            (both collapsible); managers/admin get one merged section. Ordering
            and collapsibility are decided in Shell. */}
        {sections.map((s) => (
          <NavGroup key={s.label} label={s.label} items={s.items} activeHref={activeHref} collapsible={s.collapsible} onNavClick={onNavClick} />
        ))}
        {people.length > 0 && <NavGroup label="People" items={people} activeHref={activeHref} collapsible onNavClick={onNavClick} />}
        {oversight.length > 0 && <NavGroup label="Oversight" items={oversight} activeHref={activeHref} collapsible onNavClick={onNavClick} />}
      </nav>
      <div className="border-t border-[var(--border)] px-3 py-3 lg:hidden">
        <MobileLensDropdown />
      </div>
      <RoleSwitcher />
    </>
  );
}

// Top-of-sidebar business switcher. Shows the active workspace's mark + name and
// opens a menu to switch between the businesses this person belongs to, create a
// new one, or manage the current one (admins only). Reads the store directly so
// it doesn't need props threaded through SidebarContent.
function WorkspaceSwitcher({ onNavClick }: { onNavClick?: () => void }) {
  const router = useRouter();
  const workspaces = useApp((s) => s.workspaces);
  const activeWorkspaceId = useApp((s) => s.activeWorkspaceId);
  const switchWorkspace = useApp((s) => s.switchWorkspace);
  const actingUserId = useApp((s) => s.actingUserId);
  const user = userById(actingUserId);
  const isAdmin = user?.accessLevel === "admin";
  const active = workspaces.find((w) => w.id === activeWorkspaceId);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // Only admins can juggle multiple businesses; an employee just sees their mark.
  const canManage = isAdmin;
  const multi = workspaces.length > 1;
  if (!canManage && !multi) {
    return <div className="px-2"><AppLogo size={32} /></div>;
  }

  return (
    <div ref={ref} className="relative w-full">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-[var(--surface-2)]"
      >
        <div className="min-w-0 flex-1"><AppLogo size={32} /></div>
        <ChevronsUpDown size={15} className="shrink-0 text-[var(--muted-2)]" />
      </button>
      {open && (
        <div className="absolute left-2 right-2 top-full z-50 mt-1 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)] animate-in">
          <div className="border-b border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            Your businesses
          </div>
          <div className="max-h-[50vh] overflow-y-auto p-1">
            {workspaces.map((w) => {
              const Icon = appIconComponent(w.icon);
              const isActive = w.id === activeWorkspaceId;
              return (
                <button
                  key={w.id}
                  onClick={() => { if (!isActive) void switchWorkspace(w.id); setOpen(false); onNavClick?.(); }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-[var(--surface-2)]"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--primary-soft)] text-[var(--primary)]">
                    <Icon size={15} />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{w.name}</span>
                  {isActive && <Check size={15} className="shrink-0 text-[var(--primary)]" />}
                </button>
              );
            })}
          </div>
          {canManage && (
            <div className="border-t border-[var(--border)] p-1">
              <button
                onClick={() => { setOpen(false); onNavClick?.(); router.push("/workspaces/new"); }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-[var(--primary)] hover:bg-[var(--surface-2)]"
              >
                <Plus size={16} /> New business
              </button>
              <button
                onClick={() => { setOpen(false); onNavClick?.(); router.push("/workspaces"); }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-[var(--surface-2)]"
              >
                <Building2 size={16} className="text-[var(--muted)]" /> Manage businesses
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NavGroup({ label, items, activeHref, collapsible, onNavClick }: { label: string; items: ReturnType<typeof navFor>; activeHref?: string; collapsible?: boolean; onNavClick?: () => void }) {
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
          const active = n.href === activeHref;
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

// Shown to a newly-onboarded employee whose access an admin hasn't approved yet.
function PendingApprovalScreen({ name }: { name: string }) {
  const router = useRouter();
  const logout = useApp((s) => s.logout);
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-[var(--shadow-lg)]">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--warning-soft)] text-[var(--warning)]">
          <Hourglass size={28} />
        </div>
        <h1 className="text-lg font-bold tracking-tight">Welcome, {name.split(" ")[0]}</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Your account has been created and is waiting for an admin to approve your access.
          You&apos;ll be able to use the app as soon as they do — please check back later or reach out to your admin.
        </p>
        <button
          onClick={() => { logout(); router.replace("/login"); }}
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--border-strong)] px-4 py-2 text-sm font-medium text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
        >
          <LogOut size={16} /> Sign out
        </button>
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
        <Avatar name={user.name} size={34} src={user.avatarUrl} />
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
              onClick={() => { setOpen(false); router.push("/account/settings"); }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-[var(--surface-2)]"
            >
              <SettingsIcon size={16} className="text-[var(--muted)]" /> Settings
            </button>
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
          {/* Account switching is an admin-only oversight tool — a regular
              employee/manager can only ever be themselves. */}
          {user.accessLevel === "admin" && (
            <>
              <div className="sticky top-0 border-b border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                Switch account (admin)
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
                    <Avatar name={u.name} size={28} src={u.avatarUrl} />
                    <div className="min-w-0 flex-1 leading-tight">
                      <div className="truncate text-sm font-medium">{u.name}</div>
                      <div className="truncate text-[11px] text-[var(--muted)]">{roleLabel(u, ud)}</div>
                    </div>
                    {u.id === actingUserId && <Check size={16} className="shrink-0 text-[var(--primary)]" />}
                  </button>
                );
              })}
            </>
          )}
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
        <AppLogo size={32} />
      </div>
      <div className="hidden lg:flex">
        <LensSwitcher />
      </div>
      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <ThemeToggle />
        <NotificationBell />
        <div className="lg:hidden">
          <ProfileMenu />
        </div>
      </div>
    </header>
  );
}

// Mobile-only account menu behind the top-right avatar. Desktop has the same
// actions in the sidebar RoleSwitcher; on mobile the avatar was previously inert,
// leaving no way to reach Settings / change password / sign out.
function ProfileMenu() {
  const router = useRouter();
  const actingUserId = useApp((s) => s.actingUserId);
  const setActingUser = useApp((s) => s.setActingUser);
  const logout = useApp((s) => s.logout);
  const user = userById(actingUserId)!;
  const dept = departmentById(user.departmentId);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-label="Account menu" className="flex items-center rounded-full ring-offset-2 ring-offset-[var(--surface)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]">
        <Avatar name={user.name} size={32} src={user.avatarUrl} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)] animate-in">
          <div className="flex items-center gap-2.5 border-b border-[var(--border)] p-3">
            <Avatar name={user.name} size={36} src={user.avatarUrl} />
            <div className="min-w-0 leading-tight">
              <div className="truncate text-sm font-semibold">{user.name}</div>
              <div className="truncate text-xs text-[var(--muted)]">{roleLabel(user, dept)}</div>
            </div>
          </div>
          <div className="p-1">
            <button onClick={() => { setOpen(false); router.push("/my/profile"); }} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-[var(--surface-2)]">
              <CircleUser size={16} className="text-[var(--muted)]" /> My profile
            </button>
            <button onClick={() => { setOpen(false); router.push("/account/settings"); }} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-[var(--surface-2)]">
              <SettingsIcon size={16} className="text-[var(--muted)]" /> Settings
            </button>
            <button onClick={() => { setOpen(false); router.push("/account/password"); }} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-[var(--surface-2)]">
              <KeyRound size={16} className="text-[var(--muted)]" /> Change password
            </button>
            <button onClick={() => { setOpen(false); logout(); router.replace("/login"); }} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-[var(--danger)] hover:bg-[var(--surface-2)]">
              <LogOut size={16} /> Sign out
            </button>
          </div>
          {user.accessLevel === "admin" && (
            <div className="max-h-64 overflow-y-auto border-t border-[var(--border)]">
              <div className="sticky top-0 bg-[var(--surface-2)] px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Switch account (admin)</div>
              {users.map((u) => {
                const ud = departmentById(u.departmentId);
                return (
                  <button key={u.id} onClick={() => { setActingUser(u.id); setOpen(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[var(--surface-2)]">
                    <Avatar name={u.name} size={26} src={u.avatarUrl} />
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
      )}
    </div>
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
