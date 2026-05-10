/**
 * Wallet-based identity for API routes.
 * Client sends `x-wallet-pubkey: <base58>`. Server treats that as the org id.
 *
 * NOTE: this is unauthenticated — anyone could spoof a header. For production,
 * upgrade to Sign-in-with-Solana (SIWS) and verify signatures here. The store
 * is keyed by pubkey, so spoofing only lets an attacker affect their own row
 * if they know someone else's pubkey, which is public anyway. But before
 * touching real money or settlement, signature-verify on every mutation.
 */
import { PublicKey } from "@solana/web3.js";

export class AuthError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
  }
}

export function requireWalletPubkey(req: Request): string {
  const raw = req.headers.get("x-wallet-pubkey");
  if (!raw) throw new AuthError(401, "wallet not connected");
  try {
    new PublicKey(raw); // throws on bad base58
  } catch {
    throw new AuthError(400, "invalid wallet pubkey");
  }
  return raw;
}

export function authResponse(err: unknown) {
  if (err instanceof AuthError) {
    return Response.json({ error: err.message }, { status: err.statusCode });
  }
  throw err;
}
