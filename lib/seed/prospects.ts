import type { ProspectAuditResult, DeliveryProject } from "@/lib/types";

// Mock data removed — prospect audits & delivery projects come from Supabase only.
export const prospectAudits: ProspectAuditResult[] = [];
export const deliveryProjects: DeliveryProject[] = [];

export function deliveryById(id: string) {
  return deliveryProjects.find((d) => d.id === id);
}
