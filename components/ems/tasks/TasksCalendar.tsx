"use client";

import { useMemo, useState } from "react";
import { Badge, Button } from "@/components/ui/primitives";
import { priorityColor } from "@/lib/ems";
import { localDateISO, cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import type { Task } from "@/lib/types";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function TasksCalendar({
  tasks,
  onOpen,
  onDayAdd,
}: {
  tasks: Task[];
  onOpen: (t: Task) => void;
  onDayAdd?: (dateISO: string) => void;
}) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());

  // dueDate (YYYY-MM-DD) → tasks
  const byDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      if (!t.dueAt) continue;
      const key = t.dueAt.slice(0, 10);
      const list = map.get(key) ?? [];
      list.push(t);
      map.set(key, list);
    }
    return map;
  }, [tasks]);

  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = localDateISO();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  function shift(delta: number) {
    const m = month + delta;
    if (m < 0) { setMonth(11); setYear((y) => y - 1); }
    else if (m > 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth(m);
  }
  const noDue = tasks.filter((t) => !t.dueAt);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{MONTHS[month]} {year}</h2>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => { setMonth(now.getMonth()); setYear(now.getFullYear()); }}>Today</Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => shift(-1)} aria-label="Previous month"><ChevronLeft size={16} /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => shift(1)} aria-label="Next month"><ChevronRight size={16} /></Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)]">
        <div className="grid grid-cols-7 border-b border-[var(--border)] bg-[var(--surface-2)] text-center text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
          {WEEKDAYS.map((w) => <div key={w} className="py-2">{w}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            if (day === null) return <div key={i} className="min-h-[96px] border-b border-r border-[var(--border)] bg-[var(--surface-2)]/30" />;
            const key = `${year}-${pad(month + 1)}-${pad(day)}`;
            const items = byDay.get(key) ?? [];
            const isToday = key === todayKey;
            return (
              <div key={i} className="group relative min-h-[96px] border-b border-r border-[var(--border)] p-1">
                <div className="flex items-center justify-between px-1">
                  <span className={cn("text-xs", isToday ? "flex h-5 w-5 items-center justify-center rounded-full bg-[var(--primary)] font-semibold text-white" : "text-[var(--muted)]")}>{day}</span>
                  {onDayAdd && (
                    <button
                      onClick={() => onDayAdd(new Date(year, month, day, 12).toISOString())}
                      className="rounded p-0.5 text-[var(--muted-2)] opacity-0 transition-opacity hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] group-hover:opacity-100"
                      aria-label={`Add task on ${key}`}
                    >
                      <Plus size={12} />
                    </button>
                  )}
                </div>
                <div className="mt-1 space-y-1">
                  {items.slice(0, 3).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => onOpen(t)}
                      className="flex w-full items-center gap-1 truncate rounded-md bg-[var(--surface-2)] px-1.5 py-1 text-left text-[11px] hover:bg-[var(--border)]"
                      title={t.title}
                    >
                      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", t.status === "done" ? "bg-[var(--success)]" : "bg-[var(--primary)]")} />
                      {t.icon && <span className="shrink-0">{t.icon}</span>}
                      <span className={cn("truncate", t.status === "done" && "text-[var(--muted-2)] line-through")}>{t.title}</span>
                    </button>
                  ))}
                  {items.length > 3 && <div className="px-1 text-[10px] text-[var(--muted-2)]">+{items.length - 3} more</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {noDue.length > 0 && (
        <div className="rounded-[var(--radius)] border border-dashed border-[var(--border)] p-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">No due date · {noDue.length}</div>
          <div className="flex flex-wrap gap-1.5">
            {noDue.map((t) => (
              <button key={t.id} onClick={() => onOpen(t)} className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs hover:bg-[var(--surface-2)]">
                <Badge color={priorityColor[t.priority]} className="px-1.5 py-0 text-[9px]">{t.priority}</Badge>
                {t.icon && <span>{t.icon}</span>}
                <span className="max-w-[160px] truncate">{t.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
