"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/store";
import type { InvoiceStatus } from "@/lib/types";
import { Card, Badge, Button, Stat } from "@/components/ui/primitives";
import { CreateInvoiceModal } from "@/components/bda/CreateInvoiceModal";
import { inr, formatDate } from "@/lib/utils";
import { Plus, Receipt, Repeat, AlertTriangle, Search, Filter } from "lucide-react";

const statusColor: Record<InvoiceStatus, "slate" | "primary" | "warning" | "success" | "danger" | "info"> = {
  draft: "slate", issued: "info", sent: "primary", partially_paid: "warning", paid: "success", overdue: "danger",
};

export default function InvoicesPage() {
  const invoices = useApp((s) => s.invoices);
  const [createOpen, setCreateOpen] = useState(false);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [recurring, setRecurring] = useState("all");

  const filtered = useMemo(
    () =>
      invoices
        .filter((iv) => (status === "all" ? true : iv.status === status))
        .filter((iv) => (recurring === "all" ? true : recurring === "yes" ? iv.recurring : !iv.recurring))
        .filter((iv) => {
          if (!q) return true;
          const term = q.toLowerCase();
          return iv.number.toLowerCase().includes(term) || iv.company.toLowerCase().includes(term) || (iv.milestone ?? "").toLowerCase().includes(term);
        })
        .sort((a, b) => (a.issuedAt < b.issuedAt ? 1 : -1)),
    [invoices, status, recurring, q]
  );

  const outstanding = invoices.filter((i) => i.status !== "paid").reduce((s, i) => s + (i.total - i.tdsAmount - i.received), 0);
  const overdue = invoices.filter((i) => i.status === "overdue");
  const collected = invoices.reduce((s, i) => s + i.received, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight"><Receipt size={22} className="text-[var(--primary)]" /> Invoices</h1>
          <p className="text-sm text-[var(--muted)]">Create, download and send GST invoices · TDS tracked · {invoices.length} total</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}><Plus size={16} /> New invoice</Button>
      </div>

      <Card className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-2)]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by number, company or milestone…"
            className="h-9 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] pl-9 pr-3 text-sm outline-none focus:border-[var(--primary)]" />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-[var(--muted-2)]" />
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-2 text-sm capitalize">
            <option value="all">All statuses</option>
            {Object.keys(statusColor).map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
          </select>
          <select value={recurring} onChange={(e) => setRecurring(e.target.value)} className="h-9 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-2 text-sm">
            <option value="all">All types</option>
            <option value="yes">Recurring</option>
            <option value="no">One-time</option>
          </select>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4"><Stat label="Outstanding" value={inr(outstanding, { compact: true })} sub="net of TDS" accent={outstanding ? "var(--warning)" : undefined} /></Card>
        <Card className="p-4"><Stat label="Collected" value={inr(collected, { compact: true })} accent="var(--success)" /></Card>
        <Card className="p-4"><Stat label="Overdue" value={overdue.length} sub={inr(overdue.reduce((s, i) => s + i.total, 0), { compact: true })} accent={overdue.length ? "var(--danger)" : undefined} /></Card>
        <Card className="p-4"><Stat label="Recurring" value={invoices.filter((i) => i.recurring).length} sub="retainers" /></Card>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((iv) => {
          const balance = iv.total - iv.tdsAmount - iv.received;
          return (
            <Card key={iv.id} className="lift flex h-full flex-col p-4">
              <div className="flex items-start justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--primary-soft)] text-[var(--primary)]"><Receipt size={18} /></div>
                <Badge color={statusColor[iv.status]} dot>{iv.status.replace("_", " ")}</Badge>
              </div>
              <div className="mt-3 flex items-center gap-1.5 font-semibold">{iv.company}{iv.recurring && <Repeat size={12} className="text-[var(--purple)]" />}</div>
              <div className="text-xs text-[var(--muted)]">{iv.number}</div>
              {iv.milestone && <div className="mt-0.5 truncate text-[11px] text-[var(--muted-2)]">{iv.milestone}</div>}
              <div className="mt-3 flex items-end justify-between">
                <div>
                  <div className="text-lg font-bold">{inr(iv.total)}</div>
                  <div className="text-[11px] text-[var(--muted-2)]">incl. GST</div>
                </div>
                <div className="text-right text-[11px] text-[var(--muted-2)]">
                  <div className={balance > 0 ? "font-medium text-[var(--warning)]" : "text-[var(--success)]"}>{balance > 0 ? `${inr(balance, { compact: true })} due` : "Paid"}</div>
                  <div className="flex items-center justify-end gap-1">due {formatDate(iv.dueAt)}{iv.status === "overdue" && <AlertTriangle size={11} className="text-[var(--danger)]" />}</div>
                </div>
              </div>
              <div className="mt-auto flex items-center gap-2 pt-3">
                <Link href={`/leads/${iv.leadId}`} onClick={(e) => e.stopPropagation()}><Button size="sm" variant="outline">Go to lead</Button></Link>
                <Link href={`/invoices/${iv.id}`} onClick={(e) => e.stopPropagation()} className="ml-auto"><Button size="sm">Open</Button></Link>
              </div>
            </Card>
          );
        })}
      </div>
      {filtered.length === 0 && <div className="py-10 text-center text-sm text-[var(--muted)]">No matching invoices.</div>}

      <CreateInvoiceModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
