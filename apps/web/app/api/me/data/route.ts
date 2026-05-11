/**
 * DELETE /api/me/data — wipe this wallet's workspace data (contractors,
 * invoices, payroll runs). The workspace record itself and the on-chain
 * policy / treasury are left alone — those are wallet-scoped on-chain state.
 */
import { NextResponse } from "next/server";
import { authResponse, requireWalletPubkey } from "@/lib/auth";
import { store } from "@/lib/store";

export const runtime = "nodejs";

export async function DELETE(req: Request) {
  try {
    const pubkey = requireWalletPubkey(req);
    let removed = 0;
    for (const [k, v] of Object.entries(store.contractors)) {
      if (v.ownerPubkey === pubkey) {
        delete store.contractors[k];
        removed++;
      }
    }
    for (const [k, v] of Object.entries(store.invoices)) {
      if (v.ownerPubkey === pubkey) {
        delete store.invoices[k];
        removed++;
      }
    }
    for (const [k, v] of Object.entries(store.payrollRuns)) {
      if (v.ownerPubkey === pubkey) {
        delete store.payrollRuns[k];
        removed++;
      }
    }
    store.flush();
    return NextResponse.json({ ok: true, removed });
  } catch (e) {
    return authResponse(e);
  }
}
