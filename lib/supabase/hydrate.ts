"use client";

// ─────────────────────────────────────────────────────────────
// Reads the whole app dataset out of Supabase and shapes it into the
// zustand store's slices. On first run, empty sales/CRM/QIMS tables are
// seeded once from the app's demo fixtures (remapped onto the real users)
// so every screen stays populated — after that it's real, editable data.
//
// The real HR tables (users, attendance, leave_requests) are NEVER seeded;
// their existing rows are the source of truth.
// ─────────────────────────────────────────────────────────────
import { getSupabase } from "@/lib/supabase/client";
import { userToApp, attendanceToApp, leaveToApp, genericToApp, genericToRow } from "@/lib/supabase/map";
import { setUsers } from "@/lib/seed/users";
import type { User } from "@/lib/types";

import { leads as seedLeads } from "@/lib/seed/leads";
import { callInsights as seedInsights, calls as seedCalls } from "@/lib/seed/calls";
import { activities as seedActivities } from "@/lib/seed/activities";
import { auditLog as seedAudit } from "@/lib/seed/audit";
import { proposals as seedProposals, invoices as seedInvoices } from "@/lib/seed/proposals";
import { deliveryProjects as seedDelivery } from "@/lib/seed/prospects";
import { departments as seedDepartments, companySettings as seedCompany, approvalRules as seedApprovalRules } from "@/lib/seed/org";
import { payslips as seedPayslips } from "@/lib/seed/hr";
import { tasks as seedTasks } from "@/lib/seed/tasks";
import { projects as seedProjects } from "@/lib/seed/projects";
import { mediaClients as seedClients, campaigns as seedCampaigns, contentPosts as seedContent } from "@/lib/seed/media";
import { tickets as seedTickets, notifications as seedNotifications, announcements as seedAnnouncements } from "@/lib/seed/workplace";
import { auditReports as seedAuditReports } from "@/lib/seed/auditReports";
import { briefs as seedBriefs } from "@/lib/seed/briefs";
import { forms as seedForms, formResponses as seedFormResponses } from "@/lib/seed/forms";
import { meetings as seedMeetings } from "@/lib/seed/meetings";

// Old demo user id → a real DB user id (stringified). Any string matching a
// left-hand key anywhere inside a seed object is rewritten before it's stored.
const OLD_TO_REAL: Record<string, string> = {
  "u-admin": "1",   // Abhijeet (founder/admin)
  "u-mgr": "2",     // Vishwas (founder/admin) — sales lead
  "u-priya": "9",   // Nidhi (BDA)
  "u-arjun": "10",  // Hafsa (BDA)
  "u-fatima": "9",  // Nidhi (BDA)
  "u-vikram": "1",  // Abhijeet — tech lead
  "u-aditya": "4",  // Yalaga (tech)
  "u-neha": "5",    // Mois (tech)
  "u-karan": "6",   // Vinay (tech)
  "u-ananya": "2",  // Vishwas — media lead
  "u-rahul": "7",   // Manvith (tech)
  "u-isha": "3",    // Hemanth (tech)
  "u-meera": "1",   // Abhijeet — HR/ops
};

function remap<T>(v: T): T {
  if (typeof v === "string") return (OLD_TO_REAL[v] ?? v) as unknown as T;
  if (Array.isArray(v)) return v.map(remap) as unknown as T;
  if (v && typeof v === "object") {
    const o: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v)) o[k] = remap(val);
    return o as unknown as T;
  }
  return v;
}

// Generic array slices: { store slice → { table, seed } }. Read with the
// generic mapper; seeded (remapped) when the table is empty.
const SEEDABLE: { slice: string; table: string; seed: unknown[] }[] = [
  { slice: "leads", table: "leads", seed: seedLeads },
  { slice: "insights", table: "call_insights", seed: seedInsights },
  { slice: "activities", table: "activities", seed: seedActivities },
  { slice: "audit", table: "app_audit", seed: seedAudit },
  { slice: "calls", table: "calls", seed: seedCalls },
  { slice: "proposals", table: "proposals", seed: seedProposals },
  { slice: "invoices", table: "invoices", seed: seedInvoices },
  { slice: "delivery", table: "delivery_projects", seed: seedDelivery },
  { slice: "payslips", table: "payslips", seed: seedPayslips },
  { slice: "tasks", table: "app_tasks", seed: seedTasks },
  { slice: "projects", table: "projects", seed: seedProjects },
  { slice: "clients", table: "media_clients", seed: seedClients },
  { slice: "campaigns", table: "campaigns", seed: seedCampaigns },
  { slice: "content", table: "content_posts", seed: seedContent },
  { slice: "tickets", table: "tickets", seed: seedTickets },
  { slice: "notifications", table: "notifications", seed: seedNotifications },
  { slice: "announcements", table: "announcements", seed: seedAnnouncements },
  { slice: "auditReports", table: "audit_reports", seed: seedAuditReports },
  { slice: "briefs", table: "briefs", seed: seedBriefs },
  { slice: "forms", table: "forms", seed: seedForms },
  { slice: "formResponses", table: "form_responses", seed: seedFormResponses },
  { slice: "meetings", table: "meetings", seed: seedMeetings },
];

const USER_COLS =
  "id,name,email,phone_number,role,access_level,department_id,manager_id,status," +
  "employment_type,location,avatar_color,monthly_target_calls,monthly_target_revenue," +
  "ctc_annual,salary,bank_last4,leave_balance,login_id,must_change_password," +
  "designation,employee_id,onboarding_date,created_at"; // deliberately excludes password_hash

export interface HydratedData {
  employees: User[];
  [slice: string]: unknown;
}

/**
 * Loads everything from Supabase into store-shaped slices. Returns null if
 * Supabase isn't configured or the core fetch fails (store keeps its seed data).
 */
export async function hydrateAll(): Promise<HydratedData | null> {
  const sb = getSupabase();
  if (!sb) return null;

  try {
    // ── users (source of truth for people) ──
    const { data: userRows, error: uErr } = await sb.from("users").select(USER_COLS);
    if (uErr) throw uErr;
    const employees = (userRows ?? []).map((r) => userToApp(r as unknown as Record<string, unknown>));
    employees.sort((a, b) => Number(a.id) - Number(b.id));
    setUsers(employees); // keep the sync userById() registry fresh

    const out: HydratedData = { employees };

    // ── departments ──
    const { data: deptRows } = await sb.from("departments").select("*");
    out.departments = (deptRows ?? []).map((r) => genericToApp(r as unknown as Record<string, unknown>));
    if (!(out.departments as unknown[]).length) out.departments = seedDepartments;

    // ── real HR tables (never seeded) ──
    const { data: attRows } = await sb.from("attendance").select("*").order("work_date", { ascending: false });
    out.attendance = (attRows ?? []).map((r) => attendanceToApp(r as unknown as Record<string, unknown>));

    const { data: lvRows } = await sb.from("leave_requests").select("*").order("leave_date", { ascending: false });
    out.leaves = (lvRows ?? []).map((r) => leaveToApp(r as unknown as Record<string, unknown>));

    // ── generic seedable slices ──
    for (const { slice, table, seed } of SEEDABLE) {
      const { data: rows, error } = await sb.from(table).select("*");
      if (error) { out[slice] = seed; continue; }
      if (rows && rows.length) {
        out[slice] = (rows as unknown as Record<string, unknown>[]).map((r) => genericToApp(r, table));
      } else if (seed.length) {
        // one-time seed: insert remapped demo rows, then use them
        const remapped = seed.map((x) => remap(x));
        const insertRows = remapped.map((x) => genericToRow(x as Record<string, unknown>, table));
        const { error: insErr } = await sb.from(table).insert(insertRows);
        out[slice] = insErr ? remapped : remapped; // in-memory either way; DB has them if no error
        if (insErr) console.warn(`[hydrate] seed insert failed for ${table}:`, insErr.message);
      } else {
        out[slice] = [];
      }
    }

    // slices with no seed data
    out.milestones = out.milestones ?? [];
    out.payments = out.payments ?? [];
    out.credentialEmails = [];

    // ── company settings + approval rules (single-row blobs) ──
    const { data: coRow } = await sb.from("company_settings").select("data").eq("id", "default").maybeSingle();
    if (coRow?.data) out.company = coRow.data;
    else { await sb.from("company_settings").insert({ id: "default", data: seedCompany }); out.company = seedCompany; }

    const { data: arRow } = await sb.from("approval_rules").select("data").eq("id", "default").maybeSingle();
    if (arRow?.data) out.approvalRules = arRow.data;
    else { await sb.from("approval_rules").insert({ id: "default", data: seedApprovalRules }); out.approvalRules = seedApprovalRules; }

    // ── design/doc key-value slices ──
    const { data: ovRows } = await sb.from("doc_overrides").select("*");
    out.docOverrides = Object.fromEntries((ovRows ?? []).map((r) => [(r as { key: string }).key, (r as { html: string }).html]));

    const { data: tdRows } = await sb.from("template_designs").select("*");
    out.templateDesigns = Object.fromEntries((tdRows ?? []).map((r) => [(r as { doc_type: string }).doc_type, (r as { design: unknown }).design]));

    const { data: ddRows } = await sb.from("doc_designs").select("*");
    out.docDesigns = Object.fromEntries((ddRows ?? []).map((r) => [(r as { key: string }).key, JSON.stringify((r as { design: unknown }).design)]));

    return out;
  } catch (e) {
    console.error("[hydrate] failed:", e);
    return null;
  }
}
