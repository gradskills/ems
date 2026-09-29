"use client";

// Invisible runner mounted in the Shell. While the app is open it watches the
// wall clock and, when an employee's clock-in / clock-out reminder time is
// reached (and they haven't clocked in/out yet today), fires a browser
// notification + in-app notification + a chime — at most once per day per type.
import { useEffect } from "react";
import { useApp } from "@/lib/store";
import { userById } from "@/lib/seed/users";
import {
  readReminderConfig, defaultReminderConfig, hasFired, markFired, nowHHmm, playChime,
} from "@/lib/reminders";
import { shiftById } from "@/lib/shifts";
import { localDateISO } from "@/lib/utils";

export function ClockReminderRunner() {
  const actingUserId = useApp((s) => s.actingUserId);
  const authReady = useApp((s) => s.authReady);
  const dataReady = useApp((s) => s.dataReady);
  const shifts = useApp((s) => s.shifts);
  const notify = useApp((s) => s.notify);
  const runBirthdayGreetings = useApp((s) => s.runBirthdayGreetings);

  const me = userById(actingUserId);
  const isAdmin = me?.accessLevel === "admin";
  const shift = shiftById(shifts, me?.shiftId);
  const shiftKey = shift ? `${shift.startTime}-${shift.endTime}` : "none";

  // Fire the automatic birthday greetings from here (mounts for everyone,
  // regardless of role/landing page) so they run whoever opens the app first.
  useEffect(() => {
    if (authReady) runBirthdayGreetings();
  }, [authReady, runBirthdayGreetings]);

  useEffect(() => {
    // wait for attendance to load, or "Time to clock in" fires for people who already have
    if (!authReady || !dataReady || !me || isAdmin) return;

    function fire(kind: "in" | "out") {
      const label = kind === "in" ? "Time to clock in" : "Time to clock out";
      const body = kind === "in"
        ? "Start your day — open My Dashboard to clock in."
        : "Wrapping up? Don't forget to clock out on My Dashboard.";
      notify(me!.id, `⏰ ${label}`, body, "/my");
      playChime();
      try {
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          new Notification(`⏰ ${label}`, { body, tag: `clock-${kind}` });
        }
      } catch { /* browser notifications are best-effort */ }
    }

    function tick() {
      const cfg = readReminderConfig(me!.id, defaultReminderConfig(shift));
      const now = nowHHmm();
      const today = localDateISO();
      // read the freshest attendance from the store (avoids a stale closure)
      const rec = useApp.getState().attendance.find((a) => a.userId === me!.id && a.date === today);

      if (cfg.clockInEnabled && now >= cfg.clockInTime && !hasFired(me!.id, "in", today) && !rec?.checkIn) {
        markFired(me!.id, "in", today);
        fire("in");
      }
      if (cfg.clockOutEnabled && now >= cfg.clockOutTime && !hasFired(me!.id, "out", today) && rec?.checkIn && !rec?.checkOut) {
        markFired(me!.id, "out", today);
        fire("out");
      }
    }

    tick(); // check immediately on mount / user change
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, dataReady, actingUserId, isAdmin, shiftKey]);

  return null;
}
