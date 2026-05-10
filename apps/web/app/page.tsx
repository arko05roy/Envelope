import Link from "next/link";
import { SiteHeader } from "@/components/ui/header";
import { Button, Card, Eyebrow, HRule, Label, Pill } from "@/components/ui/primitives";

export default function LandingPage() {
  return (
    <>
      <SiteHeader />

      {/* Hero — asymmetric, serif display, restrained */}
      <section className="mx-auto max-w-6xl px-6 pt-24 pb-32 grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8">
          <Eyebrow>Envelope · for crypto-native businesses</Eyebrow>
          <h1 className="mt-6 font-display text-[64px] leading-[1.02] tracking-tightest text-ink">
            Pay your global team
            <br />
            <span className="italic text-ink-2">without doxxing them.</span>
          </h1>
          <p className="mt-8 max-w-xl text-[17px] text-ink-2 leading-relaxed">
            Private, programmable treasury &amp; payroll on Solana. Customers
            pay you from any chain or any country. Your treasury sits
            cross-chain. Your payroll runs in one shielded batch. Your auditor
            sees exactly what they should — and nothing more.
          </p>
          <div className="mt-10 flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="primary" size="lg">Open dashboard →</Button>
            </Link>
            <Link href="#how">
              <Button variant="ghost" size="lg">How it works</Button>
            </Link>
          </div>
          <div className="mt-10 flex items-center gap-2">
            <Pill tone="positive">Cloak · live on mainnet</Pill>
            <Pill tone="accent">Ika · Solana pre-alpha</Pill>
            <Pill tone="neutral">KIRAPAY · 11 chains</Pill>
            <Pill tone="neutral">Dodo · 220+ countries</Pill>
          </div>
        </div>

        {/* Side card — receipt aesthetic */}
        <aside className="lg:col-span-4 lg:pt-12">
          <Card className="p-0 overflow-hidden shadow-card">
            <div className="px-5 pt-5 pb-3 border-b border-rule">
              <Label>Payroll run · 30 contractors</Label>
              <div className="mt-3 font-display text-[40px] leading-none num">$184,500.00</div>
              <div className="mt-2 text-[13px] text-ink-2">12 countries · 1 shielded batch</div>
            </div>
            <ul className="divide-y divide-rule text-[13px]">
              {[
                ["c001 · IN · engineer", "$7,500"],
                ["c002 · DE · designer", "$5,500"],
                ["c003 · BR · ops", "$4,000"],
                ["…", "+ 27 more"],
              ].map(([k, v]) => (
                <li key={k} className="flex justify-between px-5 py-2.5">
                  <span className="text-ink-2 font-mono text-[12px]">{k}</span>
                  <span className="text-ink num">{v}</span>
                </li>
              ))}
            </ul>
            <div className="px-5 py-3 border-t border-rule bg-paper-3 text-[12px] text-ink-2 flex items-center justify-between">
              <span className="font-mono">cloak://shielded</span>
              <Pill tone="positive">settled</Pill>
            </div>
          </Card>
        </aside>
      </section>

      <HRule />

      {/* The problem — editorial, single column, no triple-icon-grid */}
      <section className="mx-auto max-w-3xl px-6 py-32">
        <Eyebrow>The problem</Eyebrow>
        <h2 className="mt-6 font-display text-[40px] leading-tight tracking-tighter">
          Stablecoins are a better rail. The <em className="italic text-ink-2">public ledger</em>{" "}
          is the worst privacy default in fintech.
        </h2>
        <div className="mt-10 space-y-6 text-[17px] text-ink-2 leading-relaxed">
          <p>
            Every salary your team pays in USDC is permanently readable on a
            block explorer. Every treasury rebalance signals strategy to your
            competitors. Every fiat customer is locked out of crypto checkout.
          </p>
          <p>
            The fix isn&apos;t another wallet. It&apos;s the layer between
            customer and contractor: who pays, who&apos;s held, who computes
            policy, who sees what.
          </p>
        </div>
      </section>

      <HRule />

      {/* How it works — vertical timeline, not 3-column grid */}
      <section id="how" className="mx-auto max-w-3xl px-6 py-32">
        <Eyebrow>How it works</Eyebrow>
        <h2 className="mt-6 font-display text-[40px] leading-tight tracking-tighter">
          Four sponsors, one pay flow.
        </h2>
        <ol className="mt-12 space-y-12">
          {STEPS.map((step, i) => (
            <li key={step.title} className="grid grid-cols-[auto_1fr] gap-6">
              <div className="font-mono text-[12px] text-ink-3 pt-1.5 num">
                {String(i + 1).padStart(2, "0")}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-[24px] tracking-tight">{step.title}</h3>
                  <Pill tone={step.tone}>{step.sponsor}</Pill>
                </div>
                <p className="mt-2 text-[15px] text-ink-2 leading-relaxed">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <HRule />

      <footer className="mx-auto max-w-6xl px-6 py-12 flex items-center justify-between text-[13px] text-ink-3">
        <div className="flex items-center gap-2">
          <span>Envelope</span>
          <span>·</span>
          <span className="font-mono">v0.0.1 · Frontier 2026</span>
        </div>
        <div className="flex gap-5">
          <a href="https://github.com/your-org/envelope" className="hover:text-ink">GitHub</a>
          <a href="/docs" className="hover:text-ink">Docs</a>
        </div>
      </footer>
    </>
  );
}

const STEPS = [
  {
    title: "Customer pays from anywhere.",
    sponsor: "KIRAPAY",
    tone: "neutral" as const,
    body:
      "Customer picks any token on any chain — Base, Arbitrum, BNB, Solana. KIRAPAY routes and settles the merchant's chosen chain. Fiat customers pay through Dodo's card / UPI / SEPA rails.",
  },
  {
    title: "Funds land in a programmable treasury.",
    sponsor: "Ika",
    tone: "accent" as const,
    body:
      "Treasury is an Ika dWallet — 2PC-MPC custody split between you and the network. Spending caps, role-based co-sign, and cross-chain reserves enforced by a Solana program. Not a hot wallet, not Fireblocks.",
  },
  {
    title: "Salary policy is encrypted, not stored.",
    sponsor: "Encrypt",
    tone: "accent" as const,
    body:
      "Compensation matrix and approval thresholds live as FHE ciphertexts. Threshold rules — 'amount within band ceiling for role' — compute on encrypted inputs without revealing the bands.",
  },
  {
    title: "Payroll fires as one shielded batch.",
    sponsor: "Cloak",
    tone: "positive" as const,
    body:
      "Thirty contractors, one transaction, zero amounts on-chain. Each recipient gets a stealth claim link; the public ledger sees a single shielded entry. Your auditor opens a scoped viewing key.",
  },
];
