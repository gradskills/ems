"use client";

import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { Card, Button, Avatar } from "@/components/ui/primitives";
import { todaysBirthdays, upcomingBirthdays } from "@/lib/birthdays";
import { Cake, PartyPopper } from "lucide-react";

// Shown on the dashboard: celebrates today's birthdays and nudges colleagues to
// wish them. On mount it fires the automatic greeting (idempotent per day).
export function BirthdayBanner() {
  const employees = useApp((s) => s.employees);
  const actingUserId = useApp((s) => s.actingUserId);
  const runBirthdayGreetings = useApp((s) => s.runBirthdayGreetings);
  const wishBirthday = useApp((s) => s.wishBirthday);
  const [wished, setWished] = useState<Record<string, boolean>>({});

  useEffect(() => {
    runBirthdayGreetings();
  }, [runBirthdayGreetings]);

  const today = todaysBirthdays(employees);
  const upcoming = useMemo(() => upcomingBirthdays(employees, 14).slice(0, 3), [employees]);

  if (today.length === 0 && upcoming.length === 0) return null;

  const myBirthday = today.some((u) => u.id === actingUserId);

  return (
    <Card className="overflow-hidden border-[var(--primary)] p-0">
      <div className="flex items-center gap-2 bg-[var(--primary-soft)] px-4 py-2.5 text-[var(--primary)]">
        <PartyPopper size={16} />
        <span className="text-sm font-semibold">
          {myBirthday ? "Happy Birthday to you! 🎉" : today.length > 0 ? "Birthdays today" : "Birthdays coming up"}
        </span>
      </div>

      <div className="space-y-2.5 p-4">
        {today.map((u) => {
          const isMe = u.id === actingUserId;
          return (
            <div key={u.id} className="flex items-center gap-3">
              <Avatar name={u.name} size={36} src={u.avatarUrl} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{u.name}{isMe && " (you)"}</div>
                <div className="text-xs text-[var(--muted)]">🎂 It&apos;s their birthday today</div>
              </div>
              {!isMe && (
                <Button
                  size="sm"
                  variant={wished[u.id] ? "outline" : "primary"}
                  disabled={wished[u.id]}
                  onClick={() => { wishBirthday(u.id); setWished((w) => ({ ...w, [u.id]: true })); }}
                >
                  <Cake size={14} /> {wished[u.id] ? "Wished 🎉" : "Wish them"}
                </Button>
              )}
            </div>
          );
        })}

        {today.length > 0 && upcoming.length > 0 && <div className="border-t border-[var(--border)]" />}

        {upcoming.map(({ user, inDays, on }) => (
          <div key={user.id} className="flex items-center gap-3 text-[var(--muted)]">
            <Avatar name={user.name} size={28} src={user.avatarUrl} />
            <div className="min-w-0 flex-1">
              <span className="text-sm text-[var(--foreground)]">{user.name}</span>
              <span className="ml-1 text-xs">
                · {inDays === 1 ? "tomorrow" : new Date(on).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
