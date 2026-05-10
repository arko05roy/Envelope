# Claude Code project context

## Project: Envelope

Private, programmable treasury & payroll OS for crypto-native global businesses.
Solana Frontier Hackathon 2026 — chasing all 4 sponsor tracks (KIRAPAY + Ika/Encrypt + Dodo + Cloak).

## Read these first

1. [PLAN.md](./PLAN.md) — execution plan, timeline, risks
2. [docs/architecture.md](./docs/architecture.md) — system architecture
3. [docs/sponsor-integration-checklist.md](./docs/sponsor-integration-checklist.md) — what each sponsor's judges will look for

## Stack

- **Frontend:** Next.js 14 (App Router), TypeScript strict, Tailwind, Privy for wallet auth
- **Solana:** `@solana/web3.js` v2, Helius RPC (devnet + mainnet)
- **SDKs:** `@cloak.dev/sdk`, `dodopayments`, `@ika.xyz/sdk`, KIRAPAY REST
- **On-chain:** Anchor + `encrypt-anchor` crate (FHE program in `programs/envelope-policy`)
- **Package manager:** pnpm workspaces

## House rules

- TypeScript strict, no `any`. Treat the SDK clients as the trust boundary.
- Server-side secrets only on `app/api/**/*` routes. Never leak `process.env.*_SECRET` to client components.
- All payroll-related state mutations go through `app/api/payroll/run/route.ts` — single source of truth for orchestration.
- The five sponsor SDKs each get one wrapper module under `apps/web/lib/<sponsor>/`. UI never calls SDKs directly; always through the wrapper.
- Comments only when WHY is non-obvious. Don't narrate the code.

## What NOT to do

- Don't add a smart contract for "treasury logic" — Ika dWallet IS the treasury policy layer. Only Anchor program is `envelope-policy` (FHE).
- Don't fake the Encrypt FHE compute. One real `#[encrypt_fn]` is required. If pre-alpha breaks, document plaintext fallback in README, don't fake.
- Don't generalize personas. The demo persona is "AI/SaaS founder paying 30 contractors across 12 countries." Stay there.
- Don't build mobile app, multi-org, tax reporting, vendor payments separate from payroll, or treasury yield. PLAN.md §7 has the full cut list.

## Active spike order (per PLAN.md §4)

1. Cloak (mainnet) → 2. Ika (devnet) → 3. KIRAPAY → 4. Dodo → 5. Encrypt → 6. Glue + UI → 7. Polish + video.

## Useful commands

```bash
pnpm dev              # Run web app
pnpm build            # Build web app
pnpm cloak:spike      # scripts/cloak-spike.ts
pnpm seed:comp        # Generate fake comp.csv for demo
solana airdrop 5      # devnet
```
