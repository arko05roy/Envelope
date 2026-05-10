import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { getTransactionStatusByHash } from "@/lib/kirapay/client";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const inv = store.invoices.get(params.id);
  if (!inv) return NextResponse.json({ error: "not found" }, { status: 404 });
  // Best-effort: if we have a settlement hash but status still open, refresh from KIRAPAY.
  if (inv.settlementTxHash && inv.status === "open") {
    try {
      const r = await getTransactionStatusByHash(inv.settlementTxHash);
      if (r.data.status?.toLowerCase() === "success") inv.status = "settled";
    } catch {
      // ignore
    }
  }
  return NextResponse.json({ invoice: inv });
}
