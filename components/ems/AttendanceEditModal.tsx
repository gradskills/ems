"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { localDateISO } from "@/lib/utils";
import { Modal, Field, Input } from "@/components/ui/modal";
import { Button } from "@/components/ui/primitives";
import { attendanceLabel, needsAttendanceReview } from "@/lib/ems";
import type { AttendanceRecord, AttendanceStatus, User } from "@/lib/types";
import { AlertTriangle, LogIn } from "lucide-react";

// Admin-only editor: mark someone present/absent/on-leave for a date and fix the
// check-in / check-out times they may have forgotten. Writes through the store's
// setAttendance action (which persists to Supabase). When the employee couldn't
// finish a past day (clocked in but never clocked out, or the backend flagged
// the punch), those days are listed at the top so the admin can jump straight to
// the one that needs review and set the missing time.
const STATUS_OPTIONS: AttendanceStatus[] = [
  "present", "wfh", "half_day", "leave", "absent", "holiday", "week_off",
];

// pull "HH:MM" (local) out of an ISO timestamp for a <input type="time">
function isoToTime(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
// combine a YYYY-MM-DD date + "HH:MM" into an ISO string (local time)
function timeToIso(date: string, time: string): string | null {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  const d = new Date(`${date}T00:00:00`);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

export function AttendanceEditModal({
  open, onClose, employee, date,
}: {
  open: boolean;
  onClose: () => void;
  employee: User | null;
  date: string;
  // `record` was previously passed in, but the modal now reads live from the
  // store so the review list refreshes as days get fixed. Kept out of the props.
  record?: AttendanceRecord;
}) {
  const setAttendance = useApp((s) => s.setAttendance);
  const attendance = useApp((s) => s.attendance);
  const today = localDateISO();

  const [activeDate, setActiveDate] = useState(date);
  const [status, setStatus] = useState<AttendanceStatus>("present");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");

  // days this person flagged for review — forgot to clock out AND reached out to
  // admin. Untouched forgotten punch-outs count as half-days automatically and
  // don't appear here (latest first).
  const reviewDays = useMemo(() => {
    if (!employee) return [] as AttendanceRecord[];
    return attendance
      .filter((a) => a.userId === employee.id && needsAttendanceReview(a, today))
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [attendance, employee, today]);

  // the stored record for whichever date the admin is currently editing
  const activeRecord = useMemo(
    () => (employee ? attendance.find((a) => a.userId === employee.id && a.date === activeDate) : undefined),
    [attendance, employee, activeDate]
  );

  // Sync form state to props during render (React's recommended pattern for
  // "reset state when something changes" — no effects, no cascading renders).
  // 1) each time the modal opens (or its launch target changes) jump to `date`.
  const [openedFor, setOpenedFor] = useState<string | null>(null);
  const launchKey = `${open}:${employee?.id ?? ""}:${date}`;
  if (launchKey !== openedFor) {
    setOpenedFor(launchKey);
    setActiveDate(date);
  }
  // 2) whenever the day being edited changes, load that day's stored values.
  const [syncedFor, setSyncedFor] = useState<string | null>(null);
  const syncKey = `${activeDate}:${activeRecord?.checkIn ?? ""}:${activeRecord?.checkOut ?? ""}:${activeRecord?.status ?? ""}`;
  if (syncKey !== syncedFor) {
    setSyncedFor(syncKey);
    setStatus((activeRecord?.status as AttendanceStatus) ?? "present");
    setCheckIn(isoToTime(activeRecord?.checkIn));
    setCheckOut(isoToTime(activeRecord?.checkOut));
  }

  if (!employee) return null;

  const worksTimes = status === "present" || status === "wfh" || status === "half_day";
  const fmtT = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : "—");
  const fmtDay = (d: string) => new Date(d).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

  function save() {
    setAttendance(employee!.id, activeDate, {
      status,
      checkIn: worksTimes ? timeToIso(activeDate, checkIn) : null,
      checkOut: worksTimes ? timeToIso(activeDate, checkOut) : null,
    });
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Edit attendance — ${employee.name}`}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Save attendance</Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* ── Change attendance (primary action, shown first) ── */}
        {/* Date being edited — admin can pick any past day to correct */}
        <Field label="Date" hint="Pick any day to correct its attendance">
          <Input type="date" value={activeDate} max={today} onChange={(e) => e.target.value && setActiveDate(e.target.value)} />
        </Field>

        <Field label="Status">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as AttendanceStatus)}
            className="h-10 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--primary)]"
          >
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{attendanceLabel[s]}</option>)}
          </select>
        </Field>

        {worksTimes && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Clock-in time"><Input type="time" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} /></Field>
            <Field label="Clock-out time" hint="Fix a missed punch-out"><Input type="time" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} /></Field>
          </div>
        )}

        <p className="text-[11px] text-[var(--muted-2)]">
          Setting a status like Absent or On leave clears the clock-in/out times for the day.
        </p>

        {/* ── Caution dates (below): only days the employee reached out about ── */}
        {reviewDays.length > 0 && (
          <div className="rounded-xl border border-[var(--warning)] bg-[var(--warning-soft)] p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--warning)]">
              <AlertTriangle size={15} />
              {reviewDays.length} day{reviewDays.length > 1 ? "s" : ""} need review
            </div>
            <p className="mb-2.5 text-[11px] text-[var(--muted)]">The employee forgot to clock out and asked you to fix these. Until fixed they count as half-days. Pick a day, then set its clock-out time above.</p>
            <div className="space-y-1.5">
              {reviewDays.map((r) => {
                const selected = r.date === activeDate;
                return (
                  <button
                    key={r.id}
                    onClick={() => setActiveDate(r.date)}
                    className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${selected ? "border-[var(--warning)] bg-[var(--surface)]" : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--warning)]"}`}
                  >
                    <span className="text-sm font-medium">{fmtDay(r.date)}</span>
                    <span className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                      {r.checkIn ? (
                        <><LogIn size={12} /> In {fmtT(r.checkIn)}</>
                      ) : (
                        <span className="text-[var(--muted-2)]">No clock-in</span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
