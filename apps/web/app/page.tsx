import Link from "next/link";
import { SiteHeader } from "@/components/ui/header";
import { Button, Eyebrow, HRule } from "@/components/ui/primitives";

export default function LandingPage() {
  return (
    <>
      <SiteHeader />

      <section className="mx-auto max-w-6xl px-6 pt-24 pb-32 grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8">
          <Eyebrow>Private treasury & payroll on Solana</Eyebrow>
          <h1 className="mt-6 font-display text-[64px] leading-[1.02] tracking-tightest text-ink">
            Pay your global team
            <br />
            <span className="italic text-ink-2">without doxxing them.</span>
          </h1>
          <p className="mt-8 max-w-xl text-[17px] text-ink-2 leading-relaxed">
            Customers pay you from any chain. Treasury sits cross-chain, custodied
            by a programmable dWallet. Compensation policy is encrypted, not stored.
            Payroll runs as a single shielded batch. Auditors see exactly what they
            should — and nothing more.
          </p>
          <div className="mt-10 flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="primary" size="lg">Open dashboard →</Button>
            </Link>
            <Link href="#how">
              <Button variant="ghost" size="lg">How it works</Button>
            </Link>
          </div>
        </div>
      </section>

      <HRule />

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
            customer and contractor — who pays, who&apos;s held, who computes
            policy, who sees what.
          </p>
        </div>
      </section>

      <HRule />

      <section id="how" className="mx-auto max-w-3xl px-6 py-32">
        <Eyebrow>How it works</Eyebrow>
        <h2 className="mt-6 font-display text-[40px] leading-tight tracking-tighter">
          One pay flow.
        </h2>
        <ol className="mt-12 space-y-12">
          {STEPS.map((step, i) => (
            <li key={step.title} className="grid grid-cols-[auto_1fr] gap-6">
              <div className="font-mono text-[12px] text-ink-3 pt-1.5 num">
                {String(i + 1).padStart(2, "0")}
              </div>
              <div>
                <h3 className="font-display text-[24px] tracking-tight">{step.title}</h3>
                <p className="mt-2 text-[15px] text-ink-2 leading-relaxed">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <HRule />

      <footer className="mx-auto max-w-6xl px-6 py-12 flex items-center justify-between text-[13px] text-ink-3">
        <span>Envelope</span>
        <div className="flex gap-5">
          <Link href="/dashboard" className="hover:text-ink">Dashboard</Link>
        </div>
      </footer>
    </>
  );
}

const STEPS = [
  {
    title: "Customers pay from anywhere.",
    body: "Customer picks any token on any chain — Base, Arbitrum, BNB, Solana. Funds route to your treasury and settle on Solana. Fiat customers pay through card, UPI, or SEPA.",
  },
  {
    title: "Funds land in a programmable treasury.",
    body: "Your treasury is a dWallet — MPC custody split between you and a network. Spending caps, role-based co-sign, and cross-chain reserves enforced by a Solana program. Not a hot wallet, not Fireblocks.",
  },
  {
    title: "Salary policy is encrypted, not stored.",
    body: "Compensation matrix and approval thresholds live as ciphertexts. Threshold rules — “amount within band ceiling for role” — compute on encrypted inputs without revealing the bands.",
  },
  {
    title: "Payroll fires as one shielded batch.",
    body: "Recipients get stealth claim links. The public ledger sees a single shielded entry. Your auditor opens a scoped viewing key.",
  },
];
