"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { userById } from "@/lib/seed/users";
import { Modal, Field, Input, Textarea } from "@/components/ui/modal";
import { Button, Avatar, Badge } from "@/components/ui/primitives";
import { roleLabel } from "@/lib/ems";
import type { MeetingMode } from "@/lib/types";

const selectCls =
  "h-10 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]";

// default the datetime-local to the next round hour
function defaultWhen(): string {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ScheduleMeetingModal({ open, onClose, presetLeadId }: { open: boolean; onClose: () => void; presetLeadId?: string }) {
  const scheduleMeeting = useApp((s) => s.scheduleMeeting);
  const leads = useApp((s) => s.leads);
  const employees = useApp((s) => s.employees);
  const departments = useApp((s) => s.departments);
  const actingUserId = useApp((s) => s.actingUserId);
  const me = userById(actingUserId)!;

  const [title, setTitle] = useState("");
  const [leadId, setLeadId] = useState(presetLeadId ?? "");
  const [clientContact, setClientContact] = useState("");
  const [attendeeIds, setAttendeeIds] = useState<string[]>(me.managerId ? [me.managerId] : []);
  const [when, setWhen] = useState(defaultWhen);
  const [durationMin, setDurationMin] = useState(30);
  const [mode, setMode] = useState<MeetingMode>("video");
  const [location, setLocation] = useState("");
  const [agenda, setAgenda] = useState("");
  const [insight, setInsight] = useState("");

  // leads this person can pick: their own book (employees) or all (managers/admin)
  const myLeads = useMemo(
    () => leads.filter((l) => me.accessLevel !== "employee" || l.ownerId === actingUserId).sort((a, b) => a.company.localeCompare(b.company)),
    [leads, me.accessLevel, actingUserId]
  );
  // internal invitees to choose from — everyone but the organizer, managers/admin first
  const invitees = useMemo(
    () => employees.filter((u) => u.id !== actingUserId).sort((a, b) => Number(b.accessLevel !== "employee") - Number(a.accessLevel !== "employee")),
    [employees, actingUserId]
  );

  const valid = title.trim() && when && attendeeIds.length > 0;

  function toggle(id: string) {
    setAttendeeIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  function reset() {
    setTitle(""); setLeadId(presetLeadId ?? ""); setClientContact(""); setAttendeeIds(me.managerId ? [me.managerId] : []);
    setWhen(defaultWhen()); setDurationMin(30); setMode("video"); setLocation(""); setAgenda(""); setInsight("");
  }
  function close() { reset(); onClose(); }

  function submit() {
    if (!valid) return;
    scheduleMeeting({
      title: title.trim(),
      leadId: leadId || undefined,
      clientContact: clientContact.trim() || undefined,
      attendeeIds,
      scheduledAt: new Date(when).toISOString(),
      durationMin,
      mode,
      location: location.trim() || undefined,
      agenda: agenda.trim() || undefined,
      initialInsight: insight.trim() || undefined,
    });
    close();
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Schedule a meeting"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={close}>Cancel</Button>
          <Button onClick={submit} disabled={!valid}>Schedule & notify</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Meeting title"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Discovery call — Acme Corp" /></Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Client (lead)" hint="Optional — links the meeting to a client">
            <select className={selectCls} value={leadId} onChange={(e) => setLeadId(e.target.value)}>
              <option value="">— No client / internal —</option>
              {myLeads.map((l) => <option key={l.id} value={l.id}>{l.company} · {l.contactName}</option>)}
            </select>
          </Field>
          <Field label="Client attendees" hint="Names on the client side (optional)"><Input value={clientContact} onChange={(e) => setClientContact(e.target.value)} placeholder="e.g. Rahul (Owner)" /></Field>
        </div>

        <Field label="Invite manager / admin & teammates" hint="They'll be notified and see this meeting">
          <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border border-[var(--border)] p-1.5">
            {invitees.map((u) => {
              const dept = departments.find((d) => d.id === u.departmentId);
              const checked = attendeeIds.includes(u.id);
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggle(u.id)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-[var(--surface-2)] ${checked ? "bg-[var(--primary-soft)]" : ""}`}
                >
                  <input type="checkbox" checked={checked} readOnly className="pointer-events-none" />
                  <Avatar name={u.name} size={26} />
                  <span className="min-w-0 flex-1 truncate font-medium">{u.name}</span>
                  <Badge color={u.accessLevel === "admin" ? "danger" : u.accessLevel === "manager" ? "warning" : "slate"}>{roleLabel(u, dept)}</Badge>
                </button>
              );
            })}
          </div>
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Date & time"><Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} /></Field>
          <Field label="Duration">
            <select className={selectCls} value={durationMin} onChange={(e) => setDurationMin(Number(e.target.value))}>
              {[15, 30, 45, 60, 90, 120].map((m) => <option key={m} value={m}>{m} min</option>)}
            </select>
          </Field>
          <Field label="Mode">
            <select className={selectCls} value={mode} onChange={(e) => setMode(e.target.value as MeetingMode)}>
              <option value="video">Video call</option>
              <option value="in_person">In person</option>
              <option value="phone">Phone call</option>
            </select>
          </Field>
        </div>

        <Field label={mode === "video" ? "Meeting link" : mode === "phone" ? "Phone number" : "Location"}>
          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder={mode === "video" ? "https://meet…" : mode === "phone" ? "+91 …" : "Office / address"} />
        </Field>

        <Field label="Agenda" hint="What is this meeting about?"><Textarea rows={2} value={agenda} onChange={(e) => setAgenda(e.target.value)} placeholder="One line on the purpose of the meeting" /></Field>
        <Field label="Upfront insights" hint="Context so everyone walks in prepared"><Textarea rows={3} value={insight} onChange={(e) => setInsight(e.target.value)} placeholder="Key background, budget signals, decision makers, objections to expect…" /></Field>
      </div>
    </Modal>
  );
}
