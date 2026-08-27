"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { userById } from "@/lib/seed/users";
import { Card, Badge, Avatar, Button } from "@/components/ui/primitives";
import { PageHeader } from "@/components/ems/kit";
import { visibleEmployees, leaveTypeLabel, auditReportColor, auditReportLabel } from "@/lib/ems";
import { formatDate } from "@/lib/utils";
import { Check, X, CalendarCheck, FileText, FileSearch, CheckCircle2 } from "lucide-react";

export default function ApprovalsPage() {
  const actingUserId = useApp((s) => s.actingUserId);
  const employees = useApp((s) => s.employees);
  const leaves = useApp((s) => s.leaves);
  const proposals = useApp((s) => s.proposals);
  const auditReports = useApp((s) => s.auditReports);
  const decideLeave = useApp((s) => s.decideLeave);
  const verifyProposal = useApp((s) => s.verifyProposal);
  const verifyAuditReport = useApp((s) => s.verifyAuditReport);
  const setAuditReportStatus = useApp((s) => s.setAuditReportStatus);
  const me = userById(actingUserId)!;

  const visibleIds = useMemo(() => new Set(visibleEmployees(me, employees).map((u) => u.id)), [me, employees]);
  const pendingLeaves = leaves.filter((l) => l.status === "pending" && visibleIds.has(l.userId) && l.userId !== me.id);
  const pendingProposals = proposals.filter((p) => p.reviewStatus === "internal_review" || (p.approval?.required && !p.approval.approvedBy));
  const pendingReports = auditReports.filter((r) => r.status === "pending_verification");

  const total = pendingLeaves.length + pendingProposals.length + pendingReports.length;

  return (
    <div className="space-y-6">
      <PageHeader title="Approvals" subtitle={`${total} items awaiting your decision`} />

      {total === 0 && (
        <Card className="flex flex-col items-center gap-2 py-16 text-center"><CheckCircle2 size={30} className="text-[var(--success)]" /><p className="text-sm text-[var(--muted)]">All clear — nothing needs approval.</p></Card>
      )}

      {pendingLeaves.length > 0 && (
        <section className="space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold"><CalendarCheck size={16} /> Leave requests <Badge color="warning">{pendingLeaves.length}</Badge></h3>
          {pendingLeaves.map((l) => {
            const u = userById(l.userId);
            return (
              <Card key={l.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Avatar name={u?.name ?? "?"} size={34} />
                  <div>
                    <div className="text-sm font-medium">{u?.name} · {leaveTypeLabel[l.type]} · {l.days}d</div>
                    <div className="text-xs text-[var(--muted)]">{formatDate(l.from)} → {formatDate(l.to)} · {l.reason}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="success" onClick={() => decideLeave(l.id, "approved")}><Check size={15} /></Button>
                  <Button size="sm" variant="danger" onClick={() => decideLeave(l.id, "rejected", "Not approved")}><X size={15} /></Button>
                </div>
              </Card>
            );
          })}
        </section>
      )}

      {pendingProposals.length > 0 && (
        <section className="space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold"><FileText size={16} /> Quotations to verify <Badge color="warning">{pendingProposals.length}</Badge></h3>
          {pendingProposals.map((p) => (
            <Card key={p.id} className="flex items-center justify-between p-4">
              <div>
                <div className="text-sm font-medium">{p.number}</div>
                <div className="text-xs text-[var(--muted)]">{p.approval?.reason ?? "Awaiting internal review before sending to client"}</div>
              </div>
              <div className="flex gap-2">
                <Link href="/proposals"><Button size="sm" variant="ghost">Open</Button></Link>
                <Button size="sm" variant="success" onClick={() => verifyProposal(p.id)}><Check size={15} /> Verify</Button>
              </div>
            </Card>
          ))}
        </section>
      )}

      {pendingReports.length > 0 && (
        <section className="space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold"><FileSearch size={16} /> Audit reports to verify <Badge color="warning">{pendingReports.length}</Badge></h3>
          {pendingReports.map((r) => (
            <Card key={r.id} className="flex items-center justify-between p-4">
              <div>
                <div className="text-sm font-medium">{r.company}</div>
                <div className="text-xs text-[var(--muted)]"><Badge color={auditReportColor[r.status]}>{auditReportLabel[r.status]}</Badge> · score {r.score}/100</div>
              </div>
              <Button size="sm" variant="success" onClick={() => { verifyAuditReport(r.id); setAuditReportStatus(r.id, "sent"); }}><Check size={15} /> Verify & send</Button>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}
