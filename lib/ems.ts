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
  PayComponent,
  AttendanceRecord,
} from "@/lib/types";
import { reportsOf } from "@/lib/seed/users";
import { localDateISO } from "@/lib/utils";

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

// ── projects ──
// A project pending admin verification stays hidden from the wider team; only
// admins (who approve it) and the people attached to it (creator/manager/member)
// can see it until it goes live.
export function isProjectVisible(viewer: User, p: { approvalStatus?: string; createdById?: string; managerId?: string; memberIds?: string[] }): boolean {
  if (p.approvalStatus !== "pending" && p.approvalStatus !== "rejected") return true;
  if (viewer.accessLevel === "admin") return true;
  return p.createdById === viewer.id || p.managerId === viewer.id || (p.memberIds ?? []).includes(viewer.id);
}
export function visibleProjects<T extends { approvalStatus?: string; createdById?: string; managerId?: string; memberIds?: string[] }>(viewer: User, all: T[]): T[] {
  return all.filter((p) => isProjectVisible(viewer, p));
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
  needs_review: "Needs review",
  pending_punchout: "Pending punch-out",
};
export const attendanceColor: Record<AttendanceStatus, BadgeColor> = {
  present: "success",
  wfh: "info",
  half_day: "warning",
  leave: "purple",
  absent: "danger",
  holiday: "slate",
  week_off: "slate",
  needs_review: "warning",
  pending_punchout: "info",
};

// ── forgotten clock-out handling ──
// A past day where someone clocked in but never clocked out (or the backend
// flagged the punch). By policy this is given the benefit of the doubt and
// counts as a HALF-DAY automatically — no admin action needed. Only if the
// employee reaches out (see AttendanceRecord.fixRequested) does it surface to
// admins as a day to review and correct.
export function forgotPunchOut(a: AttendanceRecord, today: string): boolean {
  if (a.date >= today) return false; // today's open shift is "working now", not forgotten
  return (!!a.checkIn && !a.checkOut) || a.status === "needs_review" || a.status === "pending_punchout";
}
// The status to DISPLAY and count for a record: a forgotten punch-out reads as a
// half-day until an admin corrects it.
export function effectiveAttendanceStatus(a: AttendanceRecord, today: string): AttendanceStatus {
  return forgotPunchOut(a, today) ? "half_day" : a.status;
}
// A day an admin should review: forgotten punch-out AND the employee asked for a fix.
export function needsAttendanceReview(a: AttendanceRecord, today: string): boolean {
  return forgotPunchOut(a, today) && !!a.fixRequested;
}

export function attendanceSummary(records: AttendanceRecord[]) {
  const today = localDateISO();
  const eff = records.map((r) => effectiveAttendanceStatus(r, today));
  const present = eff.filter((s) => s === "present" || s === "wfh").length;
  const half = eff.filter((s) => s === "half_day").length;
  const leave = eff.filter((s) => s === "leave").length;
  const absent = eff.filter((s) => s === "absent").length;
  const working = eff.filter((s) => s !== "week_off" && s !== "holiday").length;
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

// ── multi-assignee + edit permissions ──────────────────────────
// The canonical list of people a task is assigned to. Older/back-compat tasks
// only carry `assigneeId`, so fall back to that.
export function taskAssignees(t: { assigneeIds?: string[]; assigneeId: string }): string[] {
  if (t.assigneeIds && t.assigneeIds.length) return t.assigneeIds;
  return t.assigneeId ? [t.assigneeId] : [];
}

// The set of people whose tasks show up in a viewer's "Team" scope.
//  • admin / manager → everyone they can see (visibleEmployees)
//  • employee        → their department teammates (so everyone gets a Team view)
export function teammateIds(viewer: User, all: User[]): Set<string> {
  if (viewer.accessLevel !== "employee") {
    return new Set(visibleEmployees(viewer, all).map((u) => u.id));
  }
  return new Set(all.filter((u) => u.departmentId === viewer.departmentId).map((u) => u.id).concat(viewer.id));
}

// Who may edit a task.
//  • the creator — always
//  • an admin — always (override)
//  • anyone explicitly granted edit (editorIds)
//  • a manager over any assignee — UNLESS the task was created by an admin
//    (admin-assigned work stays read-only until the admin grants edit access)
// Everyone else (including an assignee with no grant) gets a read-only view.
export function canEditTask(
  t: { createdById: string; editorIds?: string[]; assigneeIds?: string[]; assigneeId: string },
  me: User,
  all: User[],
): boolean {
  if (me.id === t.createdById) return true;
  if (me.accessLevel === "admin") return true;
  if ((t.editorIds ?? []).includes(me.id)) return true;
  if (me.accessLevel === "manager") {
    const creator = all.find((u) => u.id === t.createdById);
    if (creator?.accessLevel === "admin") return false; // admin task needs explicit grant
    const visible = new Set(visibleEmployees(me, all).map((u) => u.id));
    if (taskAssignees(t).some((id) => visible.has(id))) return true;
  }
  return false;
}

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

/** Calendar days in a YYYY-MM month. */
export function daysInMonth(ym: string): number {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

// Statutory/standard deduction knobs (prototype defaults).
const PF_RATE = 0.12;            // 12% of basic → Provident Fund
const PROFESSIONAL_TAX = 200;    // flat ₹200/month where applicable

/**
 * Build a payslip for one employee for a month from their salary structure and
 * that month's attendance. Loss-of-pay days (absent, unexcused) prorate the
 * gross; PF + professional tax are the standard deductions. The result is a
 * draft the admin can fine-tune before processing.
 */
export function buildPayslip(
  user: Pick<User, "id" | "salary" | "ctcAnnual">,
  month: string,
  monthAttendance: AttendanceRecord[],
): Payslip {
  const total = daysInMonth(month);
  const today = localDateISO();
  // LOP = full-day absences; a half-day counts as 0.5 LOP.
  let lop = 0;
  for (const a of monthAttendance) {
    const eff = effectiveAttendanceStatus(a, today);
    if (eff === "absent") lop += 1;
    else if (eff === "half_day") lop += 0.5;
  }
  lop = Math.min(lop, total);
  const paidDays = total - lop;
  const factor = total > 0 ? paidDays / total : 1;

  const salary = user.salary ?? (() => {
    const monthly = Math.round((user.ctcAnnual ?? 0) / 12);
    const basic = Math.round(monthly * 0.5);
    const hra = Math.round(monthly * 0.2);
    return { basic, hra, special: monthly - basic - hra };
  })();

  const r = (n: number) => Math.round(n * factor);
  const earnings: PayComponent[] = [
    { label: "Basic", amount: r(salary.basic) },
    { label: "HRA", amount: r(salary.hra) },
    { label: "Special allowance", amount: r(salary.special) },
  ];
  const gross = earnings.reduce((s, e) => s + e.amount, 0);

  const deductions: PayComponent[] = [
    { label: "Provident Fund", amount: Math.round(r(salary.basic) * PF_RATE) },
    { label: "Professional tax", amount: PROFESSIONAL_TAX },
  ];
  const totalDed = deductions.reduce((s, d) => s + d.amount, 0);

  return {
    id: `pay-${user.id}-${month}`,
    userId: user.id,
    month,
    status: "draft",
    earnings,
    deductions,
    paidDays: Math.round(paidDays * 10) / 10,
    lopDays: Math.round(lop * 10) / 10,
    gross,
    net: gross - totalDed,
    generatedAt: new Date().toISOString(),
  };
}
