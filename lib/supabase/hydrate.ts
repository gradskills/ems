"use client";

// ─────────────────────────────────────────────────────────────
// Reads the whole app dataset out of Supabase and shapes it into the
// zustand store's slices. Every table is read in parallel — the database is
// ~200ms away, so reading ~30 tables one after another cost 6–8 seconds on
// every page load. Nothing is seeded: the database is the only source of data.
//
// Attendance selfies (base64) are ~95% of the payload, so they're loaded
// separately by `hydrateAttendancePhotos` after the app is already usable.
// ─────────────────────────────────────────────────────────────
import { getSupabase } from "@/lib/supabase/client";
import { userToApp, attendanceToApp, leaveToApp, genericToApp } from "@/lib/supabase/map";
import { setUsers, elevate } from "@/lib/seed/users";
import type { User } from "@/lib/types";
import { departments as seedDepartments, companySettings as seedCompany, approvalRules as seedApprovalRules } from "@/lib/seed/org";

// store slice → table, read with the generic mapper
const TABLES: { slice: string; table: string }[] = [
  { slice: "leads", table: "leads" },
  { slice: "insights", table: "call_insights" },
  { slice: "activities", table: "activities" },
  { slice: "audit", table: "app_audit" },
  { slice: "calls", table: "calls" },
  { slice: "proposals", table: "proposals" },
  { slice: "invoices", table: "invoices" },
  { slice: "delivery", table: "delivery_projects" },
  { slice: "payslips", table: "payslips" },
  { slice: "tasks", table: "app_tasks" },
  { slice: "projects", table: "projects" },
  { slice: "clients", table: "media_clients" },
  { slice: "campaigns", table: "campaigns" },
  { slice: "content", table: "content_posts" },
  { slice: "tickets", table: "tickets" },
  { slice: "notifications", table: "notifications" },
  { slice: "announcements", table: "announcements" },
  { slice: "auditReports", table: "audit_reports" },
  { slice: "briefs", table: "briefs" },
  { slice: "forms", table: "forms" },
  { slice: "formResponses", table: "form_responses" },
  { slice: "meetings", table: "meetings" },
];

const USER_COLS =
  "id,name,email,phone_number,role,access_level,department_id,manager_id,status," +
  "employment_type,location,avatar_color,avatar_url,monthly_target_calls,monthly_target_revenue," +
  "ctc_annual,salary,bank_last4,leave_balance,login_id,must_change_password," +
  "approval_status,designation,employee_id,onboarding_date,created_at"; // deliberately excludes password_hash

// every attendance column except the heavy punch_in_photo
const ATTENDANCE_COLS =
  "id,user_id,work_date,status,punch_in_time,punch_out_time,punch_in_latitude,punch_in_longitude," +
  "incomplete_reason,admin_notes,hours_worked,total_break_time_minutes,current_break_start_time,on_break";

export interface HydratedData {
  employees: User[];
  [slice: string]: unknown;
}

type Row = Record<string, unknown>;

/**
 * Loads everything from Supabase into store-shaped slices. Returns null if
 * Supabase isn't configured or the core fetch fails (store keeps its seed data).
 */
export async function hydrateAll(): Promise<HydratedData | null> {
  const sb = getSupabase();
  if (!sb) return null;

  try {
    const [usersRes, deptRes, attRes, lvRes, coRes, arRes, ovRes, tdRes, ddRes, ...tableRes] = await Promise.all([
      sb.from("users").select(USER_COLS),
      sb.from("departments").select("*"),
      sb.from("attendance").select(ATTENDANCE_COLS).order("work_date", { ascending: false }),
      sb.from("leave_requests").select("*").order("leave_date", { ascending: false }),
      sb.from("company_settings").select("data").eq("id", "default").maybeSingle(),
      sb.from("approval_rules").select("data").eq("id", "default").maybeSingle(),
      sb.from("doc_overrides").select("*"),
      sb.from("template_designs").select("*"),
      sb.from("doc_designs").select("*"),
      ...TABLES.map(({ table }) => sb.from(table).select("*")),
    ]);

    // ── users (source of truth for people) ──
    if (usersRes.error) throw usersRes.error;
    const employees = ((usersRes.data ?? []) as unknown as Row[]).map((r) => elevate(userToApp(r)));
    employees.sort((a, b) => Number(a.id) - Number(b.id));
    setUsers(employees); // keep the sync userById() registry fresh

    const out: HydratedData = { employees };

    // ── departments ──
    out.departments = ((deptRes.data ?? []) as Row[]).map((r) => genericToApp(r));
    if (!(out.departments as unknown[]).length) out.departments = seedDepartments;

    // ── real HR tables ──
    // A failed attendance read must not look like "nobody has clocked in" —
    // that's what makes people clock in again over an existing punch.
    if (attRes.error) throw attRes.error;
    out.attendance = ((attRes.data ?? []) as unknown as Row[]).map((r) => attendanceToApp(r));
    out.leaves = ((lvRes.data ?? []) as Row[]).map((r) => leaveToApp(r));

    // ── generic slices ──
    TABLES.forEach(({ slice, table }, i) => {
      const { data, error } = tableRes[i];
      if (error) { console.warn(`[hydrate] ${table}:`, error.message); out[slice] = []; return; }
      out[slice] = ((data ?? []) as Row[]).map((r) => genericToApp(r, table));
    });
    out.milestones = out.milestones ?? [];
    out.payments = out.payments ?? [];
    out.credentialEmails = [];

    // ── company settings + approval rules (single-row blobs) ──
    if (coRes.data?.data) out.company = coRes.data.data;
    else { void sb.from("company_settings").insert({ id: "default", data: seedCompany }); out.company = seedCompany; }
    if (arRes.data?.data) out.approvalRules = arRes.data.data;
    else { void sb.from("approval_rules").insert({ id: "default", data: seedApprovalRules }); out.approvalRules = seedApprovalRules; }

    // ── design/doc key-value slices ──
    out.docOverrides = Object.fromEntries(((ovRes.data ?? []) as Row[]).map((r) => [r.key as string, r.html as string]));
    out.templateDesigns = Object.fromEntries(((tdRes.data ?? []) as Row[]).map((r) => [r.doc_type as string, r.design]));
    out.docDesigns = Object.fromEntries(((ddRes.data ?? []) as Row[]).map((r) => [r.key as string, JSON.stringify(r.design)]));

    return out;
  } catch (e) {
    // Supabase errors are plain objects (message/code/hint) that serialize to
    // "{}" in the console — surface the useful fields, and treat this as a
    // handled warning since the store falls back to seed data.
    const err = e as { message?: string; code?: string; hint?: string; details?: string };
    console.warn(
      "[hydrate] falling back to seed data:",
      err?.message ?? String(e),
      err?.code ? `(code ${err.code})` : "",
      err?.hint ? `— ${err.hint}` : ""
    );
    return null;
  }
}

/** attendance id → check-in selfie, loaded after the rest of the app. */
export async function hydrateAttendancePhotos(): Promise<Map<string, string> | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from("attendance").select("id,punch_in_photo").not("punch_in_photo", "is", null);
  if (error) { console.warn("[hydrate] attendance photos:", error.message); return null; }
  return new Map(((data ?? []) as { id: number; punch_in_photo: string }[]).map((r) => [String(r.id), r.punch_in_photo]));
}
