/**
 * Encrypt FHE client-side wrapper.
 *
 * On-chain:  programs/envelope-policy uses `encrypt-anchor` (Rust).
 * Client:    encode comp matrix → ciphertexts → write to ciphertext accounts;
 *            request decryption from decryptor service when authorized.
 *
 * Docs:  https://docs.encrypt.xyz
 * Status: pre-alpha. "All data is completely public and stored as plaintext on-chain"
 *         currently. We shape the program for FHE; README is transparent about pre-alpha.
 *
 * What we encode:
 *   - comp matrix: contractor_id → encrypted(salary_lamports, role_band)
 *   - approval rule: encrypted(amount) <= encrypted(band_ceiling[role])
 *
 * The Solana program holds ciphertext accounts. `execute_graph` runs the
 * threshold check on-chain; off-chain executor evaluates with real FHE in
 * mainnet. For demo we deploy ONE `#[encrypt_fn]` (threshold compare).
 */

export type Ciphertext = string; // base58 of the FHE ciphertext bytes

export interface CompRow {
  contractorId: string;
  role: "engineer" | "designer" | "ops" | "founder";
  countryCode: string;
  salaryLamports: bigint;
}

export interface EncryptedCompRow {
  contractorId: string;
  encryptedSalary: Ciphertext;
  encryptedRoleBand: Ciphertext;
  countryCode: string; // intentionally not encrypted — needed for tax reporting fallback
}

/** Encrypt a single u64 lamport amount client-side. */
export async function encryptU64(_value: bigint): Promise<Ciphertext> {
  // TODO(D5): wire client-side encryption against Encrypt's pre-alpha SDK.
  throw new Error("TODO: integrate Encrypt FHE encryption");
}

export async function encryptCompMatrix(rows: CompRow[]): Promise<EncryptedCompRow[]> {
  return Promise.all(
    rows.map(async (r) => ({
      contractorId: r.contractorId,
      encryptedSalary: await encryptU64(r.salaryLamports),
      encryptedRoleBand: await encryptU64(BigInt(roleBand(r.role))),
      countryCode: r.countryCode,
    })),
  );
}

export async function requestDecryption(
  _ciphertext: Ciphertext,
  _viewingKey: string,
): Promise<bigint> {
  // TODO(D5): call Encrypt decryptor service with viewing-key auth.
  throw new Error("TODO: integrate Encrypt decryptor");
}

function roleBand(r: CompRow["role"]): number {
  // Plaintext bands at the type level — actual ceiling values live encrypted on-chain.
  return { engineer: 1, designer: 2, ops: 3, founder: 4 }[r];
}
