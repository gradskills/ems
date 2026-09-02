// ─────────────────────────────────────────────────────────────
// DB row ⇄ app object mappers.
//
// New app tables were created with column names that are the exact
// snake_case of the app's camelCase fields, with jsonb columns holding the
// nested arrays/objects verbatim — so a generic snake⇄camel converter round-trips
// them losslessly. The three tables that predate the app (`users`,
// `attendance`, `leave_requests`) have their own shape and get hand-written
// mappers below.
// ─────────────────────────────────────────────────────────────
import type {
  User, AttendanceRecord, AttendanceStatus, LeaveRequest, LeaveStatus, Role, AccessLevel,
} from "@/lib/types";

type Row = Record<string, unknown>;
type Obj = Record<string, unknown>;

const toSnake = (s: string) => s.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());
const toCamel = (s: string) => s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());

// Per-table column aliases where the DB name isn't just snake_case of the field.
// { appField: dbColumn }
const ALIASES: Record<string, Record<string, string>> = {
  credential_emails: { to: "to_email" },
};

/** Generic app object → DB row (camelCase → snake_case, drops undefined). */
export function genericToRow(obj: Obj, table?: string): Row {
  const alias = (table && ALIASES[table]) || {};
  const row: Row = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    row[alias[k] ?? toSnake(k)] = v;
  }
  return row;
}

/** Generic DB row → app object (snake_case → camelCase, null → undefined). */
export function genericToApp(row: Row, table?: string): Obj {
  const alias = (table && ALIASES[table]) || {};
  const rev: Record<string, string> = {};
  for (const [appField, dbCol] of Object.entries(alias)) rev[dbCol] = appField;
  const obj: Obj = {};
  for (const [k, v] of Object.entries(row)) {
    if (v === null) continue;
    obj[rev[k] ?? toCamel(k)] = v;
  }
  return obj;
}

// ── users ──────────────────────────────────────────────────────
/** Legacy sales role triad derived from the EMS access level. */
export function legacyRole(accessLevel?: string | null, dbRole?: string | null): Role {
  if (accessLevel === "admin") return "admin";
  if (accessLevel === "manager") return "manager";
  if (accessLevel === "employee") return "bda";
  // fall back to the DB's own role column (founder/tl/intern/admin)
  if (dbRole === "founder" || dbRole === "admin") return "admin";
  if (dbRole === "tl") return "manager";
  return "bda";
}
function accessFromRole(dbRole?: string | null): AccessLevel {
  if (dbRole === "founder" || dbRole === "admin") return "admin";
  if (dbRole === "tl") return "manager";
  return "employee";
}

/** users row → app User. Never includes the password hash. */
export function userToApp(row: Row): User {
  const access = (row.access_level as AccessLevel) ?? accessFromRole(row.role as string);
  return {
    id: String(row.id),
    name: (row.name as string) ?? "",
    email: (row.email as string) ?? "",
    phone: (row.phone_number as string) ?? "",
    role: legacyRole(row.access_level as string, row.role as string),
    accessLevel: access,
    departmentId: (row.department_id as string) ?? "dept-admin",
    designation: (row.designation as string) ?? undefined,
    managerId: row.manager_id != null ? String(row.manager_id) : undefined,
    status: (row.status as User["status"]) ?? "active",
    employmentType: (row.employment_type as User["employmentType"]) ?? "full_time",
    joinedAt: (row.onboarding_date as string) ?? (row.created_at as string) ?? undefined,
    location: (row.location as string) ?? undefined,
    avatarColor: (row.avatar_color as string) ?? undefined,
    monthlyTargetCalls: (row.monthly_target_calls as number) ?? undefined,
    monthlyTargetRevenue: (row.monthly_target_revenue as number) ?? undefined,
    ctcAnnual: (row.ctc_annual as number) ?? undefined,
    salary: (row.salary as User["salary"]) ?? undefined,
    bankLast4: (row.bank_last4 as string) ?? undefined,
    leaveBalance: (row.leave_balance as User["leaveBalance"]) ?? undefined,
    loginId: (row.login_id as string) ?? undefined,
    mustChangePassword: Boolean(row.must_change_password),
    // employee_id / dob exist in the DB but have no app field — carried loosely:
    employeeId: (row.employee_id as string) ?? undefined,
  } as User & { employeeId?: string };
}

/** app User (patch) → users row. Only writes columns the users table owns. */
export function userToRow(u: Partial<User>): Row {
  const row: Row = {};
  if (u.name !== undefined) row.name = u.name;
  if (u.email !== undefined) row.email = u.email;
  if (u.phone !== undefined) row.phone_number = u.phone;
  if (u.accessLevel !== undefined) row.access_level = u.accessLevel;
  if (u.departmentId !== undefined) row.department_id = u.departmentId;
  if (u.managerId !== undefined) row.manager_id = u.managerId ? Number(u.managerId) : null;
  if (u.designation !== undefined) row.designation = u.designation;
  if (u.status !== undefined) row.status = u.status;
  if (u.employmentType !== undefined) row.employment_type = u.employmentType;
  if (u.location !== undefined) row.location = u.location;
  if (u.avatarColor !== undefined) row.avatar_color = u.avatarColor;
  if (u.monthlyTargetCalls !== undefined) row.monthly_target_calls = u.monthlyTargetCalls;
  if (u.monthlyTargetRevenue !== undefined) row.monthly_target_revenue = u.monthlyTargetRevenue;
  if (u.ctcAnnual !== undefined) row.ctc_annual = u.ctcAnnual;
  if (u.salary !== undefined) row.salary = u.salary;
  if (u.bankLast4 !== undefined) row.bank_last4 = u.bankLast4;
  if (u.leaveBalance !== undefined) row.leave_balance = u.leaveBalance;
  if (u.loginId !== undefined) row.login_id = u.loginId;
  if (u.mustChangePassword !== undefined) row.must_change_password = u.mustChangePassword;
  return row;
}

// ── attendance ─────────────────────────────────────────────────
const ATT_STATUSES = new Set([
  "present", "wfh", "half_day", "leave", "absent", "holiday", "week_off",
  "needs_review", "pending_punchout",
]);
function attStatus(s: unknown): AttendanceStatus {
  const v = String(s ?? "");
  return (ATT_STATUSES.has(v) ? v : "present") as AttendanceStatus;
}
const num = (v: unknown): number | undefined => (v == null ? undefined : Number(v));

export function attendanceToApp(row: Row): AttendanceRecord {
  const lat = num(row.punch_in_latitude);
  const lng = num(row.punch_in_longitude);
  const hours = num(row.hours_worked);
  const onBreak = Boolean(row.on_break);
  const curBreak = row.current_break_start_time as string | null;
  return {
    id: String(row.id),
    userId: String(row.user_id),
    date: row.work_date as string,
    status: attStatus(row.status),
    checkIn: (row.punch_in_time as string) ?? undefined,
    checkOut: (row.punch_out_time as string) ?? undefined,
    workedMinutes: hours != null ? Math.round(hours * 60) : undefined,
    checkInPhoto: (row.punch_in_photo as string) ?? undefined,
    checkInCoords: lat != null && lng != null ? { lat, lng } : undefined,
    note: (row.incomplete_reason as string) ?? (row.admin_notes as string) ?? undefined,
    // break tracking (DB stores an aggregate + a single open break)
    totalBreakMinutes: num(row.total_break_time_minutes) ?? 0,
    onBreak,
    breaks: onBreak && curBreak
      ? [{ id: `brk-${row.id}`, type: "casual", startedAt: curBreak, plannedMinutes: 0, remindersSent: 0 }]
      : [],
  };
}

// ── leave_requests (single date in DB) ─────────────────────────
export function leaveToApp(row: Row): LeaveRequest {
  const d = row.leave_date as string;
  return {
    id: String(row.id),
    userId: String(row.user_id),
    type: "casual",
    from: d,
    to: d,
    days: 1,
    reason: (row.reason as string) ?? "",
    status: (row.status as LeaveStatus) ?? "pending",
    appliedAt: (row.created_at as string) ?? d,
    approverId: row.reviewed_by != null ? String(row.reviewed_by) : undefined,
    decisionNote: (row.review_notes as string) ?? undefined,
  };
}
