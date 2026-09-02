import type { AttendanceRecord, LeaveRequest, Payslip, AttendanceStatus, BreakSession, BreakType } from "@/lib/types";
import { users } from "@/lib/seed/users";
import { seededInt } from "@/lib/clock";
import { daysAgo } from "@/lib/seed/dates";

const DAY = 86400000;
const MIN = 60000;
const ymd = (d: Date) => d.toISOString().slice(0, 10);
const ym = (d: Date) => d.toISOString().slice(0, 7);

const breakPlanned: Record<BreakType, number> = { tea: 10, snacks: 15, lunch: 45, casual: 20 };

// ── Today's live punch state — so the "who's in today" board is populated on load.
// Each active, non-admin employee is deterministically placed in one of a few
// states (working, on a break, WFH, clocked out, or not in yet). The default demo
// BDA (u-priya) is intentionally left "not in yet" so the clock-in flow still demos.
function buildToday(): AttendanceRecord[] {
  const out: AttendanceRecord[] = [];
  const now = Date.now();
  const today = ymd(new Date(now));
  for (const u of users) {
    if (u.accessLevel === "admin" || u.status === "inactive" || u.status === "resigned") continue;
    if (u.id === "u-priya") continue; // keep the clock-in demo working for the default user

    const roll = seededInt(`${u.id}-today`, 0, 100);
    // morning check-in, but never in the future — at least 90 min before "now"
    const morning = new Date(now); morning.setHours(9, seededInt(`${u.id}-tmin`, 0, 59), 0, 0);
    const checkInMs = Math.min(morning.getTime(), now - 90 * MIN);
    const checkIn = new Date(checkInMs).toISOString();

    // a completed earlier break most in-office people took
    const doneBreak = (type: BreakType, minsAgo: number): BreakSession => {
      const start = now - minsAgo * MIN;
      return { id: `BRK-${u.id}-done`, type, startedAt: new Date(start).toISOString(), plannedMinutes: breakPlanned[type], endedAt: new Date(start + breakPlanned[type] * MIN).toISOString(), remindersSent: 0 };
    };

    if (roll < 15) {
      // not in yet — no record
      continue;
    } else if (roll < 35) {
      // on a break right now (some overdue)
      const type = (["tea", "snacks", "lunch", "casual"] as BreakType[])[seededInt(`${u.id}-btype`, 0, 4)];
      const planned = breakPlanned[type];
      const overdue = seededInt(`${u.id}-bover`, 0, 10) < 4;
      const elapsed = overdue ? planned + seededInt(`${u.id}-bo`, 2, 12) : seededInt(`${u.id}-be`, 2, Math.max(3, planned - 2));
      const brk: BreakSession = { id: `BRK-${u.id}-live`, type, startedAt: new Date(now - elapsed * MIN).toISOString(), plannedMinutes: planned, remindersSent: overdue ? seededInt(`${u.id}-brem`, 1, 3) : 0 };
      out.push({ id: `AT-${u.id}-today`, userId: u.id, date: today, status: "present", checkIn, breaks: [doneBreak("tea", 180), brk] });
    } else if (roll < 55) {
      // working from home right now
      out.push({ id: `AT-${u.id}-today`, userId: u.id, date: today, status: "wfh", checkIn });
    } else if (roll < 80) {
      // in the office, working now
      const breaks = seededInt(`${u.id}-tb`, 0, 10) < 6 ? [doneBreak(seededInt(`${u.id}-tbt`, 0, 10) < 5 ? "tea" : "lunch", seededInt(`${u.id}-tba`, 60, 200))] : undefined;
      out.push({ id: `AT-${u.id}-today`, userId: u.id, date: today, status: "present", checkIn, breaks });
    } else {
      // done for the day — clocked out
      const outMs = now - seededInt(`${u.id}-tout`, 20, 150) * MIN;
      const co = new Date(Math.max(outMs, checkInMs + 4 * 60 * MIN));
      out.push({ id: `AT-${u.id}-today`, userId: u.id, date: today, status: "present", checkIn, checkOut: co.toISOString(), workedMinutes: Math.round((co.getTime() - checkInMs) / MIN), breaks: [doneBreak("lunch", 240)] });
    }
  }
  return out;
}

// ── Attendance: last 30 calendar days for every active employee ──
function buildAttendance(): AttendanceRecord[] {
  const out: AttendanceRecord[] = [];
  const now = new Date();
  for (const u of users) {
    for (let i = 1; i <= 30; i++) {
      const d = new Date(now.getTime() - i * DAY);
      const dow = d.getDay(); // 0 Sun, 6 Sat
      let status: AttendanceStatus;
      if (dow === 0) status = "week_off";
      else if (dow === 6) status = seededInt(`${u.id}-sat-${i}`, 0, 10) < 6 ? "week_off" : "present";
      else {
        const roll = seededInt(`${u.id}-att-${i}`, 0, 100);
        if (u.status === "on_leave" && i <= 4) status = "leave";
        else if (roll < 68) status = "present";
        else if (roll < 82) status = "wfh";
        else if (roll < 88) status = "half_day";
        else if (roll < 94) status = "leave";
        else status = "absent";
      }
      let checkIn: string | undefined;
      let checkOut: string | undefined;
      let workedMinutes: number | undefined;
      if (status === "present" || status === "wfh" || status === "half_day") {
        const inH = 9 + seededInt(`${u.id}-in-${i}`, 0, 2);
        const inM = seededInt(`${u.id}-inm-${i}`, 0, 59);
        const hours = status === "half_day" ? 4 : 8 + seededInt(`${u.id}-h-${i}`, 0, 2);
        const ci = new Date(d);
        ci.setHours(inH, inM, 0, 0);
        const co = new Date(ci.getTime() + hours * 3600000);
        checkIn = ci.toISOString();
        checkOut = co.toISOString();
        workedMinutes = hours * 60;
      }
      out.push({ id: `AT-${u.id}-${i}`, userId: u.id, date: ymd(d), status, checkIn, checkOut, workedMinutes });
    }
  }
  return out;
}

export const attendance: AttendanceRecord[] = [...buildToday(), ...buildAttendance()];

/** today's punch state for a user, if any */
export function todayAttendance(userId: string): AttendanceRecord | undefined {
  const today = ymd(new Date());
  return attendance.find((a) => a.userId === userId && a.date === today);
}

// ── Leave requests — a mix of statuses; several PENDING for the approval demo ──
export const leaveRequests: LeaveRequest[] = [
  {
    id: "LV-1",
    userId: "u-arjun",
    type: "casual",
    from: daysAgo(-3).slice(0, 10),
    to: daysAgo(-4).slice(0, 10),
    days: 2,
    reason: "Cousin's wedding in Nashik",
    status: "pending",
    appliedAt: daysAgo(1),
  },
  {
    id: "LV-2",
    userId: "u-neha",
    type: "sick",
    from: daysAgo(-1).slice(0, 10),
    to: daysAgo(-1).slice(0, 10),
    days: 1,
    reason: "Viral fever, doctor advised rest",
    status: "pending",
    appliedAt: daysAgo(0),
  },
  {
    id: "LV-3",
    userId: "u-fatima",
    type: "earned",
    from: daysAgo(4).slice(0, 10),
    to: daysAgo(-3).slice(0, 10),
    days: 7,
    reason: "Family trip to Kerala",
    status: "approved",
    appliedAt: daysAgo(10),
    approverId: "u-mgr",
    decidedAt: daysAgo(9),
    decisionNote: "Approved — cover handed to Priya.",
  },
  {
    id: "LV-4",
    userId: "u-isha",
    type: "casual",
    from: daysAgo(-7).slice(0, 10),
    to: daysAgo(-7).slice(0, 10),
    days: 1,
    reason: "Personal errand",
    status: "pending",
    appliedAt: daysAgo(0),
  },
  {
    id: "LV-5",
    userId: "u-karan",
    type: "unpaid",
    from: daysAgo(12).slice(0, 10),
    to: daysAgo(12).slice(0, 10),
    days: 1,
    reason: "College exam",
    status: "rejected",
    appliedAt: daysAgo(15),
    approverId: "u-vikram",
    decidedAt: daysAgo(14),
    decisionNote: "Clashes with release; take comp-off after.",
  },
  {
    id: "LV-6",
    userId: "u-rahul",
    type: "sick",
    from: daysAgo(2).slice(0, 10),
    to: daysAgo(2).slice(0, 10),
    days: 1,
    reason: "Migraine",
    status: "approved",
    appliedAt: daysAgo(3),
    approverId: "u-ananya",
    decidedAt: daysAgo(2),
  },
];

// ── Payslips — current + previous month for every employee ──
function buildPayslips(): Payslip[] {
  const out: Payslip[] = [];
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  for (const u of users) {
    if (!u.salary) continue;
    const gross = u.salary.basic + u.salary.hra + u.salary.special;
    const pf = Math.round(u.salary.basic * 0.12);
    const pt = 200; // professional tax
    const tds = u.ctcAnnual && u.ctcAnnual > 750000 ? Math.round(gross * 0.08) : 0;
    for (const [d, status] of [
      [prev, "paid"],
      [now, "processed"],
    ] as const) {
      const lopDays = u.status === "on_leave" && d === now ? 2 : 0;
      const lop = Math.round((gross / 30) * lopDays);
      const deductions = [
        { label: "Provident Fund", amount: pf },
        { label: "Professional Tax", amount: pt },
        ...(tds ? [{ label: "TDS", amount: tds }] : []),
        ...(lop ? [{ label: `Loss of Pay (${lopDays}d)`, amount: lop }] : []),
      ];
      const totalDed = deductions.reduce((s, x) => s + x.amount, 0);
      out.push({
        id: `PS-${u.id}-${ym(d)}`,
        userId: u.id,
        month: ym(d),
        status,
        earnings: [
          { label: "Basic", amount: u.salary.basic },
          { label: "HRA", amount: u.salary.hra },
          { label: "Special Allowance", amount: u.salary.special },
        ],
        deductions,
        paidDays: 30 - lopDays,
        lopDays,
        gross,
        net: gross - totalDed,
        generatedAt: daysAgo(status === "paid" ? 32 : 2),
        paidAt: status === "paid" ? daysAgo(31) : undefined,
      });
    }
  }
  return out;
}

export const payslips: Payslip[] = buildPayslips();
