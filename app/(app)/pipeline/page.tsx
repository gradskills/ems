"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { PageHeader, SegmentedControl } from "@/components/ems/kit";
import { PipelineBoard } from "@/components/bda/PipelineBoard";
import { PipelineSheet } from "@/components/bda/PipelineSheet";
import { LayoutGrid, Table2, Search } from "lucide-react";

type ViewMode = "board" | "sheet";

export default function PipelinePage() {
  const leads = useApp((s) => s.leads);
  const role = useApp((s) => s.role);
  const actingUserId = useApp((s) => s.actingUserId);

  const [view, setView] = useState<ViewMode>("board");
  const [query, setQuery] = useState("");

  const scoped = useMemo(() => {
    const base = role === "bda" ? leads.filter((l) => l.ownerId === actingUserId) : leads;
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (l) =>
        l.company.toLowerCase().includes(q) ||
        l.contactName.toLowerCase().includes(q) ||
        l.city.toLowerCase().includes(q) ||
        l.industry.toLowerCase().includes(q)
    );
  }, [leads, role, actingUserId, query]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Pipeline"
        subtitle={`${scoped.length} lead${scoped.length === 1 ? "" : "s"} · ${view === "board" ? "drag cards between stages — Won/Lost asks for a reason" : "change stages inline — both views stay in sync"}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-2)]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search leads…"
                className="h-10 w-52 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] pl-8 pr-3 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>
            <SegmentedControl
              items={[
                { key: "board", label: "Board", icon: <LayoutGrid size={14} /> },
                { key: "sheet", label: "Sheet", icon: <Table2 size={14} /> },
              ]}
              value={view}
              onChange={setView}
            />
          </div>
        }
      />

      {view === "board" ? (
        <PipelineBoard leads={scoped} role={role} />
      ) : (
        <PipelineSheet leads={scoped} role={role} meId={actingUserId} />
      )}
    </div>
  );
}
