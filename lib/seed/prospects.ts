import type { ProspectAuditResult, DeliveryProject } from "@/lib/types";
import { daysAgo, daysFromNow } from "./dates";

// Pre-computed prospect audits — the "reason to call" engine.
// In production these are generated live from a URL/company name.
export const prospectAudits: ProspectAuditResult[] = [
  {
    id: "PA-1",
    company: "Sharma Sweets & Caterers",
    url: undefined,
    createdAt: daysAgo(9),
    score: 92,
    opener:
      "\"I noticed Sharma Sweets doesn't have a website yet — during Diwali most customers search online before ordering. You might be losing orders to shops that show up on Google.\"",
    checks: [
      { key: "website", label: "Website", status: "fail", detail: "No website found — customers can't find a menu or order online" },
      { key: "ssl", label: "SSL / HTTPS", status: "fail", detail: "N/A — no website" },
      { key: "gmb", label: "Google Business listing", status: "warn", detail: "Listing exists but unclaimed, no menu, 3.9★ with unanswered reviews" },
      { key: "instagram", label: "Instagram", status: "pass", detail: "Active — posts 2–3× per week, 4.2k followers" },
      { key: "mobile", label: "Mobile presence", status: "fail", detail: "No mobile-friendly ordering option" },
    ],
  },
  {
    id: "PA-2",
    company: "Kadam Interiors",
    createdAt: daysAgo(0),
    score: 84,
    opener:
      "\"Your Instagram portfolio looks great, but there's no website linked — interior clients usually want to browse a full project gallery before enquiring. A simple portfolio site could convert those followers.\"",
    checks: [
      { key: "website", label: "Website", status: "fail", detail: "No website — Instagram bio links to a WhatsApp number only" },
      { key: "instagram", label: "Instagram", status: "pass", detail: "Strong visual portfolio, 8.1k followers, high engagement" },
      { key: "gmb", label: "Google Business listing", status: "warn", detail: "Basic listing, no photos, no website link" },
      { key: "seo", label: "Search visibility", status: "fail", detail: "Does not appear for 'interior designer Pune'" },
    ],
  },
  {
    id: "PA-3",
    company: "Green Leaf Ayurveda",
    url: "greenleafayurveda.example",
    createdAt: daysAgo(14),
    score: 61,
    opener:
      "\"Your site is solid, but it hasn't been updated in a while and isn't mobile-optimised — and your Instagram has been quiet for 3 weeks. A social retainer would keep you visible where your patients actually spend time.\"",
    checks: [
      { key: "website", label: "Website", status: "pass", detail: "Website exists and loads" },
      { key: "ssl", label: "SSL / HTTPS", status: "pass", detail: "Valid SSL certificate" },
      { key: "mobile", label: "Mobile-friendly", status: "warn", detail: "Layout breaks on small screens; slow LCP (4.1s)" },
      { key: "instagram", label: "Instagram", status: "warn", detail: "Last post 21 days ago — losing momentum" },
      { key: "gmb", label: "Google Business listing", status: "pass", detail: "Claimed, 4.6★, regularly reviewed" },
    ],
  },
];

// ── Delivery projects (won deals in production) ──
export const deliveryProjects: DeliveryProject[] = [
  {
    id: "DP-1",
    leadId: "L-107",
    company: "Coastal Seafood Exports",
    type: "combo",
    stage: "content",
    startedAt: daysAgo(3),
    ownerId: "u-priya",
    retainer: true,
    retainerEndsAt: daysFromNow(27),
    healthScore: 82,
    onboarding: [
      { id: "ob-1", label: "Brand assets received (logo, colours)", done: true },
      { id: "ob-2", label: "Social account access granted", done: true },
      { id: "ob-3", label: "Kickoff call completed", done: true },
      { id: "ob-4", label: "Content questionnaire filled", done: false },
      { id: "ob-5", label: "Hosting / domain access", done: false },
    ],
    deliverables: [
      { id: "d-1", label: "Feed posts", soldQty: 24, deliveredQty: 15, approvedByClient: true, period: "Aug 2025" },
      { id: "d-2", label: "Reels", soldQty: 12, deliveredQty: 6, approvedByClient: false, period: "Aug 2025" },
      { id: "d-3", label: "Website pages", soldQty: 6, deliveredQty: 4, approvedByClient: false },
    ],
  },
  {
    id: "DP-2",
    leadId: "L-302",
    company: "Lakshmi Textiles",
    type: "website",
    stage: "review",
    startedAt: daysAgo(18),
    ownerId: "u-fatima",
    retainer: false,
    healthScore: 68,
    onboarding: [
      { id: "ob-1", label: "Brand assets received", done: true },
      { id: "ob-2", label: "Content provided", done: true },
      { id: "ob-3", label: "Kickoff call completed", done: true },
    ],
    deliverables: [
      { id: "d-1", label: "Website pages", soldQty: 5, deliveredQty: 5, approvedByClient: false },
      { id: "d-2", label: "Revision rounds", soldQty: 3, deliveredQty: 4, approvedByClient: false }, // over — scope creep
    ],
  },
];

export function deliveryById(id: string) {
  return deliveryProjects.find((d) => d.id === id);
}
