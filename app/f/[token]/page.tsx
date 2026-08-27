"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useApp } from "@/lib/store";
import { Button } from "@/components/ui/primitives";
import { Sparkles, Check, AlertTriangle } from "lucide-react";

export default function PublicFormPage() {
  const params = useParams<{ token: string }>();
  const forms = useApp((s) => s.forms);
  const company = useApp((s) => s.company);
  const submitFormResponse = useApp((s) => s.submitFormResponse);

  const form = forms.find((f) => f.token === params.token);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  if (!form) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-6 text-center">
        <div>
          <AlertTriangle size={30} className="mx-auto text-[var(--muted-2)]" />
          <p className="mt-2 text-sm text-[var(--muted)]">This form link is invalid or has been removed.</p>
        </div>
      </div>
    );
  }

  const set = (id: string, v: string) => setAnswers((a) => ({ ...a, [id]: v }));

  function toggleCheckbox(fieldId: string, option: string) {
    const cur = (answers[fieldId] ?? "").split(", ").filter(Boolean);
    const next = cur.includes(option) ? cur.filter((x) => x !== option) : [...cur, option];
    set(fieldId, next.join(", "));
  }

  function submit() {
    const missing = form!.fields.find((f) => f.required && !(answers[f.id] ?? "").trim());
    if (missing) { setError(`Please fill: ${missing.label}`); return; }
    submitFormResponse(form!.token, answers);
    setDone(true);
  }

  const inputCls = "h-11 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]";

  return (
    <div className="min-h-screen bg-[var(--background)] px-4 py-10">
      <div className="mx-auto max-w-xl">
        {/* brand header */}
        <div className="mb-4 flex items-center gap-2">
          {company.logoDataUrl ? (
            <img src={company.logoDataUrl} alt={company.brandName} className="h-9 object-contain" />
          ) : (
            <>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)] text-white"><Sparkles size={18} /></div>
              <span className="text-sm font-bold">{company.brandName}</span>
            </>
          )}
        </div>

        {done ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-[var(--shadow-sm)]">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--success-soft)] text-[var(--success)]"><Check size={30} /></div>
            <h1 className="mt-4 text-xl font-bold">Thank you!</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">Your response has been recorded. Our team will be in touch shortly.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
            <div className="border-t-4 border-[var(--primary)] p-6">
              <h1 className="text-xl font-bold tracking-tight">{form.title}</h1>
              {form.description && <p className="mt-1 text-sm text-[var(--muted)]">{form.description}</p>}
            </div>
            <div className="space-y-5 border-t border-[var(--border)] p-6">
              {form.fields.map((f) => (
                <div key={f.id}>
                  <label className="mb-1.5 block text-sm font-medium">
                    {f.label} {f.required && <span className="text-[var(--danger)]">*</span>}
                  </label>
                  {f.type === "long_text" ? (
                    <textarea rows={3} value={answers[f.id] ?? ""} onChange={(e) => set(f.id, e.target.value)} className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]" />
                  ) : f.type === "select" ? (
                    <select value={answers[f.id] ?? ""} onChange={(e) => set(f.id, e.target.value)} className={inputCls}>
                      <option value="">Select…</option>
                      {(f.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : f.type === "checkbox" ? (
                    <div className="flex flex-wrap gap-2">
                      {(f.options ?? []).map((o) => {
                        const on = (answers[f.id] ?? "").split(", ").includes(o);
                        return (
                          <button key={o} type="button" onClick={() => toggleCheckbox(f.id, o)} className={`rounded-full border px-3 py-1.5 text-xs font-medium ${on ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]" : "border-[var(--border-strong)] text-[var(--muted)]"}`}>{o}</button>
                        );
                      })}
                    </div>
                  ) : (
                    <input
                      type={f.type === "email" ? "email" : f.type === "phone" ? "tel" : f.type === "number" ? "number" : "text"}
                      value={answers[f.id] ?? ""}
                      onChange={(e) => set(f.id, e.target.value)}
                      className={inputCls}
                    />
                  )}
                </div>
              ))}
              {error && <div className="flex items-center gap-2 rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]"><AlertTriangle size={15} /> {error}</div>}
              <Button className="w-full" onClick={submit}>Submit</Button>
              <p className="text-center text-[11px] text-[var(--muted-2)]">Powered by {company.brandName}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
