import { NextResponse } from "next/server";
import { z } from "zod";
import { authResponse, requireWalletPubkey } from "@/lib/auth";
import { buildDryRun } from "@/lib/payroll/orchestrator";

export const runtime = "nodejs";

const Body = z.object({ contractorIds: z.array(z.string()).min(1) });

export async function POST(req: Request) {
  try {
    const pubkey = requireWalletPubkey(req);
    const body = await req.json().catch(() => null);
    const parsed = Body.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    return NextResponse.json(buildDryRun(pubkey, parsed.data.contractorIds));
  } catch (e) {
    return authResponse(e);
  }
}
