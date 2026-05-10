import { NextResponse } from "next/server";
import { z } from "zod";
import { authResponse, requireWalletPubkey } from "@/lib/auth";
import { executePayrollBatch } from "@/lib/payroll/orchestrator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ contractorIds: z.array(z.string()).min(1) });

export async function POST(req: Request) {
  try {
    const pubkey = requireWalletPubkey(req);
    const body = await req.json().catch(() => null);
    const parsed = Body.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const proto = req.headers.get("x-forwarded-proto") ?? "http";
    const host = req.headers.get("host") ?? "localhost:3000";
    const origin = `${proto}://${host}`;

    const record = await executePayrollBatch({
      ownerPubkey: pubkey,
      contractorIds: parsed.data.contractorIds,
      origin,
    });
    return NextResponse.json(record);
  } catch (e) {
    if (e && typeof e === "object" && "statusCode" in e) return authResponse(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "payroll failed" },
      { status: 502 },
    );
  }
}
