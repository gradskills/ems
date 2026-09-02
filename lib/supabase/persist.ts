"use client";

// ─────────────────────────────────────────────────────────────
// Write-through persistence for the zustand store.
//
// `persistChanges(prev, next)` is called after every store mutation (the store
// wraps its `set`). It diffs the tracked slices and pushes inserts/updates/
// deletes to Supabase — so almost every action persists with no per-action code.
//
// The three int-keyed HR tables (users / attendance / leave_requests) don't fit
// the generic text-id diff, so they get dedicated helpers that the relevant
// actions call explicitly.
// ─────────────────────────────────────────────────────────────
import { getSupabase } from "@/lib/supabase/client";
import { genericToRow, userToRow } from "@/lib/supabase/map";
import type { AttendanceRecord, LeaveRequest, User } from "@/lib/types";

let suspended = false;
/** Suspend persistence (used while hydrating so a load isn't echoed back as writes). */
export function setPersistSuspended(v: boolean) { suspended = v; }

function warn(ctx: string, e: { message?: string } | null) {
  if (e) console.warn(`[persist] ${ctx}:`, e.message ?? e);
}

// store slice → text-PK table. Excludes employees/attendance/leaves (int PK).
const ARRAY_SLICES: Record<string, string> = {
  leads: "leads", insights: "call_insights", activities: "activities", audit: "app_audit",
  calls: "calls", proposals: "proposals", invoices: "invoices", delivery: "delivery_projects",
  payslips: "payslips", tasks: "app_tasks", projects: "projects", clients: "media_clients",
  campaigns: "campaigns", content: "content_posts", tickets: "tickets", notifications: "notifications",
  announcements: "announcements", auditReports: "audit_reports", briefs: "briefs", milestones: "milestones",
  payments: "payments", forms: "forms", formResponses: "form_responses", meetings: "meetings",
  departments: "departments", credentialEmails: "credential_emails",
};

type AnyRow = { id: string } & Record<string, unknown>;

function diffArray(table: string, prev: AnyRow[], next: AnyRow[]) {
  const sb = getSupabase();
  if (!sb) return;
  const pById = new Map(prev.map((x) => [x.id, x]));
  const nById = new Map(next.map((x) => [x.id, x]));
  const upserts: AnyRow[] = [];
  for (const [id, item] of nById) {
    const p = pById.get(id);
    if (!p || p !== item) upserts.push(item); // new or changed reference
  }
  const deletes: string[] = [];
  for (const id of pById.keys()) if (!nById.has(id)) deletes.push(id);

  if (upserts.length) {
    const rows = upserts.map((x) => genericToRow(x, table));
    sb.from(table).upsert(rows).then(({ error }) => warn(`upsert ${table}`, error));
  }
  if (deletes.length) {
    sb.from(table).delete().in("id", deletes).then(({ error }) => warn(`delete ${table}`, error));
  }
}

function persistBlob(table: string, value: unknown) {
  const sb = getSupabase();
  if (!sb) return;
  sb.from(table).upsert({ id: "default", data: value }).then(({ error }) => warn(`blob ${table}`, error));
}

function diffKv(table: string, keyCol: string, valCol: string, prev: Record<string, unknown>, next: Record<string, unknown>, parseJson = false) {
  const sb = getSupabase();
  if (!sb) return;
  for (const k of Object.keys(next)) {
    if (prev[k] !== next[k]) {
      const v = parseJson ? safeParse(next[k]) : next[k];
      sb.from(table).upsert({ [keyCol]: k, [valCol]: v }).then(({ error }) => warn(`kv ${table}`, error));
    }
  }
  for (const k of Object.keys(prev)) {
    if (!(k in next)) sb.from(table).delete().eq(keyCol, k).then(({ error }) => warn(`kv-del ${table}`, error));
  }
}
function safeParse(v: unknown) { try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return v; } }

/** Called by the store after each mutation. Diffs tracked slices → Supabase. */
export function persistChanges(prev: Record<string, unknown>, next: Record<string, unknown>) {
  if (suspended || !getSupabase()) return;
  try {
    for (const [slice, table] of Object.entries(ARRAY_SLICES)) {
      if (prev[slice] !== next[slice]) {
        diffArray(table, (prev[slice] as AnyRow[]) ?? [], (next[slice] as AnyRow[]) ?? []);
      }
    }
    if (prev.company !== next.company) persistBlob("company_settings", next.company);
    if (prev.approvalRules !== next.approvalRules) persistBlob("approval_rules", next.approvalRules);
    if (prev.docOverrides !== next.docOverrides) diffKv("doc_overrides", "key", "html", prev.docOverrides as Record<string, unknown> ?? {}, next.docOverrides as Record<string, unknown> ?? {});
    if (prev.templateDesigns !== next.templateDesigns) diffKv("template_designs", "doc_type", "design", prev.templateDesigns as Record<string, unknown> ?? {}, next.templateDesigns as Record<string, unknown> ?? {});
    if (prev.docDesigns !== next.docDesigns) diffKv("doc_designs", "key", "design", prev.docDesigns as Record<string, unknown> ?? {}, next.docDesigns as Record<string, unknown> ?? {}, true);
  } catch (e) {
    console.warn("[persist] persistChanges failed:", e);
  }
}

// ── dedicated helpers for the int-keyed HR tables ──────────────

/** Upsert one attendance record, keyed by (user_id, work_date). */
export async function persistAttendance(rec: AttendanceRecord) {
  const sb = getSupabase();
  if (!sb || suspended) return;
  const openBreak = (rec.breaks ?? []).find((b) => !b.endedAt);
  const row = {
    user_id: Number(rec.userId),
    work_date: rec.date,
    status: rec.status,
    punch_in_time: rec.checkIn ?? null,
    punch_out_time: rec.checkOut ?? null,
    punch_in_photo: rec.checkInPhoto ?? null,
    punch_in_latitude: rec.checkInCoords?.lat ?? null,
    punch_in_longitude: rec.checkInCoords?.lng ?? null,
    hours_worked: rec.workedMinutes != null ? rec.workedMinutes / 60 : null,
    total_break_time_minutes: rec.totalBreakMinutes ?? 0,
    on_break: Boolean(rec.onBreak),
    current_break_start_time: rec.onBreak ? openBreak?.startedAt ?? null : null,
  };
  const { data: existing } = await sb
    .from("attendance").select("id").eq("user_id", row.user_id).eq("work_date", row.work_date).limit(1);
  if (existing && existing.length) {
    await sb.from("attendance").update(row).eq("id", (existing[0] as { id: number }).id).then(({ error }) => warn("attendance update", error));
  } else {
    await sb.from("attendance").insert(row).then(({ error }) => warn("attendance insert", error));
  }
}

/** Insert one leave-request row per date in the [from, to] range. */
export async function persistLeaveApply(rec: LeaveRequest) {
  const sb = getSupabase();
  if (!sb || suspended) return;
  const rows: Record<string, unknown>[] = [];
  const start = new Date(rec.from);
  const end = new Date(rec.to);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    rows.push({ user_id: Number(rec.userId), leave_date: d.toISOString().slice(0, 10), reason: rec.reason, status: "pending" });
  }
  if (rows.length) await sb.from("leave_requests").insert(rows).then(({ error }) => warn("leave insert", error));
}

/** Update a leave request's decision. Works on rows with a numeric id. */
export async function persistLeaveDecision(id: string, status: string, approverId: string, note?: string) {
  const sb = getSupabase();
  if (!sb || suspended || !/^\d+$/.test(id)) return;
  await sb.from("leave_requests").update({
    status, reviewed_by: Number(approverId), review_notes: note ?? null,
  }).eq("id", Number(id)).then(({ error }) => warn("leave decision", error));
}

/** Update an existing employee's editable columns. */
export async function persistUserUpdate(id: string, patch: Partial<User>) {
  const sb = getSupabase();
  if (!sb || suspended || !/^\d+$/.test(id)) return;
  const row = userToRow(patch);
  if (Object.keys(row).length === 0) return;
  await sb.from("users").update(row).eq("id", Number(id)).then(({ error }) => warn("user update", error));
}
