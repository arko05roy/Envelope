import { NextResponse } from "next/server";
import { z } from "zod";
import { executePayrollBatch } from "@/lib/payroll/orchestrator";
import { seedContractorsIfEmpty } from "@/lib/payroll/seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Schema = z.object({ contractorIds: z.array(z.string().min(1)).min(1) });

export async function POST(req: Request) {
  seedContractorsIfEmpty();
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  const host = req.headers.get("host") ?? "localhost:3000";
  const origin = `${proto}://${host}`;

  try {
    const result = await executePayrollBatch({ contractorIds: parsed.data.contractorIds, origin });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "payroll failed" },
      { status: 502 },
    );
  }
}
