"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useApp, labelStage } from "@/lib/store";
import type { Lead, LeadStage } from "@/lib/types";
import { userName } from "@/lib/seed/users";
import { pipelineColumns } from "@/components/bda/PipelineBoard";
import { Avatar, selectCellCls } from "@/components/ui/primitives";
import { Modal, Textarea, Field } from "@/components/ui/modal";
import { Button } from "@/components/ui/primitives";
import { cn, inr } from "@/lib/utils";
import { ChevronUp, ChevronDown } from "lucide-react";

type SortKey = "company" | "contact" | "stage" | "value" | "score" | "owner";

interface PipelineSheetProps {
  leads: Lead[];
  role: string;
  meId: string;
}

export function PipelineSheet({ leads, role, meId }: PipelineSheetProps) {
  const move = useApp((s) => s.moveStage);

  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 } | null>(null);
  const [pendingStage, setPendingStage] = useState<{ leadId: string; stage: LeadStage } | null>(null);
  const [reason, setReason] = useState("");

  function toggleSort(key: SortKey) {
    setSort((s) => (s?.key === key ? (s.dir === 1 ? { key, dir: -1 } : null) : { key, dir: 1 }));
  }

  const rows = useMemo(() => {
    if (!sort) return leads;
    const val = (l: Lead): string | number => {
      switch (sort.key) {
        case "company": return l.company.toLowerCase();
        case "contact": return l.contactName.toLowerCase();
        case "stage": return pipelineColumns.indexOf(l.stage);
        case "value": return l.estimatedValue;
        case "score": return l.score;
        case "owner": return userName(l.ownerId).toLowerCase();
      }
    };
    return [...leads].sort((a, b) => {
      const va = val(a), vb = val(b);
      if (va === vb) return 0;
      return va < vb ? -sort.dir : sort.dir;
    });
  }, [leads, sort]);

  /** stage edits flow through the same audited moveStage action the board uses */
  function changeStage(leadId: string, stage: LeadStage) {
    const lead = rows.find((l) => l.id === leadId);
    if (!lead || lead.stage === stage) return;
    if (stage === "won" || stage === "lost") {
      setPendingStage({ leadId, stage });
      return;
    }
    move(leadId, stage);
  }

  function confirmReason() {
    if (pendingStage) {
      move(pendingStage.leadId, pendingStage.stage, reason || undefined);
      setPendingStage(null);
      setReason("");
    }
  }

  function sortHeader(label: string, k: SortKey, className?: string) {
    const active = sort?.key === k;
    return (
      <th className={cn("px-3 py-2 font-semibold", className)}>
        <button onClick={() => toggleSort(k)} className={cn("inline-flex items-center gap-1 uppercase tracking-wide transition-colors", active ? "text-[var(--primary)]" : "hover:text-[var(--foreground)]")}>
          {label}
          {active ? (sort!.dir === 1 ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : null}
        </button>
      </th>
    );
  }

  const totalValue = rows.reduce((s, l) => s + l.estimatedValue, 0);

  return (
    <>
      <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                <th className="w-8 px-3 py-2 font-semibold text-[var(--muted-2)]">#</th>
                {sortHeader("Company", "company")}
                {sortHeader("Contact", "contact", "w-44")}
                {sortHeader("Stage", "stage", "w-40")}
                {sortHeader("Value", "value", "w-28 text-right")}
                {sortHeader("Score", "score", "w-20 text-right")}
                {sortHeader("Owner", "owner", "w-44")}
                <th className="w-32 px-3 py-2 font-semibold">Source</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l, i) => (
                <tr key={l.id} className={cn("group border-b border-[var(--border)] transition-colors last:border-b-0 hover:bg-[var(--surface-2)]/60", i % 2 === 1 && "bg-[var(--surface-2)]/30")}>
                  <td className="px-3 py-1.5 text-xs text-[var(--muted-2)]">{i + 1}</td>

                  {/* company — links to the lead workspace */}
                  <td className="max-w-[220px] px-3 py-1.5">
                    <Link href={`/leads/${l.id}`} className="block truncate rounded-md px-1.5 py-1 text-sm font-medium hover:bg-[var(--surface-2)] hover:text-[var(--primary)]" title={l.company}>
                      {l.company}
                    </Link>
                  </td>

                  <td className="max-w-[170px] px-3 py-1.5">
                    <div className="truncate text-xs">{l.contactName}</div>
                    <div className="truncate text-[10px] text-[var(--muted-2)]">{l.role}</div>
                  </td>

                  {/* stage — inline select, mirrors board drops */}
                  <td className="px-1.5 py-1.5">
                    <select value={l.stage} onChange={(e) => changeStage(l.id, e.target.value as LeadStage)} className={selectCellCls(true)}>
                      {pipelineColumns.map((c) => (
                        <option key={c} value={c}>{labelStage(c)}</option>
                      ))}
                    </select>
                  </td>

                  <td className="px-3 py-1.5 text-right text-xs font-semibold tabular-nums">{inr(l.estimatedValue, { compact: true })}</td>

                  <td className="px-3 py-1.5 text-right text-xs tabular-nums">
                    <span style={{ color: l.score >= 80 ? "var(--success)" : l.score >= 60 ? "var(--warning)" : "var(--muted-2)" }}>{l.score}</span>
                  </td>

                  <td className="px-3 py-1.5">
                    <div className="flex items-center gap-1.5 px-1">
                      <Avatar name={userName(l.ownerId)} size={20} />
                      <span className="truncate text-xs text-[var(--muted)]">{l.ownerId === meId && role === "bda" ? "Me" : userName(l.ownerId)}</span>
                    </div>
                  </td>

                  <td className="px-3 py-1.5 text-xs text-[var(--muted)] capitalize">{l.source.replace(/_/g, " ")}</td>
                </tr>
              ))}

              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-sm text-[var(--muted-2)]">No leads match the current filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[11px] text-[var(--muted-2)]">
          <span>{rows.length} lead{rows.length === 1 ? "" : "s"} · pipeline {inr(totalValue, { compact: true })}{sort ? ` · sorted by ${sort.key} (${sort.dir === 1 ? "asc" : "desc"})` : ""}</span>
          <span>Change a stage here and the board updates instantly</span>
        </div>
      </div>

      <Modal
        open={!!pendingStage}
        onClose={() => setPendingStage(null)}
        title={pendingStage?.stage === "won" ? "Mark as Won 🎉" : "Mark as Lost"}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingStage(null)}>Cancel</Button>
            <Button variant={pendingStage?.stage === "won" ? "success" : "danger"} onClick={confirmReason}>Confirm</Button>
          </>
        }
      >
        <Field label={pendingStage?.stage === "won" ? "What clinched it? (optional)" : "Why was it lost?"}>
          <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
        </Field>
      </Modal>
    </>
  );
}
