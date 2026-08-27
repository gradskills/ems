// ── Prototype auth helpers ──
// This is a clickable prototype: credentials live in the in-memory store as
// plaintext and the "email" that carries them is simulated in-app. None of this
// is production-safe — swap for a real identity provider before going live.

import type { User } from "@/lib/types";

const AUTH_KEY = "ems.authUserId";

/** username from a work email's local part, e.g. priya@pixelforge.in → priya */
export function loginIdFor(email: string, fallback = "user"): string {
  const local = (email.split("@")[0] || fallback).toLowerCase().replace(/[^a-z0-9._-]/g, "");
  return local || fallback;
}

/** A readable one-time password like "Pf7k-92mx" — easy to type on a phone. */
export function tempPassword(): string {
  const letters = "abcdefghjkmnpqrstuvwxyz"; // no ambiguous i/l/o
  const digits = "23456789";
  const pick = (set: string, n: number) =>
    Array.from({ length: n }, () => set[Math.floor(Math.random() * set.length)]).join("");
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  return `${cap(pick(letters, 2))}${pick(digits, 2)}-${pick(letters, 2)}${pick(digits, 2)}`;
}

/** Standard demo password every seeded account shares, shown on the login screen. */
export const DEMO_PASSWORD = "pixel123";

/** Give a seeded user login credentials if they don't already have them. */
export function withCredentials(u: User): User {
  if (u.loginId && u.password) return u;
  return { ...u, loginId: u.loginId ?? loginIdFor(u.email, u.id), password: u.password ?? DEMO_PASSWORD, mustChangePassword: false };
}

// ── persisted session (localStorage) ──
export function readAuth(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(AUTH_KEY);
  } catch {
    return null;
  }
}
export function writeAuth(userId: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (userId) window.localStorage.setItem(AUTH_KEY, userId);
    else window.localStorage.removeItem(AUTH_KEY);
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

// ── daily clock-in gate (localStorage) ──
// Records the last date a user dismissed / satisfied the "clock in for the day"
// prompt, so the gate only interrupts once per calendar day.
export function clockGateSeen(userId: string, date: string): boolean {
  if (typeof window === "undefined") return true; // never gate during SSR
  try {
    return window.localStorage.getItem(`ems.clockGate.${userId}`) === date;
  } catch {
    return true;
  }
}
export function markClockGateSeen(userId: string, date: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`ems.clockGate.${userId}`, date);
  } catch {
    /* ignore */
  }
}
