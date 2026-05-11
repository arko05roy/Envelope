"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/ui/header";
import { Button, Card, Label, Pill } from "@/components/ui/primitives";
import { ConnectWalletState, EmptyState } from "@/components/ui/empty-state";
import { Monogram } from "@/components/ui/monogram";
import { useOrg } from "@/lib/hooks/useOrg";
import { api } from "@/lib/api/fetcher";
import type { Contractor, PayrollRunRecord } from "@/lib/store";

interface DryRun {
  rows: Array<{ id: string; name: string; monthlyUsd: number; lamports: string; encryptCiphertextId?: string }>;
  totalUsd: number;
  totalLamports: string;
  chunks: number;
}

export default function PayrollPage() {
  const { connected, pubkey, org } = useOrg();
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dry, setDry] = useState<DryRun | null>(null);
  const [busy, setBusy] = useState<"dry" | "exec" | null>(null);
  const [result, setResult] = useState<PayrollRunRecord | null>(null);
  const [armed, setArmed] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const claimRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pubkey) return;
    api<{ contractors: Contractor[] }>(pubkey, "/api/contractors")
      .then((j) => {
        setContractors(j.contractors);
        setSelected(new Set(j.contractors.map((c) => c.id)));
      })
      .catch((e: Error) => setErr(e.message));
  }, [pubkey]);

  const selectedList = useMemo(
    () => contractors.filter((c) => selected.has(c.id)),
    [contractors, selected],
  );
  const totalUsd = useMemo(() => selectedList.reduce((s, c) => s + c.monthlyUsd, 0), [selectedList]);
  const unsealed = useMemo(() => selectedList.filter((c) => !c.encryptCiphertextId).length, [selectedList]);

  // Disarm the two-step confirm after a few seconds.
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4500);
    return () => clearTimeout(t);
  }, [armed]);

  if (!connected) return <Wrap><ConnectWalletState /></Wrap>;
  if (!org?.name) {
    return (
      <Wrap>
        <EmptyState
          title="Open a workspace first"
          description="Pick or create a workspace from the dashboard before running payroll."
          action={<Link href="/dashboard"><Button variant="primary">Open dashboard</Button></Link>}
        />
      </Wrap>
    );
  }
  if (contractors.length === 0) {
    return (
      <Wrap>
        <EmptyState
          title="Add contractors first"
          description="Payroll needs people. Add the team you want to pay, then come back."
          action={<Link href="/dashboard/contractors"><Button variant="primary">+ Add contractors</Button></Link>}
        />
      </Wrap>
    );
  }

  const toggle = (id: string) => {
    const s = new Set(selected);
    if (s.has(id)) s.delete(id);
    else s.add(id);
    setSelected(s);
    setDry(null);
    setResult(null);
    setArmed(false);
  };
  const setAll = (ids: string[]) => {
    setSelected(new Set(ids));
    setDry(null);
    setResult(null);
    setArmed(false);
  };

  const doDry = async () => {
    setBusy("dry");
    setErr(null);
    try {
      const j = await api<DryRun>(pubkey, "/api/payroll/dry-run", {
        method: "POST",
        body: JSON.stringify({ contractorIds: [...selected] }),
      });
      setDry(j);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't compute the run");
    } finally {
      setBusy(null);
    }
  };

  const doRun = async () => {
    if (!armed) {
      setArmed(true);
      return;
    }
    setArmed(false);
    setBusy("exec");
    setErr(null);
    try {
      const j = await api<PayrollRunRecord>(pubkey, "/api/payroll/run", {
        method: "POST",
        body: JSON.stringify({ contractorIds: [...selected] }),
      });
      setResult(j);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "The run failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <header className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-3">
              Payroll
            </span>
            <h1 className="mt-2.5 font-display text-[34px] leading-none tracking-tighter text-ink">
              Run payroll
            </h1>
            <p className="mt-2.5 text-[14px] text-ink-2">
              Pick who gets paid. One approval settles everyone in a shielded batch — the public
              ledger sees one entry.
            </p>
          </div>
        </header>

        {err && (
          <div className="mt-6 rounded-lg border border-negative/30 bg-negative-soft px-4 py-3 text-[13px] text-negative">
            {err}
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* ── Roster ── */}
          <Card className="overflow-hidden p-0 lg:col-span-8">
            <div className="flex items-center justify-between border-b border-rule px-5 py-3.5">
              <div className="flex items-center gap-2 text-[13px]">
                <span className="text-ink">
                  {selected.size} of {contractors.length} selected
                </span>
                <span className="h-1 w-1 rounded-full bg-ink-4" />
                <span className="num text-ink-2">${totalUsd.toLocaleString()}</span>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => setAll([])}>
                  Clear
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setAll(contractors.map((c) => c.id))}>
                  Select all
                </Button>
              </div>
            </div>
            <ul className="max-h-[560px] divide-y divide-rule overflow-auto">
              {contractors.map((c) => {
                const on = selected.has(c.id);
                return (
                  <li
                    key={c.id}
                    onClick={() => toggle(c.id)}
                    className={`flex cursor-pointer items-center gap-4 border-l-2 px-5 py-3.5 transition-colors ${
                      on
                        ? "border-l-accent bg-accent-soft/40"
                        : "border-l-transparent hover:bg-paper-3/40"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggle(c.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-3.5 w-3.5 shrink-0 accent-accent"
                    />
                    <Monogram
                      seed={c.snsResolvedPubkey || c.id}
                      label={c.name}
                      className="h-9 w-9 text-[13px]"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] text-ink">{c.name}</span>
                        {c.snsHandle && (
                          <span className="rounded-full bg-accent-soft px-2 py-0.5 font-mono text-[10.5px] text-accent-ink">
                            {c.snsHandle}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[12px] text-ink-3">
                        {c.countryCode && <span className="font-mono">{c.countryCode}</span>}
                        {c.role && (
                          <>
                            <span className="h-1 w-1 rounded-full bg-ink-4" />
                            <span>{c.role}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="hidden w-20 shrink-0 text-right sm:block">
                      {c.encryptCiphertextId ? (
                        <span className="text-[11px] text-positive">sealed</span>
                      ) : (
                        <span className="text-[11px] text-warning">unsealed</span>
                      )}
                    </div>
                    <div className="num w-24 shrink-0 text-right text-[14px] text-ink">
                      ${c.monthlyUsd.toLocaleString()}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>

          {/* ── Run summary ── */}
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-6">
              <Card className="relative overflow-hidden p-5">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
                <Label>{result ? (result.cloakStatus === "settled" ? "Settled" : "Approved") : "Run summary"}</Label>

                {!result ? (
                  <>
                    <div className="mt-4 space-y-3 text-[13px]">
                      <Row k="Recipients" v={String(selected.size)} />
                      <Row k="Gross" v={`$${totalUsd.toLocaleString()}`} strong />
                      <Row
                        k="Per Solana batch"
                        v={dry ? `${dry.chunks} ${dry.chunks === 1 ? "batch" : "batches"}` : "computed on dry run"}
                        muted={!dry}
                      />
                      {dry && (
                        <Row k="Network fee" v={`≈ ${(Number(dry.totalLamports) / 1e9).toFixed(4)} SOL`} />
                      )}
                    </div>

                    {unsealed > 0 && (
                      <p className="mt-4 rounded-lg border border-warning/30 bg-warning-soft px-3 py-2 text-[12px] text-warning">
                        {unsealed} selected {unsealed === 1 ? "person is" : "people are"} unsealed —
                        their amount gets sealed automatically before settlement.
                      </p>
                    )}

                    <p className="mt-4 text-[12px] leading-relaxed text-ink-3">
                      Each recipient gets a one-time stealth claim link. Salary amounts never hit the
                      public ledger.
                    </p>

                    <div className="mt-5 space-y-2">
                      <Button
                        variant="secondary"
                        className="w-full"
                        onClick={doDry}
                        disabled={busy !== null || selected.size === 0}
                      >
                        {busy === "dry" ? "Computing…" : dry ? "Recompute dry run" : "Dry run"}
                      </Button>
                      <Button
                        variant="primary"
                        className="w-full"
                        onClick={doRun}
                        disabled={busy !== null || !dry || selected.size === 0}
                      >
                        {busy === "exec"
                          ? "Settling…"
                          : armed
                            ? `Confirm — pay ${selected.size} now`
                            : "Send shielded payroll →"}
                      </Button>
                      {armed && (
                        <button
                          onClick={() => setArmed(false)}
                          className="w-full text-center text-[12px] text-ink-3 hover:text-ink"
                        >
                          cancel
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mt-4 num font-display text-[30px] leading-none text-ink">
                      {result.recipients.length} paid
                    </div>
                    <div className="mt-1.5 text-[12px] text-ink-2">
                      ${result.totalUsd.toLocaleString()} across {result.totalChunks}{" "}
                      {result.totalChunks === 1 ? "batch" : "batches"}
                    </div>
                    <div className="mt-3">
                      <Pill tone={result.cloakStatus === "settled" ? "positive" : "warning"}>
                        {result.cloakStatus === "settled" ? "shielded on Solana" : "awaiting mainnet"}
                      </Pill>
                    </div>
                    {result.policyApproval && (
                      <div className="mt-4 text-[11.5px] text-ink-3">
                        on-chain approval ·{" "}
                        <a
                          href={`https://solscan.io/tx/${result.policyApproval.signature}?cluster=devnet`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-accent-ink hover:underline"
                        >
                          {result.policyApproval.signature.slice(0, 12)}…
                        </a>
                      </div>
                    )}
                    {result.paidByAgent && (
                      <div className="mt-2 text-[11.5px] text-ink-3">
                        signed by <span className="font-mono">{result.paidByAgent}</span>
                      </div>
                    )}
                    <div className="mt-5 space-y-2">
                      <Button
                        variant="secondary"
                        className="w-full"
                        onClick={() => claimRef.current?.scrollIntoView({ behavior: "smooth" })}
                      >
                        View claim links ↓
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full"
                        onClick={() => {
                          setResult(null);
                          setDry(null);
                        }}
                      >
                        Start another run
                      </Button>
                    </div>
                  </>
                )}
              </Card>
            </div>
          </div>
        </div>

        {result && (
          <section ref={claimRef} className="mt-12">
            <Label>Claim links</Label>
            <h2 className="mt-2.5 font-display text-[26px] tracking-tight text-ink">
              {result.recipients.length} recipients
            </h2>
            <p className="mt-2 text-[13px] text-ink-2">
              Share each link with its recipient. They expire on first use.
            </p>
            <Card className="mt-5 overflow-hidden p-0">
              <ul className="divide-y divide-rule">
                {result.recipients.map((r) => (
                  <ClaimRow key={r.contractorId} name={r.name} usd={r.monthlyUsd} url={r.claimUrl} handle={r.snsHandle} />
                ))}
              </ul>
            </Card>
          </section>
        )}
      </main>
    </>
  );
}

function Row({ k, v, strong, muted }: { k: string; v: string; strong?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-ink-3">{k}</span>
      <span
        className={`num ${strong ? "font-display text-[18px] text-ink" : muted ? "text-[12px] text-ink-3" : "text-ink-2"}`}
      >
        {v}
      </span>
    </div>
  );
}

function ClaimRow({ name, usd, url, handle }: { name: string; usd: number; url: string; handle?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <li className="flex items-center gap-4 px-5 py-3.5">
      <Monogram seed={url} label={name} className="h-9 w-9 text-[13px]" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[14px] text-ink">{name}</span>
          {handle && (
            <span className="rounded-full bg-accent-soft px-2 py-0.5 font-mono text-[10.5px] text-accent-ink">
              {handle}
            </span>
          )}
        </div>
        <div className="mt-0.5 truncate font-mono text-[11px] text-ink-3">{url}</div>
      </div>
      <div className="num w-20 shrink-0 text-right text-[14px] text-ink">${usd.toLocaleString()}</div>
      <button
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          } catch {
            /* clipboard blocked */
          }
        }}
        className="w-16 shrink-0 text-right text-[12px] text-accent-ink hover:underline"
      >
        {copied ? "copied" : "copy"}
      </button>
    </li>
  );
}

function Wrap({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-32">{children}</main>
    </>
  );
}
