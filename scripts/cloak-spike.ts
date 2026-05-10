/**
 * D1 spike: derisk Cloak shield → send → withdraw end-to-end.
 *
 * Run: pnpm cloak:spike
 *
 * Prereqs:
 *   - solana keypair at $SOLANA_KEYPAIR_PATH with 0.07+ SOL
 *   - SOLANA_RPC_URL set (mainnet or devnet)
 */
import {
  CLOAK_PROGRAM_ID,
  NATIVE_SOL_MINT,
  createUtxo,
  createZeroUtxo,
  generateUtxoKeypair,
  transact,
} from "@cloak.dev/sdk";
import { Connection, Keypair } from "@solana/web3.js";
import { readFileSync } from "node:fs";

async function main() {
  const rpc = process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";
  const keypairPath = process.env.SOLANA_KEYPAIR_PATH;
  if (!keypairPath) throw new Error("SOLANA_KEYPAIR_PATH not set");

  const secret = JSON.parse(readFileSync(keypairPath, "utf8")) as number[];
  const signer = Keypair.fromSecretKey(Uint8Array.from(secret));
  const connection = new Connection(rpc, "confirmed");

  console.log("signer:", signer.publicKey.toBase58());
  console.log(
    "balance:",
    (await connection.getBalance(signer.publicKey)) / 1e9,
    "SOL",
  );

  // Shield 0.1 SOL into a single UTXO owned by a fresh stealth keypair.
  const amount = 100_000_000n; // 0.1 SOL
  const owner = await generateUtxoKeypair();
  const out = await createUtxo(amount, owner, NATIVE_SOL_MINT);

  const result = await transact(
    {
      inputUtxos: [await createZeroUtxo(NATIVE_SOL_MINT)],
      outputUtxos: [out],
      externalAmount: amount,
      depositor: signer.publicKey,
    },
    {
      connection,
      programId: CLOAK_PROGRAM_ID,
      depositorKeypair: signer,
      walletPublicKey: signer.publicKey,
    },
  );

  console.log("shield result:", result);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
