"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { Card, Badge, Button } from "@/components/ui/primitives";
import { PageHeader } from "@/components/ems/kit";
import { Modal, Field, Input, Textarea } from "@/components/ui/modal";
import type { FormField } from "@/lib/types";
import { relativeTime } from "@/lib/utils";
import { Plus, ClipboardList, ExternalLink, Copy, Check, Users } from "lucide-react";

const STARTER_FIELDS: FormField[] = [
  { id: "s1", label: "Business name", type: "short_text", required: true, mapTo: "company" },
  { id: "s2", label: "Your name", type: "short_text", required: true, mapTo: "contactName" },
  { id: "s3", label: "Email", type: "email", required: true, mapTo: "email" },
  { id: "s4", label: "Phone", type: "phone", required: true, mapTo: "phone" },
  { id: "s5", label: "City", type: "short_text", mapTo: "city" },
  { id: "s6", label: "What are you interested in?", type: "select", options: ["Website", "Social media", "Outreach", "Combo"], mapTo: "interest" },
];

export default function FormsPage() {
  const forms = useApp((s) => s.forms);
  const responses = useApp((s) => s.formResponses);
  const createForm = useApp((s) => s.createForm);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  function create() {
    if (!title.trim()) return;
    const id = createForm({ title: title.trim(), description: desc.trim() || undefined, fields: STARTER_FIELDS.map((f, i) => ({ ...f, id: `f${Date.now()}${i}` })), autoCreateLead: true });
    setOpen(false); setTitle(""); setDesc("");
    router.push(`/forms/${id}`);
  }

  function copyLink(token: string) {
    const url = `${location.origin}/f/${token}`;
    navigator.clipboard?.writeText(url);
    setCopied(token);
    setTimeout(() => setCopied(null), 1800);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Forms"
        subtitle="Create shareable forms — every submission becomes a lead automatically"
        action={<Button onClick={() => setOpen(true)}><Plus size={16} /> New form</Button>}
      />

      {forms.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-[var(--border-strong)] py-16 text-center">
          <ClipboardList size={28} className="text-[var(--muted-2)]" />
          <p className="text-sm font-medium">No forms yet</p>
          <p className="max-w-xs text-xs text-[var(--muted)]">Build a lead-capture form and share the link on your website, WhatsApp or ads.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {forms.map((f) => {
            const count = responses.filter((r) => r.formId === f.id).length;
            return (
              <Card key={f.id} className="flex flex-col p-5">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <Link href={`/forms/${f.id}`} className="font-semibold hover:text-[var(--primary)]">{f.title}</Link>
                  <Badge color={f.published ? "success" : "slate"} dot>{f.published ? "Live" : "Draft"}</Badge>
                </div>
                {f.description && <p className="mb-3 line-clamp-2 text-xs text-[var(--muted)]">{f.description}</p>}
                <div className="mb-3 flex items-center gap-3 text-xs text-[var(--muted)]">
                  <span className="flex items-center gap-1"><Users size={13} /> {count} response{count === 1 ? "" : "s"}</span>
                  <span>· {f.fields.length} fields</span>
                  <span>· {relativeTime(f.createdAt)}</span>
                </div>
                <div className="mt-auto flex flex-wrap gap-2 pt-1">
                  <Link href={`/forms/${f.id}`}><Button size="sm" variant="outline">Open</Button></Link>
                  <Button size="sm" variant="ghost" onClick={() => copyLink(f.token)}>{copied === f.token ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Link</>}</Button>
                  <Link href={`/f/${f.token}`} target="_blank"><Button size="sm" variant="ghost"><ExternalLink size={14} /> View</Button></Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New form"
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={create} disabled={!title.trim()}>Create &amp; edit</Button></>}
      >
        <div className="space-y-3">
          <Field label="Form title"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Get a Free Digital Audit" autoFocus /></Field>
          <Field label="Description (optional)"><Textarea rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Shown under the title on the public form" /></Field>
          <p className="text-xs text-[var(--muted-2)]">Starts with common lead fields (name, email, phone, interest). You can add or remove fields next.</p>
        </div>
      </Modal>
    </div>
  );
}
