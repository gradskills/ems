import type { AccessLevel, DeptFeature, Department, User, WorkspaceModule } from "@/lib/types";
import { ALL_MODULES, pathEnabled } from "@/lib/workspace";
import {
  Phone,
  Users,
  KanbanSquare,
  FileText,
  Receipt,
  Search,
  TrendingUp,
  LayoutDashboard,
  ShieldCheck,
  BarChart3,
  Boxes,
  CalendarCheck,
  CalendarDays,
  Wallet,
  Building2,
  Code2,
  Megaphone,
  CheckSquare,
  LifeBuoy,
  Megaphone as Announce,
  FileSearch,
  Settings,
  ClipboardList,
  Compass,
  CalendarClock,
  CircleUser,
  Trophy,
  Clock,
  LucideIcon,
} from "lucide-react";

export type NavGroup = "overview" | "work" | "people" | "oversight";

export interface NavContext {
  accessLevel: AccessLevel;
  deptKey: string;
  features: Set<DeptFeature>;
}

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  group: NavGroup;
  when: (c: NavContext) => boolean;
  mobile?: boolean;
}

// ── visibility helpers ──
// Feature items are driven by the *effective* department (an employee's own dept,
// or the lens a manager/admin has selected) — NOT blanket admin access — so the
// lens switcher actually narrows the workspace.
const isAdmin = (c: NavContext) => c.accessLevel === "admin";
const isMgrUp = (c: NavContext) => c.accessLevel === "admin" || c.accessLevel === "manager";
const isSales = (c: NavContext) => c.features.has("leads");
const has = (f: DeptFeature) => (c: NavContext) => c.features.has(f);

// The generic self-service block (My Dashboard / My Tasks / Helpdesk / Announcements)
// belongs to a person's *own* workspace. It shows for employees (who have a single
// dept) and in the management lens — but NOT when a manager/admin drills into a
// department lens, so those items aren't repeated under every role.
const isMgmtLens = (c: NavContext) => c.deptKey === "";
const selfService = (c: NavContext) => c.accessLevel === "employee" || (isMgrUp(c) && isMgmtLens(c));

export const navItems: NavItem[] = [
  // ── Workspace: management self-service ──
  // Overview is a manager landing; admins get the "My Dashboard" command center
  // (/my) instead, so it's intentionally hidden from the admin workspace.
  { href: "/overview", label: "Overview", icon: LayoutDashboard, group: "work", when: (c) => c.accessLevel === "manager" && isMgmtLens(c), mobile: true },

  // ── Role dashboards (one per department lens) ──
  { href: "/dashboard", label: "BDA Dashboard", icon: LayoutDashboard, group: "work", when: (c) => c.deptKey === "bda" && isMgrUp(c) },
  { href: "/tech", label: "Tech Dashboard", icon: LayoutDashboard, group: "work", when: (c) => c.deptKey === "tech", mobile: true },
  { href: "/media", label: "Media Dashboard", icon: LayoutDashboard, group: "work", when: (c) => c.deptKey === "media", mobile: true },

  // ── Overview: personal / quick-access (employees & management lens) ──
  // "My Dashboard" is the combined personal workspace: clock in/out, breaks,
  // tasks, leaves, announcements and attendance all live here (the old separate
  // Clock In/Out page now redirects into it). Admins get a command center at /my
  // and see who's in today from the Attendance screen instead.
  { href: "/my", label: "My Dashboard", icon: LayoutDashboard, group: "overview", when: selfService, mobile: true },
  { href: "/my/profile", label: "My Profile", icon: CircleUser, group: "overview", when: selfService },
  { href: "/tasks", label: "My Tasks", icon: CheckSquare, group: "overview", when: selfService, mobile: true },
  { href: "/my/leaves", label: "My Leaves", icon: CalendarCheck, group: "overview", when: (c) => c.accessLevel === "employee" },
  { href: "/performance", label: "My Performance", icon: TrendingUp, group: "overview", when: (c) => c.accessLevel === "employee" && c.features.has("leads") },
  { href: "/tickets", label: "Helpdesk", icon: LifeBuoy, group: "overview", when: selfService },
  { href: "/announcements", label: "Announcements", icon: Announce, group: "overview", when: selfService },
  // Attendance leaderboard — a company-wide motivational ranking everyone can see.
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy, group: "overview", when: selfService },

  // ── Workspace: sales (BDA lens) ──
  { href: "/today", label: "Today", icon: Phone, group: "work", when: (c) => c.accessLevel === "employee" && c.features.has("leads"), mobile: true },
  { href: "/leads", label: "Leads", icon: Users, group: "work", when: isSales },
  // Meetings are cross-cutting — every role (BDA, tech, media, management) can
  // schedule and be looped into meetings, so this shows in every workspace.
  { href: "/meetings", label: "Meetings", icon: CalendarClock, group: "work", when: () => true, mobile: false },
  { href: "/explore", label: "Explore", icon: Compass, group: "work", when: isSales },
  { href: "/forms", label: "Forms", icon: ClipboardList, group: "work", when: isSales },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquare, group: "work", when: isSales },
  { href: "/audit-reports", label: "Audit Reports", icon: FileSearch, group: "work", when: has("audit_reports") },
  // BDAs (employees) see "Proposals"; managers/admin see "Quotations" — same screen
  { href: "/proposals", label: "Proposals", icon: FileText, group: "work", when: (c) => isSales(c) && c.accessLevel === "employee" },
  { href: "/proposals", label: "Quotations", icon: FileText, group: "work", when: (c) => isSales(c) && isMgrUp(c) },
  // Invoices are hidden from BDAs (employees) — billing stays with managers/admin
  { href: "/invoices", label: "Invoices", icon: Receipt, group: "work", when: (c) => c.features.has("invoices") && c.accessLevel !== "employee" },
  { href: "/prospect-audit", label: "Prospect Audit", icon: Search, group: "work", when: has("prospect_audit") },
  // ── Workspace: tech ──
  { href: "/projects", label: "Projects", icon: Code2, group: "work", when: has("projects"), mobile: true },

  // ── Workspace: media ──
  { href: "/clients", label: "Clients", icon: Megaphone, group: "work", when: has("clients"), mobile: true },
  { href: "/content", label: "Content Calendar", icon: CalendarDays, group: "work", when: has("content_calendar") },
  { href: "/campaigns", label: "Campaigns", icon: BarChart3, group: "work", when: has("campaigns") },

  // ── Workspace: shared ──
  { href: "/delivery", label: "Delivery", icon: Boxes, group: "work", when: isSales },

  // ── People (managers + admin) ──
  { href: "/employees", label: "Employees", icon: Users, group: "people", when: isMgrUp },
  { href: "/leaves", label: "Leave Requests", icon: CalendarCheck, group: "people", when: isMgrUp },
  { href: "/attendance", label: "Attendance", icon: ClipboardList, group: "people", when: isMgrUp },
  { href: "/shifts", label: "Shifts", icon: Clock, group: "people", when: isAdmin },
  { href: "/payroll", label: "Payroll", icon: Wallet, group: "people", when: isMgrUp },
  { href: "/approvals", label: "Approvals", icon: CheckSquare, group: "people", when: isMgrUp },

  // ── Oversight (admin-heavy) ──
  { href: "/departments", label: "Departments & Roles", icon: Building2, group: "oversight", when: isAdmin },
  { href: "/reports", label: "Reports", icon: BarChart3, group: "oversight", when: isMgrUp },
  { href: "/audit", label: "Log History", icon: ShieldCheck, group: "oversight", when: isMgrUp },
  { href: "/settings", label: "Company Settings", icon: Settings, group: "oversight", when: isAdmin },
];

export function contextFor(user: User, dept: Department | undefined): NavContext {
  return {
    accessLevel: user.accessLevel,
    deptKey: dept?.key ?? "",
    features: new Set(dept?.features ?? []),
  };
}

export function navFor(user: User, dept: Department | undefined, modules: WorkspaceModule[] = ALL_MODULES): NavItem[] {
  const ctx = contextFor(user, dept);
  const mods = new Set(modules);
  // A nav item shows only when its role/feature predicate passes AND its module
  // is enabled for the active workspace (core routes have no module → always on).
  return navItems.filter((n) => n.when(ctx) && pathEnabled(n.href, mods));
}

// Per-role importance/usage ranking for the bottom nav. The first few available
// hrefs become each role's sensible default bar; users can override via Settings.
// Anything not listed sorts after these in its natural declaration order.
const MOBILE_PRIORITY: Record<AccessLevel, string[]> = {
  employee: ["/my", "/today", "/tasks", "/pipeline", "/leads", "/projects", "/clients", "/tickets", "/my/leaves", "/announcements", "/performance", "/leaderboard", "/my/profile"],
  manager: ["/overview", "/my", "/employees", "/attendance", "/tasks", "/leaves", "/approvals", "/meetings", "/tickets"],
  admin: ["/my", "/employees", "/attendance", "/approvals", "/overview", "/leaves", "/payroll", "/tasks", "/departments"],
};

function orderedForRole(user: User, items: NavItem[]): NavItem[] {
  const pri = MOBILE_PRIORITY[user.accessLevel] ?? [];
  const idx = (h: string) => {
    const i = pri.indexOf(h);
    return i === -1 ? pri.length + 1 : i;
  };
  return [...items].sort((a, b) => idx(a.href) - idx(b.href));
}

// The pool of pages a user may pin to the bottom bar in the current workspace.
export function mobileNavPool(user: User, dept: Department | undefined, modules: WorkspaceModule[] = ALL_MODULES): NavItem[] {
  return orderedForRole(user, navFor(user, dept, modules));
}

// Resolve the bottom-bar items: the user's saved order/selection (filtered to
// what's actually available in this workspace), else the role-prioritized default.
export function mobileNavFor(user: User, dept: Department | undefined, prefHrefs?: string[] | null, modules: WorkspaceModule[] = ALL_MODULES): NavItem[] {
  const all = navFor(user, dept, modules);
  const byHref = new Map(all.map((n) => [n.href, n] as const));
  if (prefHrefs && prefHrefs.length) {
    const picked = prefHrefs.map((h) => byHref.get(h)).filter((n): n is NavItem => !!n);
    if (picked.length) return picked.slice(0, 5);
  }
  return orderedForRole(user, all).slice(0, 5);
}

// Label for the "work" nav group — brands the workspace by the active lens/role
// so it reads "Admin Workspace" / "BDA Workspace" / "Tech Workspace" …
export function workspaceLabel(user: User, dept: Department | undefined): string {
  if (dept) return `${dept.name} Workspace`;
  return user.accessLevel === "admin" ? "Admin Workspace" : "Workspace";
}
