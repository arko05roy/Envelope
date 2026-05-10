/**
 * Dodo Payments SDK wrapper.
 *
 * SDK:     `dodopayments` (Node, server-side only)
 * Docs:    https://docs.dodopayments.com
 * Webhooks: Standard Webhooks (https://standardwebhooks.com/) — Svix-compat.
 *           Headers: webhook-id, webhook-timestamp, webhook-signature.
 *
 * Hosts:   test_mode → https://test.dodopayments.com
 *          live_mode → https://live.dodopayments.com
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

export interface CreateInvoicePaymentInput {
  invoiceId: string;
  amountUsdCents: number;
  customerEmail: string;
  customerName?: string;
  description?: string;
}

export interface DodoPaymentResult {
  paymentId: string;
  paymentLink: string;
}

/**
 * Find or create the dynamic-pricing product Envelope uses for all custom
 * invoices. Cached across requests so we don't hit the products API every time.
 */
let _dynamicProductId: string | null = process.env.DODO_PRODUCT_ID_DYNAMIC ?? null;
async function ensureDynamicProduct(): Promise<string> {
  if (_dynamicProductId) return _dynamicProductId;
  const client = dodo();
  const p = (await client.products.create({
    name: "Envelope Custom Invoice",
    description: "One-off invoice issued by Envelope merchants. Amount overridden per checkout.",
    tax_category: "saas",
    price: {
      type: "one_time_price",
      currency: "USD",
      price: 100, // $1 default; overridden per invoice via product_cart amount
      discount: 0,
      purchasing_power_parity: false,
      pay_what_you_want: true,
    },
  } as never)) as { product_id: string };
  _dynamicProductId = p.product_id;
  return _dynamicProductId;
}

/** Create a one-off Dodo payment with a hosted payment link. */
export async function createInvoicePayment(input: CreateInvoicePaymentInput): Promise<DodoPaymentResult> {
  const productId = await ensureDynamicProduct();
  const res = (await dodo().payments.create({
    payment_link: true,
    customer: { email: input.customerEmail, name: input.customerName ?? input.customerEmail },
    billing: { city: "—", country: "US", state: "—", street: "—", zipcode: "00000" },
    product_cart: [{ product_id: productId, quantity: 1, amount: input.amountUsdCents }],
    metadata: { invoiceId: input.invoiceId, description: input.description ?? "" },
    return_url: process.env.DODO_PAYMENTS_RETURN_URL,
  } as never)) as { payment_id: string; payment_link?: string; payment_url?: string };

  const link = res.payment_link ?? res.payment_url;
  if (!link) throw new Error("Dodo did not return a payment link");
  return { paymentId: res.payment_id, paymentLink: link };
}

/** Create a subscription for the platform's own SaaS billing. */
export async function createSubscription(input: {
  customerEmail: string;
  customerName: string;
  productId?: string;
  metadata?: Record<string, string>;
}): Promise<{ subscriptionId: string; paymentLink: string }> {
  const productId = input.productId ?? process.env.DODO_PRODUCT_ID_SUBSCRIPTION;
  if (!productId) throw new Error("DODO_PRODUCT_ID_SUBSCRIPTION not set");
  const res = (await dodo().subscriptions.create({
    payment_link: true,
    customer: { email: input.customerEmail, name: input.customerName },
    billing: { city: "—", country: "US", state: "—", street: "—", zipcode: "00000" },
    product_id: productId,
    quantity: 1,
    metadata: input.metadata ?? {},
    return_url: process.env.DODO_PAYMENTS_RETURN_URL,
  } as never)) as { subscription_id: string; payment_link?: string; payment_url?: string };
  const link = res.payment_link ?? res.payment_url;
  if (!link) throw new Error("Dodo did not return a payment link");
  return { subscriptionId: res.subscription_id, paymentLink: link };
}
