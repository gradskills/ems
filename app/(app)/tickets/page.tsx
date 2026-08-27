"use client";

import { useState } from "react";
import { useApp } from "@/lib/store";
import { userById } from "@/lib/seed/users";
import { Card, Badge, Avatar, Button } from "@/components/ui/primitives";
import { PageHeader } from "@/components/ems/kit";
import { Modal, Field, Input, Textarea } from "@/components/ui/modal";
import { ticketStatusColor, priorityColor } from "@/lib/ems";
import { relativeTime } from "@/lib/utils";
import { Plus, LifeBuoy } from "lucide-react";
import type { TaskPriority, TicketStatus } from "@/lib/types";

const selectCls = "h-10 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]";

export default function TicketsPage() {
  const actingUserId = useApp((s) => s.actingUserId);
  const tickets = useApp((s) => s.tickets);
  const createTicket = useApp((s) => s.createTicket);
  const setTicketStatus = useApp((s) => s.setTicketStatus);
  const me = userById(actingUserId)!;
  const isSupport = me.departmentId === "dept-admin" || me.accessLevel === "admin";

  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("IT");
  const [priority, setPriority] = useState<TaskPriority>("medium");

  const mine = tickets.filter((t) => t.raisedById === me.id);
  const assigned = tickets.filter((t) => isSupport && t.assigneeId === me.id && t.raisedById !== me.id);

  function submit() {
    if (!subject || !description) return;
    createTicket({ subject, description, category, priority });
    setOpen(false); setSubject(""); setDescription("");
  }

  const Row = ({ t, canManage }: { t: (typeof tickets)[number]; canManage: boolean }) => {
    const raiser = userById(t.raisedById);
    return (
      <Card className="p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{t.subject}</span>
              <Badge color="slate">{t.category}</Badge>
              <Badge color={priorityColor[t.priority]}>{t.priority}</Badge>
              <Badge color={ticketStatusColor[t.status]} dot>{t.status.replace("_", " ")}</Badge>
            </div>
            <div className="mt-1 text-sm text-[var(--muted)]">{t.description}</div>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-[var(--muted-2)]"><Avatar name={raiser?.name ?? "?"} size={16} /> {raiser?.name} · {relativeTime(t.createdAt)}</div>
            {t.comments.map((c, i) => <div key={i} className="mt-1 rounded-md bg-[var(--surface-2)] px-2 py-1 text-xs">{userById(c.by)?.name}: {c.text}</div>)}
          </div>
          {canManage && t.status !== "closed" && (
            <select value={t.status} onChange={(e) => setTicketStatus(t.id, e.target.value as TicketStatus)} className="h-8 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 text-xs">
              <option value="open">Open</option>
              <option value="in_progress">In progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Helpdesk" subtitle="Raise IT, HR or facilities requests" action={<Button onClick={() => setOpen(true)}><Plus size={16} /> Raise ticket</Button>} />

      {isSupport && assigned.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Assigned to me</h3>
          {assigned.map((t) => <Row key={t.id} t={t} canManage />)}
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">My tickets</h3>
        {mine.length === 0 ? (
          <Card className="flex flex-col items-center gap-2 py-12 text-center"><LifeBuoy size={26} className="text-[var(--muted-2)]" /><p className="text-sm text-[var(--muted)]">No tickets yet.</p></Card>
        ) : mine.map((t) => <Row key={t.id} t={t} canManage={isSupport} />)}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Raise a ticket" size="md"
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={submit} disabled={!subject || !description}>Submit</Button></>}>
        <div className="space-y-4">
          <Field label="Subject"><Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Short summary" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <select className={selectCls} value={category} onChange={(e) => setCategory(e.target.value)}>
                <option>IT</option><option>HR</option><option>Facilities</option><option>Client</option>
              </select>
            </Field>
            <Field label="Priority">
              <select className={selectCls} value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
              </select>
            </Field>
          </div>
          <Field label="Details"><Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the issue…" /></Field>
        </div>
      </Modal>
    </div>
  );
}
