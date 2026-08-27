"use client";

import { useState } from "react";
import { useParams, notFound, useRouter } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { Card, Badge, Button } from "@/components/ui/primitives";
import { Tabs, InfoRow } from "@/components/ems/kit";
import { Field, Input, Textarea } from "@/components/ui/modal";
import type { FormField, FormFieldType } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { ChevronLeft, Plus, Trash2, Copy, Check, ExternalLink, GripVertical, Save, UserPlus } from "lucide-react";

const TYPES: { v: FormFieldType; label: string }[] = [
  { v: "short_text", label: "Short text" }, { v: "long_text", label: "Paragraph" }, { v: "email", label: "Email" },
  { v: "phone", label: "Phone" }, { v: "number", label: "Number" }, { v: "select", label: "Dropdown" }, { v: "checkbox", label: "Checkboxes" },
];
const MAPS: { v: NonNullable<FormField["mapTo"]>; label: string }[] = [
  { v: "none", label: "— not mapped —" }, { v: "company", label: "Company" }, { v: "contactName", label: "Contact name" },
  { v: "email", label: "Email" }, { v: "phone", label: "Phone" }, { v: "city", label: "City" }, { v: "industry", label: "Industry" },
  { v: "interest", label: "Interest" }, { v: "note", label: "Note / brief" },
];

export default function FormDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const forms = useApp((s) => s.forms);
  const responses = useApp((s) => s.formResponses);
  const updateForm = useApp((s) => s.updateForm);
  const deleteForm = useApp((s) => s.deleteForm);
  const convertResponseToLead = useApp((s) => s.convertResponseToLead);

  const form = forms.find((f) => f.id === params.id);
  const [tab, setTab] = useState<"build" | "responses">("build");
  const [draft, setDraft] = useState(() => form && { title: form.title, description: form.description ?? "", fields: form.fields, autoCreateLead: form.autoCreateLead });
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!form || !draft) return notFound();
  const formResponses = responses.filter((r) => r.formId === form.id).sort((a, b) => (a.at < b.at ? 1 : -1));

  function patch(p: Partial<NonNullable<typeof draft>>) { setDraft((d) => ({ ...d!, ...p })); }
  function setField(i: number, p: Partial<FormField>) {
    patch({ fields: draft!.fields.map((f, idx) => (idx === i ? { ...f, ...p } : f)) });
  }
  function addField() {
    patch({ fields: [...draft!.fields, { id: `f${Date.now()}`, label: "Untitled question", type: "short_text", mapTo: "none" }] });
  }
  function removeField(i: number) { patch({ fields: draft!.fields.filter((_, idx) => idx !== i) }); }
  function save() {
    updateForm(form!.id, { title: draft!.title, description: draft!.description, fields: draft!.fields, autoCreateLead: draft!.autoCreateLead });
    setSaved(true); setTimeout(() => setSaved(false), 1800);
  }
  function copyLink() {
    navigator.clipboard?.writeText(`${location.origin}/f/${form!.token}`);
    setCopied(true); setTimeout(() => setCopied(false), 1800);
  }
  function remove() {
    if (confirm("Delete this form and its responses?")) { deleteForm(form!.id); router.push("/forms"); }
  }

  return (
    <div className="space-y-5">
      <Link href="/forms" className="inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"><ChevronLeft size={16} /> All forms</Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{form.title}</h1>
          <p className="text-sm text-[var(--muted)]">Public link: <code className="text-xs">/f/{form.token}</code></p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={copyLink}>{copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy link</>}</Button>
          <Link href={`/f/${form.token}`} target="_blank"><Button variant="outline" size="sm"><ExternalLink size={14} /> Open form</Button></Link>
          <Button variant="ghost" size="sm" onClick={remove}><Trash2 size={14} /></Button>
        </div>
      </div>

      <Tabs tabs={[{ key: "build", label: "Build" }, { key: "responses", label: "Responses", count: formResponses.length }]} active={tab} onChange={setTab} />

      {tab === "build" && (
        <div className="space-y-4">
          <Card className="p-5">
            <div className="grid grid-cols-1 gap-4">
              <Field label="Form title"><Input value={draft.title} onChange={(e) => patch({ title: e.target.value })} /></Field>
              <Field label="Description"><Textarea rows={2} value={draft.description} onChange={(e) => patch({ description: e.target.value })} /></Field>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={draft.autoCreateLead} onChange={(e) => patch({ autoCreateLead: e.target.checked })} />
                Automatically create a lead from every submission
              </label>
            </div>
          </Card>

          <div className="space-y-3">
            {draft.fields.map((f, i) => (
              <Card key={f.id} className="p-4">
                <div className="flex items-start gap-3">
                  <GripVertical size={16} className="mt-2 shrink-0 text-[var(--muted-2)]" />
                  <div className="grid flex-1 gap-3 sm:grid-cols-2">
                    <Field label="Question"><Input value={f.label} onChange={(e) => setField(i, { label: e.target.value })} /></Field>
                    <Field label="Type">
                      <select value={f.type} onChange={(e) => setField(i, { type: e.target.value as FormFieldType })} className="h-10 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm">
                        {TYPES.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
                      </select>
                    </Field>
                    <Field label="Maps to lead field">
                      <select value={f.mapTo ?? "none"} onChange={(e) => setField(i, { mapTo: e.target.value as FormField["mapTo"] })} className="h-10 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm">
                        {MAPS.map((m) => <option key={m.v} value={m.v}>{m.label}</option>)}
                      </select>
                    </Field>
                    {(f.type === "select" || f.type === "checkbox") && (
                      <Field label="Options (comma separated)"><Input value={(f.options ?? []).join(", ")} onChange={(e) => setField(i, { options: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} /></Field>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <label className="flex items-center gap-1 text-[11px] text-[var(--muted)]">
                      <input type="checkbox" checked={!!f.required} onChange={(e) => setField(i, { required: e.target.checked })} /> Required
                    </label>
                    <button onClick={() => removeField(i)} className="rounded-md p-1.5 text-[var(--muted-2)] hover:bg-[var(--surface-2)] hover:text-[var(--danger)]"><Trash2 size={15} /></button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={addField}><Plus size={16} /> Add question</Button>
            <Button onClick={save}>{saved ? <><Check size={16} /> Saved</> : <><Save size={16} /> Save form</>}</Button>
          </div>
        </div>
      )}

      {tab === "responses" && (
        <Card className="overflow-hidden">
          {formResponses.length === 0 ? (
            <div className="py-14 text-center text-sm text-[var(--muted)]">No responses yet. Share the form link to start collecting leads.</div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {formResponses.map((r) => (
                <div key={r.id} className="p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs text-[var(--muted)]">{formatDate(r.at, true)}</span>
                    {r.convertedLeadId ? (
                      <Link href={`/leads/${r.convertedLeadId}`}><Badge color="success" dot>Lead created — open</Badge></Link>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => convertResponseToLead(r.id)}><UserPlus size={14} /> Create lead</Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
                    {form.fields.map((f) => (
                      <InfoRow key={f.id} label={f.label}>{r.answers[f.id] || "—"}</InfoRow>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
