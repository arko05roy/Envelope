import { NextResponse } from "next/server";
import { authResponse, requireWalletPubkey } from "@/lib/auth";
import { listPayrollRuns } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const pubkey = requireWalletPubkey(req);
    return NextResponse.json({ runs: listPayrollRuns(pubkey) });
  } catch (e) {
    return authResponse(e);
  }
}
