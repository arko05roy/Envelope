"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useEffect, useState } from "react";

/** Custom-styled connect button (we don't ship the default purple modal CSS). */
export function WalletButton() {
  const { publicKey, connecting, disconnect, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Avoid hydration mismatch — wallet adapter reads localStorage on mount.
  if (!mounted) {
    return (
      <span className="px-3 h-9 inline-flex items-center text-[13px] bg-paper-3 text-ink-3 rounded border border-rule">
        Connect wallet
      </span>
    );
  }

  if (connected && publicKey) {
    const short = `${publicKey.toBase58().slice(0, 4)}…${publicKey.toBase58().slice(-4)}`;
    return (
      <button
        onClick={() => disconnect()}
        title="Click to disconnect"
        className="px-3 h-9 inline-flex items-center gap-2 text-[13px] bg-paper-2 text-ink rounded border border-rule hover:border-rule-strong transition-colors duration-150"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-positive" />
        <span className="font-mono num">{short}</span>
      </button>
    );
  }

  return (
    <button
      onClick={() => setVisible(true)}
      disabled={connecting}
      className="px-3 h-9 inline-flex items-center text-[13px] bg-accent text-paper rounded hover:bg-accent-ink transition-colors duration-150 disabled:opacity-60"
    >
      {connecting ? "Connecting…" : "Connect wallet"}
    </button>
  );
}
