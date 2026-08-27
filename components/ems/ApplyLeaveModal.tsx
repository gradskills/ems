"use client";

import { useState } from "react";
import { useApp } from "@/lib/store";
import { Modal, Field, Input, Textarea } from "@/components/ui/modal";
import { Button } from "@/components/ui/primitives";
import type { LeaveType } from "@/lib/types";

const selectCls = "h-10 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]";

function daysBetween(a: string, b: string) {
  if (!a || !b) return 0;
  const d = Math.round((Date.parse(b) - Date.parse(a)) / 86400000) + 1;
  return d > 0 ? d : 0;
}

export function ApplyLeaveModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const applyLeave = useApp((s) => s.applyLeave);
  const [type, setType] = useState<LeaveType>("casual");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [reason, setReason] = useState("");
  const days = daysBetween(from, to);
  const valid = from && to && days > 0 && reason;

  function submit() {
    if (!valid) return;
    applyLeave({ type, from, to, days, reason });
    onClose();
    setFrom(""); setTo(""); setReason(""); setType("casual");
  }

  return (
    <Modal open={open} onClose={onClose} title="Apply for leave" size="md"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={submit} disabled={!valid}>Submit request</Button></>}>
      <div className="space-y-4">
        <Field label="Leave type">
          <select className={selectCls} value={type} onChange={(e) => setType(e.target.value as LeaveType)}>
            <option value="casual">Casual</option>
            <option value="sick">Sick</option>
            <option value="earned">Earned</option>
            <option value="unpaid">Unpaid</option>
            <option value="comp_off">Comp-off</option>
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="From"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="To"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
        </div>
        {days > 0 && <div className="text-xs text-[var(--muted)]">{days} day{days > 1 ? "s" : ""} · goes to your manager for approval</div>}
        <Field label="Reason"><Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Brief reason…" /></Field>
      </div>
    </Modal>
  );
}
