"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/ui/header";
import { Button, Card, HRule, Label, Pill, Stat } from "@/components/ui/primitives";
import { ConnectWalletState, EmptyState } from "@/components/ui/empty-state";
import { OnboardingDialog } from "@/components/flows/onboarding";
import { useOrg } from "@/lib/hooks/useOrg";
import { api } from "@/lib/api/fetcher";
import type { Invoice, PayrollRunRecord } from "@/lib/store";

interface Treasury {
  treasuryPubkey: string;
  network: string;
  sol: number;
  usdc: number;
}

interface PolicyView {
  owner: string;
  dwallet: string;
  dwalletBound: boolean;
  monthlyCapLamports: string;
  cosignersRequired: number;
  batchesApproved: string;
  lamportsApprovedThisPeriod: string;
  periodStartUnix: string;
}

export default function DashboardPage() {
  const { connected, pubkey, org, loading: orgLoading, update } = useOrg();
  const [treasury, setTreasury] = useState<Treasury | null>(null);
  const [policy, setPolicy] = useState<PolicyView | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [runs, setRuns] = useState<PayrollRunRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pubkey || !org) return;
    setError(null);
    Promise.all([
      api<Treasury>(pubkey, "/api/treasury"),
      api<{ policy: PolicyView | null }>(pubkey, "/api/policy"),
      api<{ invoices: Invoice[] }>(pubkey, "/api/invoices"),
      api<{ runs: PayrollRunRecord[] }>(pubkey, "/api/payroll/runs").catch(() => ({ runs: [] })),
    ])
      .then(([t, p, inv, r]) => {
        setTreasury(t);
        setPolicy(p.policy);
        setInvoices(inv.invoices);
        setRuns(r.runs ?? []);
      })
      .catch((e: Error) => setError(e.message));
  }, [pubkey, org]);

  if (!connected) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto max-w-3xl px-6 py-32">
          <ConnectWalletState />
        </main>
      </>
    );
  }

  if (orgLoading || !org) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto max-w-6xl px-6 py-12">
          <SkeletonHeader />
        </main>
      </>
    );
  }

  // First-time user — needs to set org name.
  if (!org.name) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto max-w-6xl px-6 py-24">
          <OnboardingDialog
            initialName=""
            onSave={async (name) => {
              await update({ name });
            }}
          />
        </main>
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-12">
        <header className="flex items-end justify-between gap-6 flex-wrap">
          <div>
            <Label>Treasury</Label>
            <h1 className="mt-3 font-display text-[42px] leading-none tracking-tighter">
              {org.name}
            </h1>
            <p className="mt-3 text-[14px] text-ink-2">
              {treasury ? (
                <>
                  <span className="font-mono num">{shorten(treasury.treasuryPubkey)}</span>
                  <span className="text-ink-3"> · </span>
                  {treasury.network === "mainnet-beta" ? "Solana mainnet" : "Solana devnet"}
                </>
              ) : (
                <span className="text-ink-3">loading network…</span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard/contractors">
              <Button variant="secondary">Contractors</Button>
            </Link>
            <Link href="/dashboard/payroll">
              <Button variant="primary">Run payroll →</Button>
            </Link>
          </div>
        </header>

        {error && (
          <div className="mt-6 px-4 py-3 rounded border bg-negative-soft text-negative border-negative/30 text-[13px]">
            {error}
          </div>
        )}

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Stat
            label="USDC"
            value={
              treasury ? (
                <span className="num">${treasury.usdc.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              ) : <span className="text-ink-3">—</span>
            }
            tone={treasury && treasury.usdc > 0 ? "positive" : "default"}
          />
          <Stat
            label="SOL"
            value={
              treasury ? (
                <span className="num">{treasury.sol.toFixed(4)}</span>
              ) : <span className="text-ink-3">—</span>
            }
          />
          <Stat
            label="Spent this period"
            value={
              policy ? (
                <span className="num">
                  ${(Number(policy.lamportsApprovedThisPeriod) / 1e9 * 500_000).toLocaleString()}
                </span>
              ) : <span className="text-ink-3">—</span>
            }
            hint={policy ? `of $${(Number(policy.monthlyCapLamports) / 1e9 * 500_000).toLocaleString()} cap · ${policy.batchesApproved} ${policy.batchesApproved === "1" ? "batch" : "batches"}` : undefined}
          />
        </div>

        <section className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Card className="lg:col-span-8 p-0 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-rule">
              <Label>Invoices</Label>
              <NewInvoiceButton onCreated={(inv) => setInvoices([inv, ...invoices])} />
            </div>
            {invoices.length === 0 ? (
              <EmptyState
                title="No invoices yet"
                description="Create one to share with a customer. They can pay from any chain — funds settle to your treasury."
              />
            ) : (
              <ul className="divide-y divide-rule">
                {invoices.map((inv) => (
                  <li key={inv.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-3.5">
                    <div>
                      <div className="text-[14px] text-ink">{inv.id}</div>
                      <div className="mt-0.5 text-[12px] text-ink-3 font-mono">
                        {inv.rail.toUpperCase()}
                        {inv.kiraLinkUrl && (
                          <>
                            {" · "}
                            <a
                              href={inv.kiraLinkUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="hover:text-ink"
                            >
                              checkout ↗
                            </a>
                          </>
                        )}
                      </div>
                    </div>
                    <Pill tone={inv.status === "settled" ? "positive" : "neutral"}>
                      {inv.status}
                    </Pill>
                    <div className="text-right text-[14px] num text-ink">
                      ${inv.amountUsd.toFixed(2)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <div className="lg:col-span-4">
            <Card className="p-5">
              <Label>Recent payroll runs</Label>
              {runs.length === 0 ? (
                <p className="mt-4 text-[13px] text-ink-2">
                  No runs yet. <Link className="text-accent-ink hover:underline" href="/dashboard/payroll">Set up payroll →</Link>
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-rule">
                  {runs.slice(0, 4).map((r) => (
                    <li key={r.id} className="py-3 flex items-center justify-between text-[13px]">
                      <div>
                        <div className="text-ink num">${r.totalUsd.toLocaleString()}</div>
                        <div className="text-[11px] text-ink-3 font-mono">
                          {r.recipients.length} recipients · {r.totalChunks} txs
                        </div>
                      </div>
                      <Pill tone={r.cloakLive ? "positive" : "neutral"}>
                        {r.cloakLive ? "shielded" : "devnet"}
                      </Pill>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </section>

        <HRule className="my-16" />

        <button
          onClick={async () => {
            const name = prompt("Rename organization", org.name);
            if (name && name !== org.name) await update({ name });
          }}
          className="text-[12px] text-ink-3 hover:text-ink-2"
        >
          Rename organization
        </button>
      </main>
    </>
  );
}

function NewInvoiceButton({ onCreated }: { onCreated: (inv: Invoice) => void }) {
  const { pubkey } = useOrg();
  const [busy, setBusy] = useState(false);

  const handle = async () => {
    const raw = prompt("Invoice amount in USD");
    if (!raw) return;
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount <= 0) return alert("Invalid amount");
    setBusy(true);
    try {
      const j = await api<{ invoice: Invoice }>(pubkey, "/api/invoices", {
        method: "POST",
        body: JSON.stringify({ amountUsd: amount, rail: "kirapay" }),
      });
      onCreated(j.invoice);
      if (j.invoice.kiraLinkUrl) window.open(j.invoice.kiraLinkUrl, "_blank");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant="ghost" size="sm" onClick={handle} disabled={busy}>
      {busy ? "Creating…" : "New invoice"}
    </Button>
  );
}

function SkeletonHeader() {
  return (
    <div>
      <div className="h-3 w-20 bg-rule rounded mb-3" />
      <div className="h-10 w-64 bg-rule rounded" />
    </div>
  );
}

function shorten(s: string): string {
  return `${s.slice(0, 4)}…${s.slice(-4)}`;
}
