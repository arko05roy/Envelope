import { Connection } from "@solana/web3.js";

export function getConnection(): Connection {
  const url = process.env.NEXT_PUBLIC_HELIUS_RPC_URL;
  if (!url) throw new Error("NEXT_PUBLIC_HELIUS_RPC_URL not set");
  return new Connection(url, "confirmed");
}
