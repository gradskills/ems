import type { User, AttendanceRecord } from "@/lib/types";
import { attendanceSummary } from "@/lib/ems";

export interface LeaderboardRow {
  user: User;
  rank: number;
  pct: number; // attendance %
  present: number; // present + wfh days
  working: number; // working days in the window
  streak: number; // current consecutive present/wfh streak (most recent days)
  rating: number; // 1–5 stars derived from attendance %
  score: number; // sortable composite
}

/** 1–5 star rating from an attendance percentage. */
export function ratingFor(pct: number): number {
  if (pct >= 95) return 5;
  if (pct >= 85) return 4;
  if (pct >= 70) return 3;
  if (pct >= 50) return 2;
  return 1;
}

/** Current run of consecutive present/wfh/half days, counting back from the latest record. */
function currentStreak(records: AttendanceRecord[]): number {
  const days = records
    .filter((r) => r.status !== "week_off" && r.status !== "holiday")
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1)); // newest first
  let streak = 0;
  for (const r of days) {
    if (r.status === "present" || r.status === "wfh" || r.status === "half_day") streak++;
    else break;
  }
  return streak;
}

/**
 * Rank employees by attendance. Ties on % are broken by present-day count, then
 * streak — so a consistent full-timer outranks someone with the same % on fewer days.
 */
export function attendanceLeaderboard(employees: User[], attendance: AttendanceRecord[]): LeaderboardRow[] {
  const rows = employees
    .filter((u) => u.status !== "resigned")
    .map((u) => {
      const recs = attendance.filter((a) => a.userId === u.id);
      const s = attendanceSummary(recs);
      const streak = currentStreak(recs);
      const present = s.present + Math.round(s.half * 0.5);
      const score = s.pct * 1000 + present * 10 + streak;
      return { user: u, pct: s.pct, present: s.present, working: s.working, streak, rating: ratingFor(s.pct), score, rank: 0 };
    })
    .sort((a, b) => b.score - a.score);
  rows.forEach((r, i) => (r.rank = i + 1));
  return rows;
}
