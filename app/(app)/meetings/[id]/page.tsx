"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, notFound } from "next/navigation";
import { useApp } from "@/lib/store";
import { userById } from "@/lib/seed/users";
import { Card, Button, Badge, Avatar } from "@/components/ui/primitives";
import { Textarea } from "@/components/ui/modal";
import { relativeTime } from "@/lib/utils";
import { meetingStatusColor, meetingStatusLabel, meetingModeLabel, formatMeetingWhen } from "@/lib/meetings";
import type { MeetingNote } from "@/lib/types";
import { Video, MapPin, Phone, ArrowLeft, Users, Building2, Lightbulb, NotebookPen, Play, Check, X, Clock, Link2 } from "lucide-react";

export default function MeetingDetailPage() {
  const params = useParams<{ id: string }>();
  const meetings = useApp((s) => s.meetings);
  const leads = useApp((s) => s.leads);
  const actingUserId = useApp((s) => s.actingUserId);
  const addMeetingNote = useApp((s) => s.addMeetingNote);
  const setMeetingStatus = useApp((s) => s.setMeetingStatus);

  const m = meetings.find((x) => x.id === params.id);
  if (!m) return notFound();

  const lead = m.leadId ? leads.find((l) => l.id === m.leadId) : undefined;
  const organizer = userById(m.organizerId);
  const ModeIcon = m.mode === "video" ? Video : m.mode === "phone" ? Phone : MapPin;
  const isPast = m.status === "completed" || m.status === "cancelled";
  const canEditNotes = m.status !== "cancelled";

  return (
    <div className="space-y-5">
      <Link href="/meetings" className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
        <ArrowLeft size={15} /> All meetings
      </Link>

      {/* Header */}
      <Card className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2">
              <Badge color={meetingStatusColor[m.status]} dot>{meetingStatusLabel[m.status]}</Badge>
              <span className="text-xs text-[var(--muted-2)]">{meetingModeLabel[m.mode]}</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight">{m.title}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--muted)]">
              <span className="flex items-center gap-1.5"><Clock size={14} /> {formatMeetingWhen(m.scheduledAt)} · {m.durationMin} min</span>
              <span className="flex items-center gap-1.5"><ModeIcon size={14} /> {m.location || meetingModeLabel[m.mode]}</span>
            </div>
            {m.mode === "video" && m.location && (
              <a href={m.location} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--primary)] hover:underline">
                <Link2 size={14} /> Join link
              </a>
            )}
          </div>

          {/* Status controls */}
          <div className="flex shrink-0 flex-wrap gap-2">
            {m.status === "scheduled" && (
              m.mode === "video" && m.location ? (
                <Button size="sm" onClick={() => { window.open(m.location, "_blank", "noopener,noreferrer"); setMeetingStatus(m.id, "in_progress"); }}><Video size={14} /> Join</Button>
              ) : m.mode === "phone" ? (
                <Button size="sm" onClick={() => setMeetingStatus(m.id, "in_progress")}><Phone size={14} /> Call</Button>
              ) : m.mode === "in_person" ? (
                <Button size="sm" onClick={() => setMeetingStatus(m.id, "in_progress")}><MapPin size={14} /> In person</Button>
              ) : (
                <Button size="sm" onClick={() => setMeetingStatus(m.id, "in_progress")}><Play size={14} /> Start</Button>
              )
            )}
            {m.status === "in_progress" && <Button size="sm" variant="success" onClick={() => setMeetingStatus(m.id, "completed")}><Check size={14} /> Complete</Button>}
            {!isPast && <Button size="sm" variant="ghost" onClick={() => setMeetingStatus(m.id, "cancelled")}><X size={14} /> Cancel</Button>}
            {m.status === "cancelled" && <Button size="sm" variant="outline" onClick={() => setMeetingStatus(m.id, "scheduled")}>Reinstate</Button>}
          </div>
        </div>

        {m.agenda && (
          <div className="mt-4 rounded-lg bg-[var(--surface-2)] p-3 text-sm">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-2)]">Agenda</div>
            {m.agenda}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Left: people + client */}
        <div className="space-y-4">
          <Card className="p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><Users size={15} className="text-[var(--muted)]" /> Attendees</div>
            <div className="space-y-2">
              <Person id={m.organizerId} tag="Organizer" />
              {m.attendeeIds.map((id) => <Person key={id} id={id} />)}
            </div>
            {m.clientContact && (
              <div className="mt-3 border-t border-[var(--border)] pt-3 text-sm">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-2)]">Client side</div>
                <div className="mt-1">{m.clientContact}</div>
              </div>
            )}
          </Card>

          {lead && (
            <Card className="p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><Building2 size={15} className="text-[var(--muted)]" /> Client</div>
              <Link href={`/leads/${lead.id}`} className="block rounded-lg border border-[var(--border)] p-3 hover:border-[var(--primary)]">
                <div className="font-medium">{lead.company}</div>
                <div className="text-xs text-[var(--muted)]">{lead.contactName} · {lead.role}</div>
                <div className="mt-1 text-xs text-[var(--muted-2)]">{lead.city} · {lead.industry}</div>
              </Link>
            </Card>
          )}
        </div>

        {/* Right: insights + minutes */}
        <div className="space-y-4 lg:col-span-2">
          <NoteSection
            title="Upfront insights"
            hint="Context so everyone walks in prepared"
            icon={<Lightbulb size={15} className="text-[var(--warning)]" />}
            notes={m.insights}
            empty="No insights yet. Add background before the meeting starts."
            canAdd={canEditNotes}
            placeholder="Add context — budget signals, decision makers, objections to expect…"
            onAdd={(t) => addMeetingNote(m.id, "insight", t)}
          />
          <NoteSection
            title="Minutes of the meeting"
            hint="What was discussed and decided"
            icon={<NotebookPen size={15} className="text-[var(--primary)]" />}
            notes={m.minutes}
            empty="No minutes yet. Capture decisions and next steps here."
            canAdd={canEditNotes}
            placeholder="Record decisions, action items, and follow-ups…"
            onAdd={(t) => addMeetingNote(m.id, "minute", t)}
          />
        </div>
      </div>
    </div>
  );

  function Person({ id, tag }: { id: string; tag?: string }) {
    const u = userById(id);
    return (
      <div className="flex items-center gap-2.5">
        <Avatar name={u?.name ?? "?"} size={30} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{u?.name ?? "Unknown"}{id === actingUserId && <span className="text-[var(--muted-2)]"> (you)</span>}</div>
          <div className="truncate text-xs text-[var(--muted)]">{u?.designation ?? ""}</div>
        </div>
        {tag && <Badge color="primary">{tag}</Badge>}
      </div>
    );
  }
}

function NoteSection({
  title, hint, icon, notes, empty, canAdd, placeholder, onAdd,
}: {
  title: string; hint: string; icon: React.ReactNode; notes: MeetingNote[]; empty: string; canAdd: boolean; placeholder: string; onAdd: (text: string) => void;
}) {
  const [text, setText] = useState("");
  function add() {
    if (!text.trim()) return;
    onAdd(text);
    setText("");
  }
  return (
    <Card className="p-4">
      <div className="mb-1 flex items-center gap-2 text-sm font-semibold">{icon} {title}<span className="ml-auto text-xs font-normal text-[var(--muted-2)]">{notes.length}</span></div>
      <p className="mb-3 text-xs text-[var(--muted-2)]">{hint}</p>

      {notes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--border-strong)] px-3 py-5 text-center text-xs text-[var(--muted)]">{empty}</div>
      ) : (
        <div className="space-y-2.5">
          {notes.map((n) => {
            const author = userById(n.authorId);
            return (
              <div key={n.id} className="rounded-lg border border-[var(--border)] p-3">
                <p className="whitespace-pre-wrap text-sm">{n.text}</p>
                <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[var(--muted-2)]">
                  <Avatar name={author?.name ?? "?"} size={16} /> {author?.name?.split(" ")[0]} · {relativeTime(n.at)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {canAdd && (
        <div className="mt-3 space-y-2">
          <Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} />
          <div className="flex justify-end">
            <Button size="sm" onClick={add} disabled={!text.trim()}>Add</Button>
          </div>
        </div>
      )}
    </Card>
  );
}
