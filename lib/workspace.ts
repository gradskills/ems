// ─────────────────────────────────────────────────────────────
// Workspace module catalog + helpers.
//
// A "workspace" is one business a person runs. Each workspace enables a set of
// top-level MODULES; the sidebar nav and route guards hide anything whose module
// is off, on top of the existing per-department feature gating.
// ─────────────────────────────────────────────────────────────
import type { WorkspaceModule } from "@/lib/types";

export const DEFAULT_WORKSPACE_ID = "ws-gradskills";

export interface ModuleInfo {
  key: WorkspaceModule;
  label: string;
  description: string;
  icon: string; // lucide icon name
}

// Order here is the order modules appear in the create/settings pickers.
export const WORKSPACE_MODULES: ModuleInfo[] = [
  { key: "sales", label: "Sales / BDA", description: "Leads, pipeline, quotations, invoices, prospect audit, delivery", icon: "Phone" },
  { key: "qims", label: "Audit Reports", description: "Digital-health audit reports for prospects (QIMS)", icon: "FileSearch" },
  { key: "projects", label: "Projects", description: "Tech / delivery projects and git activity", icon: "Code2" },
  { key: "media", label: "Media & Marketing", description: "Clients, content calendar, campaigns", icon: "Megaphone" },
  { key: "attendance", label: "Attendance & Leave", description: "Clock in/out, shifts, leave requests, leaderboard", icon: "ClipboardList" },
  { key: "payroll", label: "Payroll", description: "Salary structures, payroll runs, payslips", icon: "Wallet" },
  { key: "tasks", label: "Tasks", description: "Shared task board across the team", icon: "CheckSquare" },
  { key: "meetings", label: "Meetings", description: "Schedule meetings and keep minutes", icon: "CalendarClock" },
  { key: "helpdesk", label: "Helpdesk", description: "Internal support tickets", icon: "LifeBuoy" },
  { key: "announcements", label: "Announcements", description: "Company-wide announcements", icon: "Bell" },
  { key: "reports", label: "Reports", description: "Cross-module analytics dashboard", icon: "BarChart3" },
];

export const ALL_MODULES: WorkspaceModule[] = WORKSPACE_MODULES.map((m) => m.key);

export function moduleInfo(key: WorkspaceModule): ModuleInfo | undefined {
  return WORKSPACE_MODULES.find((m) => m.key === key);
}

// Starter presets for creating a new workspace. "custom" is a minimal base the
// owner then tailors in the picker.
export interface WorkspaceTemplate {
  key: string;
  name: string;
  description: string;
  icon: string; // lucide icon name suggested for the workspace mark
  modules: WorkspaceModule[];
}

export const WORKSPACE_TEMPLATES: WorkspaceTemplate[] = [
  {
    key: "full",
    name: "Everything",
    description: "The full suite — sales, projects, media, HR, payroll and more.",
    icon: "Boxes",
    modules: [...ALL_MODULES],
  },
  {
    key: "agency",
    name: "Creative / Marketing agency",
    description: "Win clients, run campaigns and deliver projects.",
    icon: "Megaphone",
    modules: ["sales", "qims", "projects", "media", "attendance", "tasks", "meetings", "helpdesk", "announcements", "reports"],
  },
  {
    key: "sales",
    name: "Sales team",
    description: "A focused pipeline: leads, quotations and audits.",
    icon: "TrendingUp",
    modules: ["sales", "qims", "attendance", "tasks", "meetings", "announcements", "reports"],
  },
  {
    key: "people",
    name: "HR / People Ops",
    description: "Attendance, leave, payroll and the team.",
    icon: "Users",
    modules: ["attendance", "payroll", "tasks", "meetings", "helpdesk", "announcements", "reports"],
  },
  {
    key: "custom",
    name: "Start from scratch",
    description: "A minimal base you tailor module by module.",
    icon: "Sparkles",
    modules: ["attendance", "tasks", "announcements"],
  },
];

// Longest-prefix path → module map used by route guards and nav gating. A path
// with no entry here is a "core" screen (dashboard, employees, settings, …) and
// is never gated by modules.
const PATH_MODULE: { prefix: string; module: WorkspaceModule }[] = [
  { prefix: "/today", module: "sales" },
  { prefix: "/leads", module: "sales" },
  { prefix: "/explore", module: "sales" },
  { prefix: "/forms", module: "sales" },
  { prefix: "/pipeline", module: "sales" },
  { prefix: "/proposals", module: "sales" },
  { prefix: "/invoices", module: "sales" },
  { prefix: "/prospect-audit", module: "sales" },
  { prefix: "/delivery", module: "sales" },
  { prefix: "/performance", module: "sales" },
  { prefix: "/dashboard", module: "sales" },
  { prefix: "/audit-reports", module: "qims" },
  { prefix: "/projects", module: "projects" },
  { prefix: "/tech", module: "projects" },
  { prefix: "/clients", module: "media" },
  { prefix: "/content", module: "media" },
  { prefix: "/campaigns", module: "media" },
  { prefix: "/media", module: "media" },
  { prefix: "/my/leaves", module: "attendance" },
  { prefix: "/attendance", module: "attendance" },
  { prefix: "/shifts", module: "attendance" },
  { prefix: "/leaves", module: "attendance" },
  { prefix: "/leaderboard", module: "attendance" },
  { prefix: "/payroll", module: "payroll" },
  { prefix: "/tasks", module: "tasks" },
  { prefix: "/meetings", module: "meetings" },
  { prefix: "/tickets", module: "helpdesk" },
  { prefix: "/announcements", module: "announcements" },
  { prefix: "/reports", module: "reports" },
];

/** Which module a route belongs to, or undefined for a core (always-on) route. */
export function moduleForPath(pathname: string): WorkspaceModule | undefined {
  let best: { prefix: string; module: WorkspaceModule } | undefined;
  for (const entry of PATH_MODULE) {
    if (pathname === entry.prefix || pathname.startsWith(entry.prefix + "/")) {
      if (!best || entry.prefix.length > best.prefix.length) best = entry;
    }
  }
  return best?.module;
}

/** True when a route is reachable given the workspace's enabled modules. */
export function pathEnabled(pathname: string, modules: WorkspaceModule[] | Set<WorkspaceModule>): boolean {
  const mod = moduleForPath(pathname);
  if (!mod) return true; // core route
  const set = modules instanceof Set ? modules : new Set(modules);
  return set.has(mod);
}
