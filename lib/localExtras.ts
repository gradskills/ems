"use client";

// ─────────────────────────────────────────────────────────────
// Browser-local persistence for two feature areas whose data has no
// dedicated Supabase column/table yet:
//   1. Company days (holiday / working-day / portal-issue calendar)
//   2. Employee personal details shown on the ID card (blood group,
//      emergency contact, DOB, address …)
//
// Keeping these in localStorage makes them durable across reloads on the
// same browser without depending on the (still-evolving) DB schema, and
// without risking the existing Supabase write-through for known columns.
// ─────────────────────────────────────────────────────────────
import type { CompanyDay, Shift, User } from "@/lib/types";
import { DEFAULT_SHIFTS } from "@/lib/shifts";

const COMPANY_DAYS_KEY = "gs.companyDays.v1";
const PERSONAL_KEY = "gs.personalExtras.v1";
const SHIFTS_KEY = "gs.shifts.v1";
const SHIFT_ASSIGN_KEY = "gs.shiftAssignments.v1"; // userId → shiftId

// The subset of User that lives in local storage (self-service personal fields).
export const PERSONAL_FIELDS = [
  "personalEmail",
  "dateOfBirth",
  "bloodGroup",
  "address",
  "emergencyContactName",
  "emergencyContactPhone",
  "emergencyContactRelation",
] as const;

export type PersonalExtras = Partial<Pick<User, (typeof PERSONAL_FIELDS)[number]>>;

function canUse() {
  return typeof window !== "undefined";
}

// ── company days ──
export function readCompanyDays(): CompanyDay[] {
  if (!canUse()) return [];
  try {
    const raw = localStorage.getItem(COMPANY_DAYS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as CompanyDay[]) : [];
  } catch {
    return [];
  }
}

export function writeCompanyDays(days: CompanyDay[]) {
  if (!canUse()) return;
  try {
    localStorage.setItem(COMPANY_DAYS_KEY, JSON.stringify(days));
  } catch {
    /* ignore quota / private-mode errors */
  }
}

// ── personal extras (keyed by employee id) ──
type PersonalMap = Record<string, PersonalExtras>;

function readPersonalMap(): PersonalMap {
  if (!canUse()) return {};
  try {
    const raw = localStorage.getItem(PERSONAL_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? (parsed as PersonalMap) : {};
  } catch {
    return {};
  }
}

/** Persist just the personal fields present in `patch` for one employee. */
export function writePersonalExtra(userId: string, patch: PersonalExtras) {
  if (!canUse()) return;
  const map = readPersonalMap();
  const next: PersonalExtras = { ...map[userId] };
  for (const f of PERSONAL_FIELDS) {
    if (f in patch) {
      const v = patch[f];
      if (v === undefined || v === "") delete next[f];
      else next[f] = v;
    }
  }
  map[userId] = next;
  try {
    localStorage.setItem(PERSONAL_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

/** Overlay any saved personal fields onto the given employees. */
export function applyPersonalExtras(employees: User[]): User[] {
  const map = readPersonalMap();
  if (!Object.keys(map).length) return employees;
  return employees.map((e) => (map[e.id] ? { ...e, ...map[e.id] } : e));
}

// ── shift definitions ──
export function readShifts(): Shift[] {
  if (!canUse()) return DEFAULT_SHIFTS;
  try {
    const raw = localStorage.getItem(SHIFTS_KEY);
    if (!raw) return DEFAULT_SHIFTS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? (parsed as Shift[]) : DEFAULT_SHIFTS;
  } catch {
    return DEFAULT_SHIFTS;
  }
}

export function writeShifts(shifts: Shift[]) {
  if (!canUse()) return;
  try {
    localStorage.setItem(SHIFTS_KEY, JSON.stringify(shifts));
  } catch {
    /* ignore */
  }
}

// ── shift assignments (userId → shiftId) ──
type ShiftAssignMap = Record<string, string>;

function readShiftAssignMap(): ShiftAssignMap {
  if (!canUse()) return {};
  try {
    const raw = localStorage.getItem(SHIFT_ASSIGN_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? (parsed as ShiftAssignMap) : {};
  } catch {
    return {};
  }
}

/** Assign (or clear, when shiftId is undefined) one employee's shift. */
export function writeShiftAssignment(userId: string, shiftId: string | undefined) {
  if (!canUse()) return;
  const map = readShiftAssignMap();
  if (shiftId) map[userId] = shiftId;
  else delete map[userId];
  try {
    localStorage.setItem(SHIFT_ASSIGN_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

/** Drop assignments pointing at a deleted shift. */
export function pruneShiftAssignments(validShiftIds: string[]) {
  if (!canUse()) return;
  const map = readShiftAssignMap();
  const valid = new Set(validShiftIds);
  let changed = false;
  for (const uid of Object.keys(map)) {
    if (!valid.has(map[uid])) { delete map[uid]; changed = true; }
  }
  if (changed) {
    try { localStorage.setItem(SHIFT_ASSIGN_KEY, JSON.stringify(map)); } catch { /* ignore */ }
  }
}

/** Overlay saved shift assignments onto employees (sets `shiftId`). */
export function applyShiftAssignments(employees: User[]): User[] {
  const map = readShiftAssignMap();
  if (!Object.keys(map).length) return employees;
  return employees.map((e) => (map[e.id] ? { ...e, shiftId: map[e.id] } : e));
}
