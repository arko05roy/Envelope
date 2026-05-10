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

/**
 * Verify a Dodo webhook (Svix scheme).
 *
 * Dodo's dashboard runs on Svix. Signing is:
 *   signed_payload = `${svix_id}.${svix_timestamp}.${rawBody}`
 *   signature      = base64( HMAC-SHA256(secret_bytes, signed_payload) )
 *   header         = "v1,<sig>"  (multiple comma-space separated values possible
 *                     when secrets are rotated; any one match passes)
 *
 * The signing secret in DODO_WEBHOOK_SIGNING_KEY starts with `whsec_`; the bytes
 * are base64 of everything after that prefix.
 *
 * Reject if the timestamp is older than 5 minutes (replay protection).
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyDodoWebhook(rawBody: string, headers: Headers): boolean {
  const secret = process.env.DODO_WEBHOOK_SIGNING_KEY;
  const id = headers.get("svix-id");
  const timestamp = headers.get("svix-timestamp");
  const sigHeader = headers.get("svix-signature");
  if (!secret || !id || !timestamp || !sigHeader) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  const ageSec = Math.abs(Date.now() / 1000 - ts);
  if (ageSec > 300) return false;

  const stripped = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  let secretBytes: Buffer;
  try {
    secretBytes = Buffer.from(stripped, "base64");
  } catch {
    return false;
  }

  const signedPayload = `${id}.${timestamp}.${rawBody}`;
  const expected = createHmac("sha256", secretBytes).update(signedPayload).digest("base64");

  // Header may contain multiple "v1,sig" entries separated by spaces.
  return sigHeader.split(" ").some((entry) => {
    const [version, sig] = entry.split(",");
    if (version !== "v1" || !sig) return false;
    if (sig.length !== expected.length) return false;
    try {
      return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    } catch {
      return false;
    }
  });
}
