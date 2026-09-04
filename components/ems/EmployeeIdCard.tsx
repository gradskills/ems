"use client";

import { QRCodeSVG } from "qrcode.react";
import { useApp } from "@/lib/store";
import { departmentById } from "@/lib/seed/org";
import { userById } from "@/lib/seed/users";
import { Modal } from "@/components/ui/modal";
import { Badge, Button } from "@/components/ui/primitives";
import { roleLabel } from "@/lib/ems";
import { formatDate, initials, avatarColor } from "@/lib/utils";
import { Sparkles, Printer, Contact, ShieldCheck } from "lucide-react";
import type { User } from "@/lib/types";

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
// means far fewer modules, so the QR stays clean and easy to scan. The full
// vCard above is kept for the "Save contact" download.
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

/** The card visual on its own — reused by the modal and by print. */
export function EmployeeIdCard({ employee }: { employee: User }) {
  const company = useApp((s) => s.company);
  const dept = departmentById(employee.departmentId);
  const mgr = employee.managerId ? userById(employee.managerId) : undefined;
  const brand = company?.brandName || "Gradskills";
  const org = company?.legalName || "Gradskills EMS";
  const qrData = vCardMini(employee);
  const idNo = employee.employeeId ?? `EMP-${employee.id}`;

  const fields: { label: string; value: string }[] = [
    { label: "Employee ID", value: idNo },
    { label: "Department", value: dept?.name ?? "—" },
    { label: "Joined", value: employee.joinedAt ? formatDate(employee.joinedAt) : "—" },
    { label: "Reports to", value: mgr?.name ?? "—" },
  ];

  return (
    <div
      id="employee-id-card"
      className="mx-auto w-full max-w-[344px] overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)]"
    >
      {/* Top: identity on the left, large photo on the right */}
      <div className="px-5 pb-5 pt-5">
        <div className="mb-4 flex items-center gap-1.5 text-[var(--muted)]">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--primary-soft)] text-[var(--primary)]">
            <Sparkles size={13} />
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">{brand}</span>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-bold leading-[1.15] tracking-tight">{employee.name}</h2>
            <p className="mt-1 text-xs text-[var(--muted)]">{employee.designation || roleLabel(employee, dept)}</p>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <Badge color={dept?.color ?? "slate"}>{dept?.name}</Badge>
              <Badge color={employee.status === "active" ? "success" : employee.status === "on_leave" ? "warning" : "slate"} dot>
                {employee.status === "on_leave" ? "On leave" : employee.status ?? "active"}
              </Badge>
            </div>
          </div>
          {employee.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={employee.avatarUrl}
              alt={employee.name}
              className="h-24 w-24 shrink-0 rounded-[20px] object-cover shadow-[var(--shadow-sm)]"
            />
          ) : (
            <div
              className="grid h-24 w-24 shrink-0 place-items-center rounded-[20px] text-3xl font-bold text-white shadow-[var(--shadow-sm)]"
              style={{ background: avatarColor(employee.name) }}
            >
              {initials(employee.name)}
            </div>
          )}
        </div>
      </div>

      {/* Bottom: bold brand panel with QR + identity fields */}
      <div className="rounded-t-[28px] bg-[var(--primary)] px-5 pb-4 pt-5 text-white">
        <div className="mb-4 flex items-start justify-between">
          <div className="leading-tight">
            <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/70">Digital</div>
            <div className="text-lg font-bold">Employee ID Card</div>
          </div>
          <ShieldCheck size={18} className="text-white/70" />
        </div>

        <div className="flex gap-4">
          <div className="shrink-0 rounded-xl bg-white p-2 shadow-[var(--shadow-sm)]">
            <QRCodeSVG value={qrData} size={88} level="L" marginSize={0} />
          </div>
          <div className="grid min-w-0 flex-1 grid-cols-2 gap-x-3 gap-y-2 self-center">
            {fields.map((f) => (
              <div key={f.label} className="min-w-0">
                <div className="text-[9px] font-semibold uppercase tracking-wider text-white/60">{f.label}</div>
                <div className="truncate text-sm font-medium">{f.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 border-t border-white/15 pt-2.5 text-center text-[10px] text-white/60">
          Scan to save contact · Property of {org}
          {company?.website ? ` · ${company.website}` : ""}
        </div>
      </div>
    </div>
  );
}

/** Modal wrapper with Print / Save-as-PDF and Save-contact actions. */
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

  return (
    <Modal open={open} onClose={onClose} title="Digital ID Card" size="sm">
      {/* Print scope — only the card prints; the modal chrome is hidden. */}
      <style>{`@media print {
        body * { visibility: hidden !important; }
        #employee-id-card, #employee-id-card * { visibility: visible !important; }
        #employee-id-card { position: fixed; left: 50%; top: 40px; transform: translateX(-50%); box-shadow: none !important; }
      }`}</style>
      <div className="py-1">
        <EmployeeIdCard employee={employee} />
        <div className="id-card-actions mt-4 flex justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}><Printer size={14} /> Print / Save PDF</Button>
          <Button variant="outline" size="sm" onClick={saveContact}><Contact size={14} /> Save contact</Button>
        </div>
      </div>
    </Modal>
  );
}
