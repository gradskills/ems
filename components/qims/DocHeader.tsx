"use client";

import { Card, Avatar, Badge } from "@/components/ui/primitives";
import { userById } from "@/lib/seed/users";
import { departmentById } from "@/lib/seed/org";
import { roleLabel } from "@/lib/ems";
import { Mail, Phone, MapPin, Globe, Building2 } from "lucide-react";
import type { Lead } from "@/lib/types";

export function DocHeader({ lead, ownerId, docTitle, docNumber, statusBadge }: { lead?: Lead; ownerId: string; docTitle: string; docNumber: string; statusBadge?: React.ReactNode }) {
  const owner = userById(ownerId);
  const dept = owner ? departmentById(owner.departmentId) : undefined;
  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2"><h1 className="text-xl font-bold tracking-tight">{docTitle}</h1>{statusBadge}</div>
          <p className="text-sm text-[var(--muted)]">{docNumber}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-[var(--border)] p-3">
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-2)]">Client</div>
          {lead ? (
            <>
              <div className="flex items-center gap-1.5 font-medium"><Building2 size={14} className="text-[var(--muted)]" /> {lead.company}</div>
              <div className="mt-1 space-y-0.5 text-xs text-[var(--muted)]">
                <div>{lead.contactName} · {lead.role}</div>
                <div className="flex items-center gap-1"><Phone size={11} /> {lead.phone}</div>
                {lead.email && <div className="flex items-center gap-1"><Mail size={11} /> {lead.email}</div>}
                <div className="flex items-center gap-1"><MapPin size={11} /> {lead.city}</div>
                {lead.website && <div className="flex items-center gap-1"><Globe size={11} /> {lead.website}</div>}
              </div>
            </>
          ) : <div className="text-xs text-[var(--muted)]">Client details unavailable</div>}
        </div>
        <div className="rounded-xl border border-[var(--border)] p-3">
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-2)]">Prepared by (BDA)</div>
          {owner ? (
            <div className="flex items-center gap-2.5">
              <Avatar name={owner.name} size={38} />
              <div>
                <div className="font-medium">{owner.name} <Badge color="primary">{roleLabel(owner, dept)}</Badge></div>
                <div className="mt-0.5 space-y-0.5 text-xs text-[var(--muted)]">
                  <div className="flex items-center gap-1"><Mail size={11} /> {owner.email}</div>
                  <div className="flex items-center gap-1"><Phone size={11} /> {owner.phone}</div>
                </div>
              </div>
            </div>
          ) : <div className="text-xs text-[var(--muted)]">—</div>}
        </div>
      </div>
    </Card>
  );
}
