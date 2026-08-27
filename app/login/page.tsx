"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { homePathFor } from "@/lib/ems";
import { DEMO_PASSWORD } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Sparkles, KeyRound, User as UserIcon, Eye, EyeOff, LogIn } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const login = useApp((s) => s.login);
  const hydrateAuth = useApp((s) => s.hydrateAuth);
  const authUserId = useApp((s) => s.authUserId);
  const authReady = useApp((s) => s.authReady);
  const employees = useApp((s) => s.employees);

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // restore any existing session, then bounce away from /login if signed in
  useEffect(() => {
    hydrateAuth();
  }, [hydrateAuth]);
  useEffect(() => {
    if (authReady && authUserId) {
      const u = employees.find((e) => e.id === authUserId);
      router.replace(u?.mustChangePassword ? "/account/password?forced=1" : homePathFor(u));
    }
  }, [authReady, authUserId, employees, router]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = login(loginId, password);
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "Sign in failed.");
      return;
    }
    if (res.mustChangePassword) router.replace("/account/password?forced=1");
    else {
      const u = useApp.getState().employees.find((x) => x.id === useApp.getState().authUserId);
      router.replace(homePathFor(u));
    }
  }

  const demoAccounts = [
    { role: "Admin", id: "rohan" },
    { role: "Manager", id: "sneha" },
    { role: "BDA", id: "priya" },
  ];

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-10">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary)] text-white">
            <Sparkles size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tight">PixelForge Portal</h1>
          <p className="text-sm text-[var(--muted)]">Sign in to your workspace</p>
        </div>

        <form onSubmit={submit} className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-lg)]">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Login ID</span>
            <div className="flex items-center gap-2 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 focus-within:border-[var(--primary)] focus-within:ring-2 focus-within:ring-[var(--ring)]">
              <UserIcon size={16} className="text-[var(--muted-2)]" />
              <input
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="username"
                placeholder="e.g. priya"
                className="h-10 w-full bg-transparent text-sm outline-none"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Password</span>
            <div className="flex items-center gap-2 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 focus-within:border-[var(--primary)] focus-within:ring-2 focus-within:ring-[var(--ring)]">
              <KeyRound size={16} className="text-[var(--muted-2)]" />
              <input
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
                className="h-10 w-full bg-transparent text-sm outline-none"
              />
              <button type="button" onClick={() => setShow((s) => !s)} className="text-[var(--muted-2)] hover:text-[var(--foreground)]" aria-label={show ? "Hide password" : "Show password"}>
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>

          {error && <div className="rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-xs font-medium text-[var(--danger)]">{error}</div>}

          <button
            type="submit"
            disabled={busy || !loginId || !password}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[var(--primary)] text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <LogIn size={16} /> {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="mt-4 rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-2)] p-3 text-xs">
          <div className="mb-1.5 font-semibold text-[var(--muted)]">Demo accounts</div>
          <div className="flex flex-wrap gap-1.5">
            {demoAccounts.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => { setLoginId(a.id); setPassword(DEMO_PASSWORD); }}
                className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 font-medium hover:border-[var(--primary)]"
              >
                {a.role}: {a.id}
              </button>
            ))}
          </div>
          <div className="mt-2 text-[var(--muted-2)]">Password for all demo accounts: <span className="font-mono font-semibold text-[var(--foreground)]">{DEMO_PASSWORD}</span></div>
        </div>
      </div>
    </div>
  );
}
