import type {
  User,
  Department,
  AttendanceStatus,
  BreakType,
  LeaveStatus,
  LeaveType,
  TaskStatus,
  TaskPriority,
  ProjectStatus,
  ClientStatus,
  TicketStatus,
  AuditReportStatus,
  Payslip,
  AttendanceRecord,
} from "@/lib/types";
import { reportsOf } from "@/lib/seed/users";

type BadgeColor = "slate" | "primary" | "success" | "warning" | "danger" | "info" | "purple";

// ── role categories — short labels only: Admin / Manager / BDA / Tech / Media / custom dept ──
export function roleLabel(u: User, dept?: Department): string {
  if (u.accessLevel === "admin") return "Admin";
  if (u.accessLevel === "manager") return "Manager";
  const fixed: Record<string, string> = { bda: "BDA", tech: "Tech", media: "Media" };
  return fixed[dept?.key ?? ""] ?? dept?.name ?? "Employee";
}

// ── view lenses — a manager/admin toggles between the management overview and
// each role's workspace so their (many, sometimes duplicated) tabs stay sorted ──
export interface Lens {
  key: string; // "management" | departmentId
  label: string;
  home: string; // where selecting this lens lands
}
function lensHome(dept: Department): string {
  return { bda: "/dashboard", tech: "/tech", media: "/media" }[dept.key] ?? "/tasks";
}
export function lensesFor(user: User, departments: Department[]): Lens[] {
  // Admins land on their "My Dashboard" command center; managers on /overview.
  const management: Lens = { key: "management", label: "Management", home: user.accessLevel === "admin" ? "/my" : "/overview" };
  if (user.accessLevel === "admin") {
    const deptLenses = departments.filter((d) => d.features.length > 0).map((d) => ({ key: d.id, label: d.name, home: lensHome(d) }));
    return [management, ...deptLenses];
  }
  if (user.accessLevel === "manager") {
    const own = departments.find((d) => d.id === user.departmentId);
    return own && own.features.length > 0 ? [management, { key: own.id, label: own.name, home: lensHome(own) }] : [management];
  }
  return [];
}

// ── where a signed-in user lands after login ──
export function homePathFor(u: User | undefined): string {
  if (!u) return "/my";
  if (u.accessLevel === "admin") return "/my";
  if (u.accessLevel === "manager") return "/overview";
  return u.departmentId === "dept-bda" ? "/today" : "/my";
}

// ── breaks ──
export const breakTypeLabel: Record<BreakType, string> = { tea: "Tea", snacks: "Snacks", lunch: "Lunch", casual: "Casual" };
export const breakDefaults: Record<BreakType, number> = { tea: 10, snacks: 15, lunch: 45, casual: 20 };
export function activeBreak(rec?: AttendanceRecord) {
  return rec?.breaks?.find((b) => !b.endedAt);
}

// ── who can a viewer see? admin → everyone; manager → their subtree + self; employee → self ──
export function visibleEmployees(viewer: User, all: User[]): User[] {
  if (viewer.accessLevel === "admin") return all;
  if (viewer.accessLevel === "manager") {
    const subtree = reportsOf(viewer.id).map((u) => u.id);
    return all.filter((u) => u.id === viewer.id || subtree.includes(u.id));
  }
  return all.filter((u) => u.id === viewer.id);
}

// ── attendance ──
export const attendanceLabel: Record<AttendanceStatus, string> = {
  present: "Present",
  wfh: "Work from home",
  half_day: "Half day",
  leave: "On leave",
  absent: "Absent",
  holiday: "Holiday",
  week_off: "Week off",
};
export const attendanceColor: Record<AttendanceStatus, BadgeColor> = {
  present: "success",
  wfh: "info",
  half_day: "warning",
  leave: "purple",
  absent: "danger",
  holiday: "slate",
  week_off: "slate",
};

export function attendanceSummary(records: AttendanceRecord[]) {
  const present = records.filter((r) => r.status === "present" || r.status === "wfh").length;
  const half = records.filter((r) => r.status === "half_day").length;
  const leave = records.filter((r) => r.status === "leave").length;
  const absent = records.filter((r) => r.status === "absent").length;
  const working = records.filter((r) => r.status !== "week_off" && r.status !== "holiday").length;
  const pct = working ? Math.round(((present + half * 0.5) / working) * 100) : 0;
  return { present, half, leave, absent, working, pct };
}

// ── leave ──
export const leaveTypeLabel: Record<LeaveType, string> = {
  casual: "Casual",
  sick: "Sick",
  earned: "Earned",
  unpaid: "Unpaid",
  comp_off: "Comp-off",
};
export const leaveStatusColor: Record<LeaveStatus, BadgeColor> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
  cancelled: "slate",
};

// ── tasks ──
export const taskStatusLabel: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  review: "In review",
  done: "Done",
  blocked: "Blocked",
};
export const taskStatusColor: Record<TaskStatus, BadgeColor> = {
  todo: "slate",
  in_progress: "info",
  review: "purple",
  done: "success",
  blocked: "danger",
};
export const priorityColor: Record<TaskPriority, BadgeColor> = {
  low: "slate",
  medium: "info",
  high: "warning",
  urgent: "danger",
};
export const taskColumns: TaskStatus[] = ["todo", "in_progress", "review", "blocked", "done"];

// ── projects ──
export const projectStatusColor: Record<ProjectStatus, BadgeColor> = {
  planning: "slate",
  active: "info",
  on_hold: "warning",
  completed: "success",
  cancelled: "danger",
};
export const projectStatusLabel: Record<ProjectStatus, string> = {
  planning: "Planning",
  active: "Active",
  on_hold: "On hold",
  completed: "Completed",
  cancelled: "Cancelled",
};

// ── clients ──
export const clientStatusColor: Record<ClientStatus, BadgeColor> = {
  onboarding: "info",
  active: "success",
  paused: "warning",
  churned: "danger",
};

// ── tickets ──
export const ticketStatusColor: Record<TicketStatus, BadgeColor> = {
  open: "info",
  in_progress: "warning",
  resolved: "success",
  closed: "slate",
};

// ── audit reports ──
export const auditReportLabel: Record<AuditReportStatus, string> = {
  need_to_create: "Need to create",
  draft: "Draft",
  pending_verification: "Pending verification",
  sent: "Sent",
  opened: "Opened",
  accepted: "Accepted",
  rejected: "Rejected",
};
export const auditReportColor: Record<AuditReportStatus, BadgeColor> = {
  need_to_create: "slate",
  draft: "info",
  pending_verification: "warning",
  sent: "primary",
  opened: "purple",
  accepted: "success",
  rejected: "danger",
};

// ── payroll ──
export function payslipTotals(p: Payslip) {
  const earnings = p.earnings.reduce((s, x) => s + x.amount, 0);
  const deductions = p.deductions.reduce((s, x) => s + x.amount, 0);
  return { earnings, deductions, net: earnings - deductions };
}

export function monthLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}
