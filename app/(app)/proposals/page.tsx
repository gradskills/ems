"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { leadById } from "@/lib/seed/leads";
import { userName, userById, users } from "@/lib/seed/users";
import { Card, Badge, Button } from "@/components/ui/primitives";
import { inr, formatDate } from "@/lib/utils";
import { FileText, Plus, MailOpen, Clock3, Send, ShieldCheck, Share2, Search, Filter } from "lucide-react";
import type { ProposalStatus } from "@/lib/types";

const statusColor: Record<ProposalStatus, "slate" | "primary" | "warning" | "success" | "danger" | "info"> = {
  draft: "slate",
  pending_approval: "warning",
  sent: "primary",
  opened: "info",
  accepted: "success",
  rejected: "danger",
  expired: "slate",
};

function proposalTotal(items: { qty: number; unitPrice: number; discountPct: number; gstRate: number }[]) {
  return items.reduce((sum, i) => {
    const base = i.qty * i.unitPrice * (1 - i.discountPct / 100);
    return sum + base * (1 + i.gstRate / 100);
  }, 0);
}

export default function ProposalsPage() {
  const proposals = useApp((s) => s.proposals);
  const role = useApp((s) => s.role);
  const actingUserId = useApp((s) => s.actingUserId);
  const submitForReview = useApp((s) => s.submitProposalForReview);
  const verifyProposal = useApp((s) => s.verifyProposal);
  const shareProposal = useApp((s) => s.shareProposal);
  const viewer = userById(actingUserId)!;

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [owner, setOwner] = useState("all");

  const scoped = useMemo(
    () =>
      (role === "bda" ? proposals.filter((p) => p.ownerId === actingUserId) : proposals).sort((a, b) =>
        a.createdAt < b.createdAt ? 1 : -1
      ),
    [proposals, role, actingUserId]
  );

  const filtered = useMemo(
    () =>
      scoped
        .filter((p) => (status === "all" ? true : p.status === status))
        .filter((p) => (owner === "all" ? true : p.ownerId === owner))
        .filter((p) => {
          if (!q) return true;
          const term = q.toLowerCase();
          const company = leadById(p.leadId)?.company ?? "";
          return p.number.toLowerCase().includes(term) || company.toLowerCase().includes(term);
        }),
    [scoped, status, owner, q]
  );

  const pendingApproval = filtered.filter((p) => p.approval?.required);
  const reviewPipeline = filtered.filter((p) => p.reviewStatus || p.customer || (p.status !== "accepted" && p.status !== "rejected"));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Proposals</h1>
          <p className="text-sm text-[var(--muted)]">{filtered.length} proposals</p>
        </div>
        <Link href="/proposals/new">
          <Button><Plus size={16} /> New proposal</Button>
        </Link>
      </div>

      <Card className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-2)]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by number or company…"
            className="h-9 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] pl-9 pr-3 text-sm outline-none focus:border-[var(--primary)]" />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-[var(--muted-2)]" />
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-2 text-sm capitalize">
            <option value="all">All statuses</option>
            {Object.keys(statusColor).map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
          </select>
          {role !== "bda" && (
            <select value={owner} onChange={(e) => setOwner(e.target.value)} className="h-9 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-2 text-sm">
              <option value="all">All owners</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {role !== "bda" && pendingApproval.length > 0 && (
          <Card className="h-full border-l-4 border-l-[var(--warning)] p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--warning)]">
              <Clock3 size={16} /> {pendingApproval.length} awaiting approval
            </div>
            <div className="space-y-1.5">
              {pendingApproval.slice(0, 3).map((p) => (
                <Link key={p.id} href={`/proposals/new?proposal=${p.id}`} className="flex items-center justify-between rounded-lg bg-[var(--surface-2)] px-3 py-2 text-sm hover:bg-[var(--border)]">
                  <span className="truncate">{p.number} · {leadById(p.leadId)?.company}</span>
                  <span className="shrink-0 text-xs text-[var(--warning)]">{p.approval?.reason}</span>
                </Link>
              ))}
              {pendingApproval.length > 3 && <div className="text-[11px] text-[var(--muted-2)]">+{pendingApproval.length - 3} more</div>}
            </div>
          </Card>
        )}
        {reviewPipeline.length > 0 && (
          <Card className="h-full p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Share2 size={15} className="text-[var(--primary)]" /> {reviewPipeline.length} need action
            </div>
            <div className="space-y-2">
              {reviewPipeline.slice(0, 3).map((p) => (
                <ReviewRowCompact
                  key={p.id}
                  number={p.number}
                  company={leadById(p.leadId)?.company ?? ""}
                  reviewStatus={p.reviewStatus}
                  customerDecision={p.customer?.decision}
                  canVerify={viewer.accessLevel !== "employee"}
                  isOwner={p.ownerId === actingUserId}
                  onSubmit={() => submitForReview(p.id)}
                  onVerify={() => verifyProposal(p.id)}
                  onShare={() => shareProposal(p.id)}
                />
              ))}
              {reviewPipeline.length > 3 && <div className="text-[11px] text-[var(--muted-2)]">+{reviewPipeline.length - 3} more</div>}
            </div>
          </Card>
        )}
        {filtered.map((p) => {
          const lead = leadById(p.leadId);
          return (
            <Card key={p.id} className="lift flex h-full flex-col p-4">
              <div className="flex items-start justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--warning-soft)] text-[var(--warning)]">
                  <FileText size={18} />
                </div>
                <Badge color={statusColor[p.status]} dot>{p.status.replace("_", " ")}</Badge>
              </div>
              <div className="mt-3 font-semibold">{lead?.company}</div>
              <div className="text-xs text-[var(--muted)]">{p.number} · v{p.version}</div>
              <div className="mt-3 flex items-end justify-between">
                <div>
                  <div className="text-lg font-bold">{inr(proposalTotal(p.items))}</div>
                  <div className="text-[11px] text-[var(--muted-2)]">incl. GST</div>
                </div>
                <div className="text-right text-[11px] text-[var(--muted-2)]">
                  {p.openCount > 0 && (
                    <div className="flex items-center gap-1 text-[var(--info)]"><MailOpen size={12} /> opened {p.openCount}×</div>
                  )}
                  <div>valid till {formatDate(p.validTill)}</div>
                </div>
              </div>
              {role !== "bda" && <div className="mt-2 text-[11px] text-[var(--muted-2)]">by {userName(p.ownerId)}</div>}
              <div className="mt-auto flex items-center gap-2 pt-3">
                <Link href={`/leads/${p.leadId}`} onClick={(e) => e.stopPropagation()}><Button size="sm" variant="outline">Go to lead</Button></Link>
                <Link href={`/proposals/${p.id}`} onClick={(e) => e.stopPropagation()} className="ml-auto"><Button size="sm">Open</Button></Link>
              </div>
            </Card>
          );
        })}
      </div>
      {filtered.length === 0 && <div className="py-10 text-center text-sm text-[var(--muted)]">No matching proposals.</div>}
    </div>
  );
}

function ReviewRowCompact({
  number, company, reviewStatus, customerDecision, canVerify, isOwner, onSubmit, onVerify, onShare,
}: {
  number: string;
  company: string;
  reviewStatus?: "internal_review" | "verified" | "shared";
  customerDecision?: "accepted" | "rejected";
  canVerify: boolean;
  isOwner: boolean;
  onSubmit: () => void;
  onVerify: () => void;
  onShare: () => string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-[var(--surface-2)] px-3 py-2">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{number}</div>
        <div className="truncate text-[11px] text-[var(--muted)]">{company}</div>
      </div>
      <div className="shrink-0">
        {customerDecision ? (
          <Badge color={customerDecision === "accepted" ? "success" : "danger"} dot>Client {customerDecision}</Badge>
        ) : (
          <>
            {!reviewStatus && isOwner && <Button size="sm" variant="secondary" onClick={onSubmit}><Send size={13} /> Review</Button>}
            {reviewStatus === "internal_review" && (canVerify
              ? <Button size="sm" variant="success" onClick={onVerify}><ShieldCheck size={13} /> Verify</Button>
              : <Badge color="warning" dot>In review</Badge>)}
            {reviewStatus === "verified" && <Button size="sm" onClick={onShare}><Share2 size={13} /> Share</Button>}
            {reviewStatus === "shared" && <Badge color="primary" dot>Shared</Badge>}
          </>
        )}
      </div>
    </div>
  );
}
