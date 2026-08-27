"use client";

import { useApp } from "@/lib/store";
import type { CallInsight } from "@/lib/types";
import { Badge, Button } from "@/components/ui/primitives";
import { Sparkles, Check, X, CircleCheck, CircleDashed } from "lucide-react";
import { cn } from "@/lib/utils";

export function AiReviewPanel({ insight, compact }: { insight: CallInsight; compact?: boolean }) {
  const setStatus = useApp((s) => s.setAiFieldStatus);
  const live = useApp((s) => s.insights.find((i) => i.id === insight.id)) ?? insight;
  const pending = live.fields.filter((f) => f.status === "pending").length;

  return (
    <div className={cn("rounded-[var(--radius)] border border-[var(--primary-soft)] bg-gradient-to-b from-[var(--primary-soft)]/60 to-[var(--surface)]", compact ? "" : "")}>
      <div className="flex items-center gap-2 border-b border-[var(--primary-soft)] px-4 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--primary)] text-white">
          <Sparkles size={15} />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold">AI call insights</div>
          <div className="text-[11px] text-[var(--muted)]">
            Transcribed & extracted automatically · {pending > 0 ? `${pending} to review` : "all reviewed"}
          </div>
        </div>
        <Badge color={live.sentiment === "positive" ? "success" : live.sentiment === "negative" ? "danger" : "slate"}>
          {live.sentiment}
        </Badge>
      </div>

      <div className="px-4 py-3">
        <div className="mb-3 rounded-lg bg-[var(--surface-2)] p-3 text-xs leading-relaxed text-[var(--foreground)]">
          {live.summary}
        </div>

        <div className="space-y-2">
          {live.fields.map((f) => (
            <div
              key={f.key}
              className={cn(
                "rounded-lg border p-2.5 transition-colors",
                f.status === "accepted"
                  ? "border-[var(--success-soft)] bg-[var(--success-soft)]/50"
                  : f.status === "rejected"
                  ? "border-[var(--border)] bg-[var(--surface-2)] opacity-60"
                  : "border-[var(--border-strong)] bg-[var(--surface)]"
              )}
            >
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">{f.label}</span>
                    {f.appliesTo === "task" && <Badge color="info">creates task</Badge>}
                    <span className="text-[10px] text-[var(--muted-2)]">{Math.round(f.confidence * 100)}% conf.</span>
                  </div>
                  <div className={cn("mt-0.5 text-sm", f.status === "rejected" && "line-through")}>{f.value}</div>
                </div>
                {f.status === "pending" ? (
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => setStatus(live.id, f.key, "accepted")}
                      className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--success)] text-white hover:brightness-95"
                      title="Accept"
                    >
                      <Check size={15} />
                    </button>
                    <button
                      onClick={() => setStatus(live.id, f.key, "rejected")}
                      className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--surface-2)] text-[var(--muted)] hover:bg-[var(--border)]"
                      title="Reject"
                    >
                      <X size={15} />
                    </button>
                  </div>
                ) : f.status === "accepted" ? (
                  <CircleCheck size={18} className="shrink-0 text-[var(--success)]" />
                ) : (
                  <CircleDashed size={18} className="shrink-0 text-[var(--muted-2)]" />
                )}
              </div>
            </div>
          ))}
        </div>

        {pending > 0 && (
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              variant="success"
              onClick={() => live.fields.filter((f) => f.status === "pending").forEach((f) => setStatus(live.id, f.key, "accepted"))}
            >
              <Check size={14} /> Accept all
            </Button>
            <span className="self-center text-[11px] text-[var(--muted-2)]">Accepted fields write to the customer record</span>
          </div>
        )}
      </div>
    </div>
  );
}
