"use client";

import { useRef, useState } from "react";
import { useApp, type NewLeadInput } from "@/lib/store";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/primitives";
import { downloadCSV } from "@/lib/exports";
import type { Lead } from "@/lib/types";
import { UploadCloud, FileSpreadsheet, Download, Check, AlertTriangle } from "lucide-react";

// Excel → "Save As CSV" is the interchange format we accept here (no binary xlsx parser
// needed in the prototype). Columns are matched by header name, order-independent.
const TEMPLATE_HEADERS = ["company", "contactName", "role", "phone", "email", "city", "industry", "website", "interest", "source", "estimatedValue"];

const interestValues: Lead["interest"][] = ["website", "social_media", "outreach", "combo"];
const sourceValues: Lead["source"][] = ["google_maps", "manual_research", "referral", "inbound_website", "indiamart", "walk_in"];

// tolerant CSV parser (handles quoted cells with commas / newlines)
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; } else inQuotes = false;
      } else cur += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(cur); cur = ""; }
    else if (c === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
    else if (c === "\r") { /* skip */ }
    else cur += c;
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

function coerceInterest(v: string): Lead["interest"] {
  const n = norm(v);
  return interestValues.find((x) => norm(x) === n) ?? (n.includes("social") ? "social_media" : n.includes("web") ? "website" : n.includes("out") ? "outreach" : "combo");
}
function coerceSource(v: string): Lead["source"] {
  const n = norm(v);
  return sourceValues.find((x) => norm(x) === n) ?? (n.includes("map") ? "google_maps" : n.includes("refer") ? "referral" : n.includes("indiamart") ? "indiamart" : n.includes("walk") ? "walk_in" : n.includes("inbound") || n.includes("website") ? "inbound_website" : "manual_research");
}

function rowsToLeads(rows: string[][]): { leads: NewLeadInput[]; skipped: number; error?: string } {
  if (rows.length < 2) return { leads: [], skipped: 0, error: "Need a header row plus at least one data row." };
  const header = rows[0].map(norm);
  const idx = (name: string) => header.indexOf(norm(name));
  const ci = { company: idx("company"), contactName: idx("contactName"), role: idx("role"), phone: idx("phone"), email: idx("email"), city: idx("city"), industry: idx("industry"), website: idx("website"), interest: idx("interest"), source: idx("source"), estimatedValue: idx("estimatedValue") };
  if (ci.company < 0) return { leads: [], skipped: 0, error: "Missing a required 'company' column." };
  const at = (r: string[], i: number) => (i >= 0 ? (r[i] ?? "").trim() : "");
  const leads: NewLeadInput[] = [];
  let skipped = 0;
  for (const r of rows.slice(1)) {
    const company = at(r, ci.company);
    if (!company) { skipped++; continue; }
    leads.push({
      company,
      contactName: at(r, ci.contactName) || "—",
      role: at(r, ci.role) || "Owner",
      phone: at(r, ci.phone),
      email: at(r, ci.email) || undefined,
      city: at(r, ci.city) || "—",
      industry: at(r, ci.industry) || "—",
      website: at(r, ci.website) || undefined,
      interest: coerceInterest(at(r, ci.interest)),
      source: coerceSource(at(r, ci.source)),
      estimatedValue: Number(at(r, ci.estimatedValue).replace(/[^0-9.]/g, "")) || 0,
    });
  }
  return { leads, skipped };
}

export function ImportLeadsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const bulkCreateLeads = useApp((s) => s.bulkCreateLeads);
  const [raw, setRaw] = useState("");
  const [fileName, setFileName] = useState("");
  const [done, setDone] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const parsed = raw.trim() ? rowsToLeads(parseCSV(raw)) : { leads: [], skipped: 0 };

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setRaw(String(reader.result ?? ""));
    reader.readAsText(file);
  }

  function downloadTemplate() {
    downloadCSV("leads-import-template", [
      TEMPLATE_HEADERS,
      ["Sharma Sweets", "Rakesh Sharma", "Owner", "+91 98XXX XXXXX", "rakesh@example.com", "Mumbai", "Food & Catering", "", "combo", "google_maps", "85000"],
      ["Green Leaf Ayurveda", "Meera Iyer", "Founder", "+91 90XXX XXXXX", "meera@example.com", "Pune", "Wellness", "greenleaf.example", "social_media", "referral", "30000"],
    ]);
  }

  function reset() { setRaw(""); setFileName(""); setDone(null); if (fileRef.current) fileRef.current.value = ""; }
  function close() { reset(); onClose(); }

  function doImport() {
    const n = bulkCreateLeads(parsed.leads);
    setDone(n);
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Import leads from Excel"
      size="xl"
      footer={
        done === null ? (
          <>
            <Button variant="ghost" onClick={close}>Cancel</Button>
            <Button disabled={!parsed.leads.length} onClick={doImport}>
              Import {parsed.leads.length || ""} {parsed.leads.length === 1 ? "lead" : "leads"}
            </Button>
          </>
        ) : (
          <Button onClick={close}>Done</Button>
        )
      }
    >
      {done !== null ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--success-soft)] text-[var(--success)]"><Check size={26} /></div>
          <div className="text-lg font-semibold">{done} lead{done === 1 ? "" : "s"} imported</div>
          <p className="max-w-sm text-sm text-[var(--muted)]">They&apos;ve been added to your leads and assigned to you. You can now work them from the Leads screen.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm">
            <div className="flex items-start gap-2">
              <FileSpreadsheet size={18} className="mt-0.5 shrink-0 text-[var(--primary)]" />
              <div>
                <p className="font-medium">Export your Excel sheet as CSV, then upload it here.</p>
                <p className="mt-0.5 text-xs text-[var(--muted)]">In Excel: <em>File → Save As → CSV (Comma delimited)</em>. Column order doesn&apos;t matter — we match by header name. A <strong>company</strong> column is required.</p>
                <button onClick={downloadTemplate} className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--primary)] hover:underline">
                  <Download size={13} /> Download CSV template
                </button>
              </div>
            </div>
          </div>

          <div>
            <button
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-[var(--border-strong)] px-4 py-6 text-center transition-colors hover:border-[var(--primary)] hover:bg-[var(--surface-2)]"
            >
              <UploadCloud size={26} className="text-[var(--muted)]" />
              <span className="text-sm font-medium">{fileName || "Choose a .csv file"}</span>
              <span className="text-xs text-[var(--muted-2)]">or paste the rows below</span>
            </button>
            <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" />
          </div>

          <div>
            <div className="mb-1 text-xs font-medium text-[var(--muted)]">Paste CSV (first row = headers)</div>
            <textarea
              value={raw}
              onChange={(e) => { setRaw(e.target.value); setFileName(""); }}
              placeholder={TEMPLATE_HEADERS.join(",") + "\nSharma Sweets,Rakesh Sharma,Owner,+91 98XXX XXXXX,rakesh@example.com,Mumbai,Food,,combo,google_maps,85000"}
              className="h-28 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 font-mono text-xs outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]"
            />
          </div>

          {raw.trim() && (
            parsed.error ? (
              <div className="flex items-center gap-2 rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">
                <AlertTriangle size={16} /> {parsed.error}
              </div>
            ) : (
              <div>
                <div className="mb-1 flex items-center justify-between text-xs text-[var(--muted)]">
                  <span><strong className="text-[var(--foreground)]">{parsed.leads.length}</strong> rows ready{parsed.skipped ? ` · ${parsed.skipped} skipped (no company)` : ""}</span>
                  <span>Preview (first 5)</span>
                </div>
                <div className="overflow-hidden rounded-lg border border-[var(--border)]">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-left text-[var(--muted)]">
                        <th className="px-2.5 py-2">Company</th><th className="px-2.5 py-2">Contact</th><th className="px-2.5 py-2">City</th><th className="px-2.5 py-2">Interest</th><th className="px-2.5 py-2">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.leads.slice(0, 5).map((l, i) => (
                        <tr key={i} className="border-b border-[var(--border)] last:border-0">
                          <td className="px-2.5 py-1.5 font-medium">{l.company}</td>
                          <td className="px-2.5 py-1.5 text-[var(--muted)]">{l.contactName}</td>
                          <td className="px-2.5 py-1.5 text-[var(--muted)]">{l.city}</td>
                          <td className="px-2.5 py-1.5 text-[var(--muted)]">{l.interest.replace("_", " ")}</td>
                          <td className="px-2.5 py-1.5">{l.estimatedValue ? `₹${l.estimatedValue.toLocaleString("en-IN")}` : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </Modal>
  );
}
