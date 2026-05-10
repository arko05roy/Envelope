/**
 * Public KIRAPAY checkout page.
 *
 * Flow:
 *   1. Server creates a KIRAPAY intent for invoice [id].
 *   2. We redirect (or embed) KIRAPAY hosted checkout.
 *   3. Customer pays from any chain; KIRAPAY hits /api/kirapay/webhook.
 */
type Params = { params: { id: string } };

export default async function CheckoutPage({ params }: Params) {
  return (
    <main className="mx-auto max-w-xl px-6 py-24">
      <h1 className="text-2xl font-bold">Pay invoice {params.id}</h1>
      <p className="mt-2 text-zinc-400">
        Pay from any chain. Settles as USDC on Solana to the merchant&apos;s
        treasury.
      </p>
      {/* TODO(D3): server action that creates KIRAPAY intent + redirects to checkoutUrl. */}
    </main>
  );
}
