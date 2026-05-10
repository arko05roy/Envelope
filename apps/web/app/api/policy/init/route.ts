import { NextResponse } from "next/server";
import { z } from "zod";
import { Connection, PublicKey } from "@solana/web3.js";
import { authResponse, requireWalletPubkey } from "@/lib/auth";
import { fetchPolicy, initPolicy } from "@/lib/policy/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  monthlyCapUsd: z.number().int().positive().max(10_000_000),
  cosigners: z.number().int().min(1).max(8).default(1),
});

const DEMO_RATE_USD_PER_SOL = 500_000;
function usdToLamports(usd: number): bigint {
  return BigInt(Math.round((usd / DEMO_RATE_USD_PER_SOL) * 1_000_000_000));
}

export async function POST(req: Request) {
  try {
    const pubkey = requireWalletPubkey(req);
    const body = await req.json().catch(() => null);
    const parsed = Body.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const conn = new Connection(process.env.NEXT_PUBLIC_HELIUS_RPC_URL!, "confirmed");
    const owner = new PublicKey(pubkey);

    const existing = await fetchPolicy(conn, owner);
    if (existing) {
      return NextResponse.json({
        alreadyInitialized: true,
        policyPubkey: (await import("@/lib/policy/client")).policyPda(owner)[0].toBase58(),
      });
    }

    const result = await initPolicy({
      connection: conn,
      owner,
      monthlyCapLamports: usdToLamports(parsed.data.monthlyCapUsd),
      cosigners: parsed.data.cosigners,
    });
    return NextResponse.json({
      signature: result.signature,
      policyPubkey: result.policyPubkey.toBase58(),
    });
  } catch (e) {
    if (e && typeof e === "object" && "statusCode" in e) return authResponse(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "init failed" },
      { status: 502 },
    );
  }
}
