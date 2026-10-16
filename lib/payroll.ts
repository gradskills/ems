// ─────────────────────────────────────────────────────────────
// Payroll types — named salary templates — and the pure logic that
// turns one (plus a month's attendance) into a draft payslip. No React,
// no store: the generator, the management UI and the preview all share
// this brain, mirroring lib/tasks.ts for the task views.
// ─────────────────────────────────────────────────────────────
import type {
  User,
  Payslip,
  PayComponent,
  PayItemDef,
  PayItemKind,
  PayrollType,
  AttendanceRecord,
} from "@/lib/types";
import { daysInMonth, effectiveAttendanceStatus } from "@/lib/ems";
import { localDateISO } from "@/lib/utils";

// ── item-kind meta (drives the component editor) ───────────────
export const payItemKindLabel: Record<PayItemKind, string> = {
  fixed: "Fixed ₹",
  percent_base: "% of base pay",
  percent_gross: "% of gross",
};

/** Kinds an earning line may use (gross-relative only makes sense for deductions). */
export const earningKinds: PayItemKind[] = ["fixed", "percent_base"];
export const deductionKinds: PayItemKind[] = ["fixed", "percent_base", "percent_gross"];

/** A short human description of what one component resolves to. */
export function payItemSummary(item: PayItemDef): string {
  if (item.kind === "fixed") return `₹${item.value.toLocaleString("en-IN")}`;
  if (item.kind === "percent_base") return `${item.value}% of base`;
  return `${item.value}% of gross`;
}

// ── id helper (used by the editor; store uses its own nid) ──────
let _c = 0;
export function payItemId(): string {
  _c += 1;
  return `pi-${Date.now().toString(36)}-${_c}`;
}
export function blankPayItem(kind: PayItemKind = "fixed"): PayItemDef {
  return { id: payItemId(), label: "", kind, value: 0 };
}

// ── employee monthly base ──────────────────────────────────────
// The magnitude percent-based components scale off: the sum of the salary
// structure if set, otherwise CTC/12. Fixed components ignore this entirely,
// so a type built from fixed amounts still produces real numbers when an
// employee has no salary on file (common in the prototype).
export function monthlyBase(user: Pick<User, "salary" | "ctcAnnual">): number {
  if (user.salary) {
    const { basic, hra, special } = user.salary;
    const sum = (basic || 0) + (hra || 0) + (special || 0);
    if (sum > 0) return sum;
  }
  return Math.round((user.ctcAnnual ?? 0) / 12);
}

// ── lookups ────────────────────────────────────────────────────
export function payrollTypeById(types: PayrollType[], id?: string): PayrollType | undefined {
  return id ? types.find((t) => t.id === id) : undefined;
}
/** The payroll type an employee is assigned to (first match wins). */
export function payrollTypeForUser(userId: string, types: PayrollType[]): PayrollType | undefined {
  return types.find((t) => t.memberIds.includes(userId));
}

// ── component maths ─────────────────────────────────────────────
function round(n: number): number {
  return Math.round(n);
}
function earningAmount(item: PayItemDef, base: number): number {
  if (item.kind === "percent_base") return (base * item.value) / 100;
  return item.value; // fixed (percent_gross is invalid for an earning → treated as fixed 0 by UI)
}
function deductionAmount(item: PayItemDef, base: number, gross: number): number {
  if (item.kind === "percent_base") return (base * item.value) / 100;
  if (item.kind === "percent_gross") return (gross * item.value) / 100;
  return item.value; // fixed
}

/** Loss-of-pay days for a month (absent = 1, half-day = 0.5), capped at the month length. */
export function lopDaysFor(month: string, monthAttendance: AttendanceRecord[]): number {
  const total = daysInMonth(month);
  const today = localDateISO();
  let lop = 0;
  for (const a of monthAttendance) {
    const eff = effectiveAttendanceStatus(a, today);
    if (eff === "absent") lop += 1;
    else if (eff === "half_day") lop += 0.5;
  }
  return Math.min(lop, total);
}

/**
 * Build a draft payslip for one employee for a month from a payroll TYPE and
 * that month's attendance. Earnings prorate by attendance when the type opts in;
 * fixed deductions are charged in full, percentage deductions follow the
 * (possibly prorated) gross. The admin can still fine-tune the draft after.
 */
export function buildPayslipFromType(
  user: Pick<User, "id" | "salary" | "ctcAnnual">,
  month: string,
  monthAttendance: AttendanceRecord[],
  type: PayrollType,
): Payslip {
  const total = daysInMonth(month);
  const lop = lopDaysFor(month, monthAttendance);
  const paidDays = total - lop;
  const factor = type.prorateByAttendance && total > 0 ? paidDays / total : 1;
  const base = monthlyBase(user);

  const earnings: PayComponent[] = type.earnings.map((e) => ({
    label: e.label,
    amount: round(earningAmount(e, base) * factor),
  }));
  const gross = earnings.reduce((s, e) => s + e.amount, 0);

  const deductions: PayComponent[] = type.deductions.map((d) => ({
    label: d.label,
    // fixed charges aren't prorated; percentages already follow the prorated gross/base
    amount: round(d.kind === "fixed" ? d.value : deductionAmount(d, base, gross)),
  }));
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
    payrollTypeId: type.id,
  };
}

// ── seed templates every workspace starts with ─────────────────
export const DEFAULT_PAYROLL_TYPES: PayrollType[] = [
  {
    id: "ptype-fulltime",
    name: "Full-time salaried",
    description: "Standard monthly salary split with PF + professional tax.",
    color: "primary",
    earnings: [
      { id: "pi-ft-basic", label: "Basic", kind: "percent_base", value: 50 },
      { id: "pi-ft-hra", label: "HRA", kind: "percent_base", value: 20 },
      { id: "pi-ft-special", label: "Special allowance", kind: "percent_base", value: 30 },
    ],
    deductions: [
      { id: "pi-ft-pf", label: "Provident Fund", kind: "percent_base", value: 6 },
      { id: "pi-ft-pt", label: "Professional tax", kind: "fixed", value: 200 },
    ],
    prorateByAttendance: true,
    memberIds: [],
    system: true,
  },
  {
    id: "ptype-intern",
    name: "Intern stipend",
    description: "Flat monthly stipend, prorated for absences, no statutory deductions.",
    color: "info",
    earnings: [{ id: "pi-in-stipend", label: "Stipend", kind: "fixed", value: 15000 }],
    deductions: [],
    prorateByAttendance: true,
    memberIds: [],
    system: true,
  },
  {
    id: "ptype-contract",
    name: "Contractor",
    description: "Fixed professional fee with 10% TDS; not prorated by attendance.",
    color: "purple",
    earnings: [{ id: "pi-ct-fee", label: "Professional fee", kind: "fixed", value: 40000 }],
    deductions: [{ id: "pi-ct-tds", label: "TDS (194J)", kind: "percent_gross", value: 10 }],
    prorateByAttendance: false,
    memberIds: [],
    system: true,
  },
];
