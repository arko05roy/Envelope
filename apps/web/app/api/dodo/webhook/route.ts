import { NextResponse } from "next/server";
import { verifyDodoWebhook } from "@/lib/dodo/client";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyDodoWebhook(raw, req.headers)) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }
  const evt = JSON.parse(raw) as { type: string; data: unknown };
  // TODO: switch on evt.type — payment.succeeded, subscription.active, etc.
  void evt;
  return NextResponse.json({ received: true });
}
