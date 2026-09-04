import type { Brief } from "@/lib/types";

// Mock data removed — briefs come from Supabase only.
export const briefs: Brief[] = [];

export function briefsForLead(leadId: string): Brief[] {
  return briefs.filter((b) => b.leadId === leadId).sort((a, b) => (a.at < b.at ? 1 : -1));
}
