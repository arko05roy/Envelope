/**
 * POST /api/dodo/webhook
 *
 * Verifies the Standard Webhooks signature (Svix-compat) using the
 * `standardwebhooks` package, then dispatches by event type.
 *
 * Payload event types we care about (per docs/developer-resources/webhooks/intents/webhook-events-guide):
 *   - payment.succeeded
 *   - payment.failed
 *   - subscription.active
 *   - subscription.cancelled
 *   - subscription.renewed
 *   - refund.succeeded / refund.failed
 *   - dispute.opened / dispute.lost / dispute.won
 */
import { NextResponse } from "next/server";
import { Webhook } from "standardwebhooks";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const secret = process.env.DODO_PAYMENTS_WEBHOOK_KEY;
  if (!secret) {
    return NextResponse.json({ error: "webhook secret not configured" }, { status: 500 });
  }

  const raw = await req.text();
  const headers = {
    "webhook-id": req.headers.get("webhook-id") ?? "",
    "webhook-timestamp": req.headers.get("webhook-timestamp") ?? "",
    "webhook-signature": req.headers.get("webhook-signature") ?? "",
  };

  let payload: { type: string; data: unknown };
  try {
    payload = new Webhook(secret).verify(raw, headers) as { type: string; data: unknown };
  } catch {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }

  switch (payload.type) {
    case "payment.succeeded":
      // TODO: mark invoice paid; if KIRAPAY-side fiat fallback, no swap needed.
      break;
    case "payment.failed":
      break;
    case "subscription.active":
    case "subscription.renewed":
      // TODO: enable org features.
      break;
    case "subscription.cancelled":
      // TODO: schedule offboarding.
      break;
    default:
      // unhandled event types are fine — we still 200 so Dodo doesn't retry.
      break;
  }

  return NextResponse.json({ received: true });
}
