import Link from "next/link";
import { SiteHeader } from "@/components/ui/header";
import { Button, Card, HRule, Label, Pill, Stat } from "@/components/ui/primitives";

export default function DashboardPage() {
  return (
    <>
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-6 py-12">
        {/* Page header — asymmetric, treasury alias on the right */}
        <header className="flex items-end justify-between gap-6">
          <div>
            <Label>Treasury</Label>
            <h1 className="mt-3 font-display text-[42px] leading-none tracking-tighter">
              Aarambh Labs
            </h1>
            <p className="mt-3 text-[14px] text-ink-2">
              Ika dWallet · cross-chain custody · policy: <span className="text-ink">2-of-2 co-sign</span>
            </p>
          </div>
          <div className="text-right">
            <Label>Treasury address</Label>
            <div className="mt-3 font-mono text-[13px] text-ink-2 num">
              7zG…f3aR <span className="text-ink-3">·</span> Solana
            </div>
            <div className="mt-1 font-mono text-[13px] text-ink-2 num">
              0x82…d1b6 <span className="text-ink-3">·</span> Base
            </div>
          </div>
        </header>

        {/* Stats — comfortable, single accent on the actionable one */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Stat label="USDC · Solana" value={<span>$182,400<span className="text-ink-3">.00</span></span>} hint="from KIRAPAY + Dodo" tone="positive" />
          <Stat label="USDC · Base" value={<span>$54,200<span className="text-ink-3">.00</span></span>} hint="cross-chain via Ika dWallet" />
          <Stat label="Pending payroll" value={<span>$184,500<span className="text-ink-3">.00</span></span>} hint="30 contractors · runs in 3 days" tone="warning" />
        </div>

        {/* Two-up: recent activity + actions — unequal split */}
        <section className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Card className="lg:col-span-8 p-0 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-rule">
              <div>
                <Label>Recent activity</Label>
                <h2 className="mt-1 font-display text-[20px] tracking-tight">Last 7 days</h2>
              </div>
              <Link
                href="/dashboard/activity"
                className="text-[13px] text-ink-2 hover:text-ink"
              >
                See all →
              </Link>
            </div>
            <ul className="divide-y divide-rule">
              {ACTIVITY.map((a) => (
                <li key={a.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-3.5">
                  <div>
                    <div className="text-[14px] text-ink">{a.label}</div>
                    <div className="mt-0.5 text-[12px] text-ink-3 font-mono num">{a.meta}</div>
                  </div>
                  <Pill tone={a.tone}>{a.status}</Pill>
                  <div className="text-right text-[14px] num text-ink">{a.amount}</div>
                </li>
              ))}
            </ul>
          </Card>

          <div className="lg:col-span-4 space-y-3">
            <Card className="p-5">
              <Label>Quick actions</Label>
              <div className="mt-4 flex flex-col gap-2">
                <Link href="/dashboard/invoices/new"><Button variant="primary" className="w-full justify-start">+ New invoice</Button></Link>
                <Link href="/dashboard/payroll"><Button variant="secondary" className="w-full justify-start">Run payroll</Button></Link>
                <Link href="/dashboard/audit"><Button variant="secondary" className="w-full justify-start">Issue viewing key</Button></Link>
                <Link href="/dashboard/treasury"><Button variant="ghost" className="w-full justify-start">Edit treasury policy</Button></Link>
              </div>
            </Card>

            <Card className="p-5">
              <Label>Compliance</Label>
              <div className="mt-3 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-positive" />
                <span className="text-[13px] text-ink-2">All viewing keys current</span>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-warning" />
                <span className="text-[13px] text-ink-2">Auditor key expires in 11 days</span>
              </div>
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

const ACTIVITY = [
  { id: 1, label: "Invoice INV-0142 settled", meta: "KIRAPAY · Base · 0x4a1c…7e9b", status: "settled", tone: "positive" as const, amount: "+ $5,000.00" },
  { id: 2, label: "Subscription · Acme Corp",      meta: "Dodo · sub_8KQ3 · monthly", status: "active",  tone: "accent" as const,   amount: "+ $1,499.00" },
  { id: 3, label: "Treasury rebalance",             meta: "Ika dWallet · 2-of-2 signed", status: "co-signed", tone: "neutral" as const,  amount: "− $20,000.00" },
  { id: 4, label: "Invoice INV-0141 settled",       meta: "KIRAPAY · Solana · 4kA…Lq2", status: "settled", tone: "positive" as const, amount: "+ $890.00" },
  { id: 5, label: "Auditor key issued · k_audit_q2",meta: "Cloak viewing key · scope: amounts", status: "active", tone: "accent" as const, amount: "—" },
];
