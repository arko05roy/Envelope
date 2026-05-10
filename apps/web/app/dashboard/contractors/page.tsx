"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/ui/header";
import { Button, Card, Eyebrow, Label, Pill } from "@/components/ui/primitives";
import { ConnectWalletState, EmptyState } from "@/components/ui/empty-state";
import { useOrg } from "@/lib/hooks/useOrg";
import { api } from "@/lib/api/fetcher";
import type { Contractor } from "@/lib/store";

export default function ContractorsPage() {
  const { connected, pubkey, org } = useOrg();
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => {
    if (!pubkey) return;
    api<{ contractors: Contractor[] }>(pubkey, "/api/contractors")
      .then((j) => setContractors(j.contractors))
      .catch((e: Error) => setError(e.message));
  };

  useEffect(refresh, [pubkey]);

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
            title="Finish onboarding first"
            description="Set your organization name on the dashboard."
            action={<Link href="/dashboard"><Button variant="primary">Open dashboard</Button></Link>}
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
      <main className="mx-auto max-w-6xl px-6 py-12">
        <header className="flex items-end justify-between gap-6 flex-wrap">
          <div>
            <Eyebrow>People</Eyebrow>
            <h1 className="mt-4 font-display text-[42px] leading-none tracking-tighter">
              Contractors
            </h1>
            <p className="mt-3 text-[14px] text-ink-2">
              {contractors.length === 0
                ? "Add the people you pay. Compensation values are sealed as ciphertexts on Solana."
                : `${contractors.length} ${contractors.length === 1 ? "person" : "people"} · `}
              {contractors.length > 0 && (
                <span className="num">
                  ${contractors.reduce((s, c) => s + c.monthlyUsd, 0).toLocaleString()}/month
                </span>
              )}
            </p>
          </div>
          <Button variant="primary" onClick={() => setShowForm((s) => !s)}>
            {showForm ? "Cancel" : "+ Add contractor"}
          </Button>
        </header>

        {error && (
          <div className="mt-6 px-4 py-3 rounded border bg-negative-soft text-negative border-negative/30 text-[13px]">
            {error}
          </div>
        )}

        {showForm && (
          <div className="mt-8">
            <ContractorForm
              onCreated={() => {
                setShowForm(false);
                refresh();
              }}
            />
          </div>
        )}

        <div className="mt-10">
          {contractors.length === 0 && !showForm ? (
            <Card>
              <EmptyState
                title="No contractors yet"
                description="Add your first contractor to begin running payroll."
                action={<Button variant="primary" onClick={() => setShowForm(true)}>+ Add contractor</Button>}
              />
            </Card>
          ) : (
            contractors.length > 0 && (
              <Card className="p-0 overflow-hidden">
                <table className="w-full text-[13px]">
                  <thead className="text-[11px] uppercase tracking-[0.1em] text-ink-3">
                    <tr className="border-b border-rule">
                      <th className="text-left font-medium px-5 py-3">Name</th>
                      <th className="text-left font-medium px-3 py-3">Country</th>
                      <th className="text-left font-medium px-3 py-3">Role</th>
                      <th className="text-left font-medium px-3 py-3">Sealed</th>
                      <th className="text-right font-medium px-3 py-3">Monthly</th>
                      <th className="text-right font-medium px-5 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {contractors.map((c) => (
                      <tr key={c.id} className="border-b border-rule/60">
                        <td className="px-5 py-3">
                          <div className="text-ink">{c.name}</div>
                          <div className="text-[11px] text-ink-3 font-mono">{c.email}</div>
                        </td>
                        <td className="px-3 py-3 font-mono text-[12px] text-ink-2">{c.countryCode}</td>
                        <td className="px-3 py-3 text-ink-2">{c.role}</td>
                        <td className="px-3 py-3">
                          {c.encryptCiphertextId ? (
                            <span className="font-mono text-[11px] text-ink-2">
                              {c.encryptCiphertextId.slice(0, 4)}…{c.encryptCiphertextId.slice(-4)}
                            </span>
                          ) : (
                            <button onClick={() => reseal(c.id)} className="text-[12px] text-ink-3 hover:text-ink underline underline-offset-2">
                              seal
                            </button>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right num text-ink">
                          ${c.monthlyUsd.toLocaleString()}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => remove(c.id)}
                            className="text-[12px] text-ink-3 hover:text-negative"
                          >
                            remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )
          )}
        </div>
      </main>
    </>
  );
}

function ContractorForm({ onCreated }: { onCreated: () => void }) {
  const { pubkey } = useOrg();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [role, setRole] = useState("");
  const [monthlyUsd, setMonthlyUsd] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await api(pubkey, "/api/contractors", {
        method: "POST",
        body: JSON.stringify({
          name,
          email,
          countryCode: countryCode.toUpperCase(),
          role,
          monthlyUsd: Number(monthlyUsd),
        }),
      });
      onCreated();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-6">
      <Label>New contractor</Label>
      <form onSubmit={submit} className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Full name" value={name} onChange={setName} placeholder="Asha Patel" />
        <Field label="Email" value={email} onChange={setEmail} type="email" placeholder="asha@acme.com" />
        <Field label="Country code" value={countryCode} onChange={setCountryCode} placeholder="IN" maxLength={3} />
        <Field label="Role" value={role} onChange={setRole} placeholder="Engineer" />
        <Field label="Monthly USD" value={monthlyUsd} onChange={setMonthlyUsd} type="number" placeholder="6000" />
        {err && <div className="sm:col-span-2 text-[13px] text-negative">{err}</div>}
        <div className="sm:col-span-2 flex gap-2">
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? "Adding…" : "Add contractor"}
          </Button>
        </div>
      </form>
    </Card>
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
      <Label>{label}</Label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        required
        className="mt-2 w-full h-10 px-3 text-[14px] bg-paper border border-rule rounded focus:border-rule-strong focus:outline-none focus:ring-2 focus:ring-accent/20"
      />
    </label>
  );
}
