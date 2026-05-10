/**
 * KIRAPAY merchant API client.
 *
 * Docs:    https://docs.kira-pay.com/developer/apis/overview
 * Base:    https://api.kira-pay.com/api
 * Auth:    x-api-key header (NOT Bearer)
 *
 * Flow (per docs.kira-pay.com/developer/apis/integration-flow):
 *   1. Server: POST /link/generate → { url, price, originalPrice }
 *   2. Send `url` to customer (hosted KIRAPAY checkout).
 *   3. Customer pays from any supported chain.
 *   4. KIRAPAY settles to merchant `receiver` on the configured `tokenOut.chainId`.
 *   5. Webhook fires: transaction.created / transaction.succeeded / transaction.refund.
 *
 * IMPORTANT — Solana settlement caveat:
 *   Per docs/payments/supported-chains-and-tokens, "For Solana it only supports
 *   native token and use 'sol' as a chainId and 'SOL' as a address while
 *   generating payment links." → KIRAPAY can NOT directly settle USDC on Solana.
 *
 *   Two options for Envelope:
 *     A) Settle SOL on Solana to dWallet → Jupiter swap to USDC on receipt.
 *     B) Settle USDC on Base (chainId 8453) to dWallet's EVM address (via Ika
 *        cross-chain custody) → bridge or hold there.
 *   Default: option (A) for v1 demo. Track design tradeoff in PLAN.md.
 */

const BASE = process.env.KIRAPAY_BASE_URL ?? "https://api.kira-pay.com/api";

export interface TokenSelector {
  /** Numeric chainId as string (EVM) or "sol" for Solana. */
  chainId: string;
  /** Token address. For Solana use "SOL". For EVM, the ERC-20 contract address. */
  address: string;
}

export interface CreateLinkInput {
  tokenOut: TokenSelector;
  /** Merchant settlement wallet address (EVM 0x… OR Solana base58). */
  receiver: string;
  /** Amount in fiat (per `fiatCurrency`). */
  originalPrice: number;
  fiatCurrency?: string; // default USD
  name?: string;
  customOrderId?: string;
  redirectUrl?: string;
  type?: "single_use" | "unlimited";
  isViewAsCrypto?: boolean;
  cryptoCurrency?: string;
}

export interface CreateLinkResponse {
  message: string;
  code: number;
  data: {
    url: string;          // checkout URL — share with customer
    price: number;        // internal USD-converted price
    originalPrice: number;
  };
}

function authHeaders(): HeadersInit {
  const key = process.env.KIRAPAY_API_KEY;
  if (!key) throw new Error("KIRAPAY_API_KEY not set");
  return { "x-api-key": key, "Content-Type": "application/json" };
}

export async function createPaymentLink(input: CreateLinkInput): Promise<CreateLinkResponse> {
  const res = await fetch(`${BASE}/link/generate`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`KIRAPAY createPaymentLink failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export interface LinkPublicView {
  message: string;
  code: number;
  data: {
    code: string;
    price: number;
    fiatCurrency: string;
    isViewAsCrypto: boolean;
    cryptoCurrency: string | null;
    receiver: string;
    status: string;
    type: "single_use" | "unlimited";
    tokenOut: { symbol: string; name: string; address: string; chainId: number | string };
    user: { businessName: string; isKybVerified: boolean; isKycVerified: boolean; supportEmail?: string; logo?: string };
    sessionId?: string;
  };
}

/** Public endpoint — no auth. */
export async function getLinkByCode(code: string, sessionId?: string): Promise<LinkPublicView> {
  const headers: HeadersInit = sessionId ? { "X-Session-Id": sessionId } : {};
  const res = await fetch(`${BASE}/link/${code}`, { headers });
  if (!res.ok) throw new Error(`KIRAPAY getLinkByCode failed: ${res.status}`);
  return res.json();
}

/** Public endpoint — no auth. Returns supported settlement tokens for a chain. */
export async function getSupportedTokens(chainId: string): Promise<Array<{
  chainId: number | string;
  address: string;
  name: string;
  symbol: string;
}>> {
  const res = await fetch(`${BASE}/link/tokens/${chainId}`);
  if (!res.ok) throw new Error(`KIRAPAY getSupportedTokens failed: ${res.status}`);
  return res.json();
}

/** Public endpoint — no auth. Returns latest status for a tx hash. */
export async function getTransactionStatusByHash(hash: string): Promise<{
  message: string;
  code: number;
  data: { status: string };
}> {
  const res = await fetch(`${BASE}/wallet/transactions/status/${hash}`);
  if (!res.ok) throw new Error(`KIRAPAY getTransactionStatusByHash failed: ${res.status}`);
  return res.json();
}

/** Register or update the webhook endpoint for our API key. */
export async function setWebhook(url: string, secret: string): Promise<unknown> {
  const res = await fetch(`${BASE}/webhooks`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ url, secret }),
  });
  if (!res.ok) throw new Error(`KIRAPAY setWebhook failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export type WebhookEventName =
  | "transaction.created"
  | "transaction.succeeded"
  | "transaction.refund";

export interface WebhookEvent {
  event: WebhookEventName;
  data: {
    _id: string;
    status: string;
    hash: string;
    price: number;
    settlementAmount: number;
    sender: string;
    recipient: string;
    createdAt: string;
  };
}

/**
 * Verify webhook signature.
 * The `secret` we sent at registration is what KIRAPAY signs with.
 * Header name & algorithm — KIRAPAY docs index references signature flow but
 * exact algorithm isn't in the public pages. Best-guess HMAC-SHA256(rawBody)
 * compared against the request's `x-kirapay-signature` header. Verify against
 * a real webhook test on D3 spike and adjust.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyWebhook(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.KIRAPAY_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
  } catch {
    return false;
  }
}

/** Convenience: build a Solana-native-SOL settlement payment link for an invoice. */
export function solanaInvoice(input: {
  amountUsd: number;
  receiverSolanaPubkey: string;
  invoiceId: string;
  redirectUrl?: string;
}): CreateLinkInput {
  return {
    tokenOut: { chainId: "sol", address: "SOL" },
    receiver: input.receiverSolanaPubkey,
    originalPrice: input.amountUsd,
    fiatCurrency: "USD",
    customOrderId: input.invoiceId,
    redirectUrl: input.redirectUrl,
    type: "single_use",
  };
}

/** Convenience: build a Base-USDC settlement payment link (settles to dWallet's EVM address). */
export function baseUsdcInvoice(input: {
  amountUsd: number;
  receiverEvmAddress: string;
  invoiceId: string;
  redirectUrl?: string;
}): CreateLinkInput {
  return {
    tokenOut: {
      chainId: "8453",
      address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base
    },
    receiver: input.receiverEvmAddress,
    originalPrice: input.amountUsd,
    fiatCurrency: "USD",
    customOrderId: input.invoiceId,
    redirectUrl: input.redirectUrl,
    type: "single_use",
  };
}

export const KIRAPAY_CHAINS = {
  arbitrum: "42161",
  avalanche: "43114",
  base: "8453",
  bsc: "56",
  ethereum: "1",
  hyperEvm: "999",
  optimism: "10",
  polygon: "137",
  soneium: "1868",
  unichain: "130",
  solana: "sol",
} as const;
