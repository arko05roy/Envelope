/**
 * KIRAPAY API client.
 *
 * Docs are auth-gated at https://docs.kira-pay.com — sign in to
 * https://dashboard.kira-pay.com to grab API key + reference.
 *
 * Hypothesized REST shape (verify on D3):
 *   POST   /v1/intents          create cross-chain payment intent
 *   GET    /v1/intents/:id      poll status
 *   POST   /v1/webhooks         settlement callback (we handle inbound)
 *
 * Customer flow:
 *   1. Envelope creates an intent: { destChain: "solana", destToken: "USDC",
 *      destAddress: <dWallet>, amountUsd, callback }.
 *   2. KIRAPAY returns a hosted checkout URL; redirect customer there.
 *   3. Customer pays from any chain; KIRAPAY routes & settles.
 *   4. KIRAPAY POSTs to our /api/kirapay/webhook with signed payload.
 */

const BASE = process.env.KIRAPAY_BASE_URL ?? "https://api.kira-pay.com";

export interface CreateIntentInput {
  invoiceId: string;
  amountUsd: number;
  destAddress: string; // Solana dWallet pubkey
  destToken?: "USDC";
  callbackUrl: string;
  metadata?: Record<string, string>;
}

export interface IntentResponse {
  id: string;
  checkoutUrl: string;
  status: "pending" | "settled" | "failed";
  expiresAt: string;
}

function authHeaders(): HeadersInit {
  const key = process.env.KIRAPAY_API_KEY;
  if (!key) throw new Error("KIRAPAY_API_KEY not set");
  return {
    "Authorization": `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

export async function createIntent(input: CreateIntentInput): Promise<IntentResponse> {
  // TODO(D3): confirm endpoint path + payload shape from authenticated docs.
  const res = await fetch(`${BASE}/v1/intents`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      destination: { chain: "solana", token: input.destToken ?? "USDC", address: input.destAddress },
      amount: { usd: input.amountUsd },
      callbackUrl: input.callbackUrl,
      reference: input.invoiceId,
      metadata: input.metadata,
    }),
  });
  if (!res.ok) throw new Error(`KIRAPAY createIntent failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function getIntent(id: string): Promise<IntentResponse> {
  const res = await fetch(`${BASE}/v1/intents/${id}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`KIRAPAY getIntent failed: ${res.status}`);
  return res.json();
}

/** Verify webhook HMAC. Algorithm TBD — likely HMAC-SHA256 with KIRAPAY_WEBHOOK_SECRET. */
export function verifyWebhook(rawBody: string, signature: string): boolean {
  // TODO(D3): replace with KIRAPAY's documented signature scheme.
  void rawBody; void signature;
  return false;
}
