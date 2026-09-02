"use client";

import { useState } from "react";
import { useApp } from "@/lib/store";
import { userById } from "@/lib/seed/users";
import { Modal, Field, Input } from "@/components/ui/modal";
import { Button } from "@/components/ui/primitives";
import { roleLabel } from "@/lib/ems";
import type { AccessLevel, EmploymentType, CredentialEmail } from "@/lib/types";
import { Mail, Copy, Check, KeyRound, User as UserIcon } from "lucide-react";

const selectCls =
  "h-10 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]";

export function CreateEmployeeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createEmployee = useApp((s) => s.createEmployee);
  const departments = useApp((s) => s.departments);
  const employees = useApp((s) => s.employees);
  const actingUserId = useApp((s) => s.actingUserId);
  const viewer = userById(actingUserId)!;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [departmentId, setDepartmentId] = useState(departments[0]?.id ?? "");
  const [accessLevel, setAccessLevel] = useState<AccessLevel>("employee");
  const [managerId, setManagerId] = useState(viewer.accessLevel === "manager" ? viewer.id : "");
  const [employmentType, setEmploymentType] = useState<EmploymentType>("full_time");
  const [monthlyCtc, setMonthlyCtc] = useState("");
  // once created, we show the simulated onboarding email instead of the form
  const [sent, setSent] = useState<CredentialEmail | null>(null);

  const managers = employees.filter((u) => u.accessLevel !== "employee");
  const valid = name && email && departmentId;

  function reset() {
    setName(""); setEmail(""); setPhone(""); setMonthlyCtc(""); setSent(null);
  }
  function close() {
    reset();
    onClose();
  }

  function submit() {
    if (!valid) return;
    const res = createEmployee({
      name,
      email,
      phone,
      accessLevel,
      departmentId,
      managerId: managerId || undefined,
      employmentType,
      monthlyCtc: Number(monthlyCtc) || 40000,
    });
    setSent(res.email);
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={sent ? "Employee created" : "Add employee"}
      size="lg"
      footer={
        sent ? (
          <Button onClick={close}>Done</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={close}>Cancel</Button>
            <Button onClick={submit} disabled={!valid}>Create & email login</Button>
          </>
        )
      }
    >
      {sent ? (
        <CredentialSent email={sent} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Full name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Aarav Kapoor" /></Field>
          <Field label="Work email" hint="Login details are emailed here"><Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@pixelforge.in" /></Field>
          <Field label="Phone"><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 …" /></Field>
          <Field label="Department">
            <select className={selectCls} value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </Field>
          <Field label="Role">
            <select className={selectCls} value={accessLevel} onChange={(e) => setAccessLevel(e.target.value as AccessLevel)} disabled={viewer.accessLevel !== "admin"}>
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
              {viewer.accessLevel === "admin" && <option value="admin">Admin</option>}
            </select>
          </Field>
          <Field label="Reports to">
            <select className={selectCls} value={managerId} onChange={(e) => setManagerId(e.target.value)}>
              <option value="">— None —</option>
              {managers.map((m) => <option key={m.id} value={m.id}>{m.name} · {roleLabel(m, departments.find((d) => d.id === m.departmentId))}</option>)}
            </select>
          </Field>
          <Field label="Employment type">
            <select className={selectCls} value={employmentType} onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}>
              <option value="full_time">Full-time</option>
              <option value="part_time">Part-time</option>
              <option value="intern">Intern</option>
              <option value="contract">Contract</option>
            </select>
          </Field>
          <Field label="Monthly CTC (₹)" hint="Auto-split into Basic / HRA / Special"><Input type="number" value={monthlyCtc} onChange={(e) => setMonthlyCtc(e.target.value)} placeholder="e.g. 60000" /></Field>
        </div>
      )}
    </Modal>
  );
}

function CopyRow({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5">
      <span className="text-[var(--muted-2)]">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] uppercase tracking-wide text-[var(--muted-2)]">{label}</div>
        <div className="truncate font-mono text-sm font-semibold">{value}</div>
      </div>
      <button
        onClick={() => {
          navigator.clipboard?.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
        }}
        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[var(--muted)] hover:bg-[var(--surface-2)]"
      >
        {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
      </button>
    </div>
  );
}

function CredentialSent({ email }: { email: CredentialEmail }) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-lg bg-[var(--success-soft)] px-4 py-3 text-sm">
        <Mail size={18} className="mt-0.5 shrink-0 text-[var(--success)]" />
        <div>
          <div className="font-medium text-[var(--success)]">Onboarding email sent to {email.to}</div>
          <div className="text-xs text-[var(--muted)]">They can sign in with the credentials below and will be asked to set a new password on first login.</div>
        </div>
      </div>

      <div className="space-y-2">
        <CopyRow label="Login ID" value={email.loginId} icon={<UserIcon size={16} />} />
        <CopyRow label="Temporary password" value={email.tempPassword} icon={<KeyRound size={16} />} />
        <CopyRow label="Portal link" value={email.loginUrl} icon={<Mail size={16} />} />
      </div>

      <div className="rounded-lg border border-dashed border-[var(--border-strong)] bg-[var(--surface-2)] p-4 text-sm">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-2)]">Email preview</div>
        <p className="mb-2">Hi {email.name.split(" ")[0]},</p>
        <p className="mb-2 text-[var(--muted)]">Welcome to Gradskills EMS! Your employee portal account is ready. Use the details below to sign in, then choose your own password.</p>
        <p className="text-[var(--muted)]">Login ID: <span className="font-mono font-medium text-[var(--foreground)]">{email.loginId}</span><br />
          Temporary password: <span className="font-mono font-medium text-[var(--foreground)]">{email.tempPassword}</span><br />
          Sign in at: <span className="font-medium text-[var(--primary)]">{email.loginUrl}</span></p>
      </div>
      <p className="text-[11px] text-[var(--muted-2)]">Prototype note: the email is simulated in-app — no message is actually delivered.</p>
    </div>
  );
}
