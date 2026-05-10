export type Address = string; // base58 Solana pubkey

export type Role = "engineer" | "designer" | "ops" | "founder";

export interface Contractor {
  id: string;
  name: string;
  email: string;
  countryCode: string;
  role: Role;
  salaryLamports: bigint;
}

export interface Org {
  id: string;
  name: string;
  treasuryDWalletId: string;
  treasurySolanaPubkey: Address;
}

export interface PayrollRun {
  id: string;
  orgId: string;
  contractorIds: string[];
  totalAmountLamports: bigint;
  status: "draft" | "approved" | "executing" | "settled" | "failed";
  cloakBatchTxSignature?: string;
  ikaCoSignTxSignature?: string;
  createdAt: number;
}

export interface ViewingKeyGrant {
  id: string;
  granteeEmail: string;
  scope: {
    showAmounts: boolean;
    countryCodeFilter?: string[];
    contractorIdFilter?: string[];
    expiresAt: number;
  };
  cloakViewingKey: string; // base58
}
