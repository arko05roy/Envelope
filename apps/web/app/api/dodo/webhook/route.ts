import { NextResponse } from "next/server";
import { verifyDodoWebhook } from "@/lib/dodo/client";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const raw = await req.text();
  const sig = req.headers.get("dodo-signature") ?? "";
  if (!verifyDodoWebhook(raw, sig)) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }
  // TODO(D4): handle payment.succeeded, subscription.activated, etc.
  return NextResponse.json({ received: true });
}
