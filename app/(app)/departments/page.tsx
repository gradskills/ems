"use client";

import { useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { Card, Badge, Button, Avatar } from "@/components/ui/primitives";
import { PageHeader } from "@/components/ems/kit";
import { Modal, Field, Input } from "@/components/ui/modal";
import { roleLabel } from "@/lib/ems";
import { downloadCSV } from "@/lib/exports";
import { userById } from "@/lib/seed/users";
import type { DeptFeature, Department } from "@/lib/types";
import { Plus, Building2, ChevronRight, Mail, Phone, Download, Users } from "lucide-react";

const ALL_FEATURES: { key: DeptFeature; label: string }[] = [
  { key: "leads", label: "Leads" },
  { key: "quotations", label: "Quotations" },
  { key: "invoices", label: "Invoices" },
  { key: "prospect_audit", label: "Prospect Audit" },
  { key: "audit_reports", label: "Audit Reports" },
  { key: "projects", label: "Projects" },
  { key: "timesheets", label: "Timesheets" },
  { key: "bugs", label: "Bug Tracker" },
  { key: "clients", label: "Clients" },
  { key: "content_calendar", label: "Content Calendar" },
  { key: "campaigns", label: "Campaigns" },
];
const COLORS: Department["color"][] = ["primary", "info", "purple", "success", "warning", "danger", "slate"];

export default function DepartmentsPage() {
  const departments = useApp((s) => s.departments);
  const employees = useApp((s) => s.employees);
  const addDepartment = useApp((s) => s.addDepartment);
  const [open, setOpen] = useState(false);
  const [viewDept, setViewDept] = useState<Department | null>(null);

  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [color, setColor] = useState<Department["color"]>("primary");
  const [features, setFeatures] = useState<DeptFeature[]>([]);

  function toggle(f: DeptFeature) {
    setFeatures((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));
  }
  function submit() {
    if (!name || !key) return;
    addDepartment({ name, key: key.toLowerCase().replace(/\s+/g, "_"), color, features });
    setOpen(false); setName(""); setKey(""); setFeatures([]); setColor("primary");
  }

  const viewMembers = viewDept ? employees.filter((u) => u.departmentId === viewDept.id) : [];

  function downloadMembers(dept: Department) {
    const members = employees.filter((u) => u.departmentId === dept.id);
    const header = ["Name", "Role", "Designation", "Access level", "Status", "Email", "Phone", "Reports to", "Location"];
    const rows = members.map((u) => [
      u.name, roleLabel(u, dept), u.designation ?? "", u.accessLevel, u.status ?? "active",
      u.email, u.phone, u.managerId ? userById(u.managerId)?.name ?? "" : "", u.location ?? "",
    ]);
    downloadCSV(`${dept.key}-team`, [header, ...rows]);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Departments & Roles"
        subtitle="Roles across the company — click a department to see its people"
        action={<Button onClick={() => setOpen(true)}><Plus size={16} /> New department</Button>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {departments.map((d) => {
          const members = employees.filter((u) => u.departmentId === d.id);
          const managers = members.filter((u) => u.accessLevel !== "employee");
          return (
            <Card key={d.id} className="lift cursor-pointer p-5" onClick={() => setViewDept(d)}>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--surface-2)]"><Building2 size={18} className="text-[var(--muted)]" /></div>
                  <div>
                    <div className="font-semibold">{d.name}</div>
                    <div className="text-[11px] text-[var(--muted-2)]">{d.key} · {members.length} people</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {d.system && <Badge color="slate">System</Badge>}
                  <ChevronRight size={16} className="text-[var(--muted-2)]" />
                </div>
              </div>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {d.features.length === 0 && <span className="text-xs text-[var(--muted-2)]">No workspace modules (support dept)</span>}
                {d.features.map((f) => <Badge key={f} color={d.color}>{ALL_FEATURES.find((x) => x.key === f)?.label ?? f}</Badge>)}
              </div>
              <div className="flex -space-x-2">
                {members.slice(0, 6).map((u) => <div key={u.id} className="ring-2 ring-[var(--surface)] rounded-full"><Avatar name={u.name} size={28} /></div>)}
                {members.length > 6 && <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--surface-2)] text-[10px] font-medium ring-2 ring-[var(--surface)]">+{members.length - 6}</div>}
              </div>
              {managers.length > 0 && <div className="mt-2 text-[11px] text-[var(--muted)]">Lead: {managers.map((m) => m.name).join(", ")}</div>}
            </Card>
          );
        })}
      </div>

      {/* Department members panel */}
      <Modal
        open={viewDept !== null}
        onClose={() => setViewDept(null)}
        size="lg"
        title={
          viewDept && (
            <span className="flex items-center gap-2">
              <Building2 size={18} className="text-[var(--muted)]" />
              {viewDept.name} team
              <Badge color={viewDept.color}>{viewMembers.length}</Badge>
            </span>
          )
        }
        footer={
          viewDept && (
            <>
              <Button variant="outline" onClick={() => downloadMembers(viewDept)} disabled={!viewMembers.length}><Download size={15} /> Download list</Button>
              <Button variant="ghost" onClick={() => setViewDept(null)}>Close</Button>
            </>
          )
        }
      >
        {viewMembers.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-[var(--muted)]">
            <Users size={26} className="text-[var(--muted-2)]" />
            <p className="text-sm">No one is in this department yet.</p>
          </div>
        ) : (
          <div className="-mx-1 divide-y divide-[var(--border)]">
            {viewMembers
              .slice()
              .sort((a, b) => (a.accessLevel === b.accessLevel ? 0 : a.accessLevel === "manager" || a.accessLevel === "admin" ? -1 : 1))
              .map((u) => {
                const mgr = u.managerId ? userById(u.managerId) : undefined;
                return (
                  <Link
                    key={u.id}
                    href={`/employees/${u.id}`}
                    onClick={() => setViewDept(null)}
                    className="flex items-center gap-3 rounded-lg px-1.5 py-2.5 hover:bg-[var(--surface-2)]"
                  >
                    <Avatar name={u.name} size={40} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">{u.name}</span>
                        {u.accessLevel !== "employee" && <Badge color={viewDept!.color}>{roleLabel(u, viewDept!)}</Badge>}
                        {u.status === "on_leave" && <Badge color="warning" dot>On leave</Badge>}
                      </div>
                      <div className="truncate text-xs text-[var(--muted)]">{u.designation ?? roleLabel(u, viewDept!)}{mgr ? ` · reports to ${mgr.name}` : ""}</div>
                      <div className="mt-0.5 flex flex-wrap gap-x-3 text-[11px] text-[var(--muted-2)]">
                        <span className="flex items-center gap-1"><Mail size={11} /> {u.email}</span>
                        <span className="flex items-center gap-1"><Phone size={11} /> {u.phone}</span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="shrink-0 text-[var(--muted-2)]" />
                  </Link>
                );
              })}
          </div>
        )}
      </Modal>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New department / role"
        size="lg"
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={submit} disabled={!name || !key}>Create</Button></>}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Design" /></Field>
          <Field label="Key (slug)" hint="Used internally for gating"><Input value={key} onChange={(e) => setKey(e.target.value)} placeholder="e.g. design" /></Field>
        </div>
        <div className="mt-4">
          <div className="mb-1 text-xs font-medium text-[var(--muted)]">Badge colour</div>
          <div className="flex gap-2">
            {COLORS.map((c) => <button key={c} onClick={() => setColor(c)} className={`rounded-full px-3 py-1 text-xs ${color === c ? "ring-2 ring-[var(--ring)]" : ""}`}><Badge color={c}>{c}</Badge></button>)}
          </div>
        </div>
        <div className="mt-4">
          <div className="mb-1 text-xs font-medium text-[var(--muted)]">Workspace modules this department sees</div>
          <div className="flex flex-wrap gap-2">
            {ALL_FEATURES.map((f) => (
              <button key={f.key} onClick={() => toggle(f.key)} className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${features.includes(f.key) ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]" : "border-[var(--border-strong)] text-[var(--muted)] hover:bg-[var(--surface-2)]"}`}>{f.label}</button>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
