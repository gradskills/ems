"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { userById } from "@/lib/seed/users";
import { Card, Button, Badge, Avatar, Stat } from "@/components/ui/primitives";
import { PageHeader, Tabs, useTabs } from "@/components/ems/kit";
import { ScheduleMeetingModal } from "@/components/ems/ScheduleMeetingModal";
import { visibleMeetings, splitByTime, meetingStatusColor, meetingStatusLabel, meetingModeLabel, formatMeetingWhen } from "@/lib/meetings";
import { Video, MapPin, Phone, Plus, Lightbulb, NotebookPen, Users } from "lucide-react";
import type { Meeting, MeetingMode } from "@/lib/types";

const modeIcon: Record<MeetingMode, typeof Video> = { video: Video, in_person: MapPin, phone: Phone };

export default function MeetingsPage() {
  const actingUserId = useApp((s) => s.actingUserId);
  const meetings = useApp((s) => s.meetings);
  const leads = useApp((s) => s.leads);
  const me = userById(actingUserId)!;

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useTabs<"upcoming" | "past">("upcoming");

  const mine = useMemo(() => visibleMeetings(me, meetings), [me, meetings]);
  const { upcoming, past } = useMemo(() => splitByTime(mine), [mine]);
  const list = tab === "upcoming" ? upcoming : past;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Meetings"
        subtitle="Client meetings with managers & admins looped in"
        action={<Button onClick={() => setOpen(true)}><Plus size={16} /> Schedule meeting</Button>}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4"><Stat label="Upcoming" value={upcoming.length} accent="var(--primary)" /></Card>
        <Card className="p-4"><Stat label="Today" value={upcoming.filter((m) => new Date(m.scheduledAt).toDateString() === new Date().toDateString()).length} accent="var(--success)" /></Card>
        <Card className="p-4"><Stat label="Completed" value={mine.filter((m) => m.status === "completed").length} /></Card>
        <Card className="p-4"><Stat label="Total" value={mine.length} /></Card>
      </div>

      <Tabs
        tabs={[
          { key: "upcoming", label: "Upcoming", count: upcoming.length },
          { key: "past", label: "Past", count: past.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {list.length === 0 ? (
        <Card className="p-10 text-center text-sm text-[var(--muted)]">
          No {tab} meetings. {tab === "upcoming" && "Schedule one to loop in your manager."}
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {list.map((m) => (
            <MeetingCard key={m.id} m={m} leadCompany={m.leadId ? leads.find((l) => l.id === m.leadId)?.company : undefined} />
          ))}
        </div>
      )}

      <ScheduleMeetingModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

function MeetingCard({ m, leadCompany }: { m: Meeting; leadCompany?: string }) {
  const Icon = modeIcon[m.mode];
  const organizer = userById(m.organizerId);
  return (
    <Link href={`/meetings/${m.id}`}>
      <Card className="h-full p-4 transition-colors hover:border-[var(--primary)]">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate font-semibold">{m.title}</div>
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-[var(--muted)]">
              <Icon size={13} /> {formatMeetingWhen(m.scheduledAt)} · {m.durationMin}m · {meetingModeLabel[m.mode]}
            </div>
          </div>
          <Badge color={meetingStatusColor[m.status]} dot>{meetingStatusLabel[m.status]}</Badge>
        </div>

        {m.agenda && <p className="mb-2 line-clamp-2 text-sm text-[var(--muted)]">{m.agenda}</p>}

        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted-2)]">
          {leadCompany && <Badge color="primary">{leadCompany}</Badge>}
          <span className="flex items-center gap-1"><Users size={12} /> {m.attendeeIds.length + 1}</span>
          {m.insights.length > 0 && <span className="flex items-center gap-1"><Lightbulb size={12} /> {m.insights.length}</span>}
          {m.minutes.length > 0 && <span className="flex items-center gap-1"><NotebookPen size={12} /> {m.minutes.length}</span>}
          <span className="ml-auto flex items-center gap-1.5"><Avatar name={organizer?.name ?? "?"} size={20} /> {organizer?.name?.split(" ")[0]}</span>
        </div>
      </Card>
    </Link>
  );
}
