import type { Proposal, Invoice } from "@/lib/types";

// Mock data removed — proposals & invoices come from Supabase only.
export const proposals: Proposal[] = [];
export const invoices: Invoice[] = [];

export function proposalById(id: string) {
  return proposals.find((p) => p.id === id);
}
export function proposalsForLead(leadId: string) {
  return proposals.filter((p) => p.leadId === leadId);
}
export function invoicesForLead(leadId: string) {
  return invoices.filter((i) => i.leadId === leadId);
}
