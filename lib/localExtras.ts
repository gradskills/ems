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
import type { CompanyDay, User } from "@/lib/types";

const COMPANY_DAYS_KEY = "gs.companyDays.v1";
const PERSONAL_KEY = "gs.personalExtras.v1";

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
