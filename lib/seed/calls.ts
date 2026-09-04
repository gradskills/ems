import type { Call, Transcript, CallInsight } from "@/lib/types";

// Mock data removed — calls / transcripts / AI insights come from Supabase only.
export const calls: Call[] = [];
export const transcripts: Transcript[] = [];
export const callInsights: CallInsight[] = [];

export function callsForLead(leadId: string) {
  return calls.filter((c) => c.leadId === leadId).sort((a, b) => (a.at < b.at ? 1 : -1));
}
export function transcriptById(id?: string) {
  return transcripts.find((t) => t.id === id);
}
export function insightForCall(callId: string) {
  return callInsights.find((i) => i.callId === callId);
}
export function latestInsightForLead(leadId: string) {
  return callInsights.filter((i) => i.leadId === leadId).slice(-1)[0];
}
