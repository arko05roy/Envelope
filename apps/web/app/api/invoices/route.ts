import { NextResponse } from "next/server";
import { z } from "zod";
import { authResponse, requireWalletPubkey } from "@/lib/auth";
import { getOrCreateOrg, listInvoices, newId, store, type Invoice } from "@/lib/store";
import { createPaymentLink, solanaInvoice } from "@/lib/kirapay/client";
import { createInvoicePayment } from "@/lib/dodo/client";

export const runtime = "nodejs";

const Body = z.object({
  amountUsd: z.number().positive(),
  rail: z.enum(["kirapay", "dodo"]).default("kirapay"),
  customerEmail: z.string().email().optional(),
  customerName: z.string().optional(),
  description: z.string().optional(),
});

export async function GET(req: Request) {
  try {
    const pubkey = requireWalletPubkey(req);
    return NextResponse.json({ invoices: listInvoices(pubkey) });
  } catch (e) {
    return authResponse(e);
  }
}

export async function POST(req: Request) {
  try {
    const pubkey = requireWalletPubkey(req);
    const org = getOrCreateOrg(pubkey);
    const body = await req.json().catch(() => null);
    const parsed = Body.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const id = newId("INV");
    const invoice: Invoice = {
      id,
      ownerPubkey: pubkey,
      amountUsd: parsed.data.amountUsd,
      rail: parsed.data.rail,
      status: "open",
      createdAt: Date.now(),
    };

    if (parsed.data.rail === "kirapay") {
      const link = await createPaymentLink(
        solanaInvoice({
          amountUsd: parsed.data.amountUsd,
          receiverSolanaPubkey: org.treasuryPubkey,
          invoiceId: id,
          redirectUrl: `${origin(req)}/checkout/success?id=${id}`,
        }),
      );
      invoice.kiraLinkUrl = link.data.url;
      invoice.kiraLinkCode = link.data.url.split("/").pop();
    } else if (parsed.data.rail === "dodo") {
      if (!parsed.data.customerEmail) {
        return NextResponse.json({ error: "customerEmail required for dodo invoices" }, { status: 400 });
      }
      const payment = await createInvoicePayment({
        invoiceId: id,
        amountUsdCents: Math.round(parsed.data.amountUsd * 100),
        customerEmail: parsed.data.customerEmail,
        customerName: parsed.data.customerName,
        description: parsed.data.description,
      });
      invoice.dodoSessionId = payment.paymentId;
      invoice.dodoCheckoutUrl = payment.paymentLink;
    }

    store.invoices[id] = invoice;
    store.flush();
    return NextResponse.json({ invoice }, { status: 201 });
  } catch (e) {
    if (e && typeof e === "object" && "statusCode" in e) return authResponse(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "internal" },
      { status: 502 },
    );
  }
}

function origin(req: Request) {
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  const host = req.headers.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}
