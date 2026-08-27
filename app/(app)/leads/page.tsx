"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useApp } from "@/lib/store";
import type { LeadStage, Lead } from "@/lib/types";
import { userName } from "@/lib/seed/users";
import { Card, StageBadge, ScoreRing, Badge, Avatar, Button } from "@/components/ui/primitives";
import { SegmentedControl } from "@/components/ems/kit";
import { CreateLeadModal } from "@/components/bda/CreateLeadModal";
import { ImportLeadsModal } from "@/components/bda/ImportLeadsModal";
import { inr, relativeTime, formatDate } from "@/lib/utils";
import { downloadCSV } from "@/lib/exports";
import { cn } from "@/lib/utils";
import { Search, Filter, Users, ChevronRight, ChevronDown, Plus, Upload, Download, Send, LayoutGrid, Table2, MapPin, Compass, Sparkles, Building2, PackageOpen, Check } from "lucide-react";

const exploreSourceLabel: Record<Lead["source"], string> = {
  google_maps: "Google Maps", manual_research: "Manual research", referral: "Referral",
  inbound_website: "Inbound", indiamart: "IndiaMART", walk_in: "Walk-in",
};

const stageLabel = (s: LeadStage | "all") => (s === "all" ? "All stages" : s.replace("_", " "));

export default function LeadsPage() {
  const leads = useApp((s) => s.leads);
  const role = useApp((s) => s.role);
  const actingUserId = useApp((s) => s.actingUserId);
  const releaseLead = useApp((s) => s.releaseLead);
  const acquireLead = useApp((s) => s.acquireLead);
  const [q, setQ] = useState("");
  const [stage, setStage] = useState<LeadStage | "all">("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [view, setView] = useState<"table" | "card" | "explore">("table");

  // stage filter dropdown
  const [stageOpen, setStageOpen] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => stageRef.current && !stageRef.current.contains(e.target as Node) && setStageOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const scoped = useMemo(() => {
    // pooled leads live in Explore, never in the working list
    let l = leads.filter((x) => !x.pooled);
    l = role === "bda" ? l.filter((x) => x.ownerId === actingUserId) : l;
    if (stage !== "all") l = l.filter((x) => x.stage === stage);
    if (q) {
      const s = q.toLowerCase();
      l = l.filter((x) => x.company.toLowerCase().includes(s) || x.contactName.toLowerCase().includes(s) || x.city.toLowerCase().includes(s));
    }
    return l.sort((a, b) => (a.lastActivityAt < b.lastActivityAt ? 1 : -1));
  }, [leads, role, actingUserId, stage, q]);

  const stages: (LeadStage | "all")[] = ["all", "new", "contacted", "qualified", "proposal_sent", "negotiation", "won", "lost"];

  // Explore pool — unclaimed leads any BDA can acquire (shown in the Explore tab)
  const pool = useMemo(() => {
    let l = leads.filter((x) => x.pooled);
    if (q) {
      const s = q.toLowerCase();
      l = l.filter((x) => x.company.toLowerCase().includes(s) || x.city.toLowerCase().includes(s) || x.industry.toLowerCase().includes(s));
    }
    return l.sort((a, b) => b.score - a.score);
  }, [leads, q]);

  function exportCSV() {
    const header = ["Company", "Contact", "Role", "Phone", "Email", "City", "Industry", "Stage", "Source", "Interest", "Owner", "Score", "Estimated value", "Last activity"];
    const rows = scoped.map((l) => [
      l.company, l.contactName, l.role, l.phone, l.email ?? "", l.city, l.industry,
      l.stage, l.source, l.interest, userName(l.ownerId), l.score, l.estimatedValue, formatDate(l.lastActivityAt),
    ]);
    downloadCSV(`leads-${new Date().toISOString().slice(0, 10)}`, [header, ...rows]);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{role === "bda" ? "My leads" : "All leads"}</h1>
          <p className="text-sm text-[var(--muted)]">
            {scoped.length} leads{role !== "bda" && " across the team"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={!scoped.length}><Download size={15} /> Export</Button>
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}><Upload size={15} /> Import</Button>
          <Button onClick={() => setCreateOpen(true)}><Plus size={16} /> New lead</Button>
        </div>
      </div>

      <Card className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-2)]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search company, contact, city…"
              className="h-9 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] pl-9 pr-3 text-sm outline-none focus:border-[var(--primary)]"
            />
          </div>
          {/* stage filter — dropdown menu (hidden while browsing the Explore pool) */}
          {view !== "explore" && (
            <div ref={stageRef} className="relative shrink-0">
              <button
                onClick={() => setStageOpen((o) => !o)}
                className="flex h-9 items-center gap-2 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm font-medium hover:bg-[var(--surface-2)]"
              >
                <Filter size={15} className="text-[var(--muted-2)]" />
                <span className="capitalize">{stageLabel(stage)}</span>
                <ChevronDown size={14} className={cn("text-[var(--muted-2)] transition-transform", stageOpen ? "" : "-rotate-90")} />
              </button>
              {stageOpen && (
                <div className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] py-1 shadow-[var(--shadow-lg)]">
                  {stages.map((s) => (
                    <button
                      key={s}
                      onClick={() => { setStage(s); setStageOpen(false); }}
                      className={cn(
                        "flex w-full items-center justify-between px-3 py-2 text-left text-sm capitalize hover:bg-[var(--surface-2)]",
                        stage === s ? "font-semibold text-[var(--primary)]" : "text-[var(--muted)]"
                      )}
                    >
                      {stageLabel(s)}
                      {stage === s && <Check size={15} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {/* view toggle — table / cards / explore (desktop) */}
          <div className="hidden lg:block">
            <SegmentedControl
              value={view}
              onChange={setView}
              items={[
                { key: "table", label: "Table", icon: <Table2 size={14} /> },
                { key: "card", label: "Cards", icon: <LayoutGrid size={14} /> },
                { key: "explore", label: "Explore", icon: <Compass size={14} /> },
              ]}
            />
          </div>
        </Card>

      {/* Desktop table */}
      {view === "table" && (
        <Card className="hidden overflow-hidden lg:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Stage</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Value</th>
                {role !== "bda" && <th className="px-4 py-3">Owner</th>}
                <th className="px-4 py-3">Last activity</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {scoped.map((l) => (
                <tr key={l.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]">
                  <td className="px-4 py-3">
                    <Link href={`/leads/${l.id}`} className="font-medium hover:text-[var(--primary)]">{l.company}</Link>
                    <div className="text-xs text-[var(--muted)]">{l.contactName} · {l.city}</div>
                    <div className="mt-1 flex gap-1">
                      {l.tags.includes("no-website") && <Badge color="danger">no website</Badge>}
                      {l.tags.includes("sla-breach") && <Badge color="warning">SLA</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3"><StageBadge stage={l.stage} /></td>
                  <td className="px-4 py-3"><ScoreRing score={l.score} size={36} /></td>
                  <td className="px-4 py-3 font-semibold">{inr(l.estimatedValue, { compact: true })}</td>
                  {role !== "bda" && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2"><Avatar name={userName(l.ownerId)} size={26} /><span className="text-xs">{userName(l.ownerId).split(" ")[0]}</span></div>
                    </td>
                  )}
                  <td className="px-4 py-3 text-xs text-[var(--muted)]">{relativeTime(l.lastActivityAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {l.ownerId === actingUserId && l.stage !== "won" && l.stage !== "lost" && (
                        <button
                          onClick={() => releaseLead(l.id)}
                          title="Send to Explore pool"
                          className="rounded-md p-1.5 text-[var(--muted-2)] hover:bg-[var(--surface)] hover:text-[var(--primary)]"
                        >
                          <Send size={15} />
                        </button>
                      )}
                      <Link href={`/leads/${l.id}`}><ChevronRight size={16} className="text-[var(--muted-2)]" /></Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Desktop card grid */}
      {view === "card" && (
        <div className="hidden gap-4 sm:grid-cols-2 xl:grid-cols-3 lg:grid">
          {scoped.map((l) => (
            <Card key={l.id} className="flex flex-col p-4">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link href={`/leads/${l.id}`} className="truncate font-semibold hover:text-[var(--primary)]">{l.company}</Link>
                  <div className="truncate text-xs text-[var(--muted)]">{l.contactName} · {l.role}</div>
                </div>
                <ScoreRing score={l.score} size={40} />
              </div>
              <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--muted)]">
                <span className="flex items-center gap-1"><MapPin size={12} /> {l.city}</span>
                {role !== "bda" && <span className="flex items-center gap-1"><Avatar name={userName(l.ownerId)} size={16} /> {userName(l.ownerId).split(" ")[0]}</span>}
              </div>
              <div className="mb-3 flex flex-wrap items-center gap-1.5">
                <StageBadge stage={l.stage} />
                {l.tags.includes("no-website") && <Badge color="danger">no website</Badge>}
              </div>
              <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                <span className="text-sm font-bold">{inr(l.estimatedValue, { compact: true })}</span>
                <div className="flex items-center gap-1.5">
                  {l.ownerId === actingUserId && l.stage !== "won" && l.stage !== "lost" && (
                    <Button size="sm" variant="ghost" onClick={() => releaseLead(l.id)} title="Send to Explore"><Send size={14} /></Button>
                  )}
                  <Link href={`/leads/${l.id}`}><Button size="sm" variant="outline">Open</Button></Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Explore pool (desktop) — unclaimed leads to acquire */}
      {view === "explore" && (
        <div className="hidden lg:block">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-[var(--muted)]">{pool.length} unclaimed {pool.length === 1 ? "lead" : "leads"} in the shared pool</p>
            <Link href="/explore" className="text-xs font-medium text-[var(--primary)] hover:underline">Send a lead to Explore →</Link>
          </div>
          {pool.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-[var(--border-strong)] py-14 text-center">
              <PackageOpen size={28} className="text-[var(--muted-2)]" />
              <div className="text-sm font-medium">The pool is empty</div>
              <p className="max-w-xs text-xs text-[var(--muted)]">No unclaimed leads right now. Release one of yours for a teammate to pick up.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {pool.map((l) => (
                <Card key={l.id} className="flex flex-col p-4">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{l.company}</div>
                      <div className="truncate text-xs text-[var(--muted)]">{l.contactName} · {l.role}</div>
                    </div>
                    <ScoreRing score={l.score} size={40} />
                  </div>
                  <div className="mb-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--muted)]">
                    <span className="flex items-center gap-1"><MapPin size={12} /> {l.city}</span>
                    <span className="flex items-center gap-1"><Building2 size={12} /> {l.industry}</span>
                  </div>
                  <div className="mb-3 flex flex-wrap items-center gap-1.5">
                    <Badge color="info">{exploreSourceLabel[l.source]}</Badge>
                    {l.tags.includes("no-website") && <Badge color="danger">no website</Badge>}
                  </div>
                  <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                    <span className="text-sm font-bold">{inr(l.estimatedValue, { compact: true })}</span>
                    <Button size="sm" onClick={() => acquireLead(l.id)}><Sparkles size={14} /> Acquire</Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mobile cards */}
      <div className="space-y-2.5 lg:hidden">
        {scoped.map((l) => (
          <Link key={l.id} href={`/leads/${l.id}`}>
            <Card className="lift flex items-center gap-3 p-3">
              <ScoreRing score={l.score} size={40} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><span className="truncate font-medium">{l.company}</span></div>
                <div className="text-xs text-[var(--muted)]">{l.contactName} · {l.city}</div>
                <div className="mt-1"><StageBadge stage={l.stage} /></div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold">{inr(l.estimatedValue, { compact: true })}</div>
                {role !== "bda" && <div className="text-[11px] text-[var(--muted-2)]">{userName(l.ownerId).split(" ")[0]}</div>}
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {view !== "explore" && scoped.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-12 text-center text-[var(--muted)]">
          <Users size={28} className="text-[var(--muted-2)]" />
          <p className="text-sm">No leads match your filters.</p>
        </div>
      )}

      <CreateLeadModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <ImportLeadsModal open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}
