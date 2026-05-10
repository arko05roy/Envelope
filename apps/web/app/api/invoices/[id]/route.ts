import { NextResponse } from "next/server";
import { authResponse, requireWalletPubkey } from "@/lib/auth";
import { store } from "@/lib/store";
import { getTransactionStatusByHash } from "@/lib/kirapay/client";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const pubkey = requireWalletPubkey(req);
    const inv = store.invoices[params.id];
    if (!inv || inv.ownerPubkey !== pubkey) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    if (inv.settlementTxHash && inv.status === "open") {
      try {
        const r = await getTransactionStatusByHash(inv.settlementTxHash);
        if (r.data.status?.toLowerCase() === "success") {
          inv.status = "settled";
          store.flush();
        }
      } catch {
        // ignore
      }
    }
    return NextResponse.json({ invoice: inv });
  } catch (e) {
    return authResponse(e);
  }
}
