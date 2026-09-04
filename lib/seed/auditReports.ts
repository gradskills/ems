import type { AuditReport } from "@/lib/types";

// Mock data removed — audit reports come from Supabase only.
export const auditReports: AuditReport[] = [];

export function auditReportForLead(leadId: string): AuditReport | undefined {
  return auditReports.find((r) => r.leadId === leadId);
}
