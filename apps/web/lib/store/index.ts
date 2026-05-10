/**
 * Server-side store, partitioned by org id (= wallet pubkey of org owner).
 * Persisted to disk (JSON) so HMR + restarts don't lose state.
 *
 * Replace with Postgres for production.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const STORE_PATH = process.env.ENVELOPE_STORE_PATH ?? "/tmp/envelope-store.json";

export interface Org {
  /** orgId = the connecting wallet pubkey (base58). */
  ownerPubkey: string;
  name: string;
  createdAt: number;
  /** Treasury Solana pubkey — defaults to owner wallet, settable later when Ika dWallet is provisioned. */
  treasuryPubkey: string;
  /** Once an Ika dWallet is provisioned, its identity. */
  ikaDWalletId?: string;
}

export interface Contractor {
  id: string;
  ownerPubkey: string;
  name: string;
  email: string;
  countryCode: string;
  role: string;
  monthlyUsd: number;
  /** Encrypt ciphertext id of monthly_usd, base58 of the on-chain account pubkey. */
  encryptCiphertextId?: string;
  encryptedAt?: number;
  createdAt: number;
}

export interface Invoice {
  id: string;
  ownerPubkey: string;
  amountUsd: number;
  status: "open" | "settled" | "refunded";
  rail: "kirapay" | "dodo";
  kiraLinkUrl?: string;
  kiraLinkCode?: string;
  dodoCheckoutUrl?: string;
  dodoSessionId?: string;
  settlementTxHash?: string;
  createdAt: number;
}

export interface PayrollRunRecord {
  id: string;
  ownerPubkey: string;
  contractorIds: string[];
  totalUsd: number;
  totalLamports: string;
  totalChunks: number;
  status: "settled" | "failed";
  network: "devnet" | "mainnet-beta";
  cloakLive: boolean;
  /** envelope-policy on-chain approval — set when policy is initialized. */
  policyApproval?: {
    signature: string;
    approvalPubkey: string;
    batchHash: string;
  };
  recipients: Array<{
    contractorId: string;
    name: string;
    monthlyUsd: number;
    lamports: string;
    claimUrl: string;
    chunkIndex: number;
    encryptCiphertextId?: string;
  }>;
  chunks: Array<{ index: number; recipientIds: string[]; signature: string; simulated: boolean }>;
  createdAt: number;
}

interface Persisted {
  orgs: Record<string, Org>;
  contractors: Record<string, Contractor>;
  invoices: Record<string, Invoice>;
  payrollRuns: Record<string, PayrollRunRecord>;
}

interface Store extends Persisted {
  flush(): void;
}

const g = globalThis as unknown as { __envelopeStore?: Store };
if (!g.__envelopeStore) {
  let data: Persisted = { orgs: {}, contractors: {}, invoices: {}, payrollRuns: {} };
  try {
    if (existsSync(STORE_PATH)) {
      data = JSON.parse(readFileSync(STORE_PATH, "utf8")) as Persisted;
    }
  } catch {
    // start fresh on parse errors
  }
  const store: Store = {
    ...data,
    flush() {
      try {
        mkdirSync(dirname(STORE_PATH), { recursive: true });
        writeFileSync(STORE_PATH, JSON.stringify(this, null, 2));
      } catch {
        // ignore
      }
    },
  };
  g.__envelopeStore = store;
}
export const store = g.__envelopeStore;

export function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

// ── Org helpers ──
export function getOrCreateOrg(ownerPubkey: string, name?: string): Org {
  const existing = store.orgs[ownerPubkey];
  if (existing) {
    if (name && name !== existing.name) {
      existing.name = name;
      store.flush();
    }
    return existing;
  }
  const org: Org = {
    ownerPubkey,
    name: name ?? "",
    createdAt: Date.now(),
    treasuryPubkey: ownerPubkey, // default — owner pubkey IS the treasury until Ika dWallet provisioned
  };
  store.orgs[ownerPubkey] = org;
  store.flush();
  return org;
}

export function listContractors(ownerPubkey: string): Contractor[] {
  return Object.values(store.contractors)
    .filter((c) => c.ownerPubkey === ownerPubkey)
    .sort((a, b) => a.createdAt - b.createdAt);
}

export function listInvoices(ownerPubkey: string): Invoice[] {
  return Object.values(store.invoices)
    .filter((i) => i.ownerPubkey === ownerPubkey)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function listPayrollRuns(ownerPubkey: string): PayrollRunRecord[] {
  return Object.values(store.payrollRuns)
    .filter((r) => r.ownerPubkey === ownerPubkey)
    .sort((a, b) => b.createdAt - a.createdAt);
}
