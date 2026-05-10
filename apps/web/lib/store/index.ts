/**
 * In-memory store for the demo. Persists for the lifetime of the dev server.
 * Replace with Postgres/SQLite once the demo lives.
 *
 * Singleton hack: stash on `globalThis` so HMR doesn't wipe it.
 */
export interface PayrollRun {
  id: string;
  contractorIds: string[];
  totalUsd: number;
  status: "draft" | "approved" | "executing" | "settled" | "failed";
  cloakBatchTxSignature?: string;
  createdAt: number;
}

export interface Invoice {
  id: string;
  merchant: string;
  amountUsd: number;
  status: "open" | "settled" | "refunded";
  rail: "kirapay" | "dodo";
  // KIRAPAY
  kiraLinkUrl?: string;
  kiraLinkCode?: string;
  // Dodo
  dodoCheckoutUrl?: string;
  dodoSessionId?: string;
  // tx hash once settled
  settlementTxHash?: string;
  createdAt: number;
}

export interface Contractor {
  id: string;
  name: string;
  email: string;
  countryCode: string;
  role: "engineer" | "designer" | "ops" | "founder";
  monthlyUsd: number;
  stealthClaimUrl?: string;
}

interface Store {
  invoices: Map<string, Invoice>;
  contractors: Map<string, Contractor>;
  payrollRuns: Map<string, PayrollRun>;
  events: Array<{ id: string; ts: number; kind: string; data: unknown }>;
}

const g = globalThis as unknown as { __envelopeStore?: Store };
if (!g.__envelopeStore) {
  g.__envelopeStore = {
    invoices: new Map(),
    contractors: new Map(),
    payrollRuns: new Map(),
    events: [],
  };
}
export const store = g.__envelopeStore;

export function appendEvent(kind: string, data: unknown) {
  store.events.unshift({ id: crypto.randomUUID(), ts: Date.now(), kind, data });
  if (store.events.length > 200) store.events.length = 200;
}

export function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
