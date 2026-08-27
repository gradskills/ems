"use client";

import { useState } from "react";
import type { Lead, LeadStage } from "@/lib/types";
import { useApp, labelStage } from "@/lib/store";
import { Modal, Textarea, Field } from "@/components/ui/modal";
import { Button } from "@/components/ui/primitives";
import { ChevronDown, Check } from "lucide-react";

const order: LeadStage[] = ["new", "contacted", "qualified", "proposal_sent", "negotiation", "won", "lost"];

export function StageMoveMenu({ lead }: { lead: Lead }) {
  const move = useApp((s) => s.moveStage);
  const [open, setOpen] = useState(false);
  const [reasonFor, setReasonFor] = useState<LeadStage | null>(null);
  const [reason, setReason] = useState("");

  function pick(stage: LeadStage) {
    setOpen(false);
    if (stage === lead.stage) return;
    if (stage === "won" || stage === "lost") {
      setReasonFor(stage);
      return;
    }
    move(lead.id, stage);
  }

  function confirm() {
    if (reasonFor) {
      move(lead.id, reasonFor, reason || undefined);
      setReasonFor(null);
      setReason("");
    }
  }

  return (
    <>
      <div className="relative">
        <Button variant="outline" size="sm" onClick={() => setOpen((o) => !o)}>
          Move stage <ChevronDown size={14} />
        </Button>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute left-0 top-full z-20 mt-1 w-52 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)] animate-in">
              {order.map((s) => (
                <button
                  key={s}
                  onClick={() => pick(s)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--surface-2)]"
                >
                  <span className="flex-1">{labelStage(s)}</span>
                  {s === lead.stage && <Check size={15} className="text-[var(--primary)]" />}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <Modal
        open={!!reasonFor}
        onClose={() => setReasonFor(null)}
        title={reasonFor === "won" ? "Mark as Won 🎉" : "Mark as Lost"}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setReasonFor(null)}>Cancel</Button>
            <Button variant={reasonFor === "won" ? "success" : "danger"} onClick={confirm}>Confirm</Button>
          </>
        }
      >
        <Field label={reasonFor === "won" ? "What clinched it? (optional)" : "Why was it lost? (helps the team)"}>
          <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus
            placeholder={reasonFor === "won" ? "e.g. combo discount + fast turnaround" : "e.g. went with a freelancer, price sensitive"} />
        </Field>
      </Modal>
    </>
  );
}
