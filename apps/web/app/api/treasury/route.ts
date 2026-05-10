/**
 * GET /api/treasury — returns SOL balance and (eventually) USDC balance for the
 * configured treasury pubkey. Real on-chain read via Helius RPC.
 */
import { NextResponse } from "next/server";
import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";

export const runtime = "nodejs";

export async function GET() {
  const treasury = process.env.NEXT_PUBLIC_TREASURY_PUBKEY;
  const rpc = process.env.NEXT_PUBLIC_HELIUS_RPC_URL;
  if (!treasury || !rpc) {
    return NextResponse.json({ configured: false });
  }
  try {
    const conn = new Connection(rpc, "confirmed");
    const pubkey = new PublicKey(treasury);
    const lamports = await conn.getBalance(pubkey, "confirmed");
    return NextResponse.json({
      configured: true,
      pubkey: treasury,
      sol: lamports / LAMPORTS_PER_SOL,
      lamports,
    });
  } catch (e) {
    return NextResponse.json(
      { configured: true, error: e instanceof Error ? e.message : "rpc error" },
      { status: 502 },
    );
  }
}
