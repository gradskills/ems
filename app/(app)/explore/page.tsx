"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { userName } from "@/lib/seed/users";
import { Card, Badge, Button, ScoreRing } from "@/components/ui/primitives";
import { PageHeader, SegmentedControl, SearchInput } from "@/components/ems/kit";
import { Modal, Field, Textarea } from "@/components/ui/modal";
import { inr, relativeTime } from "@/lib/utils";
import { Compass, Sparkles, Send, MapPin, Building2, PackageOpen, Search } from "lucide-react";
import type { Lead } from "@/lib/types";

const sourceLabel: Record<Lead["source"], string> = {
  google_maps: "Google Maps", manual_research: "Manual research", referral: "Referral",
  inbound_website: "Inbound", indiamart: "IndiaMART", walk_in: "Walk-in",
};

export default function ExplorePage() {
  const leads = useApp((s) => s.leads);
  const actingUserId = useApp((s) => s.actingUserId);
  const acquireLead = useApp((s) => s.acquireLead);
  const releaseLead = useApp((s) => s.releaseLead);
  const [view, setView] = useState<"pool" | "release">("pool");
  const [q, setQ] = useState("");
  const [releaseId, setReleaseId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const pool = useMemo(() => {
    let l = leads.filter((x) => x.pooled);
    if (q) { const s = q.toLowerCase(); l = l.filter((x) => x.company.toLowerCase().includes(s) || x.city.toLowerCase().includes(s) || x.industry.toLowerCase().includes(s)); }
    return l.sort((a, b) => b.score - a.score);
  }, [leads, q]);

  // leads I own that I could release to the pool (exclude won/lost — those are done)
  const mine = useMemo(
    () => leads.filter((x) => !x.pooled && x.ownerId === actingUserId && x.stage !== "won" && x.stage !== "lost"),
    [leads, actingUserId]
  );

  function confirmRelease() {
    if (releaseId) releaseLead(releaseId, note.trim() || undefined);
    setReleaseId(null); setNote("");
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Explore"
        subtitle="A shared pool of unclaimed leads — acquire one to work it, or release yours for a teammate to pick up."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SegmentedControl
          value={view}
          onChange={setView}
          items={[
            { key: "pool", label: `Available (${pool.length})`, icon: <Compass size={14} /> },
            { key: "release", label: "Send a lead to Explore", icon: <Send size={14} /> },
          ]}
        />
        {view === "pool" && (
          <div className="sm:w-72"><SearchInput value={q} onChange={setQ} placeholder="Search company, city, industry…" /></div>
        )}
      </div>

      {view === "pool" && (
        pool.length === 0 ? (
          <EmptyBox icon={<PackageOpen size={28} />} title="The pool is empty" sub="No unclaimed leads right now. Check back later or release one of yours." />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {pool.map((l) => (
              <Card key={l.id} className="flex flex-col p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{l.company}</div>
                    <div className="truncate text-xs text-[var(--muted)]">{l.contactName} · {l.role}</div>
                  </div>
                  <ScoreRing score={l.score} size={38} />
                </div>
                <div className="mb-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--muted)]">
                  <span className="flex items-center gap-1"><MapPin size={12} /> {l.city}</span>
                  <span className="flex items-center gap-1"><Building2 size={12} /> {l.industry}</span>
                </div>
                <div className="mb-3 flex flex-wrap items-center gap-1.5">
                  <Badge color="info">{sourceLabel[l.source]}</Badge>
                  <Badge color="primary">{l.interest.replace("_", " ")}</Badge>
                  {l.tags.includes("no-website") && <Badge color="danger">no website</Badge>}
                </div>
                {l.pooledBy ? (
                  <div className="mb-3 rounded-lg bg-[var(--surface-2)] p-2 text-[11px] text-[var(--muted)]">
                    <span className="font-medium text-[var(--foreground)]">Released by {userName(l.pooledBy).split(" ")[0]}</span>
                    {l.pooledAt && <> · {relativeTime(l.pooledAt)}</>}
                    {l.pooledNote && <div className="mt-0.5 italic">“{l.pooledNote}”</div>}
                  </div>
                ) : (
                  <div className="mb-3 text-[11px] text-[var(--muted-2)]">Fresh research lead · added {relativeTime(l.createdAt)}</div>
                )}
                <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                  <span className="text-sm font-bold">{inr(l.estimatedValue, { compact: true })}</span>
                  <Button size="sm" onClick={() => acquireLead(l.id)}><Sparkles size={14} /> Acquire</Button>
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      {view === "release" && (
        mine.length === 0 ? (
          <EmptyBox icon={<Search size={28} />} title="No active leads to release" sub="Leads you own (and haven't won or lost) will appear here." />
        ) : (
          <Card className="divide-y divide-[var(--border)]">
            {mine.map((l) => (
              <div key={l.id} className="flex items-center gap-3 p-3.5">
                <ScoreRing score={l.score} size={36} />
                <div className="min-w-0 flex-1">
                  <Link href={`/leads/${l.id}`} className="font-medium hover:text-[var(--primary)]">{l.company}</Link>
                  <div className="text-xs text-[var(--muted)]">{l.contactName} · {l.city} · <span className="capitalize">{l.stage.replace("_", " ")}</span></div>
                </div>
                <span className="hidden text-sm font-semibold sm:block">{inr(l.estimatedValue, { compact: true })}</span>
                <Button size="sm" variant="outline" onClick={() => { setReleaseId(l.id); setNote(""); }}>
                  <Send size={14} /> Send to Explore
                </Button>
              </div>
            ))}
          </Card>
        )
      )}

      <Modal
        open={releaseId !== null}
        onClose={() => setReleaseId(null)}
        title="Send lead to Explore"
        footer={<><Button variant="ghost" onClick={() => setReleaseId(null)}>Cancel</Button><Button onClick={confirmRelease}><Send size={15} /> Release to pool</Button></>}
      >
        <p className="mb-3 text-sm text-[var(--muted)]">
          This removes <strong className="text-[var(--foreground)]">{releaseId ? leads.find((l) => l.id === releaseId)?.company : ""}</strong> from your list and puts it in the shared Explore pool for any BDA to acquire.
        </p>
        <Field label="Reason (optional)" hint="Helps a teammate decide whether to pick it up">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Out of my region · no bandwidth this month · language barrier" rows={3} />
        </Field>
      </Modal>
    </div>
  );
}

function EmptyBox({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-[var(--border-strong)] py-14 text-center">
      <div className="text-[var(--muted-2)]">{icon}</div>
      <div className="text-sm font-medium">{title}</div>
      <p className="max-w-xs text-xs text-[var(--muted)]">{sub}</p>
    </div>
  );
}
