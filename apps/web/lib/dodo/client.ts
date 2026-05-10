/**
 * Dodo Payments SDK wrapper.
 *
 * Install:  npm install dodopayments
 * Docs:     https://docs.dodopayments.com
 *
 * What we use:
 *   1. One-time payments — fiat invoice fallback for end-customers (POST /payments).
 *   2. Subscriptions — Envelope's own SaaS billing for the org (POST /subscriptions).
 *   3. Webhooks — verify HMAC against signing key, then update invoice/sub state.
 *
 * Stablecoin acceptance: confirmed available "worldwide (excluding India)".
 * Solana settlement specifics: confirm with Dodo support; for v1 demo, use
 * card → Envelope account → manual rebalance to dWallet (acceptable for hackathon).
 */
import DodoPayments from "dodopayments";

let _client: DodoPayments | null = null;

export function dodo(): DodoPayments {
  if (_client) return _client;
  const bearerToken = process.env.DODO_API_KEY;
  if (!bearerToken) throw new Error("DODO_API_KEY not set");
  _client = new DodoPayments({ bearerToken });
  return _client;
}

export interface CreateInvoicePaymentInput {
  invoiceId: string;
  amountUsdCents: number;
  customerEmail: string;
  description: string;
}

export async function createInvoicePayment(input: CreateInvoicePaymentInput) {
  // TODO(D4): confirm exact field names from dodopayments TS SDK.
  return dodo().payments.create({
    payment_link: true,
    billing: { country: "US" },
    customer: { email: input.customerEmail },
    product_cart: [
      { product_id: "envelope-invoice", quantity: 1, amount: input.amountUsdCents },
    ],
    metadata: { invoiceId: input.invoiceId, description: input.description },
  } as never);
}

/** Verify webhook signature against DODO_WEBHOOK_SIGNING_KEY (HMAC-SHA256). */
export function verifyDodoWebhook(rawBody: string, signature: string): boolean {
  // TODO(D4): use the documented Dodo signature scheme; see /api-reference/webhooks.
  void rawBody; void signature;
  return false;
}
