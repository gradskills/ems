"use client";

import { useEffect, useRef, useState } from "react";
import type { Lead, LeadStage } from "@/lib/types";
import { useApp, labelStage } from "@/lib/store";
import { Modal, Textarea, Field } from "@/components/ui/modal";
import { Button, StageBadge } from "@/components/ui/primitives";
import { ChevronDown, Check } from "lucide-react";

const order: LeadStage[] = ["new", "contacted", "qualified", "proposal_sent", "negotiation", "won", "lost"];

// Shows the CURRENT stage as a badge with a down-arrow; click to change stage.
export function StagePicker({ lead }: { lead: Lead }) {
  const move = useApp((s) => s.moveStage);
  const [open, setOpen] = useState(false);
  const [reasonFor, setReasonFor] = useState<LeadStage | null>(null);
  const [reason, setReason] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  function pick(stage: LeadStage) {
    setOpen(false);
    if (stage === lead.stage) return;
    if (stage === "won" || stage === "lost") { setReasonFor(stage); return; }
    move(lead.id, stage);
  }
  function confirm() {
    if (reasonFor) { move(lead.id, reasonFor, reason || undefined); setReasonFor(null); setReason(""); }
  }

  return (
    <>
      <div ref={ref} className="relative">
        <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-2 py-1.5 hover:bg-[var(--surface-2)]">
          <StageBadge stage={lead.stage} />
          <ChevronDown size={15} className="text-[var(--muted-2)]" />
        </button>
        {open && (
          <div className="absolute left-0 top-full z-30 mt-1 w-48 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)] animate-in">
            {order.map((s) => (
              <button key={s} onClick={() => pick(s)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--surface-2)]">
                <span className="flex-1">{labelStage(s)}</span>
                {s === lead.stage && <Check size={15} className="text-[var(--primary)]" />}
              </button>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={!!reasonFor}
        onClose={() => setReasonFor(null)}
        title={reasonFor === "won" ? "Mark as Won 🎉" : "Mark as Lost"}
        size="sm"
        footer={<><Button variant="ghost" onClick={() => setReasonFor(null)}>Cancel</Button><Button variant={reasonFor === "won" ? "success" : "danger"} onClick={confirm}>Confirm</Button></>}
      >
        <Field label={reasonFor === "won" ? "What clinched it? (optional)" : "Why was it lost? (helps the team)"}>
          <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus placeholder={reasonFor === "won" ? "e.g. combo discount + fast turnaround" : "e.g. went with a freelancer, price sensitive"} />
        </Field>
      </Modal>
    </>
  );
}
