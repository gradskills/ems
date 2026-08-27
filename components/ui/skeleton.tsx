import { cn } from "@/lib/utils";

/** A single shimmering placeholder block. Size it with className (w/h). */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden />;
}

/** Content-area skeleton: a page header, a row of stat tiles, and two cards.
 *  Used inside the app shell while a page/route resolves. */
export function PageSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading">
      {/* header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>

      {/* stat tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <Skeleton className="mb-2 h-3 w-20" />
            <Skeleton className="h-7 w-12" />
          </div>
        ))}
      </div>

      {/* content cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 lg:col-span-2">
          <Skeleton className="h-4 w-32" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
          ))}
        </div>
        <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <Skeleton className="h-4 w-24" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Full-app skeleton mirroring the Shell (sidebar + topbar + content) so the
 *  hydration gate looks like the app assembling, not a blank "Loading…". */
export function AppShellSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--background)]" aria-busy="true" aria-label="Loading">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-[var(--border)] bg-[var(--surface)] lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-[var(--border)] px-5">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-2.5 w-14" />
          </div>
        </div>
        <div className="flex-1 space-y-6 px-3 py-4">
          {[5, 4, 4].map((count, g) => (
            <div key={g} className="space-y-1.5">
              <Skeleton className="mb-2 ml-3 h-2.5 w-16" />
              {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-1.5">
                  <Skeleton className="h-[18px] w-[18px] rounded" />
                  <Skeleton className="h-3.5 w-28" />
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="border-t border-[var(--border)] p-3">
          <div className="flex items-center gap-2 p-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-2.5 w-16" />
            </div>
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className="lg:pl-60">
        {/* top bar */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-[var(--border)] bg-[var(--surface)]/90 px-4 backdrop-blur sm:px-6">
          <Skeleton className="h-8 w-8 rounded-lg lg:hidden" />
          <div className="ml-auto flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-full lg:hidden" />
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 pb-24 pt-5 sm:px-6 lg:pb-10">
          <PageSkeleton />
        </main>
      </div>
    </div>
  );
}
