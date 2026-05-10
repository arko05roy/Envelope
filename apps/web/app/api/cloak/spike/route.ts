/**
 * POST /api/cloak/spike
 *
 * D1 derisking spike — runs a real Cloak shield deposit on the configured
 * network using a server-side keypair. NOT user-facing; this is the harness
 * to confirm Cloak SDK works end-to-end before wiring the payroll path.
 *
 * Body: { amountSol?: number }   default 0.01
 *
 * Requires: SOLANA_KEYPAIR_PATH on the server. Fund with `solana airdrop 2` on devnet.
 */
import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  CLOAK_PROGRAM_ID,
  NATIVE_SOL_MINT,
  createUtxo,
  createZeroUtxo,
  generateUtxoKeypair,
  transact,
} from "@cloak.dev/sdk";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { amountSol = 0.01 } = (await req.json().catch(() => ({}))) as { amountSol?: number };
  const keypairPath = process.env.SOLANA_KEYPAIR_PATH;
  const rpc = process.env.NEXT_PUBLIC_HELIUS_RPC_URL;
  if (!keypairPath || !rpc) {
    return NextResponse.json(
      { error: "SOLANA_KEYPAIR_PATH or NEXT_PUBLIC_HELIUS_RPC_URL not set" },
      { status: 500 },
    );
  }
  try {
    const secret = JSON.parse(readFileSync(keypairPath, "utf8")) as number[];
    const signer = Keypair.fromSecretKey(Uint8Array.from(secret));
    const connection = new Connection(rpc, "confirmed");

    const lamports = BigInt(Math.round(amountSol * LAMPORTS_PER_SOL));
    const owner = await generateUtxoKeypair();
    const out = await createUtxo(lamports, owner, NATIVE_SOL_MINT);

    const result = await transact(
      {
        inputUtxos: [await createZeroUtxo(NATIVE_SOL_MINT)],
        outputUtxos: [out],
        externalAmount: lamports,
        depositor: signer.publicKey,
      },
      {
        connection,
        programId: CLOAK_PROGRAM_ID,
        depositorKeypair: signer,
        walletPublicKey: signer.publicKey,
      },
    );

    return NextResponse.json({
      ok: true,
      depositor: signer.publicKey.toBase58(),
      amountSol,
      result,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "unknown" },
      { status: 502 },
    );
  }
}
