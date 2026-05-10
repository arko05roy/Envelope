/**
 * GET /api/network — combined connectivity status for Cloak / Ika / Encrypt
 * on the configured network. Used by the dashboard to render real connection
 * states (no mock pills).
 */
import { NextResponse } from "next/server";
import { getIkaStatus, IKA_PROGRAM_ID_DEVNET } from "@/lib/ika/client";
import { encryptHealth } from "@/lib/encrypt/client";

export const runtime = "nodejs";

export async function GET() {
  const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK ?? "devnet";
  const [ika, encrypt] = await Promise.all([getIkaStatus(), encryptHealth()]);
  return NextResponse.json({
    network,
    cloak: {
      ok: network === "mainnet-beta", // shielded pool deployed on mainnet only
      programId: "zh1eLd6rSphLejbFfJEneUwzHRfMKxgzrgkfwA6qRkW",
    },
    ika: {
      ok: ika.ok,
      programId: ika.programId,
      rpc: ika.rpc,
    },
    encrypt: {
      ok: encrypt.ok,
      programId: encrypt.programId,
      endpoint: encrypt.endpoint,
    },
    kirapay: { ok: !!process.env.KIRAPAY_API_KEY },
    dodo: { ok: !!process.env.DODO_PAYMENTS_API_KEY },
  });
}
