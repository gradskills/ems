// ─────────────────────────────────────────────────────────────
// Who counts as a BDA, and their activity numbers — computed only from what
// was actually logged (calls, activities, leads, proposals). No padding or
// placeholder figures: an empty table shows zeros.
// ─────────────────────────────────────────────────────────────
import type { Activity, Call, Lead, Proposal, User } from "@/lib/types";

export const BDA_DEPT_ID = "dept-bda";

/**
 * Someone in the BDA department who still works here. The legacy `role` field
 * is "bda" for EVERY non-manager employee (tech and media included), so it
 * can't be used to tell who is actually in sales.
 */
export function isBda(u: User): boolean {
  return (
    u.departmentId === BDA_DEPT_ID &&
    u.accessLevel !== "admin" &&
    u.status !== "resigned" &&
    u.status !== "inactive" &&
    u.approvalStatus !== "pending" &&
    u.approvalStatus !== "rejected"
  );
}

export interface BdaStats {
  calls: number;
  connects: number;
  connectRate: number; // 0–100
  followUps: number; // emails, WhatsApps and meetings logged against leads
  proposals: number;
  stageMoves: number;
  openLeads: number;
  openPipeline: number;
  wonCount: number;
  wonValue: number;
}

export interface BdaData {
  leads: Lead[];
  calls: Call[];
  activities: Activity[];
  proposals: Proposal[];
}

const OPEN = (l: Lead) => l.stage !== "won" && l.stage !== "lost" && !l.pooled;
const FOLLOW_UP = new Set<Activity["type"]>(["email", "whatsapp", "meeting"]);

/**
 * One BDA's real numbers. Time-based counts (calls, follow-ups, proposals,
 * stage moves) are limited to `sinceISO` onwards when given; lead/pipeline
 * figures are always the current snapshot.
 */
export function bdaStats(userId: string, data: BdaData, sinceISO?: string): BdaStats {
  const inRange = (at?: string) => !sinceISO || (!!at && at >= sinceISO);
  const calls = data.calls.filter((c) => c.agentId === userId && inRange(c.at));
  const connects = calls.filter((c) => c.disposition === "connected").length;
  const acts = data.activities.filter((a) => a.actorId === userId && inRange(a.at));
  const leads = data.leads.filter((l) => l.ownerId === userId);
  const open = leads.filter(OPEN);
  const won = leads.filter((l) => l.stage === "won");
  return {
    calls: calls.length,
    connects,
    connectRate: calls.length ? Math.round((connects / calls.length) * 100) : 0,
    followUps: acts.filter((a) => FOLLOW_UP.has(a.type)).length,
    proposals: data.proposals.filter((p) => p.ownerId === userId && inRange(p.createdAt)).length,
    stageMoves: acts.filter((a) => a.type === "stage_change").length,
    openLeads: open.length,
    openPipeline: open.reduce((s, l) => s + (l.estimatedValue || 0), 0),
    wonCount: won.length,
    wonValue: won.reduce((s, l) => s + (l.estimatedValue || 0), 0),
  };
}

/** ISO timestamp for the start of the local day `daysAgo` days back (0 = today). */
export function sinceDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

/** ISO timestamp for the start of the current calendar month (local). */
export function startOfMonthISO(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}
