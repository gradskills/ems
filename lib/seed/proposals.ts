import type { Proposal, Invoice } from "@/lib/types";
import { daysAgo, daysFromNow } from "./dates";

export const proposals: Proposal[] = [
  {
    id: "P-2",
    number: "QT/2025-26/0039",
    leadId: "L-102",
    ownerId: "u-priya",
    version: 1,
    status: "opened",
    createdAt: daysAgo(2),
    validTill: daysFromNow(12),
    openCount: 3,
    items: [
      { packageId: "pkg-smm-growth", name: "Social — Growth", billingType: "retainer", sacCode: "998361", qty: 1, unitPrice: 30000, discountPct: 0, gstRate: 18 },
    ],
    approval: { required: false },
    emailDraft:
      "Dear Dr. Meera,\n\nThank you for your time today. As discussed, here is our Social — Growth proposal for Green Leaf Ayurveda covering Instagram + Facebook: 16 posts and 8 reels per month, story designs, and a bi-weekly report at ₹30,000/month.\n\nOn your reels question — scripting and editing are included; a monthly shoot day can be arranged at a small additional cost. I've attached a reels sample from a wellness client.\n\nHappy to start whenever you and your partner are ready.\n\nWarm regards,\nPriya Sharma\nPixelForge Digital",
  },
  {
    id: "P-3",
    number: "QT/2025-26/0036",
    leadId: "L-103",
    ownerId: "u-priya",
    version: 1,
    status: "opened",
    createdAt: daysAgo(4),
    validTill: daysFromNow(10),
    openCount: 5,
    items: [
      { packageId: "pkg-web-ecom", name: "Website — E-commerce", billingType: "one_time", sacCode: "998314", qty: 1, unitPrice: 120000, discountPct: 0, gstRate: 18 },
      { packageId: "pkg-smm-pro", name: "Social — Pro", billingType: "retainer", sacCode: "998361", qty: 1, unitPrice: 55000, discountPct: 55, gstRate: 18 },
    ],
    approval: { required: false },
  },
  {
    id: "P-1",
    number: "QT/2025-26/0041",
    leadId: "L-101",
    ownerId: "u-priya",
    version: 1,
    status: "draft",
    createdAt: daysAgo(0),
    validTill: daysFromNow(14),
    openCount: 0,
    items: [
      { packageId: "pkg-web-5page", name: "Website — 5 Page", billingType: "one_time", sacCode: "998314", qty: 1, unitPrice: 55000, discountPct: 10, gstRate: 18 },
      { packageId: "pkg-smm-starter", name: "Social — Starter", billingType: "retainer", sacCode: "998361", qty: 1, unitPrice: 15000, discountPct: 0, gstRate: 18 },
    ],
    approval: { required: true, reason: "Combo discount 10% > 8% threshold" },
  },
  {
    id: "P-4",
    number: "QT/2025-26/0030",
    leadId: "L-201",
    ownerId: "u-arjun",
    version: 1,
    status: "sent",
    createdAt: daysAgo(2),
    validTill: daysFromNow(13),
    openCount: 0,
    items: [
      { packageId: "pkg-web-5page", name: "Website — 5 Page", billingType: "one_time", sacCode: "998314", qty: 1, unitPrice: 55000, discountPct: 0, gstRate: 18 },
    ],
    approval: { required: false },
  },
];

export function proposalById(id: string) {
  return proposals.find((p) => p.id === id);
}
export function proposalsForLead(leadId: string) {
  return proposals.filter((p) => p.leadId === leadId);
}

// ── Invoices (shown with sample GST + TDS math) ──
export const invoices: Invoice[] = [
  {
    id: "INV-1",
    number: "INV/2025-26/0007",
    leadId: "L-107",
    company: "Coastal Seafood Exports",
    issuedAt: daysAgo(3),
    dueAt: daysFromNow(12),
    status: "partially_paid",
    subtotal: 100000,
    gst: 18000,
    tdsSection: "194J",
    tdsAmount: 10000,
    total: 118000,
    received: 50000,
    milestone: "50% advance (website)",
    recurring: false,
  },
  {
    id: "INV-2",
    number: "INV/2025-26/0006",
    leadId: "L-302",
    company: "Lakshmi Textiles",
    issuedAt: daysAgo(20),
    dueAt: daysAgo(5),
    status: "overdue",
    subtotal: 55000,
    gst: 9900,
    tdsSection: "194J",
    tdsAmount: 5500,
    total: 64900,
    received: 0,
    milestone: "Full (website)",
    recurring: false,
  },
  {
    id: "INV-3",
    number: "INV/2025-26/0008",
    leadId: "L-107",
    company: "Coastal Seafood Exports",
    issuedAt: daysAgo(1),
    dueAt: daysFromNow(29),
    status: "sent",
    subtotal: 30000,
    gst: 5400,
    tdsSection: "194J",
    tdsAmount: 3000,
    total: 35400,
    received: 0,
    milestone: "Aug retainer (social)",
    recurring: true,
  },
];

export function invoicesForLead(leadId: string) {
  return invoices.filter((i) => i.leadId === leadId);
}
