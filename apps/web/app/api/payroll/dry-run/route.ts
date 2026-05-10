import { NextResponse } from "next/server";
import { z } from "zod";
import { buildDryRun } from "@/lib/payroll/orchestrator";
import { seedContractorsIfEmpty } from "@/lib/payroll/seed";

export const runtime = "nodejs";

const Schema = z.object({ contractorIds: z.array(z.string().min(1)).min(1) });

export async function POST(req: Request) {
  seedContractorsIfEmpty();
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const dry = buildDryRun(parsed.data.contractorIds);
  // Re-serialize bigints as strings.
  return NextResponse.json({
    contractorIds: dry.contractorIds,
    rows: dry.rows.map((r) => ({ ...r, lamports: r.lamports.toString() })),
    totalUsd: dry.totalUsd,
    totalLamports: dry.totalLamports.toString(),
    ikaCoSignRequired: dry.ikaCoSignRequired,
    ikaStub: dry.ikaStub,
  });
}
