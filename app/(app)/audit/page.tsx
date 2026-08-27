"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { users, userById } from "@/lib/seed/users";
import type { AuditEntry } from "@/lib/types";
import { Card, Avatar, Badge } from "@/components/ui/primitives";
import { formatDate, relativeTime } from "@/lib/utils";
import { ShieldCheck, Lock, Search, ArrowRight, Filter } from "lucide-react";

const actionColor: Record<AuditEntry["action"], "primary" | "success" | "danger" | "warning" | "info" | "slate"> = {
  create: "success",
  update: "primary",
  delete: "danger",
  export: "warning",
  view_recording: "info",
  login: "slate",
  approve: "success",
};

export default function AuditPage() {
  const audit = useApp((s) => s.audit);
  const [actor, setActor] = useState("all");
  const [action, setAction] = useState("all");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    return audit
      .filter((e) => (actor === "all" ? true : e.actorId === actor))
      .filter((e) => (action === "all" ? true : e.action === action))
      .filter((e) => (q ? e.entityLabel.toLowerCase().includes(q.toLowerCase()) || (e.field ?? "").includes(q.toLowerCase()) : true))
      .sort((a, b) => (a.at < b.at ? 1 : -1));
  }, [audit, actor, action, q]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight"><ShieldCheck size={22} className="text-[var(--primary)]" /> Audit log</h1>
          <p className="text-sm text-[var(--muted)]">Every create, edit, delete, export and recording access — permanently recorded.</p>
        </div>
        <Badge color="success"><Lock size={12} /> Append-only · tamper-evident</Badge>
      </div>

      <Card className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-2)]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search entity or field…"
            className="h-9 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] pl-9 pr-3 text-sm outline-none focus:border-[var(--primary)]" />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-[var(--muted-2)]" />
          <select value={actor} onChange={(e) => setActor(e.target.value)} className="h-9 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-2 text-sm">
            <option value="all">All people</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <select value={action} onChange={(e) => setAction(e.target.value)} className="h-9 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-2 text-sm capitalize">
            {["all", "create", "update", "delete", "export", "view_recording", "approve", "login"].map((a) => (
              <option key={a} value={a}>{a.replace("_", " ")}</option>
            ))}
          </select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="divide-y divide-[var(--border)]">
          {filtered.map((e) => {
            const actor = userById(e.actorId);
            return (
              <div key={e.id} className="flex items-start gap-3 px-4 py-3 hover:bg-[var(--surface-2)]">
                <Avatar name={actor?.name ?? "?"} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{actor?.name}</span>
                    <Badge color={actionColor[e.action]}>{e.action.replace("_", " ")}</Badge>
                    <span className="text-sm text-[var(--muted)]">{e.entity}</span>
                    <span className="text-sm font-medium">{e.entityLabel}</span>
                    {e.impersonating && <Badge color="warning">as {userById(e.impersonating)?.name}</Badge>}
                  </div>
                  {e.field && (
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="text-[var(--muted)]">{e.field}:</span>
                      <code className="rounded bg-[var(--danger-soft)] px-1.5 py-0.5 text-[var(--danger)]">{e.before || "—"}</code>
                      <ArrowRight size={12} className="text-[var(--muted-2)]" />
                      <code className="rounded bg-[var(--success-soft)] px-1.5 py-0.5 text-[var(--success)]">{e.after}</code>
                    </div>
                  )}
                  {!e.field && e.after && <div className="mt-0.5 text-xs text-[var(--muted)]">{e.after}</div>}
                  {e.reason && (
                    <div className="mt-1 rounded bg-[var(--warning-soft)]/50 px-2 py-1 text-xs text-[var(--warning)]">
                      <strong>Reason:</strong> {e.reason}
                    </div>
                  )}
                </div>
                <div className="shrink-0 text-right text-[11px] text-[var(--muted-2)]" title={formatDate(e.at, true)}>
                  {relativeTime(e.at)}
                </div>
              </div>
            );
          })}
        </div>
        {filtered.length === 0 && <div className="py-10 text-center text-sm text-[var(--muted)]">No matching entries.</div>}
      </Card>
    </div>
  );
}
