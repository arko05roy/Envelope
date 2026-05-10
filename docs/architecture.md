# Architecture

Envelope is a Next.js 14 monorepo + one Anchor (FHE) program.

## Trust boundaries

```
[Browser] ──Privy auth──> [Next.js server] ──server SDKs──> [Sponsor APIs]
   │                            │
   │ wallet sign request        │ orchestrates payroll run
   ▼                            ▼
[Ika 2PC-MPC]            [Cloak relay] ──submits──> [Solana mainnet/devnet]
                                                      │
                                                      ▼
                                              [envelope-policy Anchor pgm]
```

- The browser never sees `*_API_KEY` for KIRAPAY, Dodo, or Cloak relay overrides.
- Only the Next.js server can hit `/api/payroll/run`.
- Encrypt ciphertexts are encoded client-side BEFORE leaving the browser. The Next.js server only proxies them to the chain.

## Money flow

```
                                           ┌── Dodo (fiat) ──┐
                                           │                 │
                       Customer ────────────────► invoice ───┴──► Envelope
                                           │                 │
                                           └── KIRAPAY ──────┘
                                                     │
                                                     ▼
                                             USDC on Solana
                                                     │
                                                     ▼
                                          ┌──────────────────┐
                                          │ Ika dWallet (org │
                                          │ treasury)        │
                                          └────────┬─────────┘
                                                   │  dWallet co-signs
                                                   ▼
                                          ┌──────────────────┐
                                          │ Cloak shielded   │
                                          │ batch payroll    │
                                          └────────┬─────────┘
                                                   │
                                  ┌────────────────┼────────────────┐
                                  ▼                ▼                ▼
                              stealth #1       stealth #2     stealth #N
                                  │                │                │
                                  ▼                ▼                ▼
                          claim → withdraw  claim → fiat off-ramp  claim → forward via KIRAPAY
                                                  (Dodo)              to their chain
```

## Data model

See `packages/shared/src/index.ts`.

## Deploy targets

- Web: Vercel
- envelope-policy Anchor program: Solana devnet (Encrypt is devnet-only in pre-alpha)
- Cloak: mainnet (production) — but for hackathon demo use mainnet with small test amounts; or Cloak devnet if their relay supports it
- Ika: Solana devnet (pre-alpha)
- KIRAPAY: testnet first, mainnet for final demo
- Dodo: test mode for the recording, live mode for one real invoice
