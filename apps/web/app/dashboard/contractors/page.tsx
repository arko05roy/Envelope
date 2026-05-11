"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/ui/header";
import { Button, Card, Pill } from "@/components/ui/primitives";
import { ConnectWalletState, EmptyState } from "@/components/ui/empty-state";
import { Monogram } from "@/components/ui/monogram";
import { NewContractorDialog } from "@/components/flows/new-contractor";
import { useOrg } from "@/lib/hooks/useOrg";
import { api } from "@/lib/api/fetcher";
import type { Contractor } from "@/lib/store";

export default function ContractorsPage() {
  const { connected, pubkey, org } = useOrg();
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => {
    if (!pubkey) return;
    api<{ contractors: Contractor[] }>(pubkey, "/api/contractors")
      .then((j) => setContractors(j.contractors))
      .catch((e: Error) => setError(e.message));
  };

  useEffect(refresh, [pubkey]);

  const stats = useMemo(() => {
    const monthly = contractors.reduce((s, c) => s + c.monthlyUsd, 0);
    const countries = new Set(contractors.map((c) => c.countryCode).filter(Boolean)).size;
    const sealed = contractors.filter((c) => c.encryptCiphertextId).length;
    return { monthly, countries, sealed };
  }, [contractors]);

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
  if (!org?.name) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto max-w-3xl px-6 py-32">
          <EmptyState
            title="Open a workspace first"
            description="Pick or create a workspace from the dashboard, then come back to add the people you pay."
            action={
              <Link href="/dashboard">
                <Button variant="primary">Open dashboard</Button>
              </Link>
            }
          />
        </main>
      </>
    );
  }

  const remove = async (id: string) => {
    if (!confirm("Remove this contractor?")) return;
    await api(pubkey, `/api/contractors/${id}`, { method: "DELETE" });
    refresh();
  };

  const reseal = async (id: string) => {
    await api(pubkey, `/api/contractors/${id}?action=seal`, { method: "POST" });
    refresh();
  };

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-10">
        {/* ── Header ── */}
        <header className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-3">
              People
            </span>
            <h1 className="mt-2.5 font-display text-[34px] leading-none tracking-tighter text-ink">
              Contractors
            </h1>
            <p className="mt-2.5 text-[14px] text-ink-2">
              The roster payroll runs against. Every monthly figure is sealed as a ciphertext on
              Solana.
            </p>
          </div>
          <Button variant="primary" onClick={() => setShowDialog(true)}>
            + Add contractor
          </Button>
        </header>

        {/* ── Stat strip ── */}
        <div className="mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-rule bg-rule sm:grid-cols-4">
          <StatCell label="People" value={String(contractors.length)} />
          <StatCell label="Monthly" value={`$${stats.monthly.toLocaleString()}`} />
          <StatCell label="Countries" value={String(stats.countries)} />
          <StatCell
            label="Sealed"
            value={`${stats.sealed}/${contractors.length || 0}`}
            tone={
              contractors.length > 0 && stats.sealed === contractors.length ? "positive" : "default"
            }
          />
        </div>

        {error && (
          <div className="mt-6 rounded-lg border border-negative/30 bg-negative-soft px-4 py-3 text-[13px] text-negative">
            {error}
          </div>
        )}

        {showDialog && (
          <NewContractorDialog
            onClose={() => setShowDialog(false)}
            onCreated={(c) => setContractors((cur) => [...cur, c])}
          />
        )}

        {/* ── Roster ── */}
        <div className="mt-8">
          {contractors.length === 0 ? (
            <Card>
              <EmptyState
                title="No contractors yet"
                description="Add the people you pay — by .sol handle or by wallet. You'll run payroll against this roster."
                action={
                  <Button variant="primary" onClick={() => setShowDialog(true)}>
                    + Add contractor
                  </Button>
                }
              />
            </Card>
          ) : (
            <Card className="overflow-hidden p-0">
              <ul className="divide-y divide-rule">
                {contractors.map((c) => (
                  <li
                    key={c.id}
                    className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-paper-3/40"
                  >
                    <Monogram
                      seed={c.snsResolvedPubkey || c.id}
                      label={c.name}
                      className="h-10 w-10 text-[14px]"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[14px] text-ink">{c.name}</span>
                        {c.snsHandle && (
                          <span className="rounded-full bg-accent-soft px-2 py-0.5 font-mono text-[10.5px] text-accent-ink">
                            {c.snsHandle}
                          </span>
                        )}
                        {c.snsRecords?.github && <RecordTick label="gh" />}
                        {c.snsRecords?.twitter && <RecordTick label="tw" />}
                        {c.snsRecords?.discord && <RecordTick label="dc" />}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-ink-3">
                        <span className="font-mono">{c.email}</span>
                        {c.countryCode && (
                          <>
                            <span className="h-1 w-1 rounded-full bg-ink-4" />
                            <span className="font-mono">{c.countryCode}</span>
                          </>
                        )}
                        {c.role && (
                          <>
                            <span className="h-1 w-1 rounded-full bg-ink-4" />
                            <span>{c.role}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* sealed status */}
                    <div className="hidden w-28 shrink-0 text-right sm:block">
                      {c.encryptCiphertextId ? (
                        <span
                          className="inline-flex items-center gap-1.5 text-[11.5px] text-positive"
                          title={c.encryptCiphertextId}
                        >
                          <LockGlyph /> sealed
                        </span>
                      ) : (
                        <button
                          onClick={() => reseal(c.id)}
                          className="text-[11.5px] text-warning underline underline-offset-2 hover:text-ink"
                        >
                          seal now
                        </button>
                      )}
                    </div>

                    <div className="w-24 shrink-0 text-right">
                      <div className="num text-[14px] text-ink">
                        ${c.monthlyUsd.toLocaleString()}
                      </div>
                      <div className="text-[11px] text-ink-3">/ month</div>
                    </div>

                    <div className="flex w-16 shrink-0 justify-end opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={() => remove(c.id)}
                        className="text-[12px] text-ink-3 transition-colors hover:text-negative"
                        title="Remove contractor"
                      >
                        remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </main>
    </>
  );
}

function StatCell({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "positive";
}) {
  return (
    <div className="bg-paper-2 px-5 py-4">
      <div className="text-[10.5px] uppercase tracking-[0.14em] text-ink-3">{label}</div>
      <div
        className={`num mt-1.5 font-display text-[20px] leading-none ${tone === "positive" ? "text-positive" : "text-ink"}`}
      >
        {value}
      </div>
    </div>
  );
}

function RecordTick({ label }: { label: string }) {
  return (
    <span
      className="inline-flex items-center gap-0.5 rounded bg-paper-3 px-1 py-0.5 font-mono text-[10px] text-ink-2"
      title={`SNS ${label} record`}
    >
      {label}
      <span className="text-positive">✓</span>
    </span>
  );
}

function LockGlyph() {
  return (
    <svg viewBox="0 0 14 14" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="2.5" y="6" width="9" height="6.5" rx="1" />
      <path d="M4.5 6 V4 a2.5 2.5 0 0 1 5 0 V6" />
    </svg>
  );
}
