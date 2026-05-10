/**
 * GET   /api/policy        — fetch the on-chain policy for the connected org
 * POST  /api/policy/init   — create the policy on-chain (one-time)
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { Connection, PublicKey } from "@solana/web3.js";
import { authResponse, requireWalletPubkey } from "@/lib/auth";
import { fetchPolicy, initPolicy } from "@/lib/policy/client";

export const runtime = "nodejs";

function rpc() {
  const url = process.env.NEXT_PUBLIC_HELIUS_RPC_URL;
  if (!url) throw new Error("NEXT_PUBLIC_HELIUS_RPC_URL not set");
  return new Connection(url, "confirmed");
}

export async function GET(req: Request) {
  try {
    const pubkey = requireWalletPubkey(req);
    const policy = await fetchPolicy(rpc(), new PublicKey(pubkey));
    if (!policy) return NextResponse.json({ policy: null });
    return NextResponse.json({
      policy: {
        owner: policy.owner.toBase58(),
        dwallet: policy.dwallet.toBase58(),
        dwalletBound: !policy.dwallet.equals(PublicKey.default),
        monthlyCapLamports: policy.monthlyCapLamports.toString(),
        cosignersRequired: policy.cosignersRequired,
        batchesApproved: policy.batchesApproved.toString(),
        lamportsApprovedThisPeriod: policy.lamportsApprovedThisPeriod.toString(),
        periodStartUnix: policy.periodStartUnix.toString(),
      },
    });
  } catch (e) {
    return authResponse(e);
  }
}
