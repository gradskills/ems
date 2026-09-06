"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { Modal, Field, Input } from "@/components/ui/modal";
import { Button } from "@/components/ui/primitives";
import { attendanceLabel } from "@/lib/ems";
import type { AttendanceRecord, AttendanceStatus, User } from "@/lib/types";

// Admin-only editor: mark someone present/absent/on-leave for a date and fix the
// check-in / check-out times they may have forgotten. Writes through the store's
// setAttendance action (which persists to Supabase).
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
  open, onClose, employee, date, record,
}: {
  open: boolean;
  onClose: () => void;
  employee: User | null;
  date: string;
  record?: AttendanceRecord;
}) {
  const setAttendance = useApp((s) => s.setAttendance);

  const [status, setStatus] = useState<AttendanceStatus>("present");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");

  // reset the form whenever the target person/date/record changes
  useEffect(() => {
    if (!open) return;
    setStatus((record?.status as AttendanceStatus) ?? "present");
    setCheckIn(isoToTime(record?.checkIn));
    setCheckOut(isoToTime(record?.checkOut));
  }, [open, record, employee?.id, date]);

  if (!employee) return null;

  const worksTimes = status === "present" || status === "wfh" || status === "half_day";

  function save() {
    setAttendance(employee!.id, date, {
      status,
      checkIn: worksTimes ? timeToIso(date, checkIn) : null,
      checkOut: worksTimes ? timeToIso(date, checkOut) : null,
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
        <div className="rounded-lg bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--muted)]">
          {new Date(date).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </div>

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
      </div>
    </Modal>
  );
}
