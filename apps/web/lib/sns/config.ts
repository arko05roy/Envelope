/**
 * Single source of truth for every SNS-related literal in the product.
 * If it has product meaning, it goes here — read from env, never inlined.
 */
export const snsConfig = {
  /** SNS parent domain owned by the org. e.g. "envelope" → envelope.sol */
  parentDomain: process.env.NEXT_PUBLIC_SNS_PARENT_DOMAIN ?? "",
  /** Subdomain of the parent that signs payroll. e.g. "payroll-agent" → payroll-agent.envelope.sol */
  agentSubdomain: process.env.NEXT_PUBLIC_SNS_AGENT_SUBDOMAIN ?? "payroll-agent",
  /** Cluster the parent domain is registered on. */
  parentCluster:
    (process.env.NEXT_PUBLIC_SNS_PARENT_CLUSTER as "mainnet" | "devnet") ??
    "devnet",

  /** Mainnet RPC for resolving public `.sol` handles. Falls back to public. */
  mainnetRpc:
    process.env.HELIUS_MAINNET_RPC_URL ?? "https://api.mainnet-beta.solana.com",
  /** Devnet RPC for resolving demo handles under the parent domain. */
  devnetRpc:
    process.env.HELIUS_DEVNET_RPC_URL ??
    process.env.NEXT_PUBLIC_HELIUS_RPC_URL ??
    "https://api.devnet.solana.com",
} as const;

export const agentHandle = (): string | null => {
  if (!snsConfig.parentDomain) return null;
  return `${snsConfig.agentSubdomain}.${snsConfig.parentDomain}.sol`;
};

export const parentSuffix = (): string | null => {
  if (!snsConfig.parentDomain) return null;
  return `.${snsConfig.parentDomain}.sol`;
};
