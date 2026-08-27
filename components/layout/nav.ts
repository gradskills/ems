import type { AccessLevel, DeptFeature, Department, User } from "@/lib/types";
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
  Clock,
  CalendarClock,
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
  // Everyone below admin clocks in/out; admins don't — they get a live "Who's In"
  // board (same /clock route, role-aware page) to see who is working today.
  { href: "/clock", label: "Clock In/Out", icon: Clock, group: "overview", when: (c) => !isAdmin(c), mobile: true },
  { href: "/clock", label: "Who's In", icon: Clock, group: "overview", when: isAdmin, mobile: true },
  { href: "/my", label: "My Dashboard", icon: LayoutDashboard, group: "overview", when: selfService, mobile: true },
  { href: "/tasks", label: "My Tasks", icon: CheckSquare, group: "overview", when: selfService, mobile: true },
  { href: "/performance", label: "My Performance", icon: TrendingUp, group: "overview", when: (c) => c.accessLevel === "employee" && c.features.has("leads") },
  { href: "/tickets", label: "Helpdesk", icon: LifeBuoy, group: "overview", when: selfService },
  { href: "/announcements", label: "Announcements", icon: Announce, group: "overview", when: selfService },

  // ── Workspace: sales (BDA lens) ──
  { href: "/today", label: "Today", icon: Phone, group: "work", when: (c) => c.accessLevel === "employee" && c.features.has("leads"), mobile: true },
  { href: "/leads", label: "Leads", icon: Users, group: "work", when: isSales },
  { href: "/meetings", label: "Meetings", icon: CalendarClock, group: "work", when: (c) => isMgrUp(c) || c.features.has("leads"), mobile: false },
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
  { href: "/payroll", label: "Payroll", icon: Wallet, group: "people", when: isMgrUp },
  { href: "/approvals", label: "Approvals", icon: CheckSquare, group: "people", when: isMgrUp },

  // ── Oversight (admin-heavy) ──
  { href: "/departments", label: "Departments & Roles", icon: Building2, group: "oversight", when: isAdmin },
  { href: "/reports", label: "Reports", icon: BarChart3, group: "oversight", when: isMgrUp },
  { href: "/audit", label: "Audit Log", icon: ShieldCheck, group: "oversight", when: isMgrUp },
  { href: "/settings", label: "Company Settings", icon: Settings, group: "oversight", when: isAdmin },
];

export function contextFor(user: User, dept: Department | undefined): NavContext {
  return {
    accessLevel: user.accessLevel,
    deptKey: dept?.key ?? "",
    features: new Set(dept?.features ?? []),
  };
}

export function navFor(user: User, dept: Department | undefined): NavItem[] {
  const ctx = contextFor(user, dept);
  return navItems.filter((n) => n.when(ctx));
}

export function mobileNavFor(user: User, dept: Department | undefined): NavItem[] {
  const ctx = contextFor(user, dept);
  return navItems.filter((n) => n.mobile && n.when(ctx)).slice(0, 5);
}

// Label for the "work" nav group — brands the workspace by the active lens/role
// so it reads "Admin Workspace" / "BDA Workspace" / "Tech Workspace" …
export function workspaceLabel(user: User, dept: Department | undefined): string {
  if (dept) return `${dept.name} Workspace`;
  return user.accessLevel === "admin" ? "Admin Workspace" : "Workspace";
}
