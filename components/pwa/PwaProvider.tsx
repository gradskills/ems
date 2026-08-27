"use client";

import { useEffect, useState } from "react";
import { Download, Share, X, Sparkles } from "lucide-react";

// Minimal typing for the non-standard install prompt event.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "ems.installDismissed";

export function PwaProvider() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  // Service worker: only in production. In dev the SW cache-firsts /_next/static
  // assets, which have stable (unhashed) URLs — so it serves stale CSS/JS after
  // every code change (e.g. new theme tokens never show up). In dev we instead
  // tear down any SW + caches left over from a prior run so the browser recovers.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
      return;
    }
    // Dev: unregister any leftover SW and purge its caches. If we actually found
    // something stale (an SW was controlling this page with cached assets), do a
    // single guarded reload so the browser re-fetches fresh CSS/JS from the dev
    // server. The sessionStorage flag prevents a reload loop.
    (async () => {
      const regs = await navigator.serviceWorker.getRegistrations().catch(() => []);
      await Promise.all(regs.map((r) => r.unregister().catch(() => false)));
      const keys = "caches" in window ? await caches.keys().catch(() => []) : [];
      await Promise.all(keys.map((k) => caches.delete(k).catch(() => false)));
      const foundStale = regs.length > 0 || keys.length > 0;
      if (foundStale && !sessionStorage.getItem("sw-cleared")) {
        sessionStorage.setItem("sw-cleared", "1");
        location.reload();
      }
    })().catch(() => {});
  }, []);

  useEffect(() => {
    const iOS = /ipad|iphone|ipod/i.test(navigator.userAgent) && !("MSStream" in window);
    const inStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsIOS(iOS);
    setStandalone(inStandalone);
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setStandalone(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function close() {
    setDismissed(true);
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* ignore */ }
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    close();
  }

  // Nothing to show: already installed, dismissed, or no install path available
  if (standalone || dismissed) return null;
  if (!deferred && !isIOS) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-[55] mx-auto max-w-md rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--shadow-lg)] lg:left-auto lg:right-4 lg:mx-0">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)] text-white">
          <Sparkles size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">Install PixelForge</div>
          {isIOS && !deferred ? (
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              Tap <Share size={12} className="mx-0.5 -mt-0.5 inline" /> Share, then “Add to Home Screen”.
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-[var(--muted)]">Add the app to your home screen for quick clock-in and offline access.</p>
          )}
          {deferred && (
            <button onClick={install} className="mt-2 flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90">
              <Download size={14} /> Install
            </button>
          )}
        </div>
        <button onClick={close} className="rounded-lg p-1 text-[var(--muted-2)] hover:bg-[var(--surface-2)]" aria-label="Dismiss">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
