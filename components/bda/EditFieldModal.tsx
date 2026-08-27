"use client";

import { useState } from "react";
import type { Lead } from "@/lib/types";
import { useApp } from "@/lib/store";
import { Modal, Field, Input, Textarea } from "@/components/ui/modal";
import { Button, Badge } from "@/components/ui/primitives";
import { ShieldAlert } from "lucide-react";

const editable: { key: keyof Lead; label: string; type: "text" | "number" }[] = [
  { key: "estimatedValue", label: "Estimated Value (₹)", type: "number" },
  { key: "contactName", label: "Contact Name", type: "text" },
  { key: "phone", label: "Phone", type: "text" },
  { key: "email", label: "Email", type: "text" },
  { key: "score", label: "Lead Score", type: "number" },
];

export function EditFieldModal({ lead, open, onClose }: { lead: Lead; open: boolean; onClose: () => void }) {
  const edit = useApp((s) => s.editLeadField);
  const role = useApp((s) => s.role);
  const [fieldKey, setFieldKey] = useState<keyof Lead>("estimatedValue");
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");

  const field = editable.find((f) => f.key === fieldKey)!;
  const current = lead[fieldKey];
  const notOwner = role !== "bda"; // admin/manager editing someone's record

  function save() {
    if (!value || (notOwner && !reason.trim())) return;
    edit(lead.id, fieldKey, field.type === "number" ? Number(value) : value, reason.trim() || "Owner self-edit");
    setValue("");
    setReason("");
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit lead record"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={!value || (notOwner && !reason.trim())}>
            Save change
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {notOwner && (
          <div className="flex items-start gap-2 rounded-lg bg-[var(--warning-soft)] p-3 text-xs text-[var(--warning)]">
            <ShieldAlert size={16} className="mt-0.5 shrink-0" />
            <span>
              You&apos;re editing a record owned by another BDA. A <strong>reason is mandatory</strong> and this change is written to the
              immutable audit log, visible to the owner.
            </span>
          </div>
        )}
        <Field label="Field to edit">
          <select
            value={fieldKey}
            onChange={(e) => {
              setFieldKey(e.target.value as keyof Lead);
              setValue("");
            }}
            className="h-10 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]"
          >
            {editable.map((f) => (
              <option key={String(f.key)} value={String(f.key)}>
                {f.label}
              </option>
            ))}
          </select>
        </Field>
        <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
          Current: <Badge color="slate">{String(current ?? "—")}</Badge>
        </div>
        <Field label={`New ${field.label}`}>
          <Input type={field.type} value={value} onChange={(e) => setValue(e.target.value)} autoFocus />
        </Field>
        <Field label={notOwner ? "Reason (required)" : "Reason (optional)"}>
          <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this change being made?" />
        </Field>
      </div>
    </Modal>
  );
}
