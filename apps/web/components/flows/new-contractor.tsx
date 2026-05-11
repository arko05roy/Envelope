"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/primitives";
import { useOrg } from "@/lib/hooks/useOrg";
import { api } from "@/lib/api/fetcher";
import type { Contractor } from "@/lib/store";

type RecordVal = { value: string; staleness: boolean; roa: boolean };
type Records = {
  email?: RecordVal;
  twitter?: RecordVal;
  github?: RecordVal;
  discord?: RecordVal;
};

type SnsState =
  | { status: "idle" }
  | { status: "invalid" }
  | { status: "checking" }
  | { status: "missing" }
  | { status: "ok"; pubkey: string; cluster: "mainnet" | "devnet"; records: Records };

const HANDLE_RE = /^[a-z0-9-]+(\.[a-z0-9-]+)*\.sol$/;

export function NewContractorDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (contractor: Contractor) => void;
}) {
  const { pubkey } = useOrg();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [role, setRole] = useState("");
  const [monthlyUsd, setMonthlyUsd] = useState("");
  const [snsHandle, setSnsHandle] = useState("");
  const [sns, setSns] = useState<SnsState>({ status: "idle" });
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const handleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => handleRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  // Debounced live SNS resolution + records preview.
  useEffect(() => {
    const h = snsHandle.trim().toLowerCase();
    setCopied(false);
    if (!h) return setSns({ status: "idle" });
    if (!HANDLE_RE.test(h)) return setSns({ status: "invalid" });
    setSns({ status: "checking" });
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const [rRes, rRec] = await Promise.all([
          fetch(`/api/sns/resolve?handle=${encodeURIComponent(h)}`, { signal: ctrl.signal }),
          fetch(`/api/sns/records?handle=${encodeURIComponent(h)}`, { signal: ctrl.signal }),
        ]);
        const jRes = (await rRes.json()) as {
          resolved: { pubkey: string; cluster: "mainnet" | "devnet" } | null;
        };
        if (!jRes.resolved) return setSns({ status: "missing" });
        const jRec = (await rRec.json().catch(() => ({ records: {} }))) as { records: Records };
        setSns({
          status: "ok",
          pubkey: jRes.resolved.pubkey,
          cluster: jRes.resolved.cluster,
          records: jRec.records ?? {},
        });
      } catch {
        // aborted
      }
    }, 350);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [snsHandle]);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const adoptFromDomain = () => {
    if (sns.status !== "ok") return;
    if (sns.records.email && !email) setEmail(sns.records.email.value);
    if (sns.records.github && !name) setName(sns.records.github.value);
    else if (sns.records.twitter && !name) setName(sns.records.twitter.value.replace(/^@/, ""));
  };

  const copyPubkey = async () => {
    if (sns.status !== "ok") return;
    try {
      await navigator.clipboard.writeText(sns.pubkey);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked */
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const trimmed = snsHandle.trim().toLowerCase();
      const j = await api<{ contractor: Contractor }>(pubkey, "/api/contractors", {
        method: "POST",
        body: JSON.stringify({
          name,
          email,
          countryCode: countryCode.toUpperCase(),
          role,
          monthlyUsd: Number(monthlyUsd),
          ...(trimmed ? { snsHandle: trimmed } : {}),
        }),
      });
      onCreated(j.contractor);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't add the contractor");
      setBusy(false);
    }
  };

  const fieldBorder =
    sns.status === "ok"
      ? "border-positive/45 focus-within:border-positive/60 focus-within:ring-positive/12"
      : sns.status === "invalid" || sns.status === "missing"
        ? "border-warning/45 focus-within:border-warning/60 focus-within:ring-warning/12"
        : "border-rule focus-within:border-rule-strong focus-within:ring-accent/15";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink/45 backdrop-blur-md"
        style={{
          backgroundImage:
            "radial-gradient(120% 60% at 50% 0%, rgba(42,61,95,0.10), transparent 60%)",
        }}
        aria-hidden
      />

      {/* Panel */}
      <div className="dialog-in relative w-full max-w-xl">
        <div className="relative overflow-hidden rounded-[18px] border border-rule bg-paper-2 shadow-lift">
          {/* hairline accent */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/35 to-transparent" />

          <div className="max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="px-7 pt-7 pb-6">
              <div className="flex items-start justify-between gap-4">
                <span className="text-[11px] uppercase tracking-[0.16em] text-ink-3 font-medium">
                  Add contractor
                </span>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="-mt-1 -mr-1 h-7 w-7 rounded-full text-ink-3 transition-colors hover:bg-paper-3 hover:text-ink"
                >
                  ×
                </button>
              </div>
              <h2 className="mt-3 font-display text-[28px] leading-[1.1] tracking-tighter text-ink">
                Pay people by name.
                <br />
                <span className="text-ink-2">Not by forty-four random characters.</span>
              </h2>
            </div>

            {/* ── .sol identity — the main event ── */}
            <div className="px-7">
              <label
                className={`relative flex items-center gap-3 rounded-2xl border bg-paper px-4 transition-all duration-150 focus-within:ring-2 ${fieldBorder}`}
              >
                <span className="select-none font-mono text-[20px] leading-none text-ink-3">◎</span>
                <input
                  ref={handleRef}
                  value={snsHandle}
                  onChange={(e) => setSnsHandle(e.target.value)}
                  placeholder="asha.sol"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="h-16 flex-1 bg-transparent font-mono text-[22px] tracking-tight text-ink placeholder:text-ink-4 focus:outline-none"
                />
                <span className="w-6 shrink-0 text-right">
                  {sns.status === "checking" && <Spinner />}
                  {sns.status === "ok" && (
                    <span className="font-mono text-[16px] leading-none text-positive">✓</span>
                  )}
                </span>
              </label>

              {/* resolution panel */}
              <div className="mt-3 min-h-[20px]">
                {sns.status === "idle" && (
                  <p className="text-[12.5px] leading-relaxed text-ink-3">
                    A{" "}
                    <span className="text-ink-2">Solana Name Service</span> handle. Every payout is
                    tagged with it, it greets them on the claim page, and verified records
                    auto-import. Optional — but it&apos;s the point.
                  </p>
                )}
                {sns.status === "invalid" && (
                  <p className="text-[12.5px] text-warning">
                    Handles look like <span className="font-mono">name.sol</span>.
                  </p>
                )}
                {sns.status === "checking" && (
                  <p className="font-mono text-[12px] text-ink-3">resolving on solana…</p>
                )}
                {sns.status === "missing" && (
                  <p className="text-[12.5px] text-ink-3">
                    <span className="text-warning">Not registered.</span> You can still add this
                    person — payment will route to their wallet instead.
                  </p>
                )}
                {sns.status === "ok" && (
                  <div className="reveal rounded-2xl border border-rule bg-paper px-4 py-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <button
                          type="button"
                          onClick={copyPubkey}
                          className="group flex items-center gap-2 font-mono text-[12.5px] text-ink-2 transition-colors hover:text-ink"
                          title="Copy address"
                        >
                          <span className="truncate">{shorten(sns.pubkey)}</span>
                          <span className="text-[10px] text-ink-3 group-hover:text-ink-2">
                            {copied ? "copied" : "copy"}
                          </span>
                        </button>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] ${
                          sns.cluster === "mainnet"
                            ? "bg-accent-soft text-accent-ink"
                            : "bg-paper-3 text-ink-2"
                        }`}
                      >
                        {sns.cluster}
                      </span>
                    </div>

                    {hasRecords(sns.records) && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <RecordChip label="github" rec={sns.records.github} />
                        <RecordChip label="twitter" rec={sns.records.twitter} prefix="@" />
                        <RecordChip label="discord" rec={sns.records.discord} />
                        <RecordChip label="email" rec={sns.records.email} />
                      </div>
                    )}

                    {(sns.records.email || sns.records.github || sns.records.twitter) && (
                      <button
                        type="button"
                        onClick={adoptFromDomain}
                        className="mt-3 text-[11.5px] text-accent transition-colors hover:text-accent-ink"
                      >
                        ↳ Fill name &amp; email from this domain
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── their details ── */}
            <form onSubmit={submit} className="px-7 pb-7">
              <div className="my-6 flex items-center gap-3">
                <span className="h-px flex-1 bg-rule" />
                <span className="text-[10.5px] uppercase tracking-[0.16em] text-ink-3">
                  Their details
                </span>
                <span className="h-px flex-1 bg-rule" />
              </div>

              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-6">
                <div className="sm:col-span-3">
                  <Field label="Full name" value={name} onChange={setName} placeholder="Asha Patel" />
                </div>
                <div className="sm:col-span-3">
                  <Field
                    label="Email"
                    value={email}
                    onChange={setEmail}
                    type="email"
                    placeholder="asha@acme.com"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Field
                    label="Country"
                    value={countryCode}
                    onChange={(v) => setCountryCode(v.toUpperCase())}
                    placeholder="IN"
                    maxLength={3}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Field label="Role" value={role} onChange={setRole} placeholder="Engineer" />
                </div>
                <div className="sm:col-span-2">
                  <Field
                    label="Monthly USD"
                    value={monthlyUsd}
                    onChange={setMonthlyUsd}
                    type="number"
                    placeholder="6000"
                  />
                </div>
              </div>

              <p className="mt-5 flex items-start gap-2 text-[11.5px] leading-relaxed text-ink-3">
                <span className="mt-[1px] text-ink-4">⊠</span>
                The monthly figure is sealed as a ciphertext on Solana the moment you save — only the
                encrypted policy ever reads it.
              </p>

              {err && <div className="mt-3 text-[13px] text-negative">{err}</div>}

              <div className="mt-5 flex gap-2">
                <Button type="submit" variant="primary" size="lg" className="flex-1" disabled={busy}>
                  {busy ? "Adding…" : "Add contractor →"}
                </Button>
                <Button type="button" variant="ghost" size="lg" onClick={onClose}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <style jsx>{`
        .dialog-in {
          animation: dialogIn 0.32s cubic-bezier(0.2, 0.8, 0.2, 1) both;
        }
        @keyframes dialogIn {
          from {
            opacity: 0;
            transform: translateY(10px) scale(0.985);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .reveal {
          animation: reveal 0.28s cubic-bezier(0.2, 0.8, 0.2, 1) both;
        }
        @keyframes reveal {
          from {
            opacity: 0;
            transform: translateY(-4px);
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

function hasRecords(r: Records): boolean {
  return Boolean(r.github || r.twitter || r.discord || r.email);
}

function RecordChip({ label, rec, prefix = "" }: { label: string; rec?: RecordVal; prefix?: string }) {
  if (!rec) return null;
  const verified = rec.roa && !rec.staleness;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-paper-3 px-2.5 py-1 text-[11px] text-ink-2">
      <span className="text-ink-3">{label}</span>
      <span className="max-w-[140px] truncate font-mono text-ink">
        {prefix}
        {rec.value}
      </span>
      {verified ? (
        <span className="text-positive" title="Ownership-verified record">
          ✓
        </span>
      ) : rec.staleness ? (
        <span className="text-warning" title="Record may be stale">
          ⚠
        </span>
      ) : null}
    </span>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="inline-block h-3.5 w-3.5 animate-spin rounded-full border border-ink-3/30 border-t-ink-2 align-middle"
    />
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <label className="block">
      <span className="text-[10.5px] uppercase tracking-[0.14em] text-ink-3">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        required
        className="mt-1.5 h-10 w-full rounded-lg border border-rule bg-paper px-3 text-[14px] text-ink placeholder:text-ink-4 transition-colors focus:border-rule-strong focus:outline-none focus:ring-2 focus:ring-accent/15"
      />
    </label>
  );
}

function shorten(s: string): string {
  return s.length > 12 ? `${s.slice(0, 5)}…${s.slice(-5)}` : s;
}
