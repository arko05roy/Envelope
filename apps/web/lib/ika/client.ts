/**
 * Ika dWallet — pre-alpha integration.
 *
 *   gRPC:        pre-alpha-dev-1.ika.ika-network.net:443
 *   Solana RPC:  https://api.devnet.solana.com
 *   Program ID:  87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY
 *
 * Full flow (per docs.solana-pre-alpha.ika.xyz) requires:
 *   1. A custom Solana program with the `__ika_cpi_authority` PDA
 *   2. CPI calls to `approve_message` from your program
 *   3. The Ika network detects MessageApproval accounts and signs (mock signer in pre-alpha)
 *
 * Until we ship the policy program, this client checks devnet liveness of the
 * Ika program and returns its on-chain account state. That's enough for the UI
 * to show real connection status, not a stub.
 */
import { Connection, PublicKey } from "@solana/web3.js";

export const IKA_PROGRAM_ID_DEVNET = new PublicKey(
  "87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY",
);

export const IKA_DEVNET_RPC = "https://api.devnet.solana.com";

export interface IkaStatus {
  ok: boolean;
  programId: string;
  rpc: string;
  programOwner?: string;
  programDataLen?: number;
}

let cached: { ts: number; status: IkaStatus } | null = null;
const CACHE_MS = 60_000;

export async function getIkaStatus(): Promise<IkaStatus> {
  if (cached && Date.now() - cached.ts < CACHE_MS) return cached.status;
  const conn = new Connection(IKA_DEVNET_RPC, "confirmed");
  try {
    const info = await conn.getAccountInfo(IKA_PROGRAM_ID_DEVNET, "confirmed");
    const status: IkaStatus = {
      ok: !!info,
      programId: IKA_PROGRAM_ID_DEVNET.toBase58(),
      rpc: IKA_DEVNET_RPC,
      programOwner: info?.owner.toBase58(),
      programDataLen: info?.data.length,
    };
    cached = { ts: Date.now(), status };
    return status;
  } catch {
    return { ok: false, programId: IKA_PROGRAM_ID_DEVNET.toBase58(), rpc: IKA_DEVNET_RPC };
  }
}
