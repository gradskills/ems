"use client";

import { useState } from "react";
import { useApp } from "@/lib/store";
import { userById } from "@/lib/seed/users";
import { departmentById } from "@/lib/seed/org";
import { Card, Badge, Avatar, Button } from "@/components/ui/primitives";
import { PageHeader } from "@/components/ems/kit";
import { Modal, Field, Input, Textarea } from "@/components/ui/modal";
import { relativeTime } from "@/lib/utils";
import { Plus, Pin, PinOff, Megaphone, Pencil, Trash2 } from "lucide-react";

const selectCls = "h-10 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]";

export default function AnnouncementsPage() {
  const actingUserId = useApp((s) => s.actingUserId);
  const announcements = useApp((s) => s.announcements);
  const departments = useApp((s) => s.departments);
  const addAnnouncement = useApp((s) => s.addAnnouncement);
  const updateAnnouncement = useApp((s) => s.updateAnnouncement);
  const deleteAnnouncement = useApp((s) => s.deleteAnnouncement);
  const me = userById(actingUserId)!;
  const canPost = me.accessLevel !== "employee";

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState("all");

  const visible = announcements
    .filter((a) => a.audience === "all" || a.audience === me.departmentId || canPost)
    .sort((a, b) => (a.pinned === b.pinned ? (a.at < b.at ? 1 : -1) : a.pinned ? -1 : 1));

  function openCreate() {
    setEditId(null); setTitle(""); setBody(""); setAudience("all"); setOpen(true);
  }
  function openEdit(id: string) {
    const a = announcements.find((x) => x.id === id);
    if (!a) return;
    setEditId(id); setTitle(a.title); setBody(a.body); setAudience(a.audience); setOpen(true);
  }
  function submit() {
    if (!title || !body) return;
    if (editId) updateAnnouncement(editId, { title, body, audience });
    else addAnnouncement(title, body, audience);
    setOpen(false); setEditId(null); setTitle(""); setBody("");
  }
  function remove(id: string) {
    if (window.confirm("Delete this announcement?")) deleteAnnouncement(id);
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Announcements" subtitle="Company & department updates" action={canPost && <Button onClick={openCreate}><Plus size={16} /> New announcement</Button>} />

      <div className="space-y-3">
        {visible.map((a) => {
          const author = userById(a.authorId);
          const dept = a.audience === "all" ? null : departmentById(a.audience);
          return (
            <Card key={a.id} className="p-5">
              <div className="mb-1 flex items-center gap-2">
                {a.pinned && <Pin size={14} className="text-[var(--warning)]" />}
                <h3 className="font-semibold">{a.title}</h3>
                <Badge color={dept ? "purple" : "primary"}>{dept ? dept.name : "All staff"}</Badge>
                {canPost && (
                  <div className="ml-auto flex items-center gap-0.5">
                    <button onClick={() => updateAnnouncement(a.id, { pinned: !a.pinned })} className="rounded-md p-1.5 text-[var(--muted-2)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]" aria-label={a.pinned ? "Unpin" : "Pin"}>{a.pinned ? <PinOff size={15} /> : <Pin size={15} />}</button>
                    <button onClick={() => openEdit(a.id)} className="rounded-md p-1.5 text-[var(--muted-2)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]" aria-label="Edit"><Pencil size={15} /></button>
                    <button onClick={() => remove(a.id)} className="rounded-md p-1.5 text-[var(--muted-2)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]" aria-label="Delete"><Trash2 size={15} /></button>
                  </div>
                )}
              </div>
              <p className="text-sm text-[var(--muted)]">{a.body}</p>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[var(--muted-2)]"><Avatar name={author?.name ?? "?"} size={16} /> {author?.name} · {relativeTime(a.at)}</div>
            </Card>
          );
        })}
        {visible.length === 0 && <Card className="flex flex-col items-center gap-2 py-12 text-center"><Megaphone size={26} className="text-[var(--muted-2)]" /><p className="text-sm text-[var(--muted)]">No announcements.</p></Card>}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editId ? "Edit announcement" : "New announcement"} size="md"
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={submit} disabled={!title || !body}>{editId ? "Save" : "Post"}</Button></>}>
        <div className="space-y-4">
          <Field label="Title"><Input value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
          <Field label="Audience">
            <select className={selectCls} value={audience} onChange={(e) => setAudience(e.target.value)}>
              <option value="all">All staff</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </Field>
          <Field label="Message"><Textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} /></Field>
        </div>
      </Modal>
    </div>
  );
}
