"use client";

import { useState } from "react";
import { useApp } from "@/lib/store";
import { Modal, Field, Input } from "@/components/ui/modal";
import { Button } from "@/components/ui/primitives";
import type { ContentPost, ContentStatus } from "@/lib/types";

const statuses: ContentStatus[] = ["idea", "draft", "pending_approval", "approved", "scheduled", "published"];
const channels = ["Instagram", "Facebook", "LinkedIn", "YouTube", "X (Twitter)", "WhatsApp"];

export function PostModal({ post, open, onClose }: { post: ContentPost | null; open: boolean; onClose: () => void }) {
  const createContent = useApp((s) => s.createContent);
  const updateContent = useApp((s) => s.updateContent);
  const actingUserId = useApp((s) => s.actingUserId);
  const clients = useApp((s) => s.clients);
  const employees = useApp((s) => s.employees);

  const editing = !!post;
  const [title, setTitle] = useState(post?.title ?? "");
  const [clientId, setClientId] = useState(post?.clientId ?? "");
  const [channel, setChannel] = useState(post?.channel ?? "Instagram");
  const [scheduledAt, setScheduledAt] = useState(post?.scheduledAt ? post.scheduledAt.slice(0, 10) : "");
  const [status, setStatus] = useState<ContentStatus>(post?.status ?? "idea");
  const [ownerId, setOwnerId] = useState(post?.ownerId ?? "");
  const [checkUrl, setCheckUrl] = useState(post?.checkUrl ?? "");
  const [liveUrl, setLiveUrl] = useState(post?.liveUrl ?? "");

  const valid = title.trim() && clientId && channel.trim();

  function save() {
    if (!valid) return;
    const base = {
      clientId,
      title: title.trim(),
      channel,
      scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : new Date().toISOString(),
      status,
      ownerId: ownerId || actingUserId,
      checkUrl: checkUrl.trim() || undefined,
      liveUrl: liveUrl.trim() || undefined,
    };
    if (editing && post) updateContent(post.id, base);
    else createContent(base);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? `Edit post — ${post?.title}` : "Add content post"}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={!valid} onClick={save}>{editing ? "Save changes" : "Add post"}</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Post title *"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Kaju Katli behind-the-scenes reel" autoFocus /></Field>
        </div>
        <Field label="Client *">
          <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="h-10 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm">
            <option value="">Select client…</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.company}</option>)}
          </select>
        </Field>
        <Field label="Channel">
          <select value={channel} onChange={(e) => setChannel(e.target.value)} className="h-10 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm">
            {channels.map((ch) => <option key={ch} value={ch}>{ch}</option>)}
          </select>
        </Field>
        <Field label="Scheduled date"><Input type="date" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} /></Field>
        <Field label="Status">
          <select value={status} onChange={(e) => setStatus(e.target.value as ContentStatus)} className="h-10 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm">
            {statuses.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
          </select>
        </Field>
        <Field label="Owner">
          <select value={ownerId || actingUserId} onChange={(e) => setOwnerId(e.target.value)} className="h-10 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm">
            {!post && <option value={actingUserId}>Me</option>}
            {employees.filter((e) => e.status !== "inactive").map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </Field>
      </div>

      <div className="mt-4">
        <h4 className="mb-2 text-sm font-semibold">Links</h4>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Check status URL" hint="Where to check the post / approval status.">
            <Input value={checkUrl} onChange={(e) => setCheckUrl(e.target.value)} placeholder="https://…/content/post-id" />
          </Field>
          <Field label="Live preview URL" hint="Link to view the live post.">
            <Input value={liveUrl} onChange={(e) => setLiveUrl(e.target.value)} placeholder="https://instagram.com/…" />
          </Field>
        </div>
      </div>
    </Modal>
  );
}
