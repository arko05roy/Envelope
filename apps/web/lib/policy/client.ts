/**
 * envelope-policy program — TypeScript client.
 *
 * Program ID:   7xVNMJycAC5sQo1MaJTn8gHrbHBtkmuTbpBjrkC1Jo1H (devnet)
 * Source:       programs/envelope-policy/src/lib.rs
 *
 * Server-paid model: server keypair (`payer`) covers rent and signs every tx.
 * The user's wallet pubkey is the `owner` (PDA seed only — not asked to sign).
 * API auth gate validates the caller before invoking these methods.
 */
import * as anchor from "@coral-xyz/anchor";
import { AnchorProvider, BN, Program } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import idl from "./idl.json";

export const POLICY_PROGRAM_ID = new PublicKey("7xVNMJycAC5sQo1MaJTn8gHrbHBtkmuTbpBjrkC1Jo1H");
export const IKA_PROGRAM_ID = new PublicKey("87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY");
export const POLICY_SEED = Buffer.from("policy");
export const APPROVAL_SEED = Buffer.from("approval");
export const IKA_CPI_AUTHORITY_SEED = Buffer.from("__ika_cpi_authority");

/** PDA that controls a bound dWallet — Ika's transfer_dwallet target. */
export const [IKA_CPI_AUTHORITY] = PublicKey.findProgramAddressSync(
  [IKA_CPI_AUTHORITY_SEED],
  POLICY_PROGRAM_ID,
);

export function policyPda(owner: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([POLICY_SEED, owner.toBuffer()], POLICY_PROGRAM_ID);
}

export function approvalPda(policy: PublicKey, batchHash: Uint8Array): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [APPROVAL_SEED, policy.toBuffer(), Buffer.from(batchHash)],
    POLICY_PROGRAM_ID,
  );
}

function loadServerKeypair(): Keypair {
  const path = process.env.SOLANA_KEYPAIR_PATH;
  if (!path) throw new Error("SOLANA_KEYPAIR_PATH not set");
  const secret = JSON.parse(readFileSync(path, "utf8")) as number[];
  return Keypair.fromSecretKey(Uint8Array.from(secret));
}

/** Minimal Wallet adapter for AnchorProvider — Anchor v0.32 ESM exports
 *  don't reliably re-export NodeWallet, so we inline the trivial impl. */
class ServerWallet implements anchor.Wallet {
  constructor(public payer: Keypair) {}
  get publicKey() { return this.payer.publicKey; }
  async signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T> {
    if ("partialSign" in tx) (tx as Transaction).partialSign(this.payer);
    else (tx as VersionedTransaction).sign([this.payer]);
    return tx;
  }
  async signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> {
    return Promise.all(txs.map((t) => this.signTransaction(t)));
  }
}

let _program: Program | null = null;
function program(connection: Connection): Program {
  if (_program) return _program;
  const payer = loadServerKeypair();
  const provider = new AnchorProvider(connection, new ServerWallet(payer), { commitment: "confirmed" });
  anchor.setProvider(provider);
  _program = new Program(idl as anchor.Idl, provider);
  return _program;
}

export interface PolicyAccount {
  owner: PublicKey;
  dwallet: PublicKey;
  monthlyCapLamports: BN;
  cosignersRequired: number;
  bump: number;
  batchesApproved: BN;
  lamportsApprovedThisPeriod: BN;
  periodStartUnix: BN;
}

export async function fetchPolicy(connection: Connection, owner: PublicKey): Promise<PolicyAccount | null> {
  const [pda] = policyPda(owner);
  try {
    const prog = program(connection);
    // anchor's snake→camel conversion: account name `Policy` → `policy`
    const acc = (prog.account as unknown as Record<string, { fetchNullable: (k: PublicKey) => Promise<PolicyAccount | null> }>).policy;
    return await acc.fetchNullable(pda);
  } catch {
    return null;
  }
}

const RPC_METHODS = (cn: Connection) =>
  (program(cn).methods as unknown as Record<string, (...a: unknown[]) => {
    accounts: (a: Record<string, PublicKey>) => { rpc: () => Promise<string> };
  }>);

export async function initPolicy(args: {
  connection: Connection;
  owner: PublicKey;
  monthlyCapLamports: bigint;
  cosigners: number;
}): Promise<{ signature: string; policyPubkey: PublicKey }> {
  const [pda] = policyPda(args.owner);
  const payer = loadServerKeypair();
  const sig = await RPC_METHODS(args.connection)
    .initPolicy(new BN(args.monthlyCapLamports.toString()), args.cosigners)
    .accounts({
      policy: pda,
      owner: args.owner,
      payer: payer.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();
  return { signature: sig, policyPubkey: pda };
}

export async function bindDWallet(args: {
  connection: Connection;
  owner: PublicKey;
  dwallet: PublicKey;
}): Promise<{ signature: string }> {
  const [pda] = policyPda(args.owner);
  const payer = loadServerKeypair();
  const sig = await RPC_METHODS(args.connection)
    .bindDwallet(args.dwallet)
    .accounts({ policy: pda, owner: args.owner, payer: payer.publicKey })
    .rpc();
  return { signature: sig };
}

export async function updateCap(args: {
  connection: Connection;
  owner: PublicKey;
  monthlyCapLamports: bigint;
}): Promise<{ signature: string }> {
  const [pda] = policyPda(args.owner);
  const payer = loadServerKeypair();
  const sig = await RPC_METHODS(args.connection)
    .updateCap(new BN(args.monthlyCapLamports.toString()))
    .accounts({ policy: pda, owner: args.owner, payer: payer.publicKey })
    .rpc();
  return { signature: sig };
}

export async function approvePayrollBatch(args: {
  connection: Connection;
  owner: PublicKey;
  batchHash: Uint8Array;
  totalLamports: bigint;
  recipientCount: number;
}): Promise<{ signature: string; approvalPubkey: PublicKey }> {
  const [pda] = policyPda(args.owner);
  const [approval] = approvalPda(pda, args.batchHash);
  const payer = loadServerKeypair();
  const sig = await RPC_METHODS(args.connection)
    .approvePayrollBatch(
      Array.from(args.batchHash),
      new BN(args.totalLamports.toString()),
      args.recipientCount,
    )
    .accounts({
      policy: pda,
      approval,
      owner: args.owner,
      payer: payer.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();
  return { signature: sig, approvalPubkey: approval };
}

export function hashBatch(input: {
  ownerPubkey: string;
  contractorIds: string[];
  totalLamports: bigint;
  createdAt: number;
}): Uint8Array {
  const payload = JSON.stringify({
    o: input.ownerPubkey,
    c: [...input.contractorIds].sort(),
    t: input.totalLamports.toString(),
    n: input.createdAt,
  });
  return new Uint8Array(createHash("sha256").update(payload).digest());
}
