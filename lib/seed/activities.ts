import type { Activity } from "@/lib/types";

// Mock data removed — activities come from Supabase only.
export const activities: Activity[] = [];

export function activitiesForLead(leadId: string) {
  return activities.filter((a) => a.leadId === leadId).sort((a, b) => (a.at < b.at ? 1 : -1));
}
