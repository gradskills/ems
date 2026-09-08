import type { User } from "@/lib/types";

// ── Birthdays ────────────────────────────────────────────────
// Birthdays are derived from each employee's `dateOfBirth` (YYYY-MM-DD). We only
// ever compare the month + day, so the birth year is irrelevant to matching.

/** MM-DD slice of a YYYY-MM-DD date string (ignores the year). */
function monthDay(ymd: string): string {
  // dateOfBirth is stored as YYYY-MM-DD; guard against other shapes.
  const m = ymd.match(/^\d{4}-(\d{2}-\d{2})/);
  return m ? m[1] : ymd.slice(5, 10);
}

/** Local YYYY-MM-DD for a Date (defaults to now). */
export function todayISO(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Is this employee's birthday on the given day? */
export function isBirthdayOn(u: User, dayISO: string): boolean {
  if (!u.dateOfBirth) return false;
  return monthDay(u.dateOfBirth) === monthDay(dayISO);
}

/** Active employees whose birthday is today. */
export function todaysBirthdays(employees: User[], dayISO = todayISO()): User[] {
  return employees.filter((u) => u.status !== "resigned" && isBirthdayOn(u, dayISO));
}

/**
 * Employees with a birthday in the next `days` days (excluding today), each with
 * how many days away it is — used for the "coming up" celebrations preview.
 */
export function upcomingBirthdays(employees: User[], days = 14, from = new Date()): { user: User; inDays: number; on: string }[] {
  const out: { user: User; inDays: number; on: string }[] = [];
  for (const u of employees) {
    if (u.status === "resigned" || !u.dateOfBirth) continue;
    for (let i = 1; i <= days; i++) {
      const d = new Date(from);
      d.setDate(d.getDate() + i);
      if (isBirthdayOn(u, todayISO(d))) {
        out.push({ user: u, inDays: i, on: todayISO(d) });
        break;
      }
    }
  }
  return out.sort((a, b) => a.inDays - b.inDays);
}

/** Turn a YYYY-MM-DD into an age this year, if a real birth year is present. */
export function ageThisYear(dob: string, on = new Date()): number | null {
  const y = Number(dob.slice(0, 4));
  if (!y || y < 1900) return null;
  return on.getFullYear() - y;
}
