import { NextResponse } from "next/server";
import { verifyWebhook, type WebhookEvent } from "@/lib/kirapay/client";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const raw = await req.text();
  const sig = req.headers.get("x-kirapay-signature");
  if (!verifyWebhook(raw, sig)) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }
  const evt = JSON.parse(raw) as WebhookEvent;
  switch (evt.event) {
    case "transaction.created":
      // TODO: persist pending tx tied to customOrderId.
      break;
    case "transaction.succeeded":
      // TODO: mark invoice paid; if settled in SOL, queue Jupiter swap to USDC inside dWallet.
      break;
    case "transaction.refund":
      // TODO: reconcile refund.
      break;
  }
  return NextResponse.json({ received: true });
}
