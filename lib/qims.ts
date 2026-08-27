import type { Proposal, ProposalItem, InvoiceStatus } from "@/lib/types";

// ── proposal / quotation money math ──
export function proposalTotals(items: ProposalItem[]) {
  let subtotal = 0;
  let gst = 0;
  for (const i of items) {
    const base = i.qty * i.unitPrice * (1 - i.discountPct / 100);
    subtotal += base;
    gst += base * (i.gstRate / 100);
  }
  return { subtotal, gst, total: subtotal + gst };
}

export const proposalStatusColor: Record<Proposal["status"], "slate" | "primary" | "warning" | "success" | "danger" | "info"> = {
  draft: "slate",
  pending_approval: "warning",
  sent: "primary",
  opened: "info",
  accepted: "success",
  rejected: "danger",
  expired: "slate",
};

export const invoiceStatusColor: Record<InvoiceStatus, "slate" | "primary" | "warning" | "success" | "danger" | "info"> = {
  draft: "slate",
  issued: "info",
  sent: "primary",
  partially_paid: "warning",
  paid: "success",
  overdue: "danger",
};

export function proposalReviewLabel(p: Proposal): { label: string; color: "slate" | "primary" | "warning" | "success" | "danger" | "info" } {
  if (p.customer?.decision === "accepted") return { label: "Client accepted", color: "success" };
  if (p.customer?.decision === "rejected") return { label: "Client rejected", color: "danger" };
  if (p.reviewStatus === "shared") return { label: "Shared with client", color: "primary" };
  if (p.reviewStatus === "verified") return { label: "Verified — ready to share", color: "success" };
  if (p.reviewStatus === "internal_review") return { label: "In internal review", color: "warning" };
  return { label: "Draft", color: "slate" };
}
