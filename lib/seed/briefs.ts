import type { Brief } from "@/lib/types";
import { daysAgo, hoursAgo } from "@/lib/seed/dates";

export const briefs: Brief[] = [
  { id: "BR-1", leadId: "L-101", authorId: "u-priya", at: daysAgo(3), text: "First call with Rajesh — walk-in footfall is strong but they lose online orders to Zomato. Keen on a website + Instagram. Wants to see a quotation before Diwali." },
  { id: "BR-2", leadId: "L-101", authorId: "u-mgr", at: daysAgo(2), text: "Coached Priya to bundle a landing page + social starter. Owner is price-sensitive — keep combo under ₹75k." },
  { id: "BR-3", leadId: "L-102", authorId: "u-priya", at: hoursAgo(30), text: "Dr. Menon liked the audit. Concerned about reels production — clarified scripting + editing are included, shoot day optional add-on." },
  { id: "BR-4", leadId: "L-103", authorId: "u-priya", at: daysAgo(1), text: "Urban Fitness ready to move — negotiating on the e-commerce build. Asked for a small discount; escalated to manager." },
];

export function briefsForLead(leadId: string): Brief[] {
  return briefs.filter((b) => b.leadId === leadId).sort((a, b) => (a.at < b.at ? 1 : -1));
}
