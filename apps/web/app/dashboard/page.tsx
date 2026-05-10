export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-3xl font-bold">Treasury</h1>
      <p className="mt-2 text-zinc-400">
        Ika dWallet — cross-chain custody with programmable policy.
      </p>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat label="USDC on Solana" value="—" hint="from KIRAPAY + Dodo settlements" />
        <Stat label="BTC reserves" value="—" hint="custodied by dWallet (cross-chain)" />
        <Stat label="Pending payroll" value="—" hint="next batch run" />
      </div>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">Quick actions</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Action href="/dashboard/invoices" label="Create invoice" />
          <Action href="/dashboard/payroll" label="Run payroll" />
          <Action href="/dashboard/audit" label="Issue viewing key" />
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-md border border-envelope-border bg-envelope-surface p-4">
      <div className="text-xs uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      {hint && <div className="mt-1 text-xs text-zinc-500">{hint}</div>}
    </div>
  );
}

function Action({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} className="px-4 py-2 rounded border border-envelope-border hover:bg-envelope-surface">
      {label}
    </a>
  );
}
