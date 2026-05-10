import { NextResponse } from "next/server";
import { authResponse, requireWalletPubkey } from "@/lib/auth";
import { store } from "@/lib/store";
import { sealContractorSalary } from "@/lib/encrypt/client";

export const runtime = "nodejs";

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const pubkey = requireWalletPubkey(req);
    const c = store.contractors[params.id];
    if (!c || c.ownerPubkey !== pubkey) return NextResponse.json({ error: "not found" }, { status: 404 });
    delete store.contractors[params.id];
    store.flush();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return authResponse(e);
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  // POST /api/contractors/{id}?action=seal — re-seal the salary ciphertext.
  const url = new URL(req.url);
  if (url.searchParams.get("action") !== "seal") {
    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  }
  try {
    const pubkey = requireWalletPubkey(req);
    const c = store.contractors[params.id];
    if (!c || c.ownerPubkey !== pubkey) return NextResponse.json({ error: "not found" }, { status: 404 });
    const sealed = await sealContractorSalary(c.monthlyUsd, pubkey);
    if (!sealed) {
      return NextResponse.json({ error: "encrypt unreachable" }, { status: 502 });
    }
    c.encryptCiphertextId = sealed.ciphertextId;
    c.encryptedAt = Date.now();
    store.flush();
    return NextResponse.json({ contractor: c });
  } catch (e) {
    return authResponse(e);
  }
}
