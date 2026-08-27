"use client";

import { useState } from "react";
import type { Lead, Disposition } from "@/lib/types";
import { useApp, labelDisposition } from "@/lib/store";
import { latestInsightForLead } from "@/lib/seed/calls";
import { seededInt } from "@/lib/clock";
import { Modal, Textarea } from "@/components/ui/modal";
import { Button } from "@/components/ui/primitives";
import { AiReviewPanel } from "./AiReviewPanel";
import { Phone, PhoneCall, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const dispositions: { key: Disposition; color: string }[] = [
  { key: "connected", color: "var(--success)" },
  { key: "no_answer", color: "var(--muted-2)" },
  { key: "busy", color: "var(--warning)" },
  { key: "callback", color: "var(--info)" },
  { key: "not_interested", color: "var(--danger)" },
  { key: "wrong_number", color: "var(--muted-2)" },
];

type Step = "dialing" | "disposition" | "transcribing" | "review";

export function CallFlow({ lead, open, onClose }: { lead: Lead; open: boolean; onClose: () => void }) {
  const logCall = useApp((s) => s.logCall);
  const [step, setStep] = useState<Step>("dialing");
  const [dispo, setDispo] = useState<Disposition | null>(null);
  const [note, setNote] = useState("");
  const [duration, setDuration] = useState(0);

  const insight = latestInsightForLead(lead.id);

  function reset() {
    setStep("dialing");
    setDispo(null);
    setNote("");
    setDuration(0);
  }
  function close() {
    reset();
    onClose();
  }

  function pickDispo(d: Disposition) {
    setDispo(d);
    if (d === "connected") setDuration(seededInt(lead.id + d, 150, 420));
  }

  function save() {
    if (!dispo) return;
    logCall(lead.id, dispo, dispo === "connected" ? duration : 0, note || undefined);
    // If connected and we have a seeded transcript for this lead, show the AI magic
    if (dispo === "connected" && insight) {
      setStep("transcribing");
      setTimeout(() => setStep("review"), 1800);
    } else {
      close();
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={
        <span className="flex items-center gap-2">
          <Phone size={16} /> Call · {lead.contactName}
        </span>
      }
      size={step === "review" ? "lg" : "sm"}
    >
      {step === "dialing" && (
        <div className="flex flex-col items-center py-4 text-center">
          <div className="pulse-ring mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--primary)] text-white">
            <PhoneCall size={32} />
          </div>
          <div className="text-lg font-bold">{lead.phone}</div>
          <div className="text-sm text-[var(--muted)]">{lead.company}</div>
          <p className="mt-3 max-w-xs text-xs text-[var(--muted-2)]">
            On a phone this opens your dialer. Only calls started here are tracked — your personal calls stay private.
          </p>
          <div className="mt-5 flex w-full gap-2">
            <a href={`tel:${lead.phone.replace(/\s/g, "")}`} className="flex-1">
              <Button variant="success" className="w-full">
                <PhoneCall size={16} /> Open dialer
              </Button>
            </a>
            <Button variant="outline" className="flex-1" onClick={() => setStep("disposition")}>
              Call ended →
            </Button>
          </div>
        </div>
      )}

      {step === "disposition" && (
        <div className="space-y-4">
          <div>
            <div className="mb-2 text-xs font-medium text-[var(--muted)]">How did the call go? <span className="text-[var(--danger)]">*</span></div>
            <div className="grid grid-cols-2 gap-2">
              {dispositions.map((d) => (
                <button
                  key={d.key}
                  onClick={() => pickDispo(d.key)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border p-2.5 text-sm font-medium transition-all",
                    dispo === d.key ? "border-transparent text-white shadow-[var(--shadow-sm)]" : "border-[var(--border-strong)] hover:bg-[var(--surface-2)]"
                  )}
                  style={dispo === d.key ? { background: d.color } : undefined}
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: dispo === d.key ? "white" : d.color }} />
                  {labelDisposition(d.key)}
                </button>
              ))}
            </div>
          </div>
          {dispo === "connected" && insight && (
            <div className="flex items-center gap-2 rounded-lg bg-[var(--primary-soft)] p-2.5 text-xs text-[var(--primary)]">
              <Sparkles size={14} /> Recording detected — AI will transcribe & fill the record after you save.
            </div>
          )}
          <Textarea rows={2} placeholder="Quick note (optional)…" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={close}>Cancel</Button>
            <Button onClick={save} disabled={!dispo}>Save call</Button>
          </div>
        </div>
      )}

      {step === "transcribing" && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <Loader2 size={36} className="animate-spin text-[var(--primary)]" />
          <div className="text-sm font-semibold">Transcribing call…</div>
          <div className="text-xs text-[var(--muted)]">Detecting language · extracting requirement, budget, next step</div>
        </div>
      )}

      {step === "review" && insight && (
        <div className="space-y-3">
          <div className="rounded-lg bg-[var(--success-soft)] px-3 py-2 text-xs font-medium text-[var(--success)]">
            ✓ Call logged & transcribed. Review what the AI captured — accepted fields update {lead.company}&apos;s record.
          </div>
          <AiReviewPanel insight={insight} />
          <div className="flex justify-end">
            <Button onClick={close}>Done</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
