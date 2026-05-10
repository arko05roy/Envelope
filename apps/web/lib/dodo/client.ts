/**
 * Dodo Payments SDK wrapper.
 *
 * SDK:    `dodopayments` (server-side)
 * Adapter: `@dodopayments/nextjs` for App Router checkout/portal/webhooks
 * Docs:    https://docs.dodopayments.com
 *
 * Webhooks follow the Standard Webhooks spec (https://standardwebhooks.com/),
 * compatible with Svix. We use the `standardwebhooks` package directly for
 * verification. Headers: `webhook-id`, `webhook-timestamp`, `webhook-signature`.
 *
 * Test mode hosts:  https://test.dodopayments.com
 * Live mode hosts:  https://live.dodopayments.com
 */
import DodoPayments from "dodopayments";

let _client: DodoPayments | null = null;

export function dodo(): DodoPayments {
  if (_client) return _client;
  const bearerToken = process.env.DODO_PAYMENTS_API_KEY;
  if (!bearerToken) throw new Error("DODO_PAYMENTS_API_KEY not set");
  _client = new DodoPayments({
    bearerToken,
    environment: (process.env.DODO_PAYMENTS_ENVIRONMENT ?? "test_mode") as "test_mode" | "live_mode",
  });
  return _client;
}

export interface CreateInvoiceCheckoutInput {
  invoiceId: string;
  amountUsdCents: number;
  customerEmail: string;
  customerName?: string;
  productId: string;
  description?: string;
}

/**
 * Create a one-off checkout session for an invoice.
 * Returns a redirect URL to send the customer to.
 */
export async function createInvoiceCheckout(input: CreateInvoiceCheckoutInput) {
  return dodo().checkoutSessions.create({
    product_cart: [{ product_id: input.productId, quantity: 1 }],
    customer: { email: input.customerEmail, name: input.customerName ?? "" },
    return_url: process.env.DODO_PAYMENTS_RETURN_URL,
    metadata: { invoiceId: input.invoiceId, description: input.description ?? "" },
  } as never);
}

/** Subscribe an org to Envelope's own SaaS plan (used by /api/billing/subscribe). */
export async function subscribeOrg(input: {
  orgId: string;
  customerId: string;
  productId?: string;
}) {
  const productId = input.productId ?? process.env.DODO_PRODUCT_ID_SUBSCRIPTION;
  if (!productId) throw new Error("DODO_PRODUCT_ID_SUBSCRIPTION not set");
  return dodo().subscriptions.create({
    customer_id: input.customerId,
    product_id: productId,
    metadata: { orgId: input.orgId },
  } as never);
}
