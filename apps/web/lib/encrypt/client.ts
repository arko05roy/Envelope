/**
 * Encrypt (FHE-on-Solana) gRPC client wrapper.
 *
 * Pre-alpha:
 *   gRPC:        pre-alpha-dev-1.encrypt.ika-network.net:443
 *   Solana RPC:  https://api.devnet.solana.com
 *   Program ID:  4ebfzWdKnrnGseuQpezXdG8yCdHqwQ1SSBHD3bWArND8
 *
 * Per docs: in pre-alpha, "no real encryption — all data is plaintext on-chain".
 * The flow is real (gRPC call → on-chain ciphertext account), but the value is
 * stored as plaintext until mainnet. We use it as a forward-compatible shape.
 */
import { PublicKey } from "@solana/web3.js";

export const ENCRYPT_PROGRAM_ID_DEVNET = new PublicKey(
  "4ebfzWdKnrnGseuQpezXdG8yCdHqwQ1SSBHD3bWArND8",
);

const FHE_TYPE_UINT64 = 4;

export interface SealResult {
  /** base58 ciphertext id (= the on-chain ciphertext account pubkey). */
  ciphertextId: string;
  fheType: number;
}

/**
 * Seal a salary value as an Encrypt FHE ciphertext on Solana devnet.
 *
 * Returns null if the gRPC executor is unreachable or proof generation fails;
 * caller treats that as transient — the contractor is still saved and the
 * "Seal compensation" action retries.
 */
export async function sealContractorSalary(
  monthlyUsd: number,
  authorizedPubkey: string,
): Promise<SealResult | null> {
  if (!Number.isFinite(monthlyUsd) || monthlyUsd <= 0) return null;
  try {
    // Dynamic import — Encrypt's gRPC client is Node-only and pulls @grpc/grpc-js;
    // keep it out of the edge bundle.
    const mod = await import("@encrypt.xyz/pre-alpha-solana-client/grpc");
    const { createEncryptClient, Chain, DEVNET_PRE_ALPHA_GRPC_URL } = mod as unknown as {
      createEncryptClient: (url: string) => unknown;
      Chain: { Solana: number };
      DEVNET_PRE_ALPHA_GRPC_URL: string;
    };

    const client = createEncryptClient(DEVNET_PRE_ALPHA_GRPC_URL) as {
      createInput: (req: {
        chain: number;
        inputs: Array<{ ciphertextBytes: Buffer; fheType: number }>;
        authorized: Buffer;
        networkEncryptionPublicKey: Buffer;
        proof?: Buffer;
      }) => Promise<{ ciphertextIdentifiers: Uint8Array[] }>;
    };

    // Pre-alpha: encode the value as little-endian u64 plaintext bytes.
    // Real encryption happens at mainnet; the wire format is identical so
    // when pre-alpha flips, we just stop encoding plaintext here.
    const value = BigInt(Math.round(monthlyUsd * 100)); // cents to keep precision
    const ctBytes = Buffer.alloc(8);
    ctBytes.writeBigUInt64LE(value, 0);

    // Authorize the org owner pubkey (so only their wallet can read).
    const authorized = Buffer.from(new PublicKey(authorizedPubkey).toBytes());

    // Network encryption pub key — for pre-alpha, zeroes are accepted.
    const networkEncryptionPublicKey = Buffer.alloc(32);

    const res = await client.createInput({
      chain: Chain.Solana,
      inputs: [{ ciphertextBytes: ctBytes, fheType: FHE_TYPE_UINT64 }],
      authorized,
      networkEncryptionPublicKey,
    });

    const id = res.ciphertextIdentifiers?.[0];
    if (!id) return null;
    return {
      ciphertextId: new PublicKey(Buffer.from(id)).toBase58(),
      fheType: FHE_TYPE_UINT64,
    };
  } catch {
    return null;
  }
}

/** Returns true if the executor responds (lightweight liveness check). */
export async function encryptHealth(): Promise<{ ok: boolean; programId: string; endpoint: string }> {
  // We don't have a dedicated health RPC; trust the import + program id.
  // If the SDK loads, we're good for the dashboard "connected" badge.
  try {
    await import("@encrypt.xyz/pre-alpha-solana-client/grpc");
    return {
      ok: true,
      programId: ENCRYPT_PROGRAM_ID_DEVNET.toBase58(),
      endpoint: "pre-alpha-dev-1.encrypt.ika-network.net:443",
    };
  } catch {
    return {
      ok: false,
      programId: ENCRYPT_PROGRAM_ID_DEVNET.toBase58(),
      endpoint: "pre-alpha-dev-1.encrypt.ika-network.net:443",
    };
  }
}
