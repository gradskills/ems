"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { prospectAudits } from "@/lib/seed/prospects";
import type { ProspectAuditResult, ProspectCheck } from "@/lib/types";
import { Card, Button, Badge, ScoreRing } from "@/components/ui/primitives";
import { Search, Globe, ShieldCheck, Smartphone, MapPin, AtSign, Gauge, Loader2, CircleCheck, CircleAlert, CircleX, Sparkles, Flame } from "lucide-react";

const checkIcon: Record<string, typeof Globe> = {
  website: Globe,
  ssl: ShieldCheck,
  mobile: Smartphone,
  gmb: MapPin,
  instagram: AtSign,
  seo: Search,
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
          <div className="text-xs text-[var(--muted)]">Website · SSL · mobile · Google listing · social activity</div>
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
              </div>

              <div className="mt-4 space-y-2">
                {result.checks.map((c) => (
                  <CheckRow key={c.key} check={c} />
                ))}
              </div>
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
              </ul>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function CheckRow({ check }: { check: ProspectCheck }) {
  const Icon = checkIcon[check.key] ?? checkIcon.default;
  const statusMeta = {
    pass: { color: "var(--success)", Comp: CircleCheck },
    warn: { color: "var(--warning)", Comp: CircleAlert },
    fail: { color: "var(--danger)", Comp: CircleX },
  }[check.status];
  const S = statusMeta.Comp;
  return (
    <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] p-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--muted)]">
        <Icon size={17} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{check.label}</div>
        <div className="text-xs text-[var(--muted)]">{check.detail}</div>
      </div>
      <S size={20} style={{ color: statusMeta.color }} className="shrink-0" />
    </div>
  );
}

function recommend(key: string): string {
  return {
    website: "Pitch a website — Landing or 5-page",
    ssl: "Flag missing HTTPS — trust & SEO risk",
    mobile: "Offer a mobile-optimised rebuild",
    gmb: "Google Business optimisation add-on",
    instagram: "Pitch a Social retainer to stay active",
    seo: "On-page SEO to show up in local search",
  }[key] ?? "Improvement opportunity";
}

function syntheticAudit(q: string): ProspectAuditResult {
  return {
    id: "synthetic",
    company: q,
    createdAt: new Date().toISOString(),
    score: 78,
    opener: `"I had a quick look for ${q} online and couldn't find a proper website — most customers check before they buy, so you may be losing enquiries to competitors who show up on Google."`,
    checks: [
      { key: "website", label: "Website", status: "fail", detail: "No website found for this business" },
      { key: "gmb", label: "Google Business listing", status: "warn", detail: "Unclaimed or incomplete listing" },
      { key: "instagram", label: "Instagram", status: "warn", detail: "Low posting frequency" },
      { key: "seo", label: "Search visibility", status: "fail", detail: "Not ranking for key local terms" },
    ],
  };
}
