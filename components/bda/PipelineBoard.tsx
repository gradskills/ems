"use client";

import { useState } from "react";
import Link from "next/link";
import { useApp, labelStage } from "@/lib/store";
import type { Lead, LeadStage } from "@/lib/types";
import { userName } from "@/lib/seed/users";
import { Badge, Avatar, Button } from "@/components/ui/primitives";
import { Modal, Textarea, Field } from "@/components/ui/modal";
import { cn, inr } from "@/lib/utils";
import { GripVertical } from "lucide-react";

export const pipelineColumns: LeadStage[] = ["new", "contacted", "qualified", "proposal_sent", "negotiation", "won", "lost"];

const colAccent: Record<LeadStage, string> = {
  new: "var(--info)",
  contacted: "var(--primary)",
  qualified: "var(--purple)",
  proposal_sent: "var(--warning)",
  negotiation: "var(--warning)",
  won: "var(--success)",
  lost: "var(--danger)",
};

interface PipelineBoardProps {
  leads: Lead[];
  role: string;
}

export function PipelineBoard({ leads, role }: PipelineBoardProps) {
  const move = useApp((s) => s.moveStage);

  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<LeadStage | null>(null);
  const [reasonModal, setReasonModal] = useState<{ leadId: string; stage: LeadStage } | null>(null);
  const [reason, setReason] = useState("");

  function handleDragStart(e: React.DragEvent<HTMLDivElement>, l: Lead) {
    setDragId(l.id);
    e.dataTransfer.setData("text/plain", l.id);
    e.dataTransfer.effectAllowed = "move";
  }
  function handleDragEnd() {
    setDragId(null);
    setOverCol(null);
  }
  function handleDragOver(e: React.DragEvent<HTMLDivElement>, col: LeadStage) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (overCol !== col) setOverCol(col);
  }
  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    const col = e.currentTarget.dataset.col as LeadStage | undefined;
    if (!col || e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setOverCol((c) => (c === col ? null : c));
  }
  function drop(e: React.DragEvent<HTMLDivElement>, stage: LeadStage) {
    e.preventDefault();
    setOverCol(null);
    const id = e.dataTransfer.getData("text/plain") || dragId;
    setDragId(null);
    if (!id) return;
    requestMove(id, stage);
  }

  /** shared move logic — Won/Lost demand a reason first */
  function requestMove(leadId: string, stage: LeadStage) {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.stage === stage) return;
    if (stage === "won" || stage === "lost") {
      setReasonModal({ leadId, stage });
      return;
    }
    move(leadId, stage);
  }

  function confirmReason() {
    if (reasonModal) {
      move(reasonModal.leadId, reasonModal.stage, reason || undefined);
      setReasonModal(null);
      setReason("");
    }
  }

  return (
    <>
      <div className="relative min-w-0">
        <div className="overflow-x-auto pb-4 [scrollbar-width:thin]">
          <div className="flex w-max gap-3 pr-1">
            {pipelineColumns.map((col) => {
              const items = leads.filter((l) => l.stage === col);
              const total = items.reduce((s, l) => s + l.estimatedValue, 0);
              const isOver = overCol === col && dragId !== null;
              return (
                <div
                  key={col}
                  data-col={col}
                  onDragOver={(e) => handleDragOver(e, col)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => drop(e, col)}
                  className={cn(
                    "flex w-72 shrink-0 flex-col rounded-[var(--radius)] border transition-colors",
                    isOver ? "border-[var(--primary)] bg-[var(--primary-soft)]/50" : "border-[var(--border)] bg-[var(--surface-2)]/50"
                  )}
                >
                  <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: colAccent[col] }} />
                      <span className="text-sm font-semibold">{labelStage(col)}</span>
                      <span className="rounded-full bg-[var(--surface)] px-1.5 text-xs text-[var(--muted)]">{items.length}</span>
                    </div>
                    <span className="text-xs font-medium text-[var(--muted)]">{inr(total, { compact: true })}</span>
                  </div>
                  <div className="min-h-[120px] flex-1 space-y-2 p-2">
                    {items.map((l) => (
                      <PipelineCard key={l.id} lead={l} role={role} dragging={dragId === l.id} onDragStart={(e) => handleDragStart(e, l)} onDragEnd={handleDragEnd} />
                    ))}
                    {items.length === 0 && (
                      <div className={cn("flex h-[104px] items-center justify-center rounded-lg border border-dashed text-[11px] transition-colors", isOver ? "border-[var(--primary)] text-[var(--primary)]" : "border-[var(--border)] text-[var(--muted-2)]")}>
                        {isOver ? "Drop here" : "Empty"}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <Modal
        open={!!reasonModal}
        onClose={() => setReasonModal(null)}
        title={reasonModal?.stage === "won" ? "Mark as Won 🎉" : "Mark as Lost"}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setReasonModal(null)}>Cancel</Button>
            <Button variant={reasonModal?.stage === "won" ? "success" : "danger"} onClick={confirmReason}>Confirm</Button>
          </>
        }
      >
        <Field label={reasonModal?.stage === "won" ? "What clinched it? (optional)" : "Why was it lost?"}>
          <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
        </Field>
      </Modal>
    </>
  );
}

function PipelineCard({
  lead,
  role,
  dragging,
  onDragStart,
  onDragEnd,
}: {
  lead: Lead;
  role: string;
  dragging: boolean;
  onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        "group cursor-grab rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2.5 shadow-[var(--shadow-sm)] active:cursor-grabbing hover:border-[var(--border-strong)]",
        dragging && "opacity-40"
      )}
    >
      <div className="flex items-start gap-1.5">
        <GripVertical size={14} className="mt-0.5 shrink-0 text-[var(--muted-2)] opacity-0 group-hover:opacity-100" />
        <div className="min-w-0 flex-1">
          <Link href={`/leads/${lead.id}`} className="block truncate text-sm font-medium hover:text-[var(--primary)]">
            {lead.company}
          </Link>
          <div className="truncate text-xs text-[var(--muted)]">{lead.contactName}</div>
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-xs font-semibold">{inr(lead.estimatedValue, { compact: true })}</span>
            {role !== "bda" && <Avatar name={userName(lead.ownerId)} size={20} />}
          </div>
          {lead.tags.includes("no-website") && <Badge color="danger" className="mt-1.5">no website</Badge>}
        </div>
      </div>
    </div>
  );
}
