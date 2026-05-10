/**
 * POST /api/billing/subscribe
 *
 * Subscribes the connected org to Envelope's own SaaS plan via Dodo Payments.
 * Returns a hosted payment link for the user to finish checkout.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { authResponse, requireWalletPubkey } from "@/lib/auth";
import { getOrCreateOrg, store } from "@/lib/store";
import { createSubscription } from "@/lib/dodo/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  email: z.string().email(),
  name: z.string().min(1).optional(),
});

export async function POST(req: Request) {
  try {
    const pubkey = requireWalletPubkey(req);
    const org = getOrCreateOrg(pubkey);
    const body = await req.json().catch(() => null);
    const parsed = Body.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const result = await createSubscription({
      customerEmail: parsed.data.email,
      customerName: parsed.data.name ?? org.name ?? parsed.data.email,
      metadata: { orgPubkey: pubkey, orgName: org.name },
    });
    return NextResponse.json(result);
  } catch (e) {
    if (e && typeof e === "object" && "statusCode" in e) return authResponse(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "subscribe failed" },
      { status: 502 },
    );
  }
}
