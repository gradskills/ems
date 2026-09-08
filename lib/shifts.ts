import type { Shift } from "@/lib/types";

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Seed shifts every workspace starts with (marked system → not deletable).
export const DEFAULT_SHIFTS: Shift[] = [
  { id: "shift-general", name: "General", startTime: "09:00", endTime: "18:00", days: [1, 2, 3, 4, 5, 6], color: "primary", system: true },
  { id: "shift-early", name: "Early", startTime: "07:00", endTime: "16:00", days: [1, 2, 3, 4, 5, 6], color: "info" },
  { id: "shift-night", name: "Night", startTime: "22:00", endTime: "07:00", days: [1, 2, 3, 4, 5, 6], color: "purple" },
];

/** "9:00 AM" from "09:00". */
export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h)) return hhmm;
  const ampm = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

/** "9:00 AM – 6:00 PM" (adds "+1" marker for overnight shifts). */
export function shiftWindow(s: Shift): string {
  const overnight = s.endTime < s.startTime;
  return `${formatTime(s.startTime)} – ${formatTime(s.endTime)}${overnight ? " (+1)" : ""}`;
}

/** Compact weekday summary, e.g. "Mon–Sat" or "Mon, Wed, Fri". */
export function daysSummary(days: number[]): string {
  if (days.length === 0) return "No days";
  if (days.length === 7) return "Every day";
  const sorted = [...days].sort((a, b) => a - b);
  // detect a contiguous run
  const contiguous = sorted.every((d, i) => i === 0 || d === sorted[i - 1] + 1);
  if (contiguous && sorted.length > 2) return `${WEEKDAYS[sorted[0]]}–${WEEKDAYS[sorted[sorted.length - 1]]}`;
  return sorted.map((d) => WEEKDAYS[d]).join(", ");
}

export function shiftById(shifts: Shift[], id?: string): Shift | undefined {
  return id ? shifts.find((s) => s.id === id) : undefined;
}
