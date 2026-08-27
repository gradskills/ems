"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { userById } from "@/lib/seed/users";
import { Card, Badge, Button, ScoreRing } from "@/components/ui/primitives";
import { PageHeader } from "@/components/ems/kit";
import { auditReportColor, auditReportLabel } from "@/lib/ems";
import { relativeTime } from "@/lib/utils";
import { FileSearch, Sparkles, Search, Filter } from "lucide-react";
import type { AuditReportStatus } from "@/lib/types";

const allStatuses: AuditReportStatus[] = ["need_to_create", "draft", "pending_verification", "sent", "opened", "accepted", "rejected"];

export default function AuditReportsPage() {
  const actingUserId = useApp((s) => s.actingUserId);
  const auditReports = useApp((s) => s.auditReports);
  const createAuditReport = useApp((s) => s.createAuditReport);
  const me = userById(actingUserId)!;

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  const scoped = me.accessLevel === "employee" ? auditReports.filter((r) => r.ownerId === me.id) : auditReports;

  const filtered = useMemo(
    () =>
      scoped
        .filter((r) => (status === "all" ? true : r.status === status))
        .filter((r) => {
          if (!q) return true;
          const term = q.toLowerCase();
          const owner = userById(r.ownerId)?.name ?? "";
          return r.company.toLowerCase().includes(term) || owner.toLowerCase().includes(term);
        }),
    [scoped, status, q]
  );

  return (
    <div className="space-y-5">
      <PageHeader title="Audit Reports" subtitle="Digital-health audits per lead — open one to preview & edit the document" />

      <Card className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-2)]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by company or owner…"
            className="h-9 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] pl-9 pr-3 text-sm outline-none focus:border-[var(--primary)]" />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-[var(--muted-2)]" />
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-2 text-sm capitalize">
            <option value="all">All statuses</option>
            {allStatuses.map((s) => <option key={s} value={s}>{auditReportLabel[s]}</option>)}
          </select>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((r) => {
          const owner = userById(r.ownerId);
          const findings = r.items?.length ?? 0;
          return (
            <Card key={r.id} className="lift flex h-full flex-col p-4">
              <div className="flex items-start justify-between">
                {r.status === "need_to_create" ? (
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--surface-2)]"><FileSearch size={18} className="text-[var(--muted-2)]" /></div>
                ) : (
                  <ScoreRing score={r.overallScore ?? r.score} size={44} />
                )}
                <Badge color={auditReportColor[r.status]} dot>{auditReportLabel[r.status]}</Badge>
              </div>
              <div className="mt-3 font-semibold">{r.company}</div>
              <div className="text-xs text-[var(--muted)]">{owner?.name}{r.sentAt && ` · sent ${relativeTime(r.sentAt)}`}</div>
              {r.summary && <p className="mt-2 line-clamp-2 text-xs text-[var(--muted-2)]">{r.summary}</p>}
              <div className="mt-3 flex items-center justify-between text-[11px] text-[var(--muted-2)]">
                <span>{findings} findings</span>
                {r.verifiedById && <span>verified by {userById(r.verifiedById)?.name.split(" ")[0]}</span>}
              </div>
              <div className="mt-auto flex items-center gap-2 pt-3">
                <Link href={`/leads/${r.leadId}`} onClick={(e) => e.stopPropagation()}><Button size="sm" variant="outline">Go to lead</Button></Link>
                {r.status === "need_to_create" ? (
                  <Button size="sm" className="ml-auto" onClick={(e) => { e.preventDefault(); e.stopPropagation(); createAuditReport(r.leadId); }}><Sparkles size={14} /> Auto-generate</Button>
                ) : (
                  <Link href={`/audit-reports/${r.id}`} onClick={(e) => e.stopPropagation()} className="ml-auto"><Button size="sm">Open</Button></Link>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-[var(--border-strong)] py-14 text-center">
          <FileSearch size={26} className="text-[var(--muted-2)]" />
          <p className="text-sm text-[var(--muted)]">No matching audit reports.</p>
        </div>
      )}
    </div>
  );
}
