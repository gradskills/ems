"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { userById } from "@/lib/seed/users";
import { clockGateSeen, markClockGateSeen } from "@/lib/auth";
import { CameraCapture } from "@/components/ems/CameraCapture";
import { LogIn, Clock, MapPin, X } from "lucide-react";

// Shown once per calendar day, the first time someone opens the app, unless
// they've already clocked in. They can clock in right here or dismiss and do it
// later from the Clock page.
export function ClockGate() {
  const actingUserId = useApp((s) => s.actingUserId);
  const authReady = useApp((s) => s.authReady);
  const authUserId = useApp((s) => s.authUserId);
  const attendance = useApp((s) => s.attendance);
  const employees = useApp((s) => s.employees);
  const clockIn = useApp((s) => s.clockIn);

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const me = employees.find((e) => e.id === actingUserId) ?? userById(actingUserId);
  const todayRec = attendance.find((a) => a.userId === actingUserId && a.date === today);
  const clockedIn = !!todayRec?.checkIn;

  // decide whether to show, once the session is known and per acting user
  useEffect(() => {
    if (!authReady || !authUserId) return; // only for a signed-in session
    if (me?.accessLevel === "admin") { setOpen(false); return; } // admins don't clock in
    if (clockedIn) { markClockGateSeen(actingUserId, today); setOpen(false); return; }
    setOpen(!clockGateSeen(actingUserId, today));
    setErr("");
  }, [authReady, authUserId, actingUserId, clockedIn, today, me?.accessLevel]);

  if (!open || !me || me.accessLevel === "admin") return null;

  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  async function handleClockIn() {
    setCameraOpen(true);
  }

  async function doClockIn(r: { photo: string; coords?: { lat: number; lng: number }; timezone?: string; wfh: boolean }) {
    setBusy(true);
    setErr("");
    const ok = await clockIn(r);
    setBusy(false);
    if (ok) {
      markClockGateSeen(actingUserId, today);
      setOpen(false);
    } else {
      setErr("Couldn't get your location. Enable location access, or open the Clock page to try again.");
    }
  }

  function later() {
    markClockGateSeen(actingUserId, today);
    setOpen(false);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center shadow-[var(--shadow-lg)] animate-in">
        <button onClick={later} className="absolute right-3 top-3 rounded-lg p-1 text-[var(--muted-2)] hover:bg-[var(--surface-2)]" aria-label="Dismiss">
          <X size={18} />
        </button>
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)]">
          <Clock size={28} />
        </div>
        <h2 className="text-lg font-bold tracking-tight">{greet}, {me.name.split(" ")[0]}</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">Start your day by clocking in. We'll record your check-in time, location, and a selfie.</p>

        <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-[var(--muted-2)]">
          <MapPin size={13} /> Location &amp; photo are used to verify your check-in
        </div>

        {err && <div className="mt-3 rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-xs font-medium text-[var(--danger)]">{err}</div>}

        <button
          onClick={handleClockIn}
          disabled={busy}
          className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--primary)] text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          <LogIn size={17} /> {busy ? "Clocking in…" : "Clock in now"}
        </button>
        <div className="mt-2 flex items-center justify-center gap-3 text-xs">
          <button onClick={later} className="text-[var(--muted)] hover:text-[var(--foreground)]">I'll do it later</button>
          <span className="text-[var(--border-strong)]">·</span>
          <Link href="/clock" onClick={later} className="text-[var(--primary)] hover:underline">Open Clock page</Link>
        </div>
      </div>

      <CameraCapture
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={(r) => { setCameraOpen(false); doClockIn(r); }}
      />
    </div>
  );
}
