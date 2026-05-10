/**
 * POST /api/dodo/checkout — creates a Dodo checkout session and returns the
 * redirect URL.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { createInvoiceCheckout } from "@/lib/dodo/client";

export const runtime = "nodejs";

const Schema = z.object({
  invoiceId: z.string(),
  amountUsdCents: z.number().int().positive(),
  customerEmail: z.string().email(),
  customerName: z.string().optional(),
  productId: z.string(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const session = await createInvoiceCheckout(parsed.data);
    return NextResponse.json({ session });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "dodo error" },
      { status: 502 },
    );
  }
}
