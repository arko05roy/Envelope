import { NextResponse } from "next/server";
import { z } from "zod";
import { authResponse, requireWalletPubkey } from "@/lib/auth";
import { listContractors, newId, store, type Contractor } from "@/lib/store";
import { sealContractorSalary } from "@/lib/encrypt/client";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const pubkey = requireWalletPubkey(req);
    return NextResponse.json({ contractors: listContractors(pubkey) });
  } catch (e) {
    return authResponse(e);
  }
}

const Body = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email(),
  countryCode: z.string().min(2).max(3),
  role: z.string().min(1).max(40),
  monthlyUsd: z.number().int().positive().max(1_000_000),
});

export async function POST(req: Request) {
  try {
    const pubkey = requireWalletPubkey(req);
    const body = await req.json().catch(() => null);
    const parsed = Body.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const id = newId("c");
    const c: Contractor = {
      id,
      ownerPubkey: pubkey,
      ...parsed.data,
      countryCode: parsed.data.countryCode.toUpperCase(),
      createdAt: Date.now(),
    };

    // Seal salary as an Encrypt ciphertext on Solana devnet — best-effort.
    // If Encrypt's gRPC is unreachable, the contractor is still saved; the
    // ciphertext id is filled in next time the user clicks "Seal compensation".
    try {
      const sealed = await sealContractorSalary(c.monthlyUsd, pubkey);
      if (sealed) {
        c.encryptCiphertextId = sealed.ciphertextId;
        c.encryptedAt = Date.now();
      }
    } catch {
      // swallow — surfaced via separate /api/contractors/[id]/seal call
    }

    store.contractors[id] = c;
    store.flush();
    return NextResponse.json({ contractor: c }, { status: 201 });
  } catch (e) {
    return authResponse(e);
  }
}
