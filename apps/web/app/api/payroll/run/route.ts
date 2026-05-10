/**
 * POST /api/payroll/run
 *
 * The single orchestration point for a payroll run. Sequence:
 *   1. Load encrypted comp rows from envelope-policy program.
 *   2. Call envelope-policy `executeGraph` → encrypted threshold check passes
 *      for each row (Encrypt).
 *   3. Build N stealth recipient UTXOs (Cloak generateUtxoKeypair).
 *   4. Build the Cloak `transact` (or `sdk.send`) batch payload.
 *   5. Ika dWallet co-signs the Solana tx that funds the batch (2PC-MPC).
 *   6. Submit tx; collect claim links per recipient.
 *   7. Email/notify each contractor with their stealth claim link.
 *
 * Auth: server-only. Org admin session validated via Privy server SDK.
 */
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json()) as { runId: string };
  if (!body.runId) {
    return NextResponse.json({ error: "runId required" }, { status: 400 });
  }

  // TODO: orchestrate (steps above). See PLAN.md §1 step 6.
  return NextResponse.json({
    runId: body.runId,
    status: "pending",
    todo: "implement orchestration once spikes 1–5 complete",
  });
}
