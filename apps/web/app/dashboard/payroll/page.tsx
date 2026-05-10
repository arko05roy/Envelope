"use client";

import { useEffect, useMemo, useState } from "react";
import { SiteHeader } from "@/components/ui/header";
import { Button, Card, Eyebrow, HRule, Label, Pill } from "@/components/ui/primitives";
import type { Contractor } from "@/lib/store";

interface DryRun {
  totalUsd: number;
  totalLamports: string;
  ikaCoSignRequired: boolean;
  ikaStub: true;
  rows: Array<{
    id: string;
    name: string;
    monthlyUsd: number;
    lamports: string;
    encryptThresholdPasses: boolean;
    encryptStub: true;
  }>;
}

interface ExecResult {
  runId: string;
  totalLamports: string;
  totalChunks: number;
  network: "devnet" | "mainnet-beta";
  cloakLive: boolean;
  recipients: Array<{
    id: string;
    name: string;
    monthlyUsd: number;
    lamports: string;
    claimUrl: string;
    chunkIndex: number;
  }>;
  chunks: Array<{ index: number; recipientIds: string[]; txResult: unknown; simulated?: true }>;
  notes: { encrypt: string; ika: string; cloak: string };
}

export default function PayrollPage() {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dryRun, setDryRun] = useState<DryRun | null>(null);
  const [busy, setBusy] = useState<"dry" | "exec" | null>(null);
  const [result, setResult] = useState<ExecResult | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/payroll/contractors")
      .then((r) => r.json())
      .then((j: { contractors: Contractor[] }) => {
        setContractors(j.contractors);
        setSelected(new Set(j.contractors.map((c) => c.id)));
      });
  }, []);

  const totalUsd = useMemo(
    () => contractors.filter((c) => selected.has(c.id)).reduce((s, c) => s + c.monthlyUsd, 0),
    [contractors, selected],
  );

  const toggle = (id: string) => {
    const s = new Set(selected);
    if (s.has(id)) s.delete(id);
    else s.add(id);
    setSelected(s);
    setDryRun(null);
    setResult(null);
  };

  const selectAll = () => setSelected(new Set(contractors.map((c) => c.id)));
  const selectNone = () => setSelected(new Set());

  const doDryRun = async () => {
    setBusy("dry");
    setErr(null);
    try {
      const r = await fetch("/api/payroll/dry-run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contractorIds: [...selected] }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error?.formErrors?.[0] ?? "dry-run failed");
      setDryRun(j as DryRun);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(null);
    }
  };

  const doExecute = async () => {
    if (!confirm(`Execute payroll for ${selected.size} contractors? This will fire a real Cloak shielded batch on Solana devnet.`))
      return;
    setBusy("exec");
    setErr(null);
    try {
      const r = await fetch("/api/payroll/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contractorIds: [...selected] }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "execution failed");
      setResult(j as ExecResult);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "failed");
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
              Run May 2026
            </h1>
            <p className="mt-3 text-[14px] text-ink-2">
              {selected.size} of {contractors.length} contractors ·{" "}
              <span className="num text-ink">${totalUsd.toLocaleString()}</span> selected ·{" "}
              <Pill tone="warning">Encrypt FHE · pre-alpha plaintext</Pill>{" "}
              <Pill tone="warning">Ika co-sign · pre-alpha stub</Pill>{" "}
              <Pill tone="positive">Cloak · live mainnet/devnet</Pill>
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={selectNone}>
              Clear
            </Button>
            <Button variant="ghost" size="sm" onClick={selectAll}>
              Select all
            </Button>
            <Button
              variant="secondary"
              onClick={doDryRun}
              disabled={busy !== null || selected.size === 0}
            >
              {busy === "dry" ? "Dry-running…" : "Dry run"}
            </Button>
            <Button
              variant="primary"
              onClick={doExecute}
              disabled={busy !== null || !dryRun || dryRun.rows.some((r) => !r.encryptThresholdPasses)}
            >
              {busy === "exec" ? "Shielding batch…" : `Run shielded batch ↗`}
            </Button>
          </div>
        </header>

        {err && (
          <div className="mt-6 px-4 py-3 rounded border bg-negative-soft text-negative border-negative/30 text-[13px]">
            {err}
          </div>
        )}

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Contractor table */}
          <Card className="lg:col-span-8 p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-rule flex items-center justify-between">
              <Label>Comp matrix</Label>
              <span className="text-[12px] text-ink-3 font-mono">
                {contractors.length} rows · plaintext (pre-alpha){" "}
              </span>
            </div>
            <div className="max-h-[560px] overflow-auto">
              <table className="w-full text-[13px]">
                <thead className="text-[11px] uppercase tracking-[0.1em] text-ink-3">
                  <tr className="border-b border-rule">
                    <th className="text-left font-medium px-5 py-2.5 w-8"></th>
                    <th className="text-left font-medium px-3 py-2.5">ID</th>
                    <th className="text-left font-medium px-3 py-2.5">Name</th>
                    <th className="text-left font-medium px-3 py-2.5">Country</th>
                    <th className="text-left font-medium px-3 py-2.5">Role</th>
                    <th className="text-right font-medium px-5 py-2.5">Monthly</th>
                  </tr>
                </thead>
                <tbody>
                  {contractors.map((c) => {
                    const dry = dryRun?.rows.find((r) => r.id === c.id);
                    const passes = dry ? dry.encryptThresholdPasses : true;
                    return (
                      <tr
                        key={c.id}
                        onClick={() => toggle(c.id)}
                        className={`cursor-pointer border-b border-rule/60 hover:bg-paper-3 transition-colors duration-100 ${
                          selected.has(c.id) ? "bg-paper-3/60" : ""
                        }`}
                      >
                        <td className="px-5 py-2.5">
                          <input
                            type="checkbox"
                            checked={selected.has(c.id)}
                            onChange={() => toggle(c.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="accent-accent"
                          />
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[12px] text-ink-2">{c.id}</td>
                        <td className="px-3 py-2.5 text-ink">{c.name}</td>
                        <td className="px-3 py-2.5 font-mono text-[12px] text-ink-2">{c.countryCode}</td>
                        <td className="px-3 py-2.5 text-ink-2">{c.role}</td>
                        <td className="px-5 py-2.5 text-right num text-ink">
                          ${c.monthlyUsd.toLocaleString()}
                          {dry && (
                            <span className="ml-2">
                              {passes ? <Pill tone="positive">✓ pass</Pill> : <Pill tone="negative">reject</Pill>}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Side panel */}
          <div className="lg:col-span-4 space-y-3">
            {dryRun && !result && (
              <Card className="p-5">
                <Label>Dry run</Label>
                <div className="mt-3 font-display text-[28px] leading-none num">
                  ${dryRun.totalUsd.toLocaleString()}
                </div>
                <div className="mt-1 text-[12px] text-ink-2 font-mono num">
                  ≈ {(Number(dryRun.totalLamports) / 1e9).toFixed(4)} SOL
                </div>
                <ul className="mt-5 space-y-2 text-[13px]">
                  <li className="flex items-center justify-between">
                    <span className="text-ink-2">Encrypt threshold</span>
                    <Pill tone={dryRun.rows.every((r) => r.encryptThresholdPasses) ? "positive" : "negative"}>
                      {dryRun.rows.filter((r) => r.encryptThresholdPasses).length}/{dryRun.rows.length} pass
                    </Pill>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-ink-2">Ika co-sign</span>
                    <Pill tone="warning">stub · 1 sig</Pill>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-ink-2">Cloak batch size</span>
                    <Pill tone="neutral">{dryRun.rows.length} outputs</Pill>
                  </li>
                </ul>
              </Card>
            )}

            {result && (
              <Card className="p-5 shadow-card">
                <Label>Settled</Label>
                <div className="mt-3 font-display text-[28px] leading-none num">
                  {result.recipients.length} paid
                </div>
                <div className="mt-1 text-[12px] text-ink-2 font-mono">
                  run · {result.runId} · {result.totalChunks} shielded {result.totalChunks === 1 ? "tx" : "txs"}
                </div>
                <div className="mt-5 text-[12px] text-ink-2">
                  <div className="flex items-center justify-between py-1">
                    <span>Cloak</span>
                    <Pill tone={result.cloakLive ? "positive" : "warning"}>
                      {result.cloakLive ? "live · mainnet" : "simulated · devnet"}
                    </Pill>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span>Encrypt</span><Pill tone="warning">stub</Pill>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span>Ika</span><Pill tone="warning">stub</Pill>
                  </div>
                </div>
                {!result.cloakLive && (
                  <p className="mt-4 text-[11px] text-ink-3 leading-relaxed">
                    Cloak&apos;s shielded pool is mainnet-only. Set{" "}
                    <code className="font-mono">NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta</code>{" "}
                    + a funded mainnet keypair to fire real shielded txs.
                  </p>
                )}
              </Card>
            )}

            <Card className="p-5">
              <Label>How a batch fires</Label>
              <ol className="mt-3 space-y-2 text-[13px] text-ink-2 list-decimal pl-4">
                <li>envelope-policy runs encrypted threshold check per row.</li>
                <li>Ika dWallet co-signs the disbursement tx.</li>
                <li>Cloak generates N stealth keypairs + UTXOs.</li>
                <li>One <code className="font-mono text-[12px] text-ink">transact()</code> call shields and fans out.</li>
                <li>Each recipient gets a one-time claim URL by email.</li>
              </ol>
            </Card>
          </div>
        </div>

        {/* Recipients with claim links */}
        {result && (
          <>
            <HRule className="my-12" />
            <section>
              <Eyebrow>Claim links — share via email / DM</Eyebrow>
              <h2 className="mt-4 font-display text-[28px] tracking-tight">
                {result.recipients.length} recipients
              </h2>
              <Card className="mt-6 p-0 overflow-hidden">
                <ul className="divide-y divide-rule text-[13px]">
                  {result.recipients.map((r) => (
                    <li key={r.id} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 px-5 py-3">
                      <span className="font-mono text-[12px] text-ink-3">{r.id}</span>
                      <span className="text-ink">{r.name}</span>
                      <span className="text-right num text-ink">${r.monthlyUsd.toLocaleString()}</span>
                      <a
                        href={r.claimUrl}
                        className="text-[12px] text-accent-ink hover:underline font-mono"
                        target="_blank"
                        rel="noreferrer"
                      >
                        claim ↗
                      </a>
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
