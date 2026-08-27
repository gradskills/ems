"use client";

import { useMemo, useState } from "react";
import type { AttendanceRecord, AttendanceStatus } from "@/lib/types";
import { attendanceLabel } from "@/lib/ems";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";

// day-cell colour per status (soft fill + text)
const statusStyle: Record<AttendanceStatus, { bg: string; fg: string }> = {
  present: { bg: "var(--success-soft)", fg: "var(--success)" },
  wfh: { bg: "var(--info-soft)", fg: "var(--info)" },
  half_day: { bg: "var(--warning-soft)", fg: "var(--warning)" },
  leave: { bg: "var(--purple-soft)", fg: "var(--purple)" },
  absent: { bg: "var(--danger-soft)", fg: "var(--danger)" },
  holiday: { bg: "var(--surface-2)", fg: "var(--muted)" },
  week_off: { bg: "var(--surface-2)", fg: "var(--muted-2)" },
};

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const pad = (n: number) => String(n).padStart(2, "0");
const fmtTime = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : "—");

export function AttendanceCalendar({ records, legendStatuses }: { records: AttendanceRecord[]; legendStatuses?: AttendanceStatus[] }) {
  const now = new Date();
  const [month, setMonth] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [selected, setSelected] = useState<AttendanceRecord | null>(null);

  const year = month.getFullYear();
  const mon = month.getMonth();
  const monthKey = `${year}-${pad(mon + 1)}`;
  const daysInMonth = new Date(year, mon + 1, 1).getDate() === 0 ? 31 : new Date(year, mon + 1, 0).getDate();
  const startWeekday = new Date(year, mon, 1).getDay();
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const isCurrentMonth = year === now.getFullYear() && mon === now.getMonth();

  const byDate = useMemo(() => new Map(records.map((r) => [r.date, r])), [records]);
  const monthRecs = records.filter((r) => r.date.slice(0, 7) === monthKey);
  const presentCount = monthRecs.filter((r) => r.status === "present" || r.status === "wfh").length;
  const leaveCount = monthRecs.filter((r) => r.status === "leave").length;
  const absentCount = monthRecs.filter((r) => r.status === "absent").length;

  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const legend = legendStatuses ?? (["present", "wfh", "half_day", "leave", "absent"] as AttendanceStatus[]);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={() => { setMonth(new Date(year, mon - 1, 1)); setSelected(null); }}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-strong)] text-[var(--muted)] hover:bg-[var(--surface-2)]"
          aria-label="Previous month"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="text-center">
          <div className="text-sm font-semibold">{month.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</div>
          <div className="text-[11px] text-[var(--muted)]">{presentCount} present · {leaveCount} leave · {absentCount} absent</div>
        </div>
        <button
          onClick={() => { if (!isCurrentMonth) { setMonth(new Date(year, mon + 1, 1)); setSelected(null); } }}
          disabled={isCurrentMonth}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-strong)] text-[var(--muted)] hover:bg-[var(--surface-2)] disabled:opacity-40"
          aria-label="Next month"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-2)]">
        {WEEKDAYS.map((w, i) => <div key={i}>{w}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const dateStr = `${year}-${pad(mon + 1)}-${pad(d)}`;
          const rec = byDate.get(dateStr);
          const st = rec ? statusStyle[rec.status] : null;
          const isToday = dateStr === todayStr;
          const isFuture = dateStr > todayStr;
          return (
            <button
              key={i}
              onClick={() => rec && setSelected(selected?.id === rec.id ? null : rec)}
              disabled={!rec}
              title={rec ? `${d} — ${attendanceLabel[rec.status]}` : ""}
              className={`relative flex aspect-square flex-col items-center justify-center rounded-lg border text-xs transition-colors ${
                isToday ? "border-[var(--primary)] ring-1 ring-[var(--primary)]" : "border-[var(--border)]"
              } ${rec ? "cursor-pointer hover:brightness-95" : isFuture ? "opacity-40" : ""} ${selected?.id === rec?.id ? "ring-2 ring-[var(--primary)]" : ""}`}
              style={st ? { background: st.bg, color: st.fg } : undefined}
            >
              <span className="font-medium">{d}</span>
              {rec?.checkIn && <span className="mt-0.5 h-1 w-1 rounded-full" style={{ background: "currentColor" }} />}
            </button>
          );
        })}
      </div>

      {/* legend */}
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[var(--muted)]">
        {legend.map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: statusStyle[s].fg }} />
            {attendanceLabel[s]}
          </span>
        ))}
      </div>

      {/* selected day detail */}
      {selected && (
        <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3 text-xs">
          <div className="mb-1 font-semibold">
            {new Date(selected.date).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })} · {attendanceLabel[selected.status]}
          </div>
          {selected.checkIn && (
            <div className="text-[var(--muted)]">In {fmtTime(selected.checkIn)}{selected.checkOut ? ` → Out ${fmtTime(selected.checkOut)}` : ""}
              {selected.workedMinutes != null && ` · ${Math.floor(selected.workedMinutes / 60)}h ${selected.workedMinutes % 60}m`}
            </div>
          )}
          {selected.checkInCoords && (
            <a
              href={`https://www.google.com/maps?q=${selected.checkInCoords.lat},${selected.checkInCoords.lng}`}
              target="_blank" rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-[var(--primary)] hover:underline"
            >
              <MapPin size={11} /> {selected.checkInCoords.lat.toFixed(4)}, {selected.checkInCoords.lng.toFixed(4)}
            </a>
          )}
        </div>
      )}
    </div>
  );
}
