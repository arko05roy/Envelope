/**
 * Payroll orchestration — server-side only.
 *
 * Sequence (per PLAN.md §1 step 6):
 *   1. Load contractor rows + encrypted comp matrix from envelope-policy program (STUB pre-alpha — using plaintext from store).
 *   2. For each contractor, run Encrypt threshold check (STUB pre-alpha — auto-pass for now).
 *   3. Ika dWallet co-signs the disbursement tx (STUB pre-alpha — server keypair signs alone).
 *   4. Build N stealth recipient UTXOs via Cloak `generateUtxoKeypair` + `createUtxo`.
 *   5. Submit Cloak `transact` batch on Solana.
 *   6. Per-recipient claim notes get encoded into one-time URLs.
 *
 * Honest pre-alpha banner: ENCRYPT + IKA stubs are documented in the response
 * payload so the UI surfaces it.
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
import { appendEvent, newId, store, type Contractor } from "@/lib/store";

export interface PayrollDryRun {
  contractorIds: string[];
  rows: Array<{
    id: string;
    name: string;
    monthlyUsd: number;
    lamports: bigint;
    encryptThresholdPasses: boolean;
    encryptStub: true; // honest signal
  }>;
  totalUsd: number;
  totalLamports: bigint;
  ikaCoSignRequired: boolean;
  ikaStub: true;
}

/**
 * Demo rate — NOT real $/SOL. The product semantically owes $X to each
 * contractor, but for hackathon demo we settle a token amount that fits in
 * a devnet treasury (~30 SOL total). Real product:
 *   - settles USDC on Solana (not SOL)
 *   - amounts are dollar-exact
 *   - no conversion needed at this layer
 * Set DEMO_RATE_USD_PER_SOL high so the whole batch costs <0.5 SOL.
 */
// Cloak enforces a 0.01 SOL min per shielded deposit — picking a rate so
// that every 2-output chunk clears the floor with margin.
const DEMO_RATE_USD_PER_SOL = 500_000;

function usdToLamports(usd: number): bigint {
  return BigInt(Math.round((usd / DEMO_RATE_USD_PER_SOL) * LAMPORTS_PER_SOL));
}

export function buildDryRun(contractorIds: string[]): PayrollDryRun {
  const rows = contractorIds
    .map((id) => store.contractors.get(id))
    .filter((c): c is Contractor => c !== undefined)
    .map((c) => ({
      id: c.id,
      name: c.name,
      monthlyUsd: c.monthlyUsd,
      lamports: usdToLamports(c.monthlyUsd),
      // STUB: in the real flow, envelope-policy.approve_payroll_row runs an FHE
      // threshold check. For pre-alpha plaintext, we mirror the eventual
      // semantics: amount must be > 0 and within reasonable bounds.
      encryptThresholdPasses: c.monthlyUsd > 0 && c.monthlyUsd < 50000,
      encryptStub: true as const,
    }));
  const totalUsd = rows.reduce((s, r) => s + r.monthlyUsd, 0);
  const totalLamports = rows.reduce((s, r) => s + r.lamports, 0n);
  return {
    contractorIds,
    rows,
    totalUsd,
    totalLamports,
    ikaCoSignRequired: true,
    ikaStub: true,
  };
}

/**
 * Cloak's `transact` accepts at most 2 output UTXOs per call. To pay N
 * contractors we chunk into ceil(N/2) shielded transactions, fired sequentially.
 * Each chunk is a real on-chain transaction; on Solscan you see them as
 * separate shielded entries with no recipient or amount visible.
 */
const CLOAK_MAX_OUTPUTS_PER_TX = 2;

export interface PayrollExecutionResult {
  runId: string;
  chunks: Array<{
    index: number;
    recipientIds: string[];
    txResult: unknown;
    simulated?: true;
  }>;
  recipients: Array<{
    id: string;
    name: string;
    monthlyUsd: number;
    lamports: string;
    claimUrl: string;
    chunkIndex: number;
  }>;
  totalLamports: string;
  totalChunks: number;
  network: "devnet" | "mainnet-beta";
  cloakLive: boolean;
  notes: {
    encrypt: string;
    ika: string;
    cloak: string;
  };
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function executePayrollBatch(args: {
  contractorIds: string[];
  origin: string;
}): Promise<PayrollExecutionResult> {
  const dry = buildDryRun(args.contractorIds);
  if (dry.rows.length === 0) throw new Error("No contractors selected");
  if (dry.rows.some((r) => !r.encryptThresholdPasses)) {
    throw new Error("Encrypt threshold rejected one or more rows");
  }

  const keypairPath = process.env.SOLANA_KEYPAIR_PATH;
  const rpc = process.env.NEXT_PUBLIC_HELIUS_RPC_URL;
  if (!keypairPath || !rpc) throw new Error("SOLANA_KEYPAIR_PATH or NEXT_PUBLIC_HELIUS_RPC_URL not set");

  const secret = JSON.parse(readFileSync(keypairPath, "utf8")) as number[];
  const signer = Keypair.fromSecretKey(Uint8Array.from(secret));
  const connection = new Connection(rpc, "confirmed");

  // Build all stealth UTXOs up front so we know the chunk count.
  const stealthEntries = await Promise.all(
    dry.rows.map(async (r) => {
      const owner = await generateUtxoKeypair();
      const utxo = await createUtxo(r.lamports, owner, NATIVE_SOL_MINT);
      return { row: r, owner, utxo };
    }),
  );

  const groups = chunk(stealthEntries, CLOAK_MAX_OUTPUTS_PER_TX);
  const runId = newId("run");
  const chunks: PayrollExecutionResult["chunks"] = [];
  const recipients: PayrollExecutionResult["recipients"] = [];

  // Cloak's shielded pool lives on mainnet. On devnet, simulate the batch so
  // the full flow demos cleanly without spending mainnet SOL — we still mint
  // real stealth keypairs, build real UTXOs, and emit deterministic fake
  // signatures so the UI is exercised end-to-end. Switch to live by setting
  // NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta and pointing RPC + keypair to mainnet.
  const network = (process.env.NEXT_PUBLIC_SOLANA_NETWORK ?? "devnet") as
    | "devnet"
    | "mainnet-beta";
  const cloakLive = network === "mainnet-beta";

  for (let i = 0; i < groups.length; i++) {
    const group = groups[i]!;
    const groupTotal = group.reduce((s, e) => s + e.row.lamports, 0n);
    let txResult: unknown;
    let simulated: true | undefined;
    if (cloakLive) {
      txResult = await transact(
        {
          inputUtxos: [await createZeroUtxo(NATIVE_SOL_MINT)],
          outputUtxos: group.map((e) => e.utxo),
          externalAmount: groupTotal,
          depositor: signer.publicKey,
        },
        {
          connection,
          programId: CLOAK_PROGRAM_ID,
          depositorKeypair: signer,
          walletPublicKey: signer.publicKey,
        },
      );
    } else {
      // Simulated tx — same shape as Cloak result so callers don't need to branch.
      const fakeSig = `sim_${runId}_chunk${i}_${Math.random().toString(36).slice(2, 10)}`;
      txResult = {
        signature: fakeSig,
        chunkIndex: i,
        outputs: group.length,
        externalAmount: groupTotal.toString(),
        simulated: true,
      };
      simulated = true;
    }
    chunks.push({ index: i, recipientIds: group.map((e) => e.row.id), txResult, simulated });
    for (const e of group) {
      recipients.push({
        id: e.row.id,
        name: e.row.name,
        monthlyUsd: e.row.monthlyUsd,
        lamports: e.row.lamports.toString(),
        claimUrl: `${args.origin}/claim/${runId}_${e.row.id}`,
        chunkIndex: i,
      });
    }
  }

  store.payrollRuns.set(runId, {
    id: runId,
    contractorIds: args.contractorIds,
    totalUsd: dry.totalUsd,
    status: "settled",
    createdAt: Date.now(),
  });
  appendEvent("payroll.executed", {
    runId,
    count: recipients.length,
    chunks: chunks.length,
    totalUsd: dry.totalUsd,
  });

  return {
    runId,
    chunks,
    recipients,
    totalLamports: dry.totalLamports.toString(),
    totalChunks: chunks.length,
    network,
    cloakLive,
    notes: {
      encrypt: "PRE_ALPHA_STUB — REFHE threshold computed plaintext",
      ika: "PRE_ALPHA_STUB — server keypair signed alone (real flow co-signs via 2PC-MPC)",
      cloak: cloakLive
        ? "LIVE — shielded batch on Solana mainnet (chunked at 2 outputs per tx, SDK limit)"
        : "SIMULATED — Cloak's shielded pool is mainnet-only; devnet flow is fully exercised but not on-chain",
    },
  };
}
