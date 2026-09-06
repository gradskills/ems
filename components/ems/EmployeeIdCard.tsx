"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useApp } from "@/lib/store";
import { departmentById } from "@/lib/seed/org";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/primitives";
import { roleLabel } from "@/lib/ems";
import { formatDate, initials, avatarColor } from "@/lib/utils";
import {
  Sparkles, Printer, Contact, ShieldCheck, RotateCw, Phone, Mail,
  Droplet, Cake, MapPin, Globe, Building2, AlertCircle,
} from "lucide-react";
import type { User, CompanySettings } from "@/lib/types";

// A scannable vCard — scanning the QR saves the employee as a phone contact.
function vCardFor(emp: User, deptName: string, org: string): string {
  const [last, ...rest] = emp.name.split(" ").reverse();
  const first = rest.reverse().join(" ");
  return [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${last};${first};;;`,
    `FN:${emp.name}`,
    `ORG:${org};${deptName}`,
    emp.designation ? `TITLE:${emp.designation}` : "",
    emp.email ? `EMAIL;TYPE=work:${emp.email}` : "",
    emp.phone ? `TEL;TYPE=cell:${emp.phone}` : "",
    `NOTE:Employee ID ${emp.employeeId ?? emp.id}`,
    "END:VCARD",
  ].filter(Boolean).join("\n");
}

// A slimmed-down vCard for the QR itself — just name/phone/email. Less data
// means far fewer modules, so the QR stays clean and easy to scan.
function vCardMini(emp: User): string {
  return [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${emp.name}`,
    emp.phone ? `TEL:${emp.phone}` : "",
    emp.email ? `EMAIL:${emp.email}` : "",
    "END:VCARD",
  ].filter(Boolean).join("\n");
}

const CARD_W = 320;
const CARD_H = 500;

function companyAddress(c?: CompanySettings): string {
  if (!c) return "";
  return [c.address, [c.city, c.state].filter(Boolean).join(", "), c.pincode].filter(Boolean).join(", ");
}

// ── FRONT: the employee's personal identity ──
function IdCardFront({ employee }: { employee: User }) {
  const company = useApp((s) => s.company);
  const dept = departmentById(employee.departmentId);
  const brand = company?.brandName || "Gradskills";
  const idNo = employee.employeeId ?? `EMP-${employee.id}`;
  const qrData = vCardMini(employee);

  const rows: { icon: React.ReactNode; label: string; value?: string }[] = [
    { icon: <Phone size={13} />, label: "Phone", value: employee.phone },
    { icon: <Mail size={13} />, label: "Email", value: employee.personalEmail || employee.email },
    { icon: <Droplet size={13} />, label: "Blood group", value: employee.bloodGroup },
    { icon: <Cake size={13} />, label: "Date of birth", value: employee.dateOfBirth ? formatDate(employee.dateOfBirth) : undefined },
    { icon: <MapPin size={13} />, label: "Address", value: employee.address },
  ].filter((r) => r.value);

  const ec = employee.emergencyContactName || employee.emergencyContactPhone;

  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
      style={{ boxShadow: "var(--shadow-lg)" }}
    >
      {/* brand strip */}
      <div className="flex items-center gap-1.5 bg-[var(--primary)] px-5 py-2.5 text-white">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white/20">
          <Sparkles size={13} />
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">{brand}</span>
        <span className="ml-auto text-[10px] font-medium uppercase tracking-wider text-white/70">Employee ID</span>
      </div>

      {/* identity */}
      <div className="flex flex-col items-center px-5 pt-4 text-center">
        {employee.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={employee.avatarUrl} alt={employee.name} className="h-20 w-20 rounded-2xl object-cover ring-2 ring-[var(--primary-soft)]" />
        ) : (
          <div className="grid h-20 w-20 place-items-center rounded-2xl text-2xl font-bold text-white" style={{ background: avatarColor(employee.name) }}>
            {initials(employee.name)}
          </div>
        )}
        <h2 className="mt-2 text-lg font-bold leading-tight tracking-tight">{employee.name}</h2>
        <p className="text-xs text-[var(--muted)]">{employee.designation || roleLabel(employee, dept)}</p>
        <div className="mt-1.5 flex items-center gap-1.5">
          <span className="rounded-full bg-[var(--primary-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--primary)]">{dept?.name ?? "—"}</span>
          <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-semibold text-[var(--muted)]">{idNo}</span>
        </div>
      </div>

      {/* personal fields */}
      <div className="mt-3 flex-1 space-y-1.5 px-5 text-left">
        {rows.map((r) => (
          <div key={r.label} className="flex items-start gap-2">
            <span className="mt-0.5 text-[var(--primary)]">{r.icon}</span>
            <div className="min-w-0">
              <div className="text-[9px] font-semibold uppercase tracking-wider text-[var(--muted-2)]">{r.label}</div>
              <div className="text-xs font-medium leading-snug">{r.value}</div>
            </div>
          </div>
        ))}
        {ec && (
          <div className="flex items-start gap-2 rounded-lg bg-[var(--danger-soft)] px-2 py-1.5">
            <span className="mt-0.5 text-[var(--danger)]"><AlertCircle size={13} /></span>
            <div className="min-w-0">
              <div className="text-[9px] font-semibold uppercase tracking-wider text-[var(--danger)]">Emergency contact</div>
              <div className="text-xs font-medium leading-snug">
                {employee.emergencyContactName}
                {employee.emergencyContactRelation ? ` (${employee.emergencyContactRelation})` : ""}
                {employee.emergencyContactPhone ? ` · ${employee.emergencyContactPhone}` : ""}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* QR footer */}
      <div className="mt-2 flex items-center gap-3 border-t border-[var(--border)] px-5 py-3">
        <div className="id-qr shrink-0 rounded-lg bg-white p-1.5 ring-1 ring-[var(--border)]">
          <QRCodeSVG value={qrData} size={54} level="L" marginSize={0} />
        </div>
        <div className="text-[10px] leading-tight text-[var(--muted)]">
          Scan to save contact.
          <br />Tap the card to see company details.
        </div>
      </div>
    </div>
  );
}

// ── BACK: the company's details ──
function IdCardBack() {
  const company = useApp((s) => s.company);
  const org = company?.legalName || "Gradskills EMS";
  const brand = company?.brandName || "Gradskills";
  const addr = companyAddress(company);

  const rows: { icon: React.ReactNode; label: string; value?: string }[] = [
    { icon: <MapPin size={13} />, label: "Registered office", value: addr },
    { icon: <Phone size={13} />, label: "Phone", value: company?.phone },
    { icon: <Mail size={13} />, label: "Email", value: company?.email },
    { icon: <Globe size={13} />, label: "Website", value: company?.website },
  ].filter((r) => r.value);

  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--primary)] text-white"
      style={{ boxShadow: "var(--shadow-lg)" }}
    >
      <div className="flex flex-1 flex-col px-5 pt-6">
        <div className="flex items-center gap-2">
          {company?.logoDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={company.logoDataUrl} alt={brand} className="h-10 w-10 rounded-lg bg-white object-contain p-1" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15"><Building2 size={20} /></div>
          )}
          <div className="leading-tight">
            <div className="text-lg font-bold">{brand}</div>
            {company?.tagline && <div className="text-[10px] text-white/70">{company.tagline}</div>}
          </div>
        </div>

        <div className="mt-2 text-[11px] font-medium text-white/80">{org}</div>

        <div className="mt-4 space-y-2.5">
          {rows.map((r) => (
            <div key={r.label} className="flex items-start gap-2">
              <span className="mt-0.5 text-white/70">{r.icon}</span>
              <div className="min-w-0">
                <div className="text-[9px] font-semibold uppercase tracking-wider text-white/50">{r.label}</div>
                <div className="text-xs font-medium leading-snug">{r.value}</div>
              </div>
            </div>
          ))}
        </div>

        {(company?.regId || company?.gstin) && (
          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/15 pt-3">
            {company?.regId && (
              <div><div className="text-[9px] font-semibold uppercase tracking-wider text-white/50">Reg. ID</div><div className="text-[11px] font-medium">{company.regId}</div></div>
            )}
            {company?.gstin && (
              <div><div className="text-[9px] font-semibold uppercase tracking-wider text-white/50">GSTIN</div><div className="text-[11px] font-medium">{company.gstin}</div></div>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-white/15 px-5 py-3 text-center text-[10px] leading-snug text-white/70">
        <ShieldCheck size={14} className="mx-auto mb-1 text-white/60" />
        This card is the property of {org}. If found, please return it to the registered office above.
      </div>
    </div>
  );
}

/** Interactive flip card — front by default, tap to rotate to the back. */
export function EmployeeIdCard({ employee }: { employee: User }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <div className="flex flex-col items-center gap-2">
      <div style={{ perspective: "1400px", width: CARD_W, height: CARD_H }}>
        <button
          type="button"
          onClick={() => setFlipped((f) => !f)}
          aria-label="Flip ID card"
          id="id-card-live"
          className="relative block h-full w-full cursor-pointer rounded-3xl outline-none"
          style={{
            transformStyle: "preserve-3d",
            transition: "transform 0.6s cubic-bezier(0.4,0.2,0.2,1)",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          <div className="absolute inset-0" style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}>
            <IdCardFront employee={employee} />
          </div>
          <div className="absolute inset-0" style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
            <IdCardBack />
          </div>
        </button>
      </div>
      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--muted)] hover:text-[var(--primary)]"
      >
        <RotateCw size={13} /> Tap card to see {flipped ? "front" : "back"}
      </button>
    </div>
  );
}

// ── printable HTML (both faces, flat, un-clipped) — opened in a new window so
// the browser's "Save as PDF" captures the whole card, not just the top. ──
function buildPrintHtml(employee: User, company: CompanySettings, deptName: string, qrSvg: string): string {
  const org = company.legalName || "Gradskills EMS";
  const brand = company.brandName || "Gradskills";
  const idNo = employee.employeeId ?? `EMP-${employee.id}`;
  const esc = (s?: string) => (s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
  const addr = companyAddress(company);
  const avatar = employee.avatarUrl
    ? `<img src="${esc(employee.avatarUrl)}" class="photo" alt=""/>`
    : `<div class="photo initials">${esc(initials(employee.name))}</div>`;
  const row = (label: string, value?: string) => (value ? `<div class="row"><span class="lbl">${esc(label)}</span><span class="val">${esc(value)}</span></div>` : "");
  const ec = [employee.emergencyContactName, employee.emergencyContactRelation ? `(${employee.emergencyContactRelation})` : "", employee.emergencyContactPhone].filter(Boolean).join(" ");

  return `<!doctype html><html><head><meta charset="utf-8"/><title>${esc(employee.name)} — ID Card</title>
<style>
  :root { --p:#4f46e5; }
  * { box-sizing:border-box; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  body { margin:0; font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif; color:#1b2330; background:#eef1f6; }
  .sheet { display:flex; flex-wrap:wrap; gap:24px; justify-content:center; align-items:flex-start; padding:28px; }
  .card { width:320px; height:500px; border-radius:24px; overflow:hidden; box-shadow:0 10px 30px rgba(20,30,60,.18); background:#fff; display:flex; flex-direction:column; }
  .front .strip { background:var(--p); color:#fff; padding:10px 20px; font-size:11px; font-weight:700; letter-spacing:.18em; text-transform:uppercase; display:flex; justify-content:space-between; }
  .front .id { text-align:center; padding:16px 20px 0; }
  .photo { width:80px; height:80px; border-radius:16px; object-fit:cover; margin:0 auto; display:block; }
  .initials { background:var(--p); color:#fff; font-size:26px; font-weight:700; display:flex; align-items:center; justify-content:center; }
  .name { font-size:18px; font-weight:700; margin:8px 0 2px; }
  .desig { font-size:12px; color:#667085; }
  .tags { margin-top:6px; display:flex; gap:6px; justify-content:center; }
  .tag { border-radius:999px; padding:2px 8px; font-size:10px; font-weight:600; background:#eef2ff; color:var(--p); }
  .tag.muted { background:#f1f3f6; color:#667085; }
  .fields { padding:14px 20px; flex:1; }
  .row { margin-bottom:8px; }
  .lbl { display:block; font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:#98a2b3; }
  .val { display:block; font-size:12px; font-weight:500; }
  .ec { background:#fef2f2; border-radius:8px; padding:8px; }
  .ec .lbl { color:#dc2626; }
  .qr { display:flex; align-items:center; gap:12px; border-top:1px solid #e3e7ec; padding:12px 20px; }
  .qr .box { background:#fff; padding:4px; border:1px solid #e3e7ec; border-radius:8px; line-height:0; }
  .qr .cap { font-size:10px; color:#667085; }
  .back { background:var(--p); color:#fff; }
  .back .inner { flex:1; padding:24px 20px 0; }
  .back .brand { font-size:18px; font-weight:700; }
  .back .tagline { font-size:10px; color:rgba(255,255,255,.7); }
  .back .org { font-size:11px; font-weight:500; color:rgba(255,255,255,.8); margin-top:8px; }
  .back .row { margin-top:12px; }
  .back .lbl { color:rgba(255,255,255,.55); }
  .back .foot { border-top:1px solid rgba(255,255,255,.15); padding:12px 20px; font-size:10px; text-align:center; color:rgba(255,255,255,.75); }
  @media print { body { background:#fff; } .sheet { padding:0; gap:16px; } .card { box-shadow:none; border:1px solid #e3e7ec; page-break-inside:avoid; } }
</style></head><body>
<div class="sheet">
  <div class="card front">
    <div class="strip"><span>${esc(brand)}</span><span>Employee ID</span></div>
    <div class="id">
      ${avatar}
      <div class="name">${esc(employee.name)}</div>
      <div class="desig">${esc(employee.designation || deptName)}</div>
      <div class="tags"><span class="tag">${esc(deptName)}</span><span class="tag muted">${esc(idNo)}</span></div>
    </div>
    <div class="fields">
      ${row("Phone", employee.phone)}
      ${row("Email", employee.personalEmail || employee.email)}
      ${row("Blood group", employee.bloodGroup)}
      ${row("Date of birth", employee.dateOfBirth ? formatDate(employee.dateOfBirth) : undefined)}
      ${row("Address", employee.address)}
      ${ec ? `<div class="ec"><span class="lbl">Emergency contact</span><span class="val">${esc(ec)}</span></div>` : ""}
    </div>
    <div class="qr"><div class="box">${qrSvg}</div><div class="cap">Scan to save contact.</div></div>
  </div>
  <div class="card back">
    <div class="inner">
      <div class="brand">${esc(brand)}</div>
      ${company.tagline ? `<div class="tagline">${esc(company.tagline)}</div>` : ""}
      <div class="org">${esc(org)}</div>
      ${row("Registered office", addr)}
      ${row("Phone", company.phone)}
      ${row("Email", company.email)}
      ${row("Website", company.website)}
      ${row("Reg. ID", company.regId)}
      ${row("GSTIN", company.gstin)}
    </div>
    <div class="foot">This card is the property of ${esc(org)}. If found, please return it to the registered office above.</div>
  </div>
</div>
<script>window.onload=function(){setTimeout(function(){window.print();},250);};</script>
</body></html>`;
}

/** Modal wrapper with flip preview + Print/Save-PDF and Save-contact actions. */
export function IdCardModal({ open, onClose, employee }: { open: boolean; onClose: () => void; employee: User }) {
  const company = useApp((s) => s.company);
  const dept = departmentById(employee.departmentId);

  function saveContact() {
    const vcard = vCardFor(employee, dept?.name ?? "", company?.legalName || "Gradskills EMS");
    const blob = new Blob([vcard], { type: "text/vcard" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${employee.name.replace(/\s+/g, "-")}-gradskills-id.vcf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function printCard() {
    // grab the live QR svg so the printout carries the same code
    const liveQr = document.querySelector("#id-card-live .id-qr svg");
    const qrSvg = liveQr ? liveQr.outerHTML : "";
    const html = buildPrintHtml(employee, company, dept?.name ?? "—", qrSvg);
    const w = window.open("", "_blank", "width=760,height=620");
    if (!w) return; // pop-up blocked
    w.document.open();
    w.document.write(html);
    w.document.close();
  }

  return (
    <Modal open={open} onClose={onClose} title="Digital ID Card" size="sm">
      <div className="py-1">
        <EmployeeIdCard employee={employee} />
        <div className="id-card-actions mt-4 flex justify-center gap-2">
          <Button variant="outline" size="sm" onClick={printCard}><Printer size={14} /> Print / Save PDF</Button>
          <Button variant="outline" size="sm" onClick={saveContact}><Contact size={14} /> Save contact</Button>
        </div>
      </div>
    </Modal>
  );
}
