"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApp } from "@/lib/store";
import { homePathFor } from "@/lib/ems";
import { Skeleton } from "@/components/ui/skeleton";
import { KeyRound, ShieldCheck, ArrowLeft, Eye, EyeOff, Check } from "lucide-react";

export default function ChangePasswordPage() {
  const router = useRouter();
  const params = useSearchParams();
  const forced = params.get("forced") === "1";

  const hydrateAuth = useApp((s) => s.hydrateAuth);
  const authReady = useApp((s) => s.authReady);
  const authUserId = useApp((s) => s.authUserId);
  const employees = useApp((s) => s.employees);
  const changePassword = useApp((s) => s.changePassword);

  const me = employees.find((e) => e.id === authUserId);

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    hydrateAuth();
  }, [hydrateAuth]);
  useEffect(() => {
    if (authReady && !authUserId) router.replace("/login");
  }, [authReady, authUserId, router]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (next !== confirm) { setError("New password and confirmation don't match."); return; }
    if (!authUserId) return;
    const res = changePassword(authUserId, current, next);
    if (!res.ok) { setError(res.error ?? "Couldn't update password."); return; }
    setDone(true);
    setTimeout(() => router.replace(homePathFor(employees.find((x) => x.id === authUserId))), 1100);
  }

  if (!authReady || !me) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex flex-col items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3.5 w-56" />
          </div>
          <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-lg)]">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            ))}
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary)] text-white">
            <ShieldCheck size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tight">{forced ? "Set your password" : "Change password"}</h1>
          <p className="text-sm text-[var(--muted)]">
            {forced ? `Welcome, ${me.name.split(" ")[0]} — choose a password to secure your account.` : "Update the password for your account."}
          </p>
        </div>

        {done ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center shadow-[var(--shadow-lg)]">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--success-soft)] text-[var(--success)]"><Check size={22} /></div>
            <div className="text-sm font-semibold">Password updated</div>
            <div className="text-xs text-[var(--muted)]">Taking you to your workspace…</div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-lg)]">
            <PwdField label={forced ? "Temporary password" : "Current password"} value={current} onChange={setCurrent} show={show} autoComplete="current-password" />
            <PwdField label="New password" value={next} onChange={setNext} show={show} autoComplete="new-password" hint="At least 6 characters" />
            <PwdField label="Confirm new password" value={confirm} onChange={setConfirm} show={show} autoComplete="new-password" />

            <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
              <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> Show passwords
            </label>

            {error && <div className="rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-xs font-medium text-[var(--danger)]">{error}</div>}

            <button
              type="submit"
              disabled={!current || !next || !confirm}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[var(--primary)] text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <KeyRound size={16} /> {forced ? "Set password & continue" : "Update password"}
            </button>

            {!forced && (
              <button type="button" onClick={() => router.back()} className="flex w-full items-center justify-center gap-1.5 text-xs text-[var(--muted)] hover:text-[var(--foreground)]">
                <ArrowLeft size={13} /> Back
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

function PwdField({ label, value, onChange, show, autoComplete, hint }: { label: string; value: string; onChange: (v: string) => void; show: boolean; autoComplete: string; hint?: string }) {
  const [local, setLocal] = useState(false);
  const visible = show || local;
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-[var(--muted)]">{label}</span>
      <div className="flex items-center gap-2 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 focus-within:border-[var(--primary)] focus-within:ring-2 focus-within:ring-[var(--ring)]">
        <KeyRound size={16} className="text-[var(--muted-2)]" />
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className="h-10 w-full bg-transparent text-sm outline-none"
        />
        <button type="button" onClick={() => setLocal((s) => !s)} className="text-[var(--muted-2)] hover:text-[var(--foreground)]" aria-label={visible ? "Hide" : "Show"}>
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {hint && <span className="mt-1 block text-xs text-[var(--muted-2)]">{hint}</span>}
    </label>
  );
}
