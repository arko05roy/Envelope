# Sponsor integration — judging-rubric checklist

For each track, a one-sentence necessity statement + the file/line reference + the demo moment.

## KIRAPAY (Build for Adoption / Cross-Chain Checkout — $9k + $1k pool)

- **Necessity:** *Without KIRAPAY, customers can't pay invoices from any chain — Envelope cannot accept money in.*
- **Code:** `apps/web/lib/kirapay/client.ts`, `apps/web/app/checkout/[id]/page.tsx`, `apps/web/app/api/kirapay/webhook/route.ts`
- **Live transaction:** customer pays from Base in ETH → USDC settles to dWallet on Solana.
- **Submission:** working prototype, public repo, README, ≤5 min video, project write-up (Notion). API integration shown.

## Ika + Encrypt (Bridgeless / Encrypted Capital Markets — $10k 1st)

- **Necessity (Ika):** *Treasury IS a dWallet — without Ika, Envelope is a hot-wallet treasury, not "decentralized institutional custody."*
- **Necessity (Encrypt):** *Compensation policy IS encrypted — without Encrypt, salary bands and approval rules are public.*
- **Code:** `apps/web/lib/ika/client.ts`, `programs/envelope-policy/src/lib.rs` (one real `#[encrypt_fn]` for threshold compare), `apps/web/lib/encrypt/client.ts`
- **Demo:** founder cannot move treasury funds without 2PC-MPC co-sign; cannot run payroll without encrypted policy passing.
- **Submission:** public repo, README explaining problem + Ika/Encrypt usage + setup, deployed program ID, ≤5 min video.

## Dodo Payments (Stablecoins x Solana — Superteam India $5k 1st)

- **Necessity:** *Without Dodo, fiat customers can't pay AND Envelope has no SaaS billing rail for itself.*
- **Code:** `apps/web/lib/dodo/client.ts`, `apps/web/app/api/dodo/webhook/route.ts`
- **Demo:** card payment via Dodo → stablecoin settles to dWallet (or platform wallet, then rebalance); platform's own subscription created.
- **Submission:** Superteam India hackathon hub + global Colosseum portal. Show stablecoin/Solana benefit vs status quo (speed, cost). Demonstrate one real transaction.

## Cloak (Private Execution — prize amount per their announcement)

- **Necessity:** *Without Cloak, every contractor's salary is permanently readable on a block explorer — Envelope cannot ship.*
- **Code:** `apps/web/lib/cloak/client.ts`, `apps/web/app/api/payroll/run/route.ts`, `apps/web/app/claim/[id]/page.tsx`
- **Capabilities used:** `transact` for batch disbursement, stealth keypairs (`generateUtxoKeypair`), partial/full withdraw, viewing keys.
- **Demo:** 30-person payroll fires as one shielded batch; auditor opens a scoped viewing key dashboard.
- **Submission:** working demo / live URL, public GitHub, README (problem, target user, Cloak SDK usage, setup, program IDs), ≤5 min video, arena.colosseum.org submission.

## SNS Identity Track (Frontier x Network School — $3.6k winners + $1.4k runner-ups)

- **Necessity:** *Identity is the missing primitive for trust in payroll — `.sol` makes contractor onboarding portable and the orchestrator agent verifiable.*
- **Code:**
  - `apps/web/lib/sns/client.ts` — sponsor wrapper (resolve, reverse lookup, Records V2 with staleness/RoA flags)
  - `apps/web/app/api/sns/resolve/route.ts`, `apps/web/app/api/sns/records/route.ts` — server-side resolver + records bundle
  - `apps/web/app/api/contractors/route.ts` — best-effort SNS resolution + records import on contractor create
  - `apps/web/app/dashboard/contractors/page.tsx` — `.sol` handle input with live debounced resolution; verified-record badges in the list
  - `apps/web/lib/payroll/orchestrator.ts` — every run is signed by `payroll-agent.envelope.sol` (Agent Identity)
  - `apps/web/app/claim/[id]/page.tsx` — `.sol` greeting + agent footer
  - `scripts/sns-bootstrap.ts` — one-shot devnet registration of `envelope.sol` + 5 demo subdomains
- **Capabilities used:** `resolve` (SNS-IP-5), `getDomainKeySync`, `reverseLookup`, `getPrimaryDomain`, `getAllDomains`, `getRecordV2` with staleness/RoA verification, `createSubdomain`, `createNameRegistry` on the devnet bindings module.
- **Theme: Agent Identity** — `payroll-agent.envelope.sol` is the on-chain identity of the orchestrator; subdomains under `envelope.sol` give every contractor a deterministic, parent-revocable identity without writing a custom registry program.
- **Theme: Social Identity** — onboarding accepts `alice.sol`; SNS Records V2 (email / twitter / github / discord) are pulled with their staleness + RoA flags so judges can see the trust chain rather than us hand-rolling email validation.
- **Demo:** open `/dashboard/contractors`, type `bonfida.sol` → live mainnet resolution preview; add a contractor via `alice.envelope.sol` (devnet bootstrapped) → run payroll → claim page greets `Hi, alice.envelope.sol` with `paid by payroll-agent.envelope.sol` footer.
- **Submission:** Colosseum Frontier (Global) + Superteam Earn; public GitHub; README explains identity primitive + run instructions (`pnpm sns:bootstrap`); ≤5 min video.

---

## Pre-flight before each track submission

- [ ] README necessity sentence quoted in track-specific section
- [ ] One code reference per track shows non-trivial usage
- [ ] One demo moment per track exists in the video
- [ ] Live URL works on a fresh browser without our local state
