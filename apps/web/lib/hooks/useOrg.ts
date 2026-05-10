"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api/fetcher";
import type { Org } from "@/lib/store";

export function useOrg() {
  const { publicKey, connected } = useWallet();
  const pubkey = publicKey?.toBase58() ?? null;
  const [org, setOrg] = useState<Org | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!connected || !pubkey) {
      setOrg(null);
      return;
    }
    setLoading(true);
    setError(null);
    api<{ org: Org }>(pubkey, "/api/me")
      .then((j) => setOrg(j.org))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [pubkey, connected]);

  const update = async (patch: Partial<Pick<Org, "name" | "treasuryPubkey">>) => {
    const j = await api<{ org: Org }>(pubkey, "/api/me", {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    setOrg(j.org);
    return j.org;
  };

  return { pubkey, connected, org, loading, error, update };
}
