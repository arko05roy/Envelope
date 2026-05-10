"use client";

/**
 * Authenticated fetch — attaches `x-wallet-pubkey` header from the connected
 * Phantom wallet. Throws AuthRequired when no wallet is connected.
 */
export class AuthRequired extends Error {
  constructor() {
    super("connect a wallet to continue");
  }
}

export async function api<T = unknown>(
  pubkey: string | null,
  path: string,
  init?: RequestInit,
): Promise<T> {
  if (!pubkey) throw new AuthRequired();
  const headers = new Headers(init?.headers);
  headers.set("x-wallet-pubkey", pubkey);
  if (init?.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  const res = await fetch(path, { ...init, headers });
  if (!res.ok) {
    const text = await res.text();
    let msg = text;
    try {
      const j = JSON.parse(text) as { error?: string | { formErrors?: string[] } };
      if (typeof j.error === "string") msg = j.error;
      else if (j.error && "formErrors" in j.error) msg = j.error.formErrors?.[0] ?? text;
    } catch {
      // text is fine
    }
    throw new Error(msg || `${res.status}`);
  }
  return res.json() as Promise<T>;
}
