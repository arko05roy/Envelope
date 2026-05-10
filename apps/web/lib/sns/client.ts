/**
 * SNS (Solana Name Service) wrapper.
 *
 * Docs: https://docs.sns.id/dev
 * Program ID (mainnet + devnet): namesLPneVptA9Z5rqUDD9tMTWEJwofgaYwp8cawRkX
 *
 * Real `.sol` registries live on mainnet. The same program is also deployed on
 * devnet but with mostly empty registries, so the demo path uses our pre-
 * registered `envelope.sol` tree (see `scripts/sns-bootstrap.ts`).
 */
import { Connection, PublicKey } from "@solana/web3.js";
import {
  Record as SnsRecordEnum,
  devnet as snsDevnet,
  getDomainKeySync as getDomainKeySyncMainnet,
  getRecordV2,
  resolve,
  reverseLookup as reverseLookupMainnet,
  getAllDomains as getAllDomainsMainnet,
  getPrimaryDomain as getPrimaryDomainMainnet,
} from "@bonfida/spl-name-service";

// Devnet has its own ROOT_DOMAIN_ACCOUNT, so domain key derivation differs
// between clusters even though the program ID is identical. Pick the right
// helper for the cluster you're querying.
const getDomainKeyFor = (cluster: SnsCluster) =>
  cluster === "devnet" ? snsDevnet.utils.getDomainKeySync : getDomainKeySyncMainnet;
const reverseLookupFor = (cluster: SnsCluster) =>
  cluster === "devnet" ? snsDevnet.utils.reverseLookup : reverseLookupMainnet;
const getPrimaryDomainFor = (cluster: SnsCluster) =>
  cluster === "devnet" ? snsDevnet.utils.getPrimaryDomain : getPrimaryDomainMainnet;

// NEXT_PUBLIC_HELIUS_RPC_URL is the app's primary cluster (devnet in this
// project), so don't reuse it as the mainnet fallback — it would silently
// route mainnet `.sol` resolution to a devnet RPC and return null.
const MAINNET_RPC =
  process.env.HELIUS_MAINNET_RPC_URL ?? "https://api.mainnet-beta.solana.com";
const DEVNET_RPC =
  process.env.HELIUS_DEVNET_RPC_URL ??
  process.env.NEXT_PUBLIC_HELIUS_RPC_URL ??
  "https://api.devnet.solana.com";

export type SnsCluster = "mainnet" | "devnet";

const connCache = new Map<SnsCluster, Connection>();
function conn(cluster: SnsCluster): Connection {
  let c = connCache.get(cluster);
  if (!c) {
    c = new Connection(cluster === "devnet" ? DEVNET_RPC : MAINNET_RPC, "confirmed");
    connCache.set(cluster, c);
  }
  return c;
}

const HANDLE_RE = /^[a-z0-9-]+(\.[a-z0-9-]+)*\.sol$/i;

export function isValidSnsHandle(s: string): boolean {
  if (typeof s !== "string") return false;
  if (s.length < 5 || s.length > 96) return false;
  return HANDLE_RE.test(s);
}

// Handles ending in `.envelope.sol` are bootstrapped on devnet for the demo;
// everything else lives on mainnet.
export function clusterFor(handle: string): SnsCluster {
  return handle.toLowerCase().endsWith(".envelope.sol") ? "devnet" : "mainnet";
}

export interface ResolvedSns {
  pubkey: string;
  cluster: SnsCluster;
}

export async function resolveSnsHandle(
  handle: string,
  opts?: { cluster?: SnsCluster },
): Promise<ResolvedSns | null> {
  if (!isValidSnsHandle(handle)) return null;
  const cluster = opts?.cluster ?? clusterFor(handle);
  // SNS-IP-5 `resolve` lives in the mainnet module; on devnet we rely on the
  // raw NameRegistry owner field instead, which is what fresh bootstrap
  // domains have anyway (no SOL Record / RoA yet).
  if (cluster === "mainnet") {
    try {
      const owner = await resolve(conn(cluster), handle);
      return { pubkey: owner.toBase58(), cluster };
    } catch {
      // fall through to raw lookup
    }
  }
  try {
    const { pubkey } = getDomainKeyFor(cluster)(handle);
    const info = await conn(cluster).getAccountInfo(pubkey);
    if (!info || info.data.length < 96) return null;
    const owner = new PublicKey(info.data.slice(32, 64));
    return { pubkey: owner.toBase58(), cluster };
  } catch {
    return null;
  }
}

export async function reverseLookupPubkey(
  pubkey: string,
  opts?: { cluster?: SnsCluster },
): Promise<string | null> {
  const cluster = opts?.cluster ?? "mainnet";
  try {
    const owner = new PublicKey(pubkey);
    const primary = await getPrimaryDomainFor(cluster)(conn(cluster), owner);
    if (primary?.reverse) return `${primary.reverse}.sol`;
  } catch {}
  return null;
}

export async function getAllDomainsForOwner(
  pubkey: string,
  opts?: { cluster?: SnsCluster },
): Promise<string[]> {
  const cluster = opts?.cluster ?? "mainnet";
  try {
    const owner = new PublicKey(pubkey);
    // getAllDomains is mainnet-only in the SDK; on devnet we'd need a custom
    // getProgramAccounts call. Skip for now — not on the demo critical path.
    if (cluster === "devnet") return [];
    const keys = await getAllDomainsMainnet(conn(cluster), owner);
    const names = await Promise.all(
      keys.map((k) => reverseLookupFor(cluster)(conn(cluster), k).catch(() => null)),
    );
    return names.filter((n): n is string => Boolean(n)).map((n) => `${n}.sol`);
  } catch {
    return [];
  }
}

export type SnsRecordKey = "Email" | "Twitter" | "Github" | "Discord" | "Telegram" | "Url";

export interface SnsRecordValue {
  value: string;
  staleness: boolean;
  roa: boolean;
}

export async function getRecord(
  handle: string,
  type: SnsRecordKey,
  opts?: { cluster?: SnsCluster },
): Promise<SnsRecordValue | null> {
  if (!isValidSnsHandle(handle)) return null;
  const cluster = opts?.cluster ?? clusterFor(handle);
  const recordEnum = SnsRecordEnum[type];
  if (!recordEnum) return null;
  try {
    const result = await getRecordV2(conn(cluster), handle, recordEnum, {
      deserialize: true,
    });
    const value = result.deserializedContent;
    if (!value) return null;
    return {
      value: String(value),
      staleness: Boolean(result.verified.staleness),
      roa: Boolean(result.verified.roa),
    };
  } catch {
    return null;
  }
}

export type RecordsBundle = Partial<Record<Lowercase<SnsRecordKey>, SnsRecordValue>>;

export async function getRecordsBundle(
  handle: string,
  opts?: { cluster?: SnsCluster },
): Promise<RecordsBundle> {
  const types: SnsRecordKey[] = ["Email", "Twitter", "Github", "Discord"];
  const settled = await Promise.all(types.map((t) => getRecord(handle, t, opts)));
  const out: RecordsBundle = {};
  for (let i = 0; i < types.length; i++) {
    const v = settled[i];
    if (v) out[types[i].toLowerCase() as Lowercase<SnsRecordKey>] = v;
  }
  return out;
}
