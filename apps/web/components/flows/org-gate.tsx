"use client";

import { useEffect, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Button } from "@/components/ui/primitives";
import { Monogram } from "@/components/ui/monogram";

export interface OrgSummary {
  id: string;
  name: string;
  treasuryPubkey: string;
  createdAt: number;
}

/**
 * Workspace screen. One wallet owns exactly one workspace (the on-chain policy
 * and treasury are wallet-scoped), so this is enter / name / rename — not a
 * multi-workspace switcher.
 */
export function OrgGate({
  org,
  initialMode = "view",
  onEnter,
  onSave,
}: {
  org: OrgSummary | null;
  initialMode?: "view" | "edit";
  onEnter: () => void;
  onSave: (name: string) => Promise<void>;
}) {
  const { publicKey, disconnect } = useWallet();
  const creating = !org;
  const [mode, setMode] = useState<"view" | "edit">(creating ? "edit" : initialMode);
  const [name, setName] = useState(org?.name ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode === "edit") {
      const t = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [mode]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErr("Give your workspace a name");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await onSave(name.trim());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't save the workspace");
      setBusy(false);
    }
  };

  const me = publicKey?.toBase58() ?? "";

  return (
    <div className="relative min-h-screen overflow-hidden bg-paper">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(58% 46% at 50% -8%, rgba(42,61,95,0.11), transparent 70%)",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-rule-strong to-transparent"
        aria-hidden
      />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16">
        <div className="mb-12 flex items-center gap-2.5">
          <Logo className="h-5 w-5 text-ink" />
          <span className="font-display text-[19px] tracking-tight">Envelope</span>
        </div>

        <div className="gate-rise">
          <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-3">
            Workspace
          </span>
          <h1 className="mt-3 font-display text-[34px] leading-[1.05] tracking-tighter text-ink">
            {mode === "edit"
              ? creating
                ? "Name your workspace"
                : "Rename workspace"
              : "Welcome back"}
          </h1>
          <p className="mt-3 text-[14.5px] leading-relaxed text-ink-2">
            {mode === "edit"
              ? "It appears on invoices and every contractor claim page. Change it anytime — your treasury, policy, and data stay put."
              : "Open your workspace to manage payroll, contractors, and invoices."}
          </p>

          {mode === "view" && org ? (
            <div className="mt-8 space-y-3">
              <div className="rounded-2xl border border-rule bg-paper-2 p-4">
                <div className="flex items-center gap-4">
                  <Monogram
                    seed={org.treasuryPubkey}
                    label={org.name}
                    className="h-12 w-12 text-[17px]"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-display text-[18px] leading-tight tracking-tight text-ink">
                      {org.name}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[12px] text-ink-3">
                      <span className="font-mono">{shorten(org.treasuryPubkey)}</span>
                      <span className="h-1 w-1 rounded-full bg-ink-4" />
                      <span>created {timeAgo(org.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
              <Button variant="primary" size="lg" className="w-full" onClick={onEnter}>
                Open workspace →
              </Button>
              <button
                type="button"
                onClick={() => {
                  setName(org.name);
                  setErr(null);
                  setMode("edit");
                }}
                className="block w-full text-center text-[12px] text-ink-3 transition-colors hover:text-ink"
              >
                Rename workspace
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-8">
              <div className="flex items-center gap-4 rounded-2xl border border-rule bg-paper-2 p-4">
                <Monogram
                  seed={name.trim() || me || "envelope"}
                  label={name.trim() || "?"}
                  className="h-14 w-14 text-[20px]"
                />
                <label className="flex-1">
                  <span className="text-[10.5px] uppercase tracking-[0.14em] text-ink-3">
                    Workspace name
                  </span>
                  <input
                    ref={inputRef}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Acme Labs"
                    maxLength={60}
                    className="mt-1 w-full bg-transparent font-display text-[22px] tracking-tight text-ink placeholder:text-ink-4 focus:outline-none"
                  />
                </label>
              </div>
              {err && <p className="mt-3 text-[13px] text-negative">{err}</p>}
              <div className="mt-5 flex gap-2">
                {!creating && org && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="lg"
                    onClick={() => {
                      setErr(null);
                      setName(org.name);
                      setMode("view");
                    }}
                  >
                    ← Back
                  </Button>
                )}
                <Button type="submit" variant="primary" size="lg" className="flex-1" disabled={busy}>
                  {busy ? "Saving…" : creating ? "Create workspace →" : "Save & open →"}
                </Button>
              </div>
            </form>
          )}
        </div>

        <div className="mt-12 flex items-center gap-2.5 text-[12px] text-ink-3">
          {me && <span className="font-mono">signed in as {shorten(me)}</span>}
          {me && <span className="h-1 w-1 rounded-full bg-ink-4" />}
          <button
            type="button"
            onClick={() => disconnect().catch(() => {})}
            className="transition-colors hover:text-ink"
          >
            Disconnect
          </button>
        </div>
      </div>

      <style jsx>{`
        .gate-rise {
          animation: gateRise 0.42s cubic-bezier(0.2, 0.8, 0.2, 1) both;
        }
        @keyframes gateRise {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

function Logo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="1.5" y="4.5" width="17" height="13" rx="1.5" />
      <path d="M1.5 6 L10 12 L18.5 6" />
    </svg>
  );
}

function shorten(s: string): string {
  return s.length > 12 ? `${s.slice(0, 5)}…${s.slice(-5)}` : s;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const d = Math.floor(diff / 86_400_000);
  if (d >= 1) return d === 1 ? "yesterday" : `${d}d ago`;
  const h = Math.floor(diff / 3_600_000);
  if (h >= 1) return `${h}h ago`;
  const m = Math.floor(diff / 60_000);
  if (m >= 1) return `${m}m ago`;
  return "just now";
}
