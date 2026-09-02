import { WifiOff } from "lucide-react";

export const metadata = { title: "Offline · Gradskills EMS" };

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[var(--background)] px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--muted)]">
        <WifiOff size={26} />
      </div>
      <h1 className="text-lg font-bold">You're offline</h1>
      <p className="max-w-xs text-sm text-[var(--muted)]">
        Gradskills EMS can't reach the network right now. Pages you've already opened stay available — reconnect to load new data.
      </p>
    </div>
  );
}
