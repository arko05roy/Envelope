import { Card, Eyebrow, Pill } from "@/components/ui/primitives";

type Search = { searchParams: { id?: string } };

export default function CheckoutSuccessPage({ searchParams }: Search) {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-24">
      <Card className="w-full max-w-md p-8 shadow-lift">
        <Eyebrow>Thanks — payment received</Eyebrow>
        <h1 className="mt-5 font-display text-[40px] leading-none tracking-tighter">
          You&apos;re all set.
        </h1>
        {searchParams.id && (
          <div className="mt-2 font-mono text-[12px] text-ink-3">#{searchParams.id}</div>
        )}
        <div className="mt-8 pt-6 border-t border-rule">
          <Pill tone="positive">Settling on Solana</Pill>
        </div>
        <p className="mt-5 text-[13px] text-ink-2 leading-relaxed">
          The merchant has been notified. KIRAPAY is bridging your payment to
          their Solana treasury. You&apos;ll receive a receipt by email.
        </p>
      </Card>
    </main>
  );
}
