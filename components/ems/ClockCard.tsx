"use client";

import { useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/store";
import { Card, Badge } from "@/components/ui/primitives";
import { breakTypeLabel, breakDefaults, activeBreak } from "@/lib/ems";
import { shiftById, shiftWindow, DEFAULT_SHIFTS } from "@/lib/shifts";
import type { BreakType, User } from "@/lib/types";
import { localDateISO } from "@/lib/utils";
import {
  LogIn, LogOut, MapPin, Coffee, Cookie, UtensilsCrossed, Armchair,
  ChevronRight, AlarmClock, type LucideIcon,
} from "lucide-react";

const breakIcons: Record<BreakType, LucideIcon> = { tea: Coffee, snacks: Cookie, lunch: UtensilsCrossed, casual: Armchair };
const BREAK_ORDER: BreakType[] = ["tea", "snacks", "lunch", "casual"];

function fmtClock(d: Date) {
  return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
}
function fmtT(iso?: string) {
  return iso ? new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : "—";
}
function mmss(totalSec: number) {
  const s = Math.max(0, Math.round(totalSec));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/** Talenta-style drag-to-confirm control. Works with mouse, touch and pen. */
function SlideToConfirm({
  label, onConfirm, disabled, tone = "primary", Icon,
}: {
  label: string;
  onConfirm: () => void;
  disabled?: boolean;
  tone?: "primary" | "danger";
  Icon: LucideIcon;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0); // px the knob has travelled
  const [pct, setPct] = useState(0); // 0..1 progress (computed in handlers)
  const [dragging, setDragging] = useState(false);
  const KNOB = 40;
  const PAD = 4;

  const moveTo = (clientX: number) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const max = Math.max(1, rect.width - KNOB - PAD * 2);
    const clamped = Math.min(max, Math.max(0, clientX - rect.left - PAD - KNOB / 2));
    setOffset(clamped);
    setPct(clamped / max);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    moveTo(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    moveTo(e.clientX);
  };
  const onPointerUp = () => {
    if (!dragging) return;
    setDragging(false);
    if (pct >= 0.9) onConfirm();
    setOffset(0);
    setPct(0);
  };

  const knobBg = tone === "danger" ? "bg-[var(--danger)]" : "bg-[var(--primary)]";

  return (
    <div
      ref={trackRef}
      className={`relative h-12 w-full select-none overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surface-2)] ${disabled ? "opacity-50" : ""}`}
    >
      {/* progress fill */}
      <div
        className={`absolute inset-y-0 left-0 rounded-full ${tone === "danger" ? "bg-[var(--danger-soft)]" : "bg-[var(--primary-soft)]"}`}
        style={{ width: offset + KNOB + PAD, transition: dragging ? "none" : "width .2s ease" }}
      />
      {/* label */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center pl-8 text-sm font-medium text-[var(--muted)]"
        style={{ opacity: disabled ? 0.7 : 1 - Math.min(1, pct * 1.4) }}
      >
        {label}
      </div>
      {/* knob */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className={`absolute top-1/2 flex h-10 w-10 touch-none items-center justify-center rounded-full text-white shadow-[var(--shadow-sm)] ${knobBg} ${disabled ? "cursor-not-allowed" : dragging ? "cursor-grabbing" : "cursor-grab"}`}
        style={{ left: PAD, transform: `translate(${offset}px, -50%)`, transition: dragging ? "none" : "transform .2s cubic-bezier(0.2,0,0,1)", willChange: "transform" }}
      >
        <Icon size={18} className={!dragging && !disabled ? "motion-safe:animate-pulse" : ""} />
      </div>
    </div>
  );
}

export function ClockCard({
  me, onClockIn, clockingIn, clockErr,
}: {
  me: User;
  onClockIn: () => void;
  clockingIn: boolean;
  clockErr: string;
}) {
  const attendance = useApp((s) => s.attendance);
  const shifts = useApp((s) => s.shifts);
  const clockOut = useApp((s) => s.clockOut);
  const startBreak = useApp((s) => s.startBreak);
  const endBreak = useApp((s) => s.endBreak);
  const dataReady = useApp((s) => s.dataReady);

  const [now, setNow] = useState<Date | null>(null);
  const [breakType, setBreakType] = useState<BreakType>("casual");

  useEffect(() => {
    // Set on the next tick (not synchronously in the effect) to avoid an
    // extra cascading render and to keep server/client markup in sync.
    const id = setInterval(() => setNow(new Date()), 1000);
    const kick = requestAnimationFrame(() => setNow(new Date()));
    return () => { clearInterval(id); cancelAnimationFrame(kick); };
  }, []);

  const today = localDateISO();
  const rec = attendance.find((a) => a.userId === me.id && a.date === today);
  const clockedIn = !!rec?.checkIn && !rec?.checkOut;
  const clockedOut = !!rec?.checkOut;
  const brk = activeBreak(rec);

  const shift = shiftById(shifts, me.shiftId) ?? DEFAULT_SHIFTS[0];

  // Active-break remaining time
  const brkMs = brk && now ? now.getTime() - Date.parse(brk.startedAt) : 0;
  const brkRemaining = brk ? brk.plannedMinutes * 60 - brkMs / 1000 : 0;
  const brkOverdue = !!brk && brkRemaining <= 0;

  // Today's timeline (newest first)
  type Ev = { t: string; label: string; kind: "in" | "out" | "bstart" | "bend" };
  const events: Ev[] = [];
  if (rec?.checkIn) events.push({ t: rec.checkIn, label: "Clock In", kind: "in" });
  (rec?.breaks ?? []).forEach((b) => {
    events.push({ t: b.startedAt, label: `Start ${breakTypeLabel[b.type]} break`, kind: "bstart" });
    if (b.endedAt) events.push({ t: b.endedAt, label: "End break", kind: "bend" });
  });
  if (rec?.checkOut) events.push({ t: rec.checkOut, label: "Clock Out", kind: "out" });
  events.sort((a, b) => (a.t < b.t ? 1 : -1));

  const dotColor: Record<Ev["kind"], string> = {
    in: "var(--success)", out: "var(--danger)", bstart: "var(--warning)", bend: "var(--muted-2)",
  };

  return (
    <Card className="overflow-hidden p-0">
      {/* ── Live clock header ── */}
      <div className="flex flex-col items-center gap-1 border-b border-[var(--border)] px-5 py-6 text-center">
        <div className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Live Attendance</div>
        <div className="font-mono text-4xl font-bold tabular-nums sm:text-5xl">{now ? fmtClock(now) : "--:--"}</div>
        <div className="text-sm text-[var(--muted)]">
          {now ? now.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : " "}
        </div>
      </div>

      <div className="space-y-4 p-5">
        {/* ── Shift window ── */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-center">
          <div className="text-xs font-medium text-[var(--muted)]">{shift.name}</div>
          <div className="mt-0.5 text-base font-semibold tracking-tight">{shiftWindow(shift)}</div>
          {rec?.status === "wfh" && <Badge color="info" dot className="mt-1.5">Work from home</Badge>}
        </div>

        {clockErr && (
          <div className="rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-center text-xs font-medium text-[var(--danger)]">{clockErr}</div>
        )}

        {/* ── Clock In (slide) — shown first, before anything else ──
            Nothing is offered until today's record has loaded; otherwise an
            already-clocked-in person briefly sees "Slide to clock in". */}
        {!dataReady ? (
          <div className="h-12 w-full animate-pulse rounded-full bg-[var(--surface-2)]" aria-label="Loading attendance" />
        ) : !rec?.checkIn ? (
          <div className="space-y-2">
            <SlideToConfirm
              label={clockingIn ? "Clocking in…" : "Slide to clock in"}
              Icon={LogIn}
              disabled={clockingIn}
              onConfirm={onClockIn}
            />
            <p className="text-center text-xs text-[var(--muted)]">A selfie is required to clock in.</p>
          </div>
        ) : clockedOut ? (
          <p className="text-center text-xs text-[var(--muted)]">
            In {fmtT(rec.checkIn)} · Out {fmtT(rec.checkOut)}
            {rec.workedMinutes != null && ` · ${Math.floor(rec.workedMinutes / 60)}h ${rec.workedMinutes % 60}m worked`}
          </p>
        ) : (
          <div className="flex items-center justify-center gap-2 text-xs text-[var(--muted)]">
            {rec.checkInPhoto && (
              <img src={rec.checkInPhoto} alt="" className="h-5 w-5 rounded-full object-cover ring-1 ring-[var(--success)]" style={{ transform: "scaleX(-1)" }} />
            )}
            <span>Clocked in at {fmtT(rec.checkIn)}</span>
            {rec.checkInCoords && (
              <span className="flex items-center gap-1 text-[var(--muted-2)]"><MapPin size={12} /> {rec.checkInCoords.lat.toFixed(3)}, {rec.checkInCoords.lng.toFixed(3)}</span>
            )}
          </div>
        )}

        {/* ── Break: active timer OR chips+slide — only once clocked in ──
            (before clocking in there's nothing to do here, so we hide it
            entirely rather than showing an inert control) */}
        {brk ? (
          <div className={`space-y-2 rounded-xl border p-3 ${brkOverdue ? "border-[var(--danger)] bg-[var(--danger-soft)]" : "border-[var(--border)] bg-[var(--surface-2)]"}`}>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">{breakTypeLabel[brk.type]} break</span>
              <span className={`font-mono font-semibold tabular-nums ${brkOverdue ? "text-[var(--danger)]" : ""}`}>
                {brkOverdue ? `+${mmss(-brkRemaining)}` : mmss(brkRemaining)}
              </span>
            </div>
            {brkOverdue && (
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--danger)]">
                <AlarmClock size={13} /> Break over — slide to clock back in
              </div>
            )}
            <SlideToConfirm
              label="Slide to end break"
              tone={brkOverdue ? "danger" : "primary"}
              Icon={ChevronRight}
              onConfirm={endBreak}
            />
          </div>
        ) : clockedIn ? (
          <div className="space-y-4">
            {/* Clock Out (slide) — only once clocked in and not on a break */}
            <SlideToConfirm
              label="Slide to clock out"
              tone="danger"
              Icon={LogOut}
              onConfirm={clockOut}
            />
            {/* Take a break */}
            <div className="space-y-2.5 border-t border-[var(--border)] pt-4">
              <div className="text-center text-xs font-medium text-[var(--muted)]">Take a break</div>
              <div className="grid grid-cols-2 gap-2">
                {BREAK_ORDER.map((type) => {
                  const Icon = breakIcons[type];
                  const active = breakType === type;
                  return (
                    <button
                      key={type}
                      onClick={() => setBreakType(type)}
                      className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors ${
                        active
                          ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                          : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--surface-2)]"
                      }`}
                    >
                      <Icon size={14} /> {breakTypeLabel[type]} · {breakDefaults[type]}m
                    </button>
                  );
                })}
              </div>
              <SlideToConfirm
                label="Slide to start break"
                Icon={ChevronRight}
                onConfirm={() => startBreak(breakType, breakDefaults[breakType])}
              />
            </div>
          </div>
        ) : null}
      </div>

      {/* ── Attendance log (today) ── */}
      <div className="border-t border-[var(--border)] px-5 py-4">
        <div className="mb-2 text-sm font-semibold">Attendance log</div>
        {events.length === 0 ? (
          <div className="py-4 text-center text-xs text-[var(--muted)]">No activity yet today.</div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {events.map((e, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5 text-sm">
                <span className="w-20 shrink-0 font-mono text-xs tabular-nums text-[var(--muted)]">{fmtT(e.t)}</span>
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: dotColor[e.kind] }} />
                <span className="flex-1 font-medium">{e.label}</span>
                <ChevronRight size={15} className="text-[var(--muted-2)]" />
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
