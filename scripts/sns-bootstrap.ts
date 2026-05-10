/**
 * Bootstraps the `envelope.sol` SNS tree on Solana devnet for the demo.
 *
 * Run: pnpm sns:bootstrap
 *
 * Prereqs:
 *   - Solana CLI keypair at $SOLANA_KEYPAIR_PATH funded on devnet
 *     (`solana airdrop 5 -u devnet`)
 *   - ~0.5 SOL covers the parent registration + 5 subdomain rent
 *
 * What it does:
 *   1. Wraps 0.01 SOL into a WSOL ATA (used as registration payment).
 *   2. Registers `envelope.sol` on devnet via registerDomainNameV2 with
 *      NATIVE_MINT (wrapped SOL).
 *   3. Creates demo subdomains via createSubdomain (parent owner = signer):
 *        alice.envelope.sol
 *        bob.envelope.sol
 *        carol.envelope.sol
 *        dev.envelope.sol
 *        payroll-agent.envelope.sol
 *
 * Idempotent: re-running skips names that already exist.
 */
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  NATIVE_MINT,
  createAssociatedTokenAccountIdempotentInstruction,
  createSyncNativeInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { devnet } from "@bonfida/spl-name-service";
import { readFileSync } from "node:fs";

const RPC = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
const PARENT = "envelope";
const SUBS = ["alice", "bob", "carol", "dev", "payroll-agent"];
const PARENT_SPACE = 1_000;
const SUB_SPACE = 1_000;
const WRAP_LAMPORTS = 10_000_000; // 0.01 SOL into WSOL

async function exists(conn: Connection, pubkey: PublicKey): Promise<boolean> {
  const info = await conn.getAccountInfo(pubkey);
  return !!info && info.data.length > 0;
}

async function main() {
  const keypairPath = process.env.SOLANA_KEYPAIR_PATH;
  if (!keypairPath) throw new Error("SOLANA_KEYPAIR_PATH not set");
  const secret = JSON.parse(readFileSync(keypairPath, "utf8")) as number[];
  const signer = Keypair.fromSecretKey(Uint8Array.from(secret));
  const conn = new Connection(RPC, "confirmed");

  console.log("signer:", signer.publicKey.toBase58());
  console.log("balance:", (await conn.getBalance(signer.publicKey)) / 1e9, "SOL");
  console.log("rpc:", RPC);

  // 1. Parent: envelope.sol via registerDomainNameV2 with WSOL.
  const parentKey = devnet.utils.getDomainKeySync(PARENT).pubkey;
  console.log(`\n${PARENT}.sol => ${parentKey.toBase58()}`);
  if (await exists(conn, parentKey)) {
    console.log("  already registered, skipping");
  } else {
    const wsolAta = getAssociatedTokenAddressSync(NATIVE_MINT, signer.publicKey);
    const setupIxs = [
      createAssociatedTokenAccountIdempotentInstruction(
        signer.publicKey,
        wsolAta,
        signer.publicKey,
        NATIVE_MINT,
      ),
      SystemProgram.transfer({
        fromPubkey: signer.publicKey,
        toPubkey: wsolAta,
        lamports: WRAP_LAMPORTS,
      }),
      createSyncNativeInstruction(wsolAta),
    ];
    const setupSig = await sendAndConfirmTransaction(
      conn,
      new Transaction().add(...setupIxs),
      [signer],
    );
    console.log("  wrapped SOL:", setupSig);

    const regIxs = await devnet.bindings.registerDomainNameV2(
      conn,
      PARENT,
      PARENT_SPACE,
      signer.publicKey,
      wsolAta,
      NATIVE_MINT,
    );
    const sig = await sendAndConfirmTransaction(
      conn,
      new Transaction().add(...regIxs),
      [signer],
    );
    console.log("  registered:", sig);
  }

  // 2. Subdomains.
  for (const sub of SUBS) {
    const fqdn = `${sub}.${PARENT}`;
    const subKey = devnet.utils.getDomainKeySync(fqdn).pubkey;
    process.stdout.write(`${fqdn}.sol => ${subKey.toBase58()} ... `);
    if (await exists(conn, subKey)) {
      console.log("exists");
      continue;
    }
    try {
      const ixs = await devnet.bindings.createSubdomain(
        conn,
        fqdn,
        signer.publicKey,
        SUB_SPACE,
      );
      const flat = (ixs as unknown as { length: number }[]).flat
        ? (ixs as unknown as TransactionInstruction[][]).flat()
        : (ixs as unknown as TransactionInstruction[]);
      const sig = await sendAndConfirmTransaction(
        conn,
        new Transaction().add(...(flat as TransactionInstruction[])),
        [signer],
      );
      console.log("registered:", sig);
    } catch (e) {
      console.log("FAILED:", (e as Error).message);
    }
  }

  console.log("\ndone. demo handles ready on devnet.");
}

import type { TransactionInstruction } from "@solana/web3.js";

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
