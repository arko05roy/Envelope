/**
 * Bootstraps the `envelope.sol` SNS tree on Solana devnet for the demo.
 *
 * Run: pnpm sns:bootstrap
 *
 * Prereqs:
 *   - Solana CLI keypair at $SOLANA_KEYPAIR_PATH with 0.5+ SOL on devnet
 *     (`solana airdrop 5 -u devnet`)
 *
 * What it does:
 *   1. Registers `envelope.sol` on devnet via the low-level createNameRegistry
 *      binding (rent-only, no USDC).
 *   2. Creates demo subdomains:
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
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { devnet } from "@bonfida/spl-name-service";
import { readFileSync } from "node:fs";

const RPC = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
const PARENT = "envelope";
const SUBS = ["alice", "bob", "carol", "dev", "payroll-agent"];
const PARENT_SPACE = 1_000;
const SUB_SPACE = 1_000;

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

  // Parent: envelope.sol
  const parentKey = devnet.utils.getDomainKeySync(PARENT).pubkey;
  console.log(`\n${PARENT}.sol => ${parentKey.toBase58()}`);
  if (await exists(conn, parentKey)) {
    console.log("  already registered, skipping");
  } else {
    const ix = await devnet.bindings.createNameRegistry(
      conn,
      PARENT,
      PARENT_SPACE,
      signer.publicKey,
      signer.publicKey,
      undefined,
      undefined,
      devnet.constants.ROOT_DOMAIN_ACCOUNT,
    );
    const sig = await sendAndConfirmTransaction(conn, new Transaction().add(ix), [signer]);
    console.log("  registered:", sig);
  }

  // Subdomains
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
      const flat = ixs.flat();
      const sig = await sendAndConfirmTransaction(
        conn,
        new Transaction().add(...flat),
        [signer],
      );
      console.log("registered:", sig);
    } catch (e) {
      console.log("FAILED:", (e as Error).message);
    }
  }

  console.log("\ndone. demo handles ready on devnet.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
