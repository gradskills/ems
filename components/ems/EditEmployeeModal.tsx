"use client";

import { useState, useEffect } from "react";
import { useApp } from "@/lib/store";
import { userById } from "@/lib/seed/users";
import { Modal, Field, Input } from "@/components/ui/modal";
import { Button } from "@/components/ui/primitives";
import { AvatarPicker } from "@/components/ems/MyProfileEditModal";
import { roleLabel } from "@/lib/ems";
import type { AccessLevel, EmploymentType, EmployeeStatus, User } from "@/lib/types";

const selectCls =
  "h-10 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]";

export function EditEmployeeModal({ open, onClose, employee }: { open: boolean; onClose: () => void; employee: User }) {
  const updateEmployee = useApp((s) => s.updateEmployee);
  const departments = useApp((s) => s.departments);
  const employees = useApp((s) => s.employees);
  const actingUserId = useApp((s) => s.actingUserId);
  const viewer = userById(actingUserId)!;

  const [avatarUrl, setAvatarUrl] = useState(employee.avatarUrl ?? "");
  const [name, setName] = useState(employee.name);
  const [email, setEmail] = useState(employee.email);
  const [phone, setPhone] = useState(employee.phone);
  const [departmentId, setDepartmentId] = useState(employee.departmentId);
  const [accessLevel, setAccessLevel] = useState<AccessLevel>(employee.accessLevel);
  const [designation, setDesignation] = useState(employee.designation ?? "");
  const [managerId, setManagerId] = useState(employee.managerId ?? "");
  const [employmentType, setEmploymentType] = useState<EmploymentType>(employee.employmentType ?? "full_time");
  const [location, setLocation] = useState(employee.location ?? "");
  const [status, setStatus] = useState<EmployeeStatus>(employee.status ?? "active");
  const [monthlyTargetRevenue, setMonthlyTargetRevenue] = useState(employee.monthlyTargetRevenue?.toString() ?? "");
  const [ctcAnnual, setCtcAnnual] = useState(employee.ctcAnnual?.toString() ?? "");

  useEffect(() => {
    if (open) {
      setAvatarUrl(employee.avatarUrl ?? "");
      setName(employee.name);
      setEmail(employee.email);
      setPhone(employee.phone);
      setDepartmentId(employee.departmentId);
      setAccessLevel(employee.accessLevel);
      setDesignation(employee.designation ?? "");
      setManagerId(employee.managerId ?? "");
      setEmploymentType(employee.employmentType ?? "full_time");
      setLocation(employee.location ?? "");
      setStatus(employee.status ?? "active");
      setMonthlyTargetRevenue(employee.monthlyTargetRevenue?.toString() ?? "");
      setCtcAnnual(employee.ctcAnnual?.toString() ?? "");
    }
  }, [open, employee]);

  const managers = employees.filter((u) => u.accessLevel !== "employee" && u.id !== employee.id);
  const valid = name && email && departmentId;

  function submit() {
    if (!valid) return;
    updateEmployee(employee.id, {
      avatarUrl,
      name,
      email,
      phone,
      departmentId,
      accessLevel,
      designation: designation || undefined,
      managerId: managerId || undefined,
      employmentType,
      location: location || undefined,
      status,
      monthlyTargetRevenue: monthlyTargetRevenue ? Number(monthlyTargetRevenue) : undefined,
      ctcAnnual: ctcAnnual ? Number(ctcAnnual) : undefined,
    });
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Edit ${employee.name}`}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={!valid}>Save changes</Button>
        </>
      }
    >
      <div className="mb-4">
        <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Profile photo</span>
        <AvatarPicker name={name || employee.name} value={avatarUrl} onChange={setAvatarUrl} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Full name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Work email"><Input value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Phone"><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
        <Field label="Designation"><Input value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="e.g. Senior Engineer" /></Field>
        <Field label="Department">
          <select className={selectCls} value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </Field>
        <Field label="Role / Access level">
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
        <Field label="Status">
          <select className={selectCls} value={status} onChange={(e) => setStatus(e.target.value as EmployeeStatus)}>
            <option value="active">Active</option>
            <option value="on_leave">On leave</option>
            <option value="inactive">Inactive</option>
            <option value="resigned">Resigned</option>
          </select>
        </Field>
        <Field label="Location"><Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Mumbai" /></Field>
        <Field label="Annual CTC (₹)"><Input type="number" value={ctcAnnual} onChange={(e) => setCtcAnnual(e.target.value)} placeholder="e.g. 720000" /></Field>
        <Field label="Monthly revenue target (₹)"><Input type="number" value={monthlyTargetRevenue} onChange={(e) => setMonthlyTargetRevenue(e.target.value)} placeholder="e.g. 500000" /></Field>
      </div>
    </Modal>
  );
}
