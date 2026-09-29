"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApp } from "@/lib/store";
import type { ProspectAuditResult, ProspectCheck, AuditArea, Lead } from "@/lib/types";
import { Card, Button, Badge, ScoreRing } from "@/components/ui/primitives";
import {
  Search, Globe, ShieldCheck, Smartphone, MapPin, AtSign, Gauge, Loader2, CircleCheck, CircleAlert, CircleX, CircleHelp,
  Sparkles, Flame, Building2, Star, FileText, BarChart3, MessageCircle, ExternalLink, Info,
} from "lucide-react";

const checkIcon: Record<string, typeof Globe> = {
  website: Globe,
  ssl: ShieldCheck,
  mobile: Smartphone,
  seo: Search,
  tracking: BarChart3,
  contact: MessageCircle,
  gmb: MapPin,
  linkedin: Building2,
  instagram: AtSign,
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

type Extra = { website?: string; city?: string; instagram?: string };

type Outcome = { result?: ProspectAuditResult; error?: string };

// Calls the live scanner (no React state here — callers apply the outcome).
async function requestAudit(company: string, extra: Extra): Promise<Outcome> {
  try {
    const res = await fetch("/api/prospect-audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company, ...extra }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) return { error: data.error ?? "The audit failed — please try again." };
    return { result: data.result as ProspectAuditResult };
  } catch {
    return { error: "Couldn't reach the audit service. Check your connection and try again." };
  }
}

function matchLead(leads: Lead[], term: string): Lead | undefined {
  const t = term.trim().toLowerCase();
  return leads.find((l) => l.company.trim().toLowerCase() === t);
}

function Audit() {
  const sp = useSearchParams();
  const router = useRouter();
  const leads = useApp((s) => s.leads);
  const upsertAuditReport = useApp((s) => s.upsertAuditReport);
  const initialCompany = sp.get("company") ?? "";
  const [query, setQuery] = useState(initialCompany);
  const [website, setWebsite] = useState(sp.get("website") ?? "");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(!!initialCompany);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ProspectAuditResult | null>(null);

  function apply(o: Outcome) {
    setResult(o.result ?? null);
    setError(o.error ?? "");
    setLoading(false);
  }

  function extrasFor(term: string): Extra {
    // details already on the lead fill in anything not typed here
    const lead = matchLead(leads, term);
    return {
      website: website.trim() || lead?.website || undefined,
      city: city.trim() || lead?.city || undefined,
      instagram: lead?.instagram || undefined,
    };
  }

  function run(q: string = query) {
    const term = q.trim();
    if (!term) return;
    setQuery(q);
    setLoading(true);
    setError("");
    setResult(null);
    void requestAudit(term, extrasFor(term)).then(apply);
  }

  // opened from a lead (/prospect-audit?company=…) → scan straight away
  useEffect(() => {
    if (initialCompany) void requestAudit(initialCompany, extrasFor(initialCompany)).then(apply);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Turn the scan into an editable audit report (existing /audit-reports page).
  function generateReport() {
    if (!result) return;
    const company = result.company;
    // Link to a matching lead if one exists, otherwise a stable prospect id so
    // re-generating for the same company updates the same report.
    const lead = matchLead(leads, company) ?? matchLead(leads, query);
    const slug = company.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const leadId = lead?.id ?? `pa-${slug}`;
    const checked = result.checks.filter((c) => c.status !== "unknown");
    const areas: AuditArea[] = checked.map((c) => {
      const score = c.status === "pass" ? 84 : c.status === "warn" ? 56 : 28;
      const facts = c.evidence?.length ? c.evidence : [c.detail];
      return {
        key: c.key,
        name: c.label,
        score,
        status: c.status === "pass" ? "Strong" : c.status === "warn" ? "Average" : "Needs Work",
        priority: c.status === "fail" ? "High" : c.status === "warn" ? "Medium" : "Low",
        summary: c.detail,
        working: c.status === "pass" ? facts : [],
        issues: c.status !== "pass" ? facts : [],
        recommendations: c.status !== "pass" ? [recommend(c.key)] : [],
      };
    });
    const health = Math.round(areas.reduce((s, a) => s + a.score, 0) / Math.max(1, areas.length));
    const gaps = checked.filter((c) => c.status !== "pass").length;
    const id = upsertAuditReport(leadId, {
      company,
      score: health,
      overallScore: health,
      summary: `Digital-health audit for ${company}${result.url ? ` (${result.url})` : ""}. We checked ${checked.map((c) => c.label.toLowerCase()).join(", ")}. ${gaps} area${gaps === 1 ? "" : "s"} need attention.`,
      takeaway: result.opener,
      overallOpportunity: `Closing these ${gaps} gap${gaps === 1 ? "" : "s"} would lift ${company}'s visibility and inbound enquiries.`,
      opener: result.opener,
      areas,
    });
    router.push(`/audit-reports/${id}`);
  }

  const quickPicks = leads.filter((l) => !l.pooled).slice(0, 4);
  const inputCls = "h-10 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Sparkles size={22} className="text-[var(--primary)]" /> Prospect audit
        </h1>
        <p className="hidden text-sm text-[var(--muted)] lg:block">
          Scan a business&apos;s website and online presence before you call — turn real gaps into a specific opening line.
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
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <input value={website} onChange={(e) => setWebsite(e.target.value)} onKeyDown={(e) => e.key === "Enter" && run()} placeholder="Website (optional) — e.g. cafemocha.in" className={inputCls} />
          <input value={city} onChange={(e) => setCity(e.target.value)} onKeyDown={(e) => e.key === "Enter" && run()} placeholder="City (optional) — helps find the right Google listing" className={inputCls} />
        </div>
        {quickPicks.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-[var(--muted-2)]">Your leads:</span>
            {quickPicks.map((l) => (
              <button key={l.id} onClick={() => run(l.company)} className="rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-[11px] font-medium hover:bg-[var(--border)]">
                {l.company}
              </button>
            ))}
          </div>
        )}
      </Card>

      {loading && (
        <Card className="flex flex-col items-center gap-3 py-14 text-center">
          <Loader2 size={32} className="animate-spin text-[var(--primary)]" />
          <div className="text-sm font-medium">Scanning their website &amp; online presence…</div>
          <div className="text-xs text-[var(--muted)]">Loading the site · HTTPS certificate · mobile · SEO · tracking · contact · social links · Google</div>
        </Card>
      )}

      {error && !loading && (
        <Card className="flex items-start gap-3 border-[var(--danger)] p-4">
          <CircleX size={18} className="mt-0.5 shrink-0 text-[var(--danger)]" />
          <div className="text-sm">{error}</div>
        </Card>
      )}

      {result && !loading && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card className="p-5">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <ScoreRing score={result.score} size={56} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-lg font-bold">{result.company}</h2>
                    {result.score >= 80 && <Badge color="danger" dot><Flame size={11} /> Hot prospect</Badge>}
                  </div>
                  <p className="text-xs text-[var(--muted)]">
                    Opportunity score — higher means they need us more
                    {result.url && <> · <a href={result.url} target="_blank" rel="noopener noreferrer" className="text-[var(--primary)] hover:underline">{result.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}</a></>}
                  </p>
                </div>
                <Button onClick={generateReport} disabled={!result.checks.some((c) => c.status !== "unknown")}><FileText size={16} /> Generate audit report</Button>
              </div>

              <div className="mt-4 space-y-2">
                {result.checks.map((c) => (
                  <CheckRow key={c.key} check={c} result={result} />
                ))}
              </div>

              {result.notes?.map((n) => (
                <p key={n} className="mt-3 flex items-start gap-1.5 text-[11px] text-[var(--muted-2)]"><Info size={12} className="mt-0.5 shrink-0" /> {n}</p>
              ))}
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="border border-[var(--primary-soft)] bg-[var(--primary-soft)]/40 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--primary)]">
                <Sparkles size={15} /> Suggested opener
              </div>
              <p className="text-sm italic leading-relaxed">{result.opener}</p>
              <p className="mt-2 text-[11px] text-[var(--muted)]">Built from what the scan actually found — lead with the specific fact.</p>
            </Card>
            <Card className="p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Recommended pitch</div>
              <ul className="mt-2 space-y-1.5 text-sm">
                {result.checks.filter((c) => c.status === "fail").map((c) => (
                  <li key={c.key} className="flex items-center gap-2"><CircleX size={14} className="shrink-0 text-[var(--danger)]" /> {recommend(c.key)}</li>
                ))}
                {result.checks.filter((c) => c.status === "warn").map((c) => (
                  <li key={c.key} className="flex items-center gap-2"><CircleAlert size={14} className="shrink-0 text-[var(--warning)]" /> {recommend(c.key)}</li>
                ))}
                {result.checks.every((c) => c.status === "pass" || c.status === "unknown") && (
                  <li className="flex items-center gap-2 text-[var(--muted)]"><CircleCheck size={14} className="shrink-0 text-[var(--success)]" /> Strong footprint — pitch growth &amp; retainer services.</li>
                )}
              </ul>
            </Card>
            {result.place && (
              <Card className="p-4 text-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Google listing</div>
                <div className="mt-1 font-medium">{result.place.name}</div>
                {result.place.address && <div className="text-xs text-[var(--muted)]">{result.place.address}</div>}
                {result.place.phone && <div className="mt-1 text-xs">{result.place.phone}</div>}
                {result.place.mapsUrl && <a href={result.place.mapsUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[var(--primary)]">Open in Maps <ExternalLink size={11} /></a>}
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CheckRow({ check, result }: { check: ProspectCheck; result: ProspectAuditResult }) {
  const Icon = checkIcon[check.key] ?? checkIcon.default;
  const statusMeta = {
    pass: { color: "var(--success)", Comp: CircleCheck },
    warn: { color: "var(--warning)", Comp: CircleAlert },
    fail: { color: "var(--danger)", Comp: CircleX },
    unknown: { color: "var(--muted-2)", Comp: CircleHelp },
  }[check.status];
  const S = statusMeta.Comp;
  const url = verifyUrl(check.key, result);
  return (
    <div className="flex items-start gap-3 rounded-lg border border-[var(--border)] p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--muted)]">
        <Icon size={17} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{check.label}</div>
        <div className="text-xs text-[var(--muted)]">{check.detail}</div>
        {!!check.evidence?.length && (
          <ul className="mt-1 space-y-0.5">
            {check.evidence.map((e) => (
              <li key={e} className="break-all text-[11px] text-[var(--muted-2)]">· {e}</li>
            ))}
          </ul>
        )}
      </div>
      <a href={url} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded-md px-2 py-1 text-[11px] font-medium text-[var(--primary)] hover:bg-[var(--primary-soft)]">
        Verify ↗
      </a>
      <S size={20} style={{ color: statusMeta.color }} className="mt-1.5 shrink-0" />
    </div>
  );
}

// Real, clickable lookups so a BDA can confirm (or fill in) each row themselves.
function verifyUrl(key: string, r: ProspectAuditResult): string {
  const q = encodeURIComponent(r.company.trim());
  const site = r.url ? encodeURIComponent(r.url) : "";
  switch (key) {
    case "gmb": return r.place?.mapsUrl ?? `https://www.google.com/maps/search/${q}`;
    case "reviews": return r.place?.mapsUrl ?? `https://www.google.com/search?q=${q}%20reviews`;
    case "linkedin": return `https://www.linkedin.com/search/results/companies/?keywords=${q}`;
    case "instagram": return `https://www.google.com/search?q=${q}%20instagram`;
    case "mobile":
    case "seo": return site ? `https://pagespeed.web.dev/analysis?url=${site}` : `https://www.google.com/search?q=${q}`;
    case "ssl": return r.url ? `https://www.ssllabs.com/ssltest/analyze.html?d=${encodeURIComponent(new URL(r.url).hostname)}` : `https://www.google.com/search?q=${q}`;
    default: return r.url ?? `https://www.google.com/search?q=${q}`; // website / tracking / contact
  }
}

function recommend(key: string): string {
  return {
    website: "Pitch a website — Landing or 5-page",
    ssl: "Fix HTTPS — trust & SEO risk",
    mobile: "Offer a mobile-optimised rebuild",
    seo: "On-page SEO to show up in local search",
    tracking: "Set up analytics & ad pixels to measure marketing",
    contact: "Add WhatsApp & click-to-call to capture enquiries",
    gmb: "Google Business optimisation add-on",
    linkedin: "Build a company LinkedIn presence",
    instagram: "Pitch a Social retainer to stay active",
    reviews: "Reputation & review-generation service",
  }[key] ?? "Improvement opportunity";
}
