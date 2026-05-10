/**
 * Payroll orchestration — server-side.
 *
 * Real flow:
 *   1. Load contractors for owner pubkey
 *   2. Encrypt-seal each comp value (idempotent: skip rows already sealed)
 *   3. (TODO when Ika program ships) co-sign disbursement via dWallet
 *   4. Cloak shielded batch: chunk to 2 outputs/tx, fire transact() per chunk
 *   5. Emit per-recipient claim URLs
 */
import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  CLOAK_PROGRAM_ID,
  NATIVE_SOL_MINT,
  createUtxo,
  createZeroUtxo,
  generateUtxoKeypair,
  transact,
} from "@cloak.dev/sdk";
import { readFileSync } from "node:fs";
import { listContractors, newId, store, type Contractor, type PayrollRunRecord } from "@/lib/store";
import { sealContractorSalary } from "@/lib/encrypt/client";

// Demo rate so a 30-recipient batch fits under 1 SOL on devnet.
// Real deployment settles USDC, not SOL — this conversion goes away.
const DEMO_RATE_USD_PER_SOL = 500_000;
const CLOAK_MAX_OUTPUTS_PER_TX = 2;

function usdToLamports(usd: number): bigint {
  return BigInt(Math.round((usd / DEMO_RATE_USD_PER_SOL) * LAMPORTS_PER_SOL));
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export interface DryRunRow {
  id: string;
  name: string;
  monthlyUsd: number;
  lamports: string;
  encryptCiphertextId?: string;
}

export function buildDryRun(ownerPubkey: string, contractorIds: string[]) {
  const wanted = new Set(contractorIds);
  const rows = listContractors(ownerPubkey)
    .filter((c) => wanted.has(c.id))
    .map((c) => ({
      id: c.id,
      name: c.name,
      monthlyUsd: c.monthlyUsd,
      lamports: usdToLamports(c.monthlyUsd).toString(),
      encryptCiphertextId: c.encryptCiphertextId,
    }));
  const totalUsd = rows.reduce((s, r) => s + r.monthlyUsd, 0);
  const totalLamports = rows.reduce((s, r) => s + BigInt(r.lamports), 0n);
  return {
    rows,
    totalUsd,
    totalLamports: totalLamports.toString(),
    chunks: Math.ceil(rows.length / CLOAK_MAX_OUTPUTS_PER_TX),
  };
}

export async function executePayrollBatch(args: {
  ownerPubkey: string;
  contractorIds: string[];
  origin: string;
}): Promise<PayrollRunRecord> {
  const wanted = new Set(args.contractorIds);
  const contractors = listContractors(args.ownerPubkey).filter((c) => wanted.has(c.id));
  if (contractors.length === 0) throw new Error("no contractors selected");

  // Seal any rows that aren't yet sealed (best-effort, doesn't block payroll).
  await Promise.all(
    contractors
      .filter((c) => !c.encryptCiphertextId)
      .map(async (c) => {
        const sealed = await sealContractorSalary(c.monthlyUsd, args.ownerPubkey);
        if (sealed) {
          c.encryptCiphertextId = sealed.ciphertextId;
          c.encryptedAt = Date.now();
        }
      }),
  );
  store.flush();

  const keypairPath = process.env.SOLANA_KEYPAIR_PATH;
  const rpc = process.env.NEXT_PUBLIC_HELIUS_RPC_URL;
  if (!keypairPath || !rpc) {
    throw new Error("server keypair or rpc not configured");
  }

  const secret = JSON.parse(readFileSync(keypairPath, "utf8")) as number[];
  const signer = Keypair.fromSecretKey(Uint8Array.from(secret));
  const connection = new Connection(rpc, "confirmed");

  const stealthEntries: Array<{ row: Contractor; lamports: bigint; utxo: unknown }> = [];
  for (const c of contractors) {
    const lamports = usdToLamports(c.monthlyUsd);
    const owner = await generateUtxoKeypair();
    const utxo = await createUtxo(lamports, owner, NATIVE_SOL_MINT);
    stealthEntries.push({ row: c, lamports, utxo });
  }

  const groups = chunk(stealthEntries, CLOAK_MAX_OUTPUTS_PER_TX);
  const network = (process.env.NEXT_PUBLIC_SOLANA_NETWORK ?? "devnet") as
    | "devnet"
    | "mainnet-beta";
  const cloakLive = network === "mainnet-beta";

  const runId = newId("run");
  const chunks: PayrollRunRecord["chunks"] = [];
  const recipients: PayrollRunRecord["recipients"] = [];

  for (let i = 0; i < groups.length; i++) {
    const group = groups[i]!;
    let signature: string;
    let simulated = false;
    if (cloakLive) {
      const groupTotal = group.reduce((s, e) => s + e.lamports, 0n);
      const txResult = (await transact(
        {
          inputUtxos: [await createZeroUtxo(NATIVE_SOL_MINT)],
          outputUtxos: group.map((e) => e.utxo as never),
          externalAmount: groupTotal,
          depositor: signer.publicKey,
        },
        {
          connection,
          programId: CLOAK_PROGRAM_ID,
          depositorKeypair: signer,
          walletPublicKey: signer.publicKey,
        },
      )) as { signature?: string };
      signature = txResult.signature ?? "?";
    } else {
      // Cloak's shielded pool is mainnet-only; on devnet we still mint stealth
      // keys & build the UTXOs (real cryptographic objects) but skip submission.
      signature = `sim_${runId}_${i}`;
      simulated = true;
    }
    chunks.push({
      index: i,
      recipientIds: group.map((e) => e.row.id),
      signature,
      simulated,
    });
    for (const e of group) {
      recipients.push({
        contractorId: e.row.id,
        name: e.row.name,
        monthlyUsd: e.row.monthlyUsd,
        lamports: e.lamports.toString(),
        claimUrl: `${args.origin}/claim/${runId}_${e.row.id}`,
        chunkIndex: i,
        encryptCiphertextId: e.row.encryptCiphertextId,
      });
    }
  }

  const record: PayrollRunRecord = {
    id: runId,
    ownerPubkey: args.ownerPubkey,
    contractorIds: args.contractorIds,
    totalUsd: contractors.reduce((s, c) => s + c.monthlyUsd, 0),
    totalLamports: stealthEntries.reduce((s, e) => s + e.lamports, 0n).toString(),
    totalChunks: chunks.length,
    status: "settled",
    network,
    cloakLive,
    recipients,
    chunks,
    createdAt: Date.now(),
  };
  store.payrollRuns[runId] = record;
  store.flush();
  return record;
}
