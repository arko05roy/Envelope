/**
 * Cloak stealth claim page for a contractor.
 *
 * The claim link contains the encrypted UTXO note in the URL fragment.
 * The contractor signs in (Privy), client decrypts, then chooses how to take
 * the money: withdraw to wallet, off-ramp to fiat (Dodo), or forward (KIRAPAY).
 */
import { Button, Card, Eyebrow, HRule, Label } from "@/components/ui/primitives";

type Params = { params: { id: string } };

export default function ClaimPage({ params }: Params) {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-24">
      <Card className="w-full max-w-lg p-8 shadow-lift">
        <Eyebrow>You&apos;ve been paid</Eyebrow>
        <h1 className="mt-5 font-display text-[40px] leading-none tracking-tighter num">
          $7,500.00
        </h1>
        <div className="mt-2 text-[14px] text-ink-2">
          from <span className="text-ink">Aarambh Labs</span>
        </div>
        <div className="mt-1 font-mono text-[12px] text-ink-3">claim · {params.id}</div>

        <HRule className="my-7" />

        <Label>Choose how to receive</Label>
        <div className="mt-4 space-y-2">
          <Button variant="primary" className="w-full justify-between">
            Withdraw to wallet
            <span className="text-[12px] opacity-70 font-mono">Cloak · partial</span>
          </Button>
          <Button variant="secondary" className="w-full justify-between">
            Off-ramp to local currency
            <span className="text-[12px] opacity-70 font-mono">Dodo · INR / USD / EUR</span>
          </Button>
          <Button variant="secondary" className="w-full justify-between">
            Forward to another chain
            <span className="text-[12px] opacity-70 font-mono">KIRAPAY · 11 chains</span>
          </Button>
        </div>

        <p className="mt-7 text-[12px] text-ink-3 leading-relaxed">
          Your name, address, and amount are not visible on Solana — only this
          link sees them. The link expires in 7 days.
        </p>
      </Card>
    </main>
  );
}
