# Envelope

**Private, programmable treasury & payroll OS for crypto-native global businesses.**

Solana Frontier Hackathon 2026 — built across all 4 sponsor tracks.

> Every salary your team pays in stablecoins is permanently readable on a block explorer. Envelope fixes that, end-to-end, on Solana.

## What it does

1. **Customers pay invoices** from any chain (KIRAPAY) or any country (Dodo Payments) — funds settle as USDC on Solana inside an Ika dWallet.
2. **Treasury** is a programmable Ika dWallet with cross-chain custody (USDC on Solana, BTC reserves, ETH ops) and policy rules (multi-sig, spend caps, role-based co-sign).
3. **Compensation policy** (salary bands, approval thresholds) is encrypted via Encrypt's FHE primitives — stored as ciphertexts, computed on without decryption.
4. **Payroll runs** as a single shielded batch via Cloak — N stealth recipients, amounts and identities hidden on-chain.
5. **Auditors** unlock exactly what they need with scoped viewing keys (Cloak) + decryption requests (Encrypt). No more, no less.

## Architecture (high level)

```
   ┌──────────────────────────────────────────────────────────┐
   │           ENVELOPE  ─  next.js + ts + tailwind            │
   ├──────────────┬──────────────┬───────────────┬─────────────┤
   │  KIRAPAY     │  Dodo        │  Ika          │  Encrypt    │
   │  cross-chain │  fiat/SaaS   │  dWallet MPC  │  FHE policy │
   │  pay-in      │  pay-in      │  treasury     │  on Solana  │
   └──────┬───────┴──────┬───────┴───────┬───────┴──────┬──────┘
          │              │               │              │
          └──────┬───────┴───────┬───────┘              │
                 ▼               ▼                      ▼
            ┌──────────────────────┐         ┌──────────────────┐
            │   Solana — Ika dWallet (USDC) │ │ envelope-policy │
            │   (programmable custody)      │ │ FHE Anchor pgm  │
            └──────────────────────┬────────┘ └────────┬────────┘
                                   │                   │
                                   └─────────┬─────────┘
                                             ▼
                                   ┌──────────────────┐
                                   │ Cloak shielded   │
                                   │ batch payroll    │
                                   └────────┬─────────┘
                                            ▼
                              ┌──────────────────────────┐
                              │ N stealth recipients     │
                              │ + scoped viewing keys    │
                              └──────────────────────────┘
```

See [PLAN.md](./PLAN.md) for the full build plan and [docs/architecture.md](./docs/architecture.md) for system internals.

## Setup

Requires Node 20+, pnpm, Rust + Solana CLI for the FHE program.

```bash
pnpm install
cp .env.example .env.local
# Fill in keys (Helius, Privy, KIRAPAY, Dodo, etc.)
pnpm dev
```

## Sponsor integration

Each sponsor's tech is structurally load-bearing. Pull any out, the product collapses. See [docs/sponsor-integration-checklist.md](./docs/sponsor-integration-checklist.md) for the per-track judging answers.

| Sponsor | Where in code |
|---|---|
| KIRAPAY | `apps/web/lib/kirapay/`, `apps/web/app/checkout/[id]/` |
| Dodo Payments | `apps/web/lib/dodo/`, `apps/web/app/api/dodo/webhook/` |
| Ika | `apps/web/lib/ika/`, treasury policy in `apps/web/app/dashboard/treasury/` |
| Encrypt | `programs/envelope-policy/src/lib.rs`, `apps/web/lib/encrypt/` |
| Cloak | `apps/web/lib/cloak/`, payroll runner in `apps/web/app/api/payroll/run/` |

## Status

Pre-hackathon scaffolding. See PLAN.md §4 for execution timeline.

## License

MIT — see LICENSE
