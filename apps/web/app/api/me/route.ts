/**
 * GET    /api/me  → org for the connecting wallet (creates an empty one if first time)
 * PATCH  /api/me  → set org name, treasury pubkey
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { authResponse, requireWalletPubkey } from "@/lib/auth";
import { getOrCreateOrg, store } from "@/lib/store";
import { PublicKey } from "@solana/web3.js";

export const runtime = "nodejs";

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
    return NextResponse.json({ org });
  } catch (e) {
    return authResponse(e);
  }
}
