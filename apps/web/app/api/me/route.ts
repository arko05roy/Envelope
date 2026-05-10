/**
 * GET    /api/me  → org for the connecting wallet (creates an empty one if first time)
 * PATCH  /api/me  → set org name, treasury pubkey
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { authResponse, requireWalletPubkey } from "@/lib/auth";
import { getOrCreateOrg, store } from "@/lib/store";
import { Connection, PublicKey } from "@solana/web3.js";
import { fetchPolicy, initPolicy } from "@/lib/policy/client";

export const runtime = "nodejs";

const DEMO_RATE_USD_PER_SOL = 500_000;
const DEFAULT_CAP_USD = 100_000;
function usdToLamports(usd: number): bigint {
  return BigInt(Math.round((usd / DEMO_RATE_USD_PER_SOL) * 1_000_000_000));
}

export async function GET(req: Request) {
  try {
    const pubkey = requireWalletPubkey(req);
    const org = getOrCreateOrg(pubkey);
    return NextResponse.json({ org });
  } catch (e) {
    return authResponse(e);
  }
}

const Patch = z.object({
  name: z.string().min(1).max(60).optional(),
  treasuryPubkey: z.string().optional(),
});

export async function PATCH(req: Request) {
  try {
    const pubkey = requireWalletPubkey(req);
    const body = await req.json().catch(() => null);
    const parsed = Patch.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const org = getOrCreateOrg(pubkey);
    const wasFirstName = !org.name && parsed.data.name;
    if (parsed.data.name !== undefined) org.name = parsed.data.name.trim();
    if (parsed.data.treasuryPubkey !== undefined) {
      try {
        new PublicKey(parsed.data.treasuryPubkey);
      } catch {
        return NextResponse.json({ error: "invalid treasuryPubkey" }, { status: 400 });
      }
      org.treasuryPubkey = parsed.data.treasuryPubkey;
    }
    store.flush();

    // First-time onboarding: bootstrap the on-chain policy if it doesn't exist.
    if (wasFirstName && process.env.NEXT_PUBLIC_HELIUS_RPC_URL) {
      try {
        const conn = new Connection(process.env.NEXT_PUBLIC_HELIUS_RPC_URL, "confirmed");
        const owner = new PublicKey(pubkey);
        const existing = await fetchPolicy(conn, owner);
        if (!existing) {
          await initPolicy({
            connection: conn,
            owner,
            monthlyCapLamports: usdToLamports(DEFAULT_CAP_USD),
            cosigners: 1,
          });
        }
      } catch {
        // Policy bootstrapping is best-effort; user can retry from /api/policy/init.
      }
    }

    return NextResponse.json({ org });
  } catch (e) {
    return authResponse(e);
  }
}
