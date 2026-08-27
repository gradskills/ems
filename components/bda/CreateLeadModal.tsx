"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp, type NewLeadInput } from "@/lib/store";
import { Modal, Field, Input } from "@/components/ui/modal";
import { Button } from "@/components/ui/primitives";
import type { Lead } from "@/lib/types";

const interests: { v: Lead["interest"]; label: string }[] = [
  { v: "website", label: "Website" },
  { v: "social_media", label: "Social media" },
  { v: "outreach", label: "Outreach" },
  { v: "combo", label: "Combo" },
];
const sources: { v: Lead["source"]; label: string }[] = [
  { v: "google_maps", label: "Google Maps" },
  { v: "manual_research", label: "Manual research" },
  { v: "referral", label: "Referral" },
  { v: "inbound_website", label: "Inbound (website)" },
  { v: "indiamart", label: "IndiaMART" },
  { v: "walk_in", label: "Walk-in" },
];

export function CreateLeadModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createLead = useApp((s) => s.createLead);
  const router = useRouter();
  const [f, setF] = useState<NewLeadInput>({
    company: "", contactName: "", role: "Owner", phone: "", email: "", city: "", industry: "",
    interest: "website", interests: ["website"], source: "google_maps", estimatedValue: 40000, website: "",
  });

  function toggleInterest(v: Lead["interest"]) {
    setF((prev) => {
      const cur = prev.interests ?? [prev.interest];
      const next = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
      const list = next.length ? next : [v];
      return { ...prev, interests: list, interest: list[0] };
    });
  }

  const valid = f.company.trim() && f.contactName.trim() && f.phone.trim() && f.city.trim();

  function save(openAfter: boolean) {
    if (!valid) return;
    const id = createLead(f);
    onClose();
    if (openAfter) router.push(`/leads/${id}`);
  }

  const set = (patch: Partial<NewLeadInput>) => setF((prev) => ({ ...prev, ...patch }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add new lead"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="outline" disabled={!valid} onClick={() => save(false)}>Save</Button>
          <Button disabled={!valid} onClick={() => save(true)}>Save &amp; open</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Company *"><Input value={f.company} onChange={(e) => set({ company: e.target.value })} placeholder="Sharma Sweets" autoFocus /></Field>
        <Field label="Contact name *"><Input value={f.contactName} onChange={(e) => set({ contactName: e.target.value })} placeholder="Rakesh Sharma" /></Field>
        <Field label="Role"><Input value={f.role} onChange={(e) => set({ role: e.target.value })} placeholder="Owner" /></Field>
        <Field label="Phone *"><Input value={f.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="+91 98XXX XXXXX" /></Field>
        <Field label="Email"><Input type="email" value={f.email} onChange={(e) => set({ email: e.target.value })} placeholder="name@company.in" /></Field>
        <Field label="City *"><Input value={f.city} onChange={(e) => set({ city: e.target.value })} placeholder="Mumbai" /></Field>
        <Field label="Industry"><Input value={f.industry} onChange={(e) => set({ industry: e.target.value })} placeholder="Food & Catering" /></Field>
        <Field label="Website (leave blank if none)"><Input value={f.website} onChange={(e) => set({ website: e.target.value })} placeholder="—" /></Field>
        <Field label="Source">
          <select value={f.source} onChange={(e) => set({ source: e.target.value as Lead["source"] })}
            className="h-10 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm">
            {sources.map((i) => <option key={i.v} value={i.v}>{i.label}</option>)}
          </select>
        </Field>
        <Field label="Estimated value (₹)"><Input type="number" value={f.estimatedValue} onChange={(e) => set({ estimatedValue: +e.target.value })} /></Field>
      </div>

      <div className="mt-3">
        <div className="mb-1.5 text-xs font-medium text-[var(--muted)]">Interested in <span className="text-[var(--muted-2)]">(select all that apply)</span></div>
        <div className="flex flex-wrap gap-2">
          {interests.map((i) => {
            const on = (f.interests ?? [f.interest]).includes(i.v);
            return (
              <button
                key={i.v}
                type="button"
                onClick={() => toggleInterest(i.v)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${on ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]" : "border-[var(--border-strong)] text-[var(--muted)] hover:bg-[var(--surface-2)]"}`}
              >
                {i.label}
              </button>
            );
          })}
        </div>
      </div>

      {!f.website && (
        <div className="mt-3 rounded-lg bg-[var(--warning-soft)]/50 px-3 py-2 text-xs text-[var(--warning)]">
          No website → auto-tagged <strong>no-website</strong> and scored as a hot prospect.
        </div>
      )}
    </Modal>
  );
}
