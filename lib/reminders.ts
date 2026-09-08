"use client";

// ─────────────────────────────────────────────────────────────
// Clock-in / clock-out reminders ("alarms"), managed by each employee and
// stored per-device in localStorage. A lightweight runner (ClockReminderRunner)
// checks these against the wall clock while the app is open and fires a browser
// notification + in-app notification + a short beep when a reminder time is
// reached and the person hasn't already clocked in/out for the day.
// ─────────────────────────────────────────────────────────────
import type { Shift } from "@/lib/types";

const CONFIG_KEY = "gs.clockReminders.v1";  // userId → ClockReminderConfig
const FIRED_KEY = "gs.clockReminderFired.v1"; // set of "<userId>:<in|out>:<date>"

export interface ClockReminderConfig {
  clockInEnabled: boolean;
  clockInTime: string;  // "HH:mm"
  clockOutEnabled: boolean;
  clockOutTime: string; // "HH:mm"
}

function canUse() {
  return typeof window !== "undefined";
}

/** Sensible defaults, seeded from the assigned shift's window when present. */
export function defaultReminderConfig(shift?: Shift): ClockReminderConfig {
  return {
    clockInEnabled: true,
    clockInTime: shift?.startTime ?? "09:00",
    clockOutEnabled: true,
    clockOutTime: shift?.endTime ?? "18:00",
  };
}

export function readReminderConfig(userId: string, fallback: ClockReminderConfig): ClockReminderConfig {
  if (!canUse()) return fallback;
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    const map = raw ? JSON.parse(raw) : {};
    return map && map[userId] ? { ...fallback, ...map[userId] } : fallback;
  } catch {
    return fallback;
  }
}

export function writeReminderConfig(userId: string, config: ClockReminderConfig) {
  if (!canUse()) return;
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[userId] = config;
    localStorage.setItem(CONFIG_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

// ── "fired today" bookkeeping so a reminder nags at most once per day ──
function firedKey(userId: string, kind: "in" | "out", date: string) {
  return `${userId}:${kind}:${date}`;
}

export function hasFired(userId: string, kind: "in" | "out", date: string): boolean {
  if (!canUse()) return true;
  try {
    const raw = localStorage.getItem(FIRED_KEY);
    const set = raw ? JSON.parse(raw) : {};
    return !!set[firedKey(userId, kind, date)];
  } catch {
    return false;
  }
}

export function markFired(userId: string, kind: "in" | "out", date: string) {
  if (!canUse()) return;
  try {
    const raw = localStorage.getItem(FIRED_KEY);
    const set = raw ? JSON.parse(raw) : {};
    set[firedKey(userId, kind, date)] = true;
    // keep the map small — drop keys older than today
    for (const k of Object.keys(set)) {
      if (!k.endsWith(date)) delete set[k];
    }
    set[firedKey(userId, kind, date)] = true;
    localStorage.setItem(FIRED_KEY, JSON.stringify(set));
  } catch {
    /* ignore */
  }
}

/** "HH:mm" of a Date in local time. */
export function nowHHmm(d = new Date()): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Short two-tone beep via Web Audio (best-effort; silent if unavailable). */
export function playChime() {
  if (!canUse()) return;
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const beep = (freq: number, start: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + 0.35);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + 0.36);
    };
    beep(880, 0);
    beep(1174, 0.18);
    setTimeout(() => ctx.close().catch(() => {}), 1000);
  } catch {
    /* ignore */
  }
}
