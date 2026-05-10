/**
 * Ika dWallet SDK wrapper.
 *
 * Install:  pnpm add @ika.xyz/sdk
 * Docs:     https://docs.ika.xyz  ·  https://docs.ika.xyz/docs/sdk
 * Status:   Solana Pre-Alpha live. EdDSA support shipped Dec 2025.
 *
 * What we use:
 *   - createDWallet:    provision MPC keypair (user share + Ika network share)
 *   - signSolanaTx:     2PC-MPC sign for the dWallet's Solana custody
 *   - signCrossChain:   sign EVM/BTC payload for cross-chain treasury (pre-alpha — gate behind feature flag)
 *   - configurePolicy:  Solana program defines what can be signed under what conditions
 *
 * Treasury model: dWallet IS the org's treasury account. KIRAPAY/Dodo pay-ins
 * settle to the dWallet's Solana ATA. Cloak batch disbursement is co-signed
 * by the dWallet. Cross-chain reserves (BTC/ETH) live under the same dWallet
 * with chain-specific signing.
 */

// import * as Ika from "@ika.xyz/sdk"; // populate after `pnpm add @ika.xyz/sdk`

export interface DWalletHandle {
  id: string;
  solanaPubkey: string;
  evmAddress?: string;
  btcAddress?: string;
}

export interface PolicyConfig {
  /** Multi-sig: list of co-signer pubkeys + threshold. */
  cosigners: { pubkey: string; weight: number }[];
  threshold: number;
  /** Spend caps per (token, period). */
  spendCaps?: Array<{ token: string; periodSec: number; maxAmount: bigint }>;
  /** Allowlisted destination programs / addresses (e.g. CLOAK_PROGRAM_ID). */
  allowedDestinations?: string[];
}

export async function createDWallet(_userPubkey: string): Promise<DWalletHandle> {
  // TODO(D2): Replace with @ika.xyz/sdk createDWallet flow.
  // The 2PC-MPC handshake creates a user share locally + network share on Ika.
  throw new Error("TODO: integrate Ika createDWallet");
}

export async function configurePolicy(_dWalletId: string, _policy: PolicyConfig): Promise<void> {
  // TODO(D2): Deploy/init the Solana program that gates dWallet sign requests
  // for this org. Pinocchio / Anchor / Native are all supported.
  throw new Error("TODO: integrate Ika policy program");
}

export async function signSolanaTx(_dWalletId: string, _serializedTx: Uint8Array): Promise<Uint8Array> {
  // TODO(D2): Returns the 2PC-MPC signed tx bytes ready for sendRawTransaction.
  throw new Error("TODO: integrate Ika signSolanaTx");
}

export async function signCrossChain(
  _dWalletId: string,
  _chain: "ethereum" | "bitcoin",
  _payload: Uint8Array,
): Promise<Uint8Array> {
  // Pre-alpha — gate behind feature flag. v1 demo focuses on Solana custody.
  throw new Error("TODO(roadmap): cross-chain signing pending Ika pre-alpha stability");
}
