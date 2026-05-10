/**
 * Cloak SDK wrapper.
 *
 * Docs: https://docs.cloak.ag/sdk/quickstart
 * Program ID (mainnet): zh1eLd6rSphLejbFfJEneUwzHRfMKxgzrgkfwA6qRkW
 * Relay (default):       https://api.cloak.ag
 * Fee model (SOL):        5_000_000 + floor(gross * 3 / 1000) lamports.
 * Min recommended balance: 0.07 SOL.
 *
 * Surface used by Envelope:
 *   - shieldDeposit:      bring USDC/SOL into the shielded pool
 *   - batchDisburse:      one shielded tx, N stealth recipients (the payroll core)
 *   - claim:              partialWithdraw / fullWithdraw for contractor side
 *   - issueViewingKey:    scoped audit key (pending — verify in /architecture/viewing-keys-compliance)
 */
import {
  CLOAK_PROGRAM_ID,
  NATIVE_SOL_MINT,
  createUtxo,
  createZeroUtxo,
  generateUtxoKeypair,
  transact,
} from "@cloak.dev/sdk";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";

export interface CloakConfig {
  rpcUrl: string;
  relayUrl?: string;
  programId?: PublicKey;
}

export function makeConnection(cfg: CloakConfig) {
  return new Connection(cfg.rpcUrl, "confirmed");
}

export interface BatchRecipient {
  /** Stealth pubkey for the recipient, output of generateUtxoKeypair() shared via claim link. */
  ownerPubkey: Awaited<ReturnType<typeof generateUtxoKeypair>>;
  amount: bigint;
}

/**
 * Shield-and-disburse in one transaction.
 *
 * Funds come from `depositor` (the dWallet — Ika co-signs upstream),
 * and fan out to N stealth recipients.
 *
 * NOTE: Solana CU budget caps batch size. Spike on D1 to determine the
 * practical N (likely 8–15 per tx). Chunk above that.
 */
export async function batchDisburse(args: {
  connection: Connection;
  depositor: Keypair;
  mint: PublicKey;
  recipients: BatchRecipient[];
  totalExternalAmount: bigint;
}) {
  const { connection, depositor, mint, recipients, totalExternalAmount } = args;

  const outputUtxos = await Promise.all(
    recipients.map((r) => createUtxo(r.amount, r.ownerPubkey, mint)),
  );

  return transact(
    {
      inputUtxos: [await createZeroUtxo(mint)],
      outputUtxos,
      externalAmount: totalExternalAmount,
      depositor: depositor.publicKey,
    },
    {
      connection,
      programId: CLOAK_PROGRAM_ID,
      depositorKeypair: depositor,
      walletPublicKey: depositor.publicKey,
    },
  );
}

/** Re-export for callers that want to mint stealth keys client-side. */
export { generateUtxoKeypair, NATIVE_SOL_MINT, CLOAK_PROGRAM_ID };

/**
 * Issue a scoped viewing key for an auditor.
 *
 * TODO(D1): Verify exact API in /architecture/viewing-keys-compliance + sdk/api-reference.
 * The shape below is the wire we want — implementation may differ.
 */
export interface ViewingKeyScope {
  startTime?: number; // unix ms
  endTime?: number; // unix ms
  recipientFilter?: string[]; // restrict to certain stealth addresses
  showAmounts: boolean;
}

export async function issueViewingKey(_scope: ViewingKeyScope): Promise<{
  key: string; // base58
  expiresAt: number;
}> {
  throw new Error("TODO: implement against Cloak viewing-key API. See /architecture/viewing-keys-compliance");
}
