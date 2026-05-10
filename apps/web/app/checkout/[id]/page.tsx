/**
 * Public KIRAPAY checkout entry.
 *
 * Flow:
 *   1. Server: POST /api/link/generate to KIRAPAY → { url, price }
 *   2. Redirect customer to that hosted checkout URL.
 *   3. Customer pays from any chain; KIRAPAY hits /api/kirapay/webhook.
 *
 * Settlement: SOL on Solana (default) — webhook handler queues Jupiter swap
 * to USDC on receipt. See PLAN.md §3.3 for Path A/B tradeoff.
 */
import { redirect } from "next/navigation";
import { createPaymentLink, solanaInvoice } from "@/lib/kirapay/client";

type Params = { params: { id: string } };

export default async function CheckoutPage({ params }: Params) {
  // TODO: load invoice by id from your store; for now use a fixture.
  const invoice = {
    id: params.id,
    amountUsd: 56,
    receiverSolanaPubkey: process.env.NEXT_PUBLIC_TREASURY_PUBKEY ?? "",
  };

  if (!invoice.receiverSolanaPubkey) {
    return (
      <main className="mx-auto max-w-xl px-6 py-24">
        <h1 className="text-2xl font-bold">Invoice unavailable</h1>
        <p className="mt-2 text-zinc-400">Treasury not configured.</p>
      </main>
    );
  }

  const link = await createPaymentLink(
    solanaInvoice({
      amountUsd: invoice.amountUsd,
      receiverSolanaPubkey: invoice.receiverSolanaPubkey,
      invoiceId: invoice.id,
    }),
  );

  redirect(link.data.url);
}
