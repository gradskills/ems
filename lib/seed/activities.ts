import type { Activity } from "@/lib/types";
import { daysAgo, hoursAgo } from "./dates";

export const activities: Activity[] = [
  // L-101 Sharma Sweets
  { id: "A-1", leadId: "L-101", type: "call", actorId: "u-priya", at: daysAgo(2), title: "Call — Connected (6m 12s)", body: "Discussed website + Instagram combo for festive season.", meta: { disposition: "connected", duration: 372 } },
  { id: "A-2", leadId: "L-101", type: "note", actorId: "u-priya", at: daysAgo(2), title: "AI summary saved", body: "No website; wants menu + enquiry form live before Diwali. Combo discount requested." },
  { id: "A-3", leadId: "L-101", type: "stage_change", actorId: "u-priya", at: daysAgo(2), title: "Stage: Contacted → Qualified", meta: { from: "contacted", to: "qualified" } },
  { id: "A-4", leadId: "L-101", type: "call", actorId: "u-priya", at: daysAgo(6), title: "Call — Callback (54s)", body: "Busy at shop, asked to call next week.", meta: { disposition: "callback" } },
  { id: "A-5", leadId: "L-101", type: "whatsapp", actorId: "u-priya", at: daysAgo(6), title: "WhatsApp sent", body: "Shared PixelForge intro + 2 sample food websites." },

  // L-102 Green Leaf
  { id: "A-10", leadId: "L-102", type: "call", actorId: "u-priya", at: hoursAgo(3), title: "Call — Connected (4m 49s)", body: "Reviewed Growth proposal; reels shooting question; wants IG + FB." },
  { id: "A-11", leadId: "L-102", type: "proposal", actorId: "u-priya", at: daysAgo(2), title: "Proposal QT/2025-26/0039 sent", body: "Social — Growth, ₹30,000/mo", meta: { proposalId: "P-2" } },
  { id: "A-12", leadId: "L-102", type: "email", actorId: "u-priya", at: hoursAgo(2), title: "Proposal opened by client", body: "Opened 3 times between 9:10–9:45 AM.", meta: { opens: 3 } },

  // L-103 Urban Fitness
  { id: "A-20", leadId: "L-103", type: "call", actorId: "u-priya", at: daysAgo(1), title: "Call — Connected (7m 25s)", body: "Negotiating: E-comm ₹1L + Social Growth. Needs discount approval." },
  { id: "A-21", leadId: "L-103", type: "proposal", actorId: "u-priya", at: daysAgo(4), title: "Proposal QT/2025-26/0036 sent", body: "E-commerce + Social Pro, ₹1,45,000", meta: { proposalId: "P-3" } },
  { id: "A-22", leadId: "L-103", type: "stage_change", actorId: "u-priya", at: daysAgo(1), title: "Stage: Proposal Sent → Negotiation", meta: { from: "proposal_sent", to: "negotiation" } },

  // L-104 Kadam Interiors (new)
  { id: "A-30", leadId: "L-104", type: "note", actorId: "u-priya", at: hoursAgo(4), title: "Lead created from Google Maps", body: "Interior designer, no website, active on Instagram. Good website candidate." },

  // L-105 Blossom (going cold)
  { id: "A-40", leadId: "L-105", type: "call", actorId: "u-priya", at: daysAgo(13), title: "Call — Connected (3m 02s)", body: "Interested in social but wanted to think. No follow-up since." },

  // L-107 won — with admin edit example
  { id: "A-50", leadId: "L-107", type: "stage_change", actorId: "u-priya", at: daysAgo(3), title: "Stage: Negotiation → Won", meta: { from: "negotiation", to: "won" } },
  { id: "A-51", leadId: "L-107", type: "field_edit", actorId: "u-admin", at: daysAgo(2), title: "Admin edited: Estimated Value", body: "Corrected value ₹1,50,000 → ₹1,75,000. Reason: client added AMC to the deal.", meta: { field: "estimatedValue", by: "admin" } },
];

export function activitiesForLead(leadId: string) {
  return activities.filter((a) => a.leadId === leadId).sort((a, b) => (a.at < b.at ? 1 : -1));
}
