"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/ui/header";
import { Button, Card, Label, Pill } from "@/components/ui/primitives";
import { ConnectWalletState, EmptyState } from "@/components/ui/empty-state";
import { Monogram } from "@/components/ui/monogram";
import { OrgGate } from "@/components/flows/org-gate";
import { NewInvoiceDialog } from "@/components/flows/new-invoice";
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
  monthlyCapUsd: number;
  cosignersRequired: number;
  batchesApproved: string;
  lamportsApprovedThisPeriod: string;
  spentUsdThisPeriod: number;
  periodStartUnix: string;
}

export default function DashboardPage() {
  const { connected, pubkey, org, loading: orgLoading, update } = useOrg();
  const [treasury, setTreasury] = useState<Treasury | null>(null);
  const [policy, setPolicy] = useState<PolicyView | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [runs, setRuns] = useState<PayrollRunRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [gatePassed, setGatePassed] = useState(false);
  const [gateMode, setGateMode] = useState<"view" | "edit">("view");

  const gateKey = pubkey ? `envelope:org-gate:${pubkey}` : null;

  useEffect(() => {
    if (!org || !gateKey) return;
    if (!org.name) {
      setGatePassed(false);
      return;
    }
    setGatePassed(sessionStorage.getItem(gateKey) === "1");
  }, [org, gateKey]);

  useEffect(() => {
    if (!pubkey || !org || !gatePassed) return;
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
  }, [pubkey, org, gatePassed]);

  const reopenGate = (mode: "view" | "edit") => {
    if (gateKey) sessionStorage.removeItem(gateKey);
    setGateMode(mode);
    setGatePassed(false);
  };

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
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-xl bg-rule" />
            <div className="space-y-2">
              <div className="h-3 w-20 rounded bg-rule" />
              <div className="h-9 w-64 rounded bg-rule" />
            </div>
          </div>
        </main>
      </>
    );
  }

  // Workspace gate — every visit lands here first: open, name, or rename.
  if (!gatePassed) {
    const enter = () => {
      if (gateKey) sessionStorage.setItem(gateKey, "1");
      setGateMode("view");
      setGatePassed(true);
    };
    return (
      <OrgGate
        org={
          org.name
            ? {
                id: org.ownerPubkey,
                name: org.name,
                treasuryPubkey: org.treasuryPubkey,
                createdAt: org.createdAt,
              }
            : null
        }
        initialMode={gateMode}
        onEnter={enter}
        onSave={async (name) => {
          await update({ name });
          enter();
        }}
      />
    );
  }

  const seed = treasury?.treasuryPubkey ?? org.treasuryPubkey ?? org.ownerPubkey;
  const networkLabel =
    treasury == null
      ? "—"
      : treasury.network === "mainnet-beta"
        ? "Solana mainnet"
        : "Solana devnet";

  const spentUsd = policy?.spentUsdThisPeriod ?? 0;
  const capUsd = policy?.monthlyCapUsd ?? 0;
  const capPct = capUsd > 0 ? Math.min(100, (spentUsd / capUsd) * 100) : 0;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-10">
        {/* ── Workspace header band ── */}
        <header className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex items-center gap-4">
            <Monogram seed={seed} label={org.name} className="h-14 w-14 text-[20px]" />
            <div>
              <h1 className="font-display text-[34px] leading-none tracking-tighter text-ink">
                {org.name}
              </h1>
              <div className="mt-2.5 flex flex-wrap items-center gap-2.5 text-[13px] text-ink-2">
                {treasury ? (
                  <CopyAddr value={treasury.treasuryPubkey} />
                ) : (
                  <span className="text-ink-3">loading treasury…</span>
                )}
                <span className="h-1 w-1 rounded-full bg-ink-4" />
                <Pill tone={treasury?.network === "mainnet-beta" ? "accent" : "neutral"}>
                  {networkLabel}
                </Pill>
                <span className="h-1 w-1 rounded-full bg-ink-4" />
                <button
                  type="button"
                  onClick={() => reopenGate("edit")}
                  className="text-[12px] text-ink-3 underline-offset-2 transition-colors hover:text-ink hover:underline"
                >
                  rename
                </button>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard/contractors">
              <Button variant="secondary">People</Button>
            </Link>
            <Link href="/dashboard/payroll">
              <Button variant="primary">Run payroll →</Button>
            </Link>
          </div>
        </header>

        {error && (
          <div className="mt-6 rounded-lg border border-negative/30 bg-negative-soft px-4 py-3 text-[13px] text-negative">
            {error}
          </div>
        )}

        {/* ── Treasury panel ── */}
        <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-12">
          <Card className="relative overflow-hidden p-6 lg:col-span-7">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
            <div className="flex items-center justify-between">
              <Label>Treasury balance</Label>
              <span className="text-[11px] uppercase tracking-[0.12em] text-ink-3">USDC</span>
            </div>
            <div className="mt-5 flex flex-wrap items-end gap-x-8 gap-y-3">
              <div>
                <div className="num font-display text-[44px] leading-none text-ink">
                  {treasury ? `$${fmtUsd2(treasury.usdc)}` : <span className="text-ink-3">—</span>}
                </div>
                <div className="mt-2 text-[12px] text-ink-3">available to pay out</div>
              </div>
              <div className="pb-1">
                <div className="num font-display text-[22px] leading-none text-ink-2">
                  {treasury ? treasury.sol.toFixed(4) : "—"}{" "}
                  <span className="text-[12px] font-sans text-ink-3">SOL</span>
                </div>
                <div className="mt-2 text-[12px] text-ink-3">gas reserve</div>
              </div>
            </div>
          </Card>

          <Card className="p-6 lg:col-span-5">
            <div className="flex items-center justify-between">
              <Label>This period</Label>
              {policy && (
                <span className="num font-mono text-[11px] text-ink-3">
                  {policy.batchesApproved} {policy.batchesApproved === "1" ? "batch" : "batches"}
                </span>
              )}
            </div>
            {policy ? (
              <>
                <div className="mt-5 flex items-baseline justify-between">
                  <span className="num font-display text-[26px] leading-none text-ink">
                    ${fmtUsd0(spentUsd)}
                  </span>
                  <span className="num text-[13px] text-ink-3">of ${fmtUsd0(capUsd)} cap</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-paper-3">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${capPct >= 90 ? "bg-warning" : "bg-accent"}`}
                    style={{ width: `${Math.max(capPct, 1.5)}%` }}
                  />
                </div>
                <div className="mt-4 flex items-center gap-2 text-[12px] text-ink-2">
                  <span>
                    {policy.cosignersRequired} co-signer
                    {policy.cosignersRequired === 1 ? "" : "s"} required
                  </span>
                  <span className="h-1 w-1 rounded-full bg-ink-4" />
                  <span className={policy.dwalletBound ? "text-positive" : "text-ink-3"}>
                    {policy.dwalletBound ? "dWallet bound" : "dWallet not bound"}
                  </span>
                </div>
              </>
            ) : (
              <div className="mt-5 text-[13px] text-ink-3">
                On-chain policy not initialized yet.{" "}
                <Link href="/dashboard/payroll" className="text-accent-ink hover:underline">
                  Set up payroll →
                </Link>
              </div>
            )}
          </Card>
        </section>

        {/* ── Invoices + runs ── */}
        <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
          <Card className="overflow-hidden p-0 lg:col-span-8">
            <div className="flex items-center justify-between border-b border-rule px-5 py-4">
              <Label>Invoices</Label>
              <NewInvoiceButton onCreated={(inv) => setInvoices((cur) => [inv, ...cur])} />
            </div>
            {invoices.length === 0 ? (
              <EmptyState
                title="No invoices yet"
                description="Create one to share with a customer. They can pay from any chain — funds settle to your treasury."
              />
            ) : (
              <ul className="divide-y divide-rule">
                {invoices.map((inv) => {
                  const url = inv.kiraLinkUrl ?? inv.dodoCheckoutUrl;
                  const railLabel = inv.rail === "kirapay" ? "Crypto" : "Card / fiat";
                  return (
                    <li
                      key={inv.id}
                      className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-3.5 transition-colors hover:bg-paper-3/40"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-mono text-[13px] text-ink">{inv.id}</div>
                        <div className="mt-0.5 text-[12px] text-ink-3">
                          {railLabel} · {timeAgo(inv.createdAt)}
                          {url && (
                            <>
                              {" · "}
                              <a
                                href={url}
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
                      <div className="num text-right text-[14px] text-ink">
                        ${inv.amountUsd.toFixed(2)}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card className="p-5 lg:col-span-4">
            <Label>Recent payroll runs</Label>
            {runs.length === 0 ? (
              <p className="mt-4 text-[13px] text-ink-2">
                No runs yet.{" "}
                <Link className="text-accent-ink hover:underline" href="/dashboard/payroll">
                  Set up payroll →
                </Link>
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-rule">
                {runs.slice(0, 5).map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 py-3 text-[13px]">
                    <div className="min-w-0">
                      <div className="num text-ink">${r.totalUsd.toLocaleString()}</div>
                      <div className="mt-0.5 font-mono text-[11px] text-ink-3">
                        {r.recipients.length} recipients · {r.totalChunks}{" "}
                        {r.totalChunks === 1 ? "batch" : "batches"} · {timeAgo(r.createdAt)}
                      </div>
                    </div>
                    <Pill tone={r.cloakStatus === "settled" ? "positive" : "neutral"}>
                      {r.cloakStatus === "settled" ? "shielded" : "approved"}
                    </Pill>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>

        {/* ── Workspace data ── */}
        <details className="mt-10 text-[12px] text-ink-3">
          <summary className="cursor-pointer select-none text-ink-3 hover:text-ink-2">
            Workspace data
          </summary>
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-rule bg-paper-2 px-4 py-3">
            <span>
              {invoices.length} {invoices.length === 1 ? "invoice" : "invoices"} · {runs.length}{" "}
              {runs.length === 1 ? "run" : "runs"} on this workspace.
            </span>
            <button
              type="button"
              onClick={async () => {
                if (
                  !confirm(
                    "Clear all invoices, payroll runs, and contractors for this workspace? The workspace, treasury balance, and on-chain policy are not affected.",
                  )
                )
                  return;
                try {
                  await api(pubkey, "/api/me/data", { method: "DELETE" });
                  setInvoices([]);
                  setRuns([]);
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Couldn't reset workspace data");
                }
              }}
              className="text-negative underline underline-offset-2 hover:text-ink"
            >
              Reset workspace data
            </button>
          </div>
        </details>
      </main>
    </>
  );
}

function NewInvoiceButton({ onCreated }: { onCreated: (inv: Invoice) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        New invoice
      </Button>
      {open && <NewInvoiceDialog onClose={() => setOpen(false)} onCreated={onCreated} />}
    </>
  );
}

function CopyAddr({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          /* clipboard blocked */
        }
      }}
      className="group inline-flex items-center gap-1.5 font-mono text-[12.5px] text-ink-2 transition-colors hover:text-ink"
      title="Copy treasury address"
    >
      <span>{shorten(value)}</span>
      <span className="text-[10px] text-ink-3 group-hover:text-ink-2">
        {copied ? "copied" : "copy"}
      </span>
    </button>
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

function fmtUsd0(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function fmtUsd2(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
