import type { AuditReport, AuditReportItem } from "@/lib/types";
import { daysAgo, hoursAgo } from "@/lib/seed/dates";

// a reusable set of digital-health checks
function items(profile: "no_web" | "weak" | "decent"): AuditReportItem[] {
  const base: Record<string, AuditReportItem> = {
    website: { key: "website", label: "Website", status: "fail", detail: "No website found — only a Justdial listing.", recommendation: "Ship a 5-page site with enquiry capture." },
    ssl: { key: "ssl", label: "HTTPS / SSL", status: "fail", detail: "Not applicable — no site.", recommendation: "Include SSL + hosting in the build." },
    mobile: { key: "mobile", label: "Mobile experience", status: "warn", detail: "Existing page not mobile-optimised.", recommendation: "Responsive-first rebuild." },
    seo: { key: "seo", label: "Google visibility", status: "warn", detail: "Ranks page 3 for '{city} + category'.", recommendation: "On-page SEO + GMB optimisation." },
    gmb: { key: "gmb", label: "Google Business", status: "warn", detail: "Unclaimed listing, 3.9★ (17 reviews).", recommendation: "Claim + review-generation flow." },
    social: { key: "social", label: "Social presence", status: "fail", detail: "Instagram inactive for 4 months.", recommendation: "Content retainer, 16 posts/mo." },
    speed: { key: "speed", label: "Page speed", status: "warn", detail: "LCP 4.8s on 4G.", recommendation: "Image + hosting optimisation." },
  };
  if (profile === "no_web") return [base.website, base.ssl, base.gmb, base.social];
  if (profile === "weak") return [base.mobile, base.seo, base.gmb, base.social, base.speed];
  return [
    { ...base.seo, status: "pass", detail: "Ranks top-3 for core terms." },
    { ...base.gmb, status: "warn", detail: "4.4★ but slow to respond." },
    { ...base.social, status: "warn", detail: "Posts twice a month, low reach." },
    { ...base.speed, status: "pass", detail: "LCP 2.1s — healthy." },
  ];
}

export const auditReports: AuditReport[] = [
  {
    id: "AR-1",
    leadId: "L-104",
    company: "Kadam Interiors",
    status: "need_to_create",
    ownerId: "u-priya",
    createdAt: daysAgo(1),
    score: 0,
    summary: "",
    items: [],
  },
  {
    id: "AR-2",
    leadId: "L-101",
    company: "Sharma Sweets & Caterers",
    status: "draft",
    ownerId: "u-priya",
    createdAt: daysAgo(2),
    score: 38,
    summary: "Strong walk-in footfall but almost no digital funnel — a website + social retainer would capture demand they currently lose to Zomato/Swiggy competitors.",
    opener: "Hi Rajesh — I looked up Sharma Sweets online and noticed you don't have a website yet, while two nearby sweet shops rank on page one. Can I show you what you're missing?",
    items: items("no_web"),
  },
  {
    id: "AR-3",
    leadId: "L-102",
    company: "Green Leaf Ayurveda",
    status: "pending_verification",
    ownerId: "u-priya",
    createdAt: daysAgo(3),
    score: 45,
    summary: "Decent brand recall locally but the site is slow, not mobile-friendly, and social is inconsistent — a combo (site refresh + social + ads) fits their growth goal.",
    opener: "Dr. Menon, your clinic has a great reputation but your site scores 45/100 on digital health — mostly speed and mobile. Worth a 10-minute walkthrough?",
    items: items("weak"),
    verifiedById: undefined,
  },
  {
    id: "AR-4",
    leadId: "L-103",
    company: "Urban Fitness Studio",
    status: "sent",
    ownerId: "u-priya",
    createdAt: daysAgo(5),
    sentAt: daysAgo(4),
    score: 52,
    summary: "Active on Instagram but no lead capture and a broken booking link — quick wins available.",
    opener: "Your Insta is buzzing but the link in bio is broken — you're leaking sign-ups daily. Let me show you the fix.",
    items: items("weak"),
    verifiedById: "u-mgr",
  },
  {
    id: "AR-5",
    leadId: "L-201",
    company: "Nair Dental Care",
    status: "opened",
    ownerId: "u-arjun",
    createdAt: daysAgo(6),
    sentAt: daysAgo(5),
    score: 60,
    summary: "Good fundamentals, weak review-generation and GMB response time. A light retainer would lift local rankings.",
    opener: "Dr. Nair, you're close to ranking #1 locally — a couple of tweaks to reviews and GMB would get you there.",
    items: items("decent"),
    verifiedById: "u-mgr",
  },
  {
    id: "AR-6",
    leadId: "L-107",
    company: "Coastal Seafood Exports",
    status: "accepted",
    ownerId: "u-priya",
    createdAt: daysAgo(14),
    sentAt: daysAgo(12),
    decidedAt: daysAgo(8),
    score: 41,
    summary: "Export-ready product, zero digital presence for domestic B2B. Accepted the audit and moved to proposal.",
    opener: "You export beautifully but domestic buyers can't find you online. Let's fix that.",
    items: items("no_web"),
    verifiedById: "u-mgr",
  },
  {
    id: "AR-7",
    leadId: "L-108",
    company: "Trendy Threads Boutique",
    status: "rejected",
    ownerId: "u-priya",
    createdAt: daysAgo(20),
    sentAt: daysAgo(18),
    decidedAt: hoursAgo(30),
    score: 55,
    summary: "Owner felt current agency already covers social; rejected the audit. Lead marked lost.",
    opener: "Your feed looks great — but reach dropped 30% this quarter. Want a second opinion?",
    items: items("decent"),
    verifiedById: "u-mgr",
  },
];

export function auditReportForLead(leadId: string): AuditReport | undefined {
  return auditReports.find((r) => r.leadId === leadId);
}
