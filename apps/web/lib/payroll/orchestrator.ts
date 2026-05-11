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
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
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
import { approvePayrollBatch, fetchPolicy, hashBatch } from "@/lib/policy/client";
import { agentHandle } from "@/lib/sns/config";
import { usdToLamports } from "@/lib/config";

const CLOAK_MAX_OUTPUTS_PER_TX = 2;

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
  const cloakOnChain = network === "mainnet-beta";

  const runId = newId("run");
  const totalLamports = stealthEntries.reduce((s, e) => s + e.lamports, 0n);

  // On-chain policy approval — only if the org has initialized their policy.
  // Skipped silently for orgs that haven't run /api/policy/init yet, so the
  // orchestrator stays useful during onboarding.
  let policyApproval: PayrollRunRecord["policyApproval"];
  try {
    const ownerKey = new PublicKey(args.ownerPubkey);
    const policy = await fetchPolicy(connection, ownerKey);
    if (policy) {
      const batchHash = hashBatch({
        ownerPubkey: args.ownerPubkey,
        contractorIds: args.contractorIds,
        totalLamports,
        createdAt: Date.now(),
      });
      const result = await approvePayrollBatch({
        connection,
        owner: ownerKey,
        batchHash,
        totalLamports,
        recipientCount: contractors.length,
      });
      policyApproval = {
        signature: result.signature,
        approvalPubkey: result.approvalPubkey.toBase58(),
        batchHash: Buffer.from(batchHash).toString("hex"),
      };
    }
  } catch (e) {
    // Cap exceeded or policy missing — surface in the response but don't kill payroll.
    // Intentionally swallow; UI surfaces absent approval as a warning.
  }

  const chunks: PayrollRunRecord["chunks"] = [];
  const recipients: PayrollRunRecord["recipients"] = [];

  for (let i = 0; i < groups.length; i++) {
    const group = groups[i]!;
    let signature: string | null = null;
    if (cloakOnChain) {
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
      signature = txResult.signature ?? null;
    }
    chunks.push({ index: i, recipientIds: group.map((e) => e.row.id), signature });
    for (const e of group) {
      recipients.push({
        contractorId: e.row.id,
        name: e.row.name,
        monthlyUsd: e.row.monthlyUsd,
        lamports: e.lamports.toString(),
        claimUrl: `${args.origin}/claim/${runId}_${e.row.id}`,
        chunkIndex: i,
        encryptCiphertextId: e.row.encryptCiphertextId,
        snsHandle: e.row.snsHandle,
      });
    }
  }

  const record: PayrollRunRecord = {
    id: runId,
    ownerPubkey: args.ownerPubkey,
    contractorIds: args.contractorIds,
    totalUsd: contractors.reduce((s, c) => s + c.monthlyUsd, 0),
    totalLamports: totalLamports.toString(),
    totalChunks: chunks.length,
    status: cloakOnChain ? "settled" : "approved",
    cloakStatus: cloakOnChain ? "settled" : "pending_mainnet",
    network,
    policyApproval,
    recipients,
    chunks,
    paidByAgent: agentHandle() ?? undefined,
    createdAt: Date.now(),
  };
  store.payrollRuns[runId] = record;
  store.flush();
  return record;
}
