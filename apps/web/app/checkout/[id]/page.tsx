/**
 * Public KIRAPAY checkout entry. Server creates a payment link and redirects.
 * If creation fails (or treasury not configured), render the empty state.
 */
import { redirect } from "next/navigation";
import { createPaymentLink, solanaInvoice } from "@/lib/kirapay/client";
import { Card, Eyebrow, Label, Pill } from "@/components/ui/primitives";

type Params = { params: { id: string } };

export default async function CheckoutPage({ params }: Params) {
  const treasury = process.env.NEXT_PUBLIC_TREASURY_PUBKEY;
  // TODO: load real invoice — for the demo, use a fixture.
  const invoice = { id: params.id, amountUsd: 56, merchant: "Aarambh Labs" };

  if (!treasury) return <CheckoutShell invoice={invoice} state="unconfigured" />;

  try {
    const link = await createPaymentLink(
      solanaInvoice({
        amountUsd: invoice.amountUsd,
        receiverSolanaPubkey: treasury,
        invoiceId: invoice.id,
      }),
    );
    redirect(link.data.url);
  } catch {
    return <CheckoutShell invoice={invoice} state="failed" />;
  }
}

function CheckoutShell({
  invoice,
  state,
}: {
  invoice: { id: string; amountUsd: number; merchant: string };
  state: "unconfigured" | "failed";
}) {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-24">
      <Card className="w-full max-w-md p-8 shadow-lift">
        <Eyebrow>Pay invoice</Eyebrow>
        <h1 className="mt-5 font-display text-[40px] leading-none tracking-tighter num">
          ${invoice.amountUsd.toFixed(2)}
        </h1>
        <div className="mt-2 text-[14px] text-ink-2">
          to <span className="text-ink">{invoice.merchant}</span>
        </div>
        <div className="mt-1 font-mono text-[12px] text-ink-3">#{invoice.id}</div>

        <div className="mt-8 pt-6 border-t border-rule">
          <Label>Payment status</Label>
          <div className="mt-3">
            {state === "unconfigured" ? (
              <Pill tone="warning">Treasury not configured</Pill>
            ) : (
              <Pill tone="negative">Could not create payment link</Pill>
            )}
          </div>
          <p className="mt-4 text-[13px] text-ink-2 leading-relaxed">
            Once configured, this page redirects to KIRAPAY hosted checkout —
            customer can pay from any of 11 chains; funds settle on Solana.
          </p>
        </div>
      </Card>
    </main>
  );
}
