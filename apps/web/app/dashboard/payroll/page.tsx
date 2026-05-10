"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/ui/header";
import { Button, Card, Eyebrow, HRule, Label, Pill } from "@/components/ui/primitives";
import { ConnectWalletState, EmptyState } from "@/components/ui/empty-state";
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
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!pubkey) return;
    api<{ contractors: Contractor[] }>(pubkey, "/api/contractors")
      .then((j) => {
        setContractors(j.contractors);
        setSelected(new Set(j.contractors.map((c) => c.id)));
      })
      .catch((e: Error) => setErr(e.message));
  }, [pubkey]);

  const totalUsd = useMemo(
    () => contractors.filter((c) => selected.has(c.id)).reduce((s, c) => s + c.monthlyUsd, 0),
    [contractors, selected],
  );

  if (!connected) {
    return <Wrap><ConnectWalletState /></Wrap>;
  }
  if (!org?.name) {
    return (
      <Wrap>
        <EmptyState
          title="Finish onboarding first"
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
          description="Payroll needs people. Add the team you want to pay."
          action={<Link href="/dashboard/contractors"><Button variant="primary">+ Add contractors</Button></Link>}
        />
      </Wrap>
    );
  }

  const toggle = (id: string) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
    setDry(null);
    setResult(null);
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
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  };

  const doRun = async () => {
    if (!confirm(`Run payroll for ${selected.size} ${selected.size === 1 ? "person" : "people"}? This fires a real shielded batch.`)) return;
    setBusy("exec");
    setErr(null);
    try {
      const j = await api<PayrollRunRecord>(pubkey, "/api/payroll/run", {
        method: "POST",
        body: JSON.stringify({ contractorIds: [...selected] }),
      });
      setResult(j);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-12">
        <header className="flex items-end justify-between gap-6 flex-wrap">
          <div>
            <Eyebrow>Payroll</Eyebrow>
            <h1 className="mt-4 font-display text-[42px] leading-none tracking-tighter">
              Run
            </h1>
            <p className="mt-3 text-[14px] text-ink-2">
              {selected.size} of {contractors.length} selected ·{" "}
              <span className="num text-ink">${totalUsd.toLocaleString()}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>Clear</Button>
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set(contractors.map((c) => c.id)))}>Select all</Button>
            <Button variant="secondary" onClick={doDry} disabled={busy !== null || selected.size === 0}>
              {busy === "dry" ? "Calculating…" : "Dry run"}
            </Button>
            <Button variant="primary" onClick={doRun} disabled={busy !== null || !dry}>
              {busy === "exec" ? "Settling…" : "Send shielded payroll"}
            </Button>
          </div>
        </header>

        {err && (
          <div className="mt-6 px-4 py-3 rounded border bg-negative-soft text-negative border-negative/30 text-[13px]">
            {err}
          </div>
        )}

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Card className="lg:col-span-8 p-0 overflow-hidden">
            <div className="max-h-[560px] overflow-auto">
              <table className="w-full text-[13px]">
                <thead className="text-[11px] uppercase tracking-[0.1em] text-ink-3">
                  <tr className="border-b border-rule">
                    <th className="text-left font-medium px-5 py-3 w-8"></th>
                    <th className="text-left font-medium px-3 py-3">Name</th>
                    <th className="text-left font-medium px-3 py-3">Country</th>
                    <th className="text-left font-medium px-3 py-3">Role</th>
                    <th className="text-left font-medium px-3 py-3">Sealed</th>
                    <th className="text-right font-medium px-5 py-3">Monthly</th>
                  </tr>
                </thead>
                <tbody>
                  {contractors.map((c) => (
                    <tr key={c.id} onClick={() => toggle(c.id)} className={`cursor-pointer border-b border-rule/60 hover:bg-paper-3 ${selected.has(c.id) ? "bg-paper-3/60" : ""}`}>
                      <td className="px-5 py-3">
                        <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} onClick={(e) => e.stopPropagation()} className="accent-accent" />
                      </td>
                      <td className="px-3 py-3 text-ink">{c.name}</td>
                      <td className="px-3 py-3 font-mono text-[12px] text-ink-2">{c.countryCode}</td>
                      <td className="px-3 py-3 text-ink-2">{c.role}</td>
                      <td className="px-3 py-3">
                        {c.encryptCiphertextId ? (
                          <span className="font-mono text-[11px] text-ink-2" title={c.encryptCiphertextId}>
                            {c.encryptCiphertextId.slice(0, 4)}…{c.encryptCiphertextId.slice(-4)}
                          </span>
                        ) : (
                          <span className="text-[11px] text-ink-3">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right num text-ink">${c.monthlyUsd.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="lg:col-span-4 space-y-3">
            {dry && !result && (
              <Card className="p-5">
                <Label>Dry run</Label>
                <div className="mt-3 font-display text-[28px] leading-none num">
                  ${dry.totalUsd.toLocaleString()}
                </div>
                <div className="mt-1 text-[12px] text-ink-2 font-mono num">
                  {(Number(dry.totalLamports) / 1e9).toFixed(4)} SOL · {dry.chunks} {dry.chunks === 1 ? "tx" : "txs"}
                </div>
              </Card>
            )}

            {result && (
              <Card className="p-5 shadow-card">
                <Label>{result.cloakStatus === "settled" ? "Settled" : "Approved"}</Label>
                <div className="mt-3 font-display text-[28px] leading-none num">
                  {result.recipients.length}
                </div>
                <div className="mt-1 text-[12px] text-ink-3 font-mono">
                  {result.totalChunks} {result.totalChunks === 1 ? "batch" : "batches"} ·{" "}
                  {result.cloakStatus === "settled"
                    ? "shielded on Solana"
                    : "awaiting mainnet"}
                </div>
                {result.policyApproval && (
                  <div className="mt-3 text-[11px] text-ink-3 font-mono break-all">
                    on-chain approval ·{" "}
                    <a
                      href={`https://solscan.io/tx/${result.policyApproval.signature}?cluster=devnet`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent-ink hover:underline"
                    >
                      {result.policyApproval.signature.slice(0, 12)}…
                    </a>
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>

        {result && (
          <>
            <HRule className="my-12" />
            <section>
              <Label>Claim links</Label>
              <h2 className="mt-3 font-display text-[28px] tracking-tight">{result.recipients.length} recipients</h2>
              <p className="mt-2 text-[13px] text-ink-2">
                Share these one-time links with each recipient. They expire on first use.
              </p>
              <Card className="mt-6 p-0 overflow-hidden">
                <ul className="divide-y divide-rule text-[13px]">
                  {result.recipients.map((r) => (
                    <li key={r.contractorId} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-3">
                      <span className="text-ink">{r.name}</span>
                      <span className="text-right num text-ink">${r.monthlyUsd.toLocaleString()}</span>
                      <button
                        onClick={() => navigator.clipboard.writeText(r.claimUrl)}
                        className="text-[12px] text-accent-ink hover:underline font-mono"
                      >
                        copy link
                      </button>
                    </li>
                  ))}
                </ul>
              </Card>
            </section>
          </>
        )}
      </main>
    </>
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
