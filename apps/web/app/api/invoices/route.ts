import { NextResponse } from "next/server";
import { z } from "zod";
import { appendEvent, newId, store, type Invoice } from "@/lib/store";
import { createPaymentLink, solanaInvoice } from "@/lib/kirapay/client";

export const runtime = "nodejs";

const CreateInvoiceSchema = z.object({
  merchant: z.string().min(1).default("Aarambh Labs"),
  amountUsd: z.number().positive(),
  rail: z.enum(["kirapay", "dodo"]).default("kirapay"),
});

export async function GET() {
  const list = [...store.invoices.values()].sort((a, b) => b.createdAt - a.createdAt);
  return NextResponse.json({ invoices: list });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = CreateInvoiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const id = newId("INV");
  const invoice: Invoice = {
    id,
    merchant: parsed.data.merchant,
    amountUsd: parsed.data.amountUsd,
    rail: parsed.data.rail,
    status: "open",
    createdAt: Date.now(),
  };

  if (parsed.data.rail === "kirapay") {
    const treasury = process.env.NEXT_PUBLIC_TREASURY_PUBKEY;
    if (!treasury) {
      return NextResponse.json(
        { error: "NEXT_PUBLIC_TREASURY_PUBKEY not set — connect a wallet and set it" },
        { status: 412 },
      );
    }
    try {
      const link = await createPaymentLink(
        solanaInvoice({
          amountUsd: parsed.data.amountUsd,
          receiverSolanaPubkey: treasury,
          invoiceId: id,
          redirectUrl: `${origin(req)}/checkout/success?id=${id}`,
        }),
      );
      invoice.kiraLinkUrl = link.data.url;
      // KIRAPAY returns checkout URL like https://checkout.kira-pay.com/{code}
      invoice.kiraLinkCode = link.data.url.split("/").pop();
    } catch (e) {
      return NextResponse.json(
        { error: `KIRAPAY: ${e instanceof Error ? e.message : "unknown"}` },
        { status: 502 },
      );
    }
  }

  store.invoices.set(id, invoice);
  appendEvent("invoice.created", { id, amountUsd: invoice.amountUsd, rail: invoice.rail });
  return NextResponse.json({ invoice }, { status: 201 });
}

function origin(req: Request) {
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  const host = req.headers.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}
