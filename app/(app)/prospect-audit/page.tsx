"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApp } from "@/lib/store";
import { prospectAudits } from "@/lib/seed/prospects";
import type { ProspectAuditResult, ProspectCheck, AuditArea } from "@/lib/types";
import { Card, Button, Badge, ScoreRing } from "@/components/ui/primitives";
import { Search, Globe, ShieldCheck, Smartphone, MapPin, AtSign, Gauge, Loader2, CircleCheck, CircleAlert, CircleX, Sparkles, Flame, Building2, Star, FileText } from "lucide-react";

const checkIcon: Record<string, typeof Globe> = {
  website: Globe,
  ssl: ShieldCheck,
  mobile: Smartphone,
  gmb: MapPin,
  linkedin: Building2,
  instagram: AtSign,
  seo: Search,
  reviews: Star,
  default: Gauge,
};

export default function ProspectAuditPage() {
  return (
    <Suspense fallback={null}>
      <Audit />
    </Suspense>
  );
}

function Audit() {
  const sp = useSearchParams();
  const router = useRouter();
  const leads = useApp((s) => s.leads);
  const upsertAuditReport = useApp((s) => s.upsertAuditReport);
  const [query, setQuery] = useState(sp.get("company") ?? "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProspectAuditResult | null>(
    sp.get("company") ? prospectAudits.find((p) => p.company.toLowerCase().includes(sp.get("company")!.toLowerCase())) ?? null : null
  );

  function run(q: string = query) {
    const term = q.trim();
    if (!term) return;
    setQuery(q);
    setLoading(true);
    setResult(null);
    setTimeout(() => {
      const match =
        prospectAudits.find((p) => p.company.toLowerCase().includes(term.toLowerCase()) || (p.url && term.toLowerCase().includes(p.url.split(".")[0]))) ??
        syntheticAudit(term);
      setResult(match);
      setLoading(false);
    }, 1400);
  }

  // Turn the scan into an editable audit report (existing /audit-reports page).
  function generateReport() {
    if (!result) return;
    const company = result.company;
    // Link to a matching lead if one exists, otherwise a stable prospect id so
    // re-generating for the same company updates the same report.
    const lead = leads.find((l) => l.company.toLowerCase() === company.toLowerCase());
    const slug = company.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const leadId = lead?.id ?? `pa-${slug}`;
    const areas: AuditArea[] = result.checks.map((c) => {
      const score = c.status === "pass" ? 84 : c.status === "warn" ? 56 : 28;
      return {
        key: c.key,
        name: c.label,
        score,
        status: c.status === "pass" ? "Strong" : c.status === "warn" ? "Average" : "Needs Work",
        priority: c.status === "fail" ? "High" : c.status === "warn" ? "Medium" : "Low",
        summary: c.detail,
        working: c.status === "pass" ? [c.detail] : [],
        issues: c.status !== "pass" ? [c.detail] : [],
        recommendations: c.status !== "pass" ? [recommend(c.key)] : [],
      };
    });
    const health = Math.round(areas.reduce((s, a) => s + a.score, 0) / Math.max(1, areas.length));
    const gaps = result.checks.filter((c) => c.status !== "pass").length;
    const id = upsertAuditReport(leadId, {
      company,
      score: health,
      overallScore: health,
      summary: `Digital-health audit for ${company}. We reviewed the website, Google Business, social profiles, LinkedIn and search visibility across public sources. ${gaps} area${gaps === 1 ? "" : "s"} need attention.`,
      takeaway: result.opener,
      overallOpportunity: `Closing these ${gaps} gap${gaps === 1 ? "" : "s"} would lift ${company}'s visibility and inbound enquiries.`,
      opener: result.opener,
      areas,
    });
    router.push(`/audit-reports/${id}`);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Sparkles size={22} className="text-[var(--primary)]" /> Prospect audit
        </h1>
        <p className="text-sm text-[var(--muted)]">
          Check a business&apos;s digital health before you call — turn gaps into a specific opening line.
        </p>
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-2)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && run()}
              placeholder="Company name or website URL…"
              className="h-11 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] pl-9 pr-3 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]"
            />
          </div>
          <Button size="lg" onClick={() => run()} disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} Audit
          </Button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="text-[11px] text-[var(--muted-2)]">Try:</span>
          {prospectAudits.map((p) => (
            <button key={p.id} onClick={() => run(p.company)} className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[11px] hover:bg-[var(--border)]">
              {p.company}
            </button>
          ))}
        </div>
      </Card>

      {loading && (
        <Card className="flex flex-col items-center gap-3 py-14 text-center">
          <Loader2 size={32} className="animate-spin text-[var(--primary)]" />
          <div className="text-sm font-medium">Scanning digital footprint…</div>
          <div className="text-xs text-[var(--muted)]">Website · SSL · mobile · Google · LinkedIn · social · reviews · SEO</div>
        </Card>
      )}

      {result && !loading && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <ScoreRing score={result.score} size={56} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold">{result.company}</h2>
                    {result.score >= 80 && <Badge color="danger" dot><Flame size={11} /> Hot prospect</Badge>}
                  </div>
                  <p className="text-xs text-[var(--muted)]">Opportunity score — higher means they need us more</p>
                </div>
                <Button onClick={generateReport}><FileText size={16} /> Generate audit report</Button>
              </div>

              <div className="mt-4 space-y-2">
                {result.checks.map((c) => (
                  <CheckRow key={c.key} check={c} company={result.company} />
                ))}
              </div>

              <p className="mt-3 text-[11px] text-[var(--muted-2)]">
                This is a heuristic scan for the prototype — it doesn&apos;t crawl live sites. Hit <span className="font-medium text-[var(--primary)]">Verify ↗</span> on any row to open the real Google / Maps / LinkedIn / Instagram lookup for this business and confirm the footprint yourself.
              </p>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="border border-[var(--primary-soft)] bg-[var(--primary-soft)]/40 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--primary)]">
                <Sparkles size={15} /> Suggested opener
              </div>
              <p className="text-sm italic leading-relaxed">{result.opener}</p>
              <p className="mt-2 text-[11px] text-[var(--muted)]">Lead with a specific, factual observation — it beats a generic pitch every time.</p>
            </Card>
            <Card className="p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Recommended pitch</div>
              <ul className="mt-2 space-y-1.5 text-sm">
                {result.checks.filter((c) => c.status === "fail").map((c) => (
                  <li key={c.key} className="flex items-center gap-2"><CircleX size={14} className="text-[var(--danger)]" /> {recommend(c.key)}</li>
                ))}
                {result.checks.filter((c) => c.status === "warn").map((c) => (
                  <li key={c.key} className="flex items-center gap-2"><CircleAlert size={14} className="text-[var(--warning)]" /> {recommend(c.key)}</li>
                ))}
                {result.checks.every((c) => c.status === "pass") && (
                  <li className="flex items-center gap-2 text-[var(--muted)]"><CircleCheck size={14} className="text-[var(--success)]" /> Strong footprint — pitch growth & retainer services.</li>
                )}
              </ul>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function CheckRow({ check, company }: { check: ProspectCheck; company: string }) {
  const Icon = checkIcon[check.key] ?? checkIcon.default;
  const statusMeta = {
    pass: { color: "var(--success)", Comp: CircleCheck },
    warn: { color: "var(--warning)", Comp: CircleAlert },
    fail: { color: "var(--danger)", Comp: CircleX },
  }[check.status];
  const S = statusMeta.Comp;
  const url = verifyUrl(check.key, company);
  return (
    <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] p-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--muted)]">
        <Icon size={17} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{check.label}</div>
        <div className="text-xs text-[var(--muted)]">{check.detail}</div>
      </div>
      <a href={url} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded-md px-2 py-1 text-[11px] font-medium text-[var(--primary)] hover:bg-[var(--primary-soft)]">
        Verify ↗
      </a>
      <S size={20} style={{ color: statusMeta.color }} className="shrink-0" />
    </div>
  );
}

// Real, clickable lookups so a BDA can confirm the footprint themselves.
function verifyUrl(key: string, company: string): string {
  const q = encodeURIComponent(company.trim());
  switch (key) {
    case "gmb": return `https://www.google.com/maps/search/${q}`;
    case "linkedin": return `https://www.linkedin.com/search/results/companies/?keywords=${q}`;
    case "instagram": return `https://www.google.com/search?q=${q}%20instagram`;
    case "reviews": return `https://www.google.com/search?q=${q}%20reviews`;
    default: return `https://www.google.com/search?q=${q}`; // website / ssl / mobile / seo
  }
}

function recommend(key: string): string {
  return {
    website: "Pitch a website — Landing or 5-page",
    ssl: "Flag missing HTTPS — trust & SEO risk",
    mobile: "Offer a mobile-optimised rebuild",
    gmb: "Google Business optimisation add-on",
    linkedin: "Build a company LinkedIn presence",
    instagram: "Pitch a Social retainer to stay active",
    seo: "On-page SEO to show up in local search",
    reviews: "Reputation & review-generation service",
  }[key] ?? "Improvement opportunity";
}

// ── Deterministic, per-company synthetic audit ─────────────────────────────
// The prototype can't crawl live sources, so results are derived deterministically
// from the company name — different businesses get different, plausible signals
// across website, SSL, mobile, Google, LinkedIn, Instagram, SEO and reviews.
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

type Src = { key: string; label: string; pass: string; warn: string; fail: string };
const SOURCES: Src[] = [
  { key: "website", label: "Website", pass: "Live, modern website found", warn: "Website is dated / slow to load", fail: "No website found for this business" },
  { key: "ssl", label: "SSL / HTTPS", pass: "Secure — valid HTTPS certificate", warn: "Certificate expiring soon", fail: "Site not served over HTTPS" },
  { key: "mobile", label: "Mobile experience", pass: "Mobile-friendly and responsive", warn: "Usable but not fully optimised", fail: "Not mobile-optimised" },
  { key: "gmb", label: "Google Business listing", pass: "Verified & well-maintained listing", warn: "Unclaimed or incomplete listing", fail: "No Google Business presence" },
  { key: "linkedin", label: "LinkedIn presence", pass: "Active company page with updates", warn: "Page exists but rarely posts", fail: "No LinkedIn company page found" },
  { key: "instagram", label: "Instagram", pass: "Active, consistent posting", warn: "Low posting frequency", fail: "No active Instagram found" },
  { key: "seo", label: "Search visibility", pass: "Ranks for key local terms", warn: "Thin ranking on a few terms", fail: "Not ranking for key local terms" },
  { key: "reviews", label: "Online reviews", pass: "Strong rating with recent reviews", warn: "Few or ageing reviews", fail: "Little to no review presence" },
];

function syntheticAudit(company: string): ProspectAuditResult {
  const h = hashStr(company.toLowerCase());
  const checks: ProspectCheck[] = SOURCES.map((src, i) => {
    // two deterministic bits per source decide pass / warn / fail (skewed toward gaps)
    const v = (h >> (i * 2)) & 0b11;
    const status: ProspectCheck["status"] = v === 0 ? "pass" : v === 1 ? "pass" : v === 2 ? "warn" : "fail";
    return { key: src.key, label: src.label, status, detail: src[status] };
  });
  const fails = checks.filter((c) => c.status === "fail").length;
  const warns = checks.filter((c) => c.status === "warn").length;
  // more gaps → higher opportunity score
  const score = Math.max(28, Math.min(96, 34 + fails * 11 + warns * 5 + (h % 7)));
  const worst = checks.find((c) => c.status === "fail") ?? checks.find((c) => c.status === "warn");
  const opener = worst
    ? worstOpener(company, worst)
    : `"I had a look at ${company} online — your digital footprint is solid. I work with businesses like yours to turn that into more enquiries; worth a quick chat?"`;
  return {
    id: "synthetic",
    company,
    createdAt: new Date().toISOString(),
    score,
    opener,
    checks,
  };
}

function worstOpener(company: string, c: ProspectCheck): string {
  const map: Record<string, string> = {
    website: `couldn't find a proper website — most customers check online before they buy, so you may be losing enquiries to competitors who show up on Google`,
    ssl: `noticed your site isn't secured with HTTPS — browsers flag that to visitors and it quietly hurts your Google ranking`,
    mobile: `your site was hard to use on my phone — most local searches happen on mobile, so that's likely costing you enquiries`,
    gmb: `couldn't find a proper Google Business listing — that's usually the first thing a local customer sees before they call`,
    linkedin: `couldn't find a company LinkedIn page — for B2B that's often where buyers check credibility before reaching out`,
    instagram: `your Instagram looks quite inactive — regular content keeps you top-of-mind with the customers already following you`,
    seo: `you're not showing up for the searches your customers are making — that traffic is going straight to competitors`,
    reviews: `there aren't many reviews online — a few recent ones make a big difference to whether new customers trust you`,
  };
  return `"I had a quick look at ${company} online and ${map[c.key] ?? "spotted a few gaps"} — happy to show you what I found."`;
}
