import { NextResponse } from "next/server";
import { verifyWebhook } from "@/lib/kirapay/client";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const raw = await req.text();
  const sig = req.headers.get("x-kirapay-signature") ?? "";
  if (!verifyWebhook(raw, sig)) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }
  // TODO(D3): on settlement, mark invoice paid + emit dashboard event.
  return NextResponse.json({ received: true });
}
