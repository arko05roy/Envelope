"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import Link from "next/link";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/ui/header";
import { Button, Card, HRule, Label, Pill, Stat } from "@/components/ui/primitives";
import type { Invoice } from "@/lib/store";

interface TreasuryView {
  configured: boolean;
  pubkey?: string;
  sol?: number;
  error?: string;
}

export default function DashboardPage() {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();

  const [treasury, setTreasury] = useState<TreasuryView | null>(null);
  const [walletSol, setWalletSol] = useState<number | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ tone: "ok" | "err"; msg: string } | null>(null);

  // Treasury balance — from /api/treasury (server-side Helius read).
  useEffect(() => {
    fetch("/api/treasury").then((r) => r.json()).then(setTreasury);
  }, []);

  // Connected wallet balance.
  useEffect(() => {
    if (!publicKey) return;
    let cancel = false;
    connection
      .getBalance(publicKey)
      .then((l) => !cancel && setWalletSol(l / LAMPORTS_PER_SOL))
      .catch(() => !cancel && setWalletSol(null));
    return () => {
      cancel = true;
    };
  }, [publicKey, connection]);

  // Invoices.
  const refreshInvoices = async () => {
    const r = await fetch("/api/invoices");
    const j = (await r.json()) as { invoices: Invoice[] };
    setInvoices(j.invoices);
  };
  useEffect(() => {
    void refreshInvoices();
  }, []);

  const createInvoice = async () => {
    setBusy("invoice");
    setToast(null);
    try {
      const r = await fetch("/api/invoices", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ amountUsd: 56, rail: "kirapay" }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error?.formErrors?.[0] ?? j.error ?? "failed");
      setToast({ tone: "ok", msg: `Invoice ${j.invoice.id} created · KIRAPAY link ready` });
      await refreshInvoices();
    } catch (e) {
      setToast({ tone: "err", msg: e instanceof Error ? e.message : "failed" });
    } finally {
      setBusy(null);
    }
  };

  const runCloakSpike = async () => {
    setBusy("cloak");
    setToast(null);
    try {
      const r = await fetch("/api/cloak/spike", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ amountSol: 0.01 }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "spike failed");
      setToast({ tone: "ok", msg: `Cloak shield 0.01 SOL · depositor ${shorten(j.depositor)}` });
    } catch (e) {
      setToast({ tone: "err", msg: e instanceof Error ? e.message : "failed" });
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
            <Label>Treasury</Label>
            <h1 className="mt-3 font-display text-[42px] leading-none tracking-tighter">
              {treasury?.configured ? "Aarambh Labs" : "Treasury not configured"}
            </h1>
            <p className="mt-3 text-[14px] text-ink-2">
              {treasury?.configured ? (
                <>
                  Ika dWallet ·{" "}
                  <Pill tone="warning">pre-alpha · Solana custody only</Pill>
                </>
              ) : (
                <>Set <code className="font-mono text-[13px]">NEXT_PUBLIC_TREASURY_PUBKEY</code> in <code className="font-mono text-[13px]">.env.local</code> to a Solana pubkey to begin.</>
              )}
            </p>
          </div>
          <div className="text-right">
            <Label>Treasury address</Label>
            <div className="mt-3 font-mono text-[13px] text-ink-2 num">
              {treasury?.pubkey ? `${shorten(treasury.pubkey)} · Solana` : "—"}
            </div>
            <div className="mt-1 text-[12px] text-ink-3">
              {connected && publicKey ? (
                <>
                  Wallet:{" "}
                  <span className="font-mono num">{shorten(publicKey.toBase58())}</span>
                  {walletSol !== null && <> · <span className="num">{walletSol.toFixed(3)} SOL</span></>}
                </>
              ) : (
                "no wallet connected"
              )}
            </div>
          </div>
        </header>

        {/* Toast */}
        {toast && (
          <div
            className={`mt-6 px-4 py-3 rounded border text-[13px] ${
              toast.tone === "ok"
                ? "bg-positive-soft text-positive border-positive/30"
                : "bg-negative-soft text-negative border-negative/30"
            }`}
          >
            {toast.msg}
          </div>
        )}

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Stat
            label="SOL · treasury"
            value={
              treasury?.sol !== undefined ? (
                <span className="num">{treasury.sol.toFixed(4)}</span>
              ) : (
                <span className="text-ink-3">—</span>
              )
            }
            hint={treasury?.configured ? "Live · Helius RPC" : "treasury pubkey not set"}
            tone={treasury?.sol && treasury.sol > 0 ? "positive" : "default"}
          />
          <Stat
            label="USDC · treasury"
            value={<span className="text-ink-3">—</span>}
            hint="ATA balance · TODO: wire SPL token account read"
          />
          <Stat
            label="Open invoices"
            value={<span className="num">{invoices.filter((i) => i.status === "open").length}</span>}
            hint={`${invoices.length} total · live from /api/invoices`}
          />
        </div>

        <section className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Card className="lg:col-span-8 p-0 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-rule">
              <div>
                <Label>Recent invoices</Label>
                <h2 className="mt-1 font-display text-[20px] tracking-tight">All time</h2>
              </div>
              <button
                onClick={() => void refreshInvoices()}
                className="text-[13px] text-ink-2 hover:text-ink"
              >
                Refresh ↻
              </button>
            </div>
            {invoices.length === 0 ? (
              <div className="px-5 py-12 text-center text-[13px] text-ink-3">
                No invoices yet — click &ldquo;+ New invoice&rdquo; to create one through KIRAPAY.
              </div>
            ) : (
              <ul className="divide-y divide-rule">
                {invoices.map((inv) => (
                  <li
                    key={inv.id}
                    className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-3.5"
                  >
                    <div>
                      <div className="text-[14px] text-ink">
                        {inv.merchant} · <span className="font-mono text-[12px]">{inv.id}</span>
                      </div>
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
                              checkout link ↗
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

          <div className="lg:col-span-4 space-y-3">
            <Card className="p-5">
              <Label>Quick actions</Label>
              <div className="mt-4 flex flex-col gap-2">
                <Button
                  variant="primary"
                  onClick={createInvoice}
                  disabled={busy !== null}
                  className="w-full justify-start"
                >
                  {busy === "invoice" ? "Creating…" : "+ New invoice ($56)"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={runCloakSpike}
                  disabled={busy !== null}
                  className="w-full justify-start"
                >
                  {busy === "cloak" ? "Shielding…" : "↗ Cloak: shield 0.01 SOL"}
                </Button>
                <Link href="/dashboard/payroll">
                  <Button variant="secondary" className="w-full justify-start">
                    Run payroll
                  </Button>
                </Link>
                <Link href="/dashboard/audit">
                  <Button variant="ghost" className="w-full justify-start">
                    Issue viewing key
                  </Button>
                </Link>
              </div>
            </Card>

            <Card className="p-5">
              <Label>Sponsor status</Label>
              <ul className="mt-3 space-y-2 text-[13px]">
                <li className="flex items-center justify-between">
                  <span className="text-ink-2">KIRAPAY</span>
                  <Pill tone="positive">live</Pill>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-ink-2">Dodo Payments</span>
                  <Pill tone="positive">live</Pill>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-ink-2">Cloak</span>
                  <Pill tone="positive">live · mainnet</Pill>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-ink-2">Ika</span>
                  <Pill tone="warning">pre-alpha</Pill>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-ink-2">Encrypt</span>
                  <Pill tone="warning">pre-alpha</Pill>
                </li>
              </ul>
            </Card>
          </div>
        </section>

        <HRule className="my-16" />

        <footer className="text-[12px] text-ink-3">
          Treasury custody by Ika · Payroll by Cloak · FHE policy by Encrypt · Pay-in by KIRAPAY &amp; Dodo
        </footer>
      </main>
    </>
  );
}

function shorten(s: string): string {
  return `${s.slice(0, 4)}…${s.slice(-4)}`;
}
