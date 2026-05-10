# ENVELOPE — Build Plan

> Private, programmable treasury & payroll OS for crypto-native global businesses.
> Solana Frontier Hackathon 2026 — chasing all 4 sponsor tracks: KIRAPAY + Ika/Encrypt + Dodo + Cloak.

---

## 0. The thesis (read before anything)

Each sponsor occupies a different structural axis of one product. Pull any out, the product collapses:

| Axis | Sponsor | Job | Without it |
|---|---|---|---|
| Crypto pay-in | **KIRAPAY** | Customer pays invoice from any chain → settles to USDC on Solana | "use 5 PSPs" |
| Fiat pay-in + SaaS billing | **Dodo** | Card/UPI/SEPA in 220+ countries + our own subscription billing | No fiat customers, no rev rail |
| Cross-chain custody | **Ika** | dWallet treasury holds USDC + BTC reserves + ETH ops without bridges | Hot wallet or Fireblocks |
| Confidential policy | **Encrypt** | FHE compute over salary bands + approval thresholds | Salary bands public |
| Private payout | **Cloak** | Shielded batch disbursement + viewing keys for audit | Every salary doxxed forever |

**Persona:** AI/SaaS founder, ~30 contractors across 12 countries, ~$50k–500k MRR, mostly stablecoins.
**Demo north star:** Run a real 30-person payroll on stage, then have an "auditor" view exactly what they should and nothing more.

---

## 1. End-to-end demo flow (the 5-min video script)

1. **Landing** → "Mercury for crypto-native global businesses, with privacy as default."
2. **Sign in** (Privy) → onboarding picks org name. Behind scenes: provision an **Ika dWallet** as treasury, default policy "CFO + CEO co-sign for >$10k."
3. **Customer pays an invoice (KIRAPAY)** → public checkout link. Customer on Base picks ETH → KIRAPAY routes → USDC lands in dWallet on Solana. Tx hash visible.
4. **Customer pays an invoice (Dodo)** → enterprise customer pays $5k by card via Dodo. Stablecoin lands in dWallet.
5. **Set up payroll (Encrypt)** → upload `comp.csv` (30 contractors, country, role, salary). Client-side encrypts comp matrix into FHE ciphertexts. On-chain Encrypt program holds ciphertexts + an encrypted "approval threshold" rule.
6. **Run payroll (Cloak)** →
   - Encrypt program's `execute_graph` runs the threshold check on encrypted comp.
   - dWallet (Ika) co-signs the disbursement with founder.
   - Cloak `transact` fires a single shielded batch with N output UTXOs to N stealth addresses.
   - Public ledger: one tx, no amounts, no recipient identities.
7. **Contractor receives** → opens stealth claim link, can off-ramp via Dodo to local fiat (INR/USD/EUR), OR forward via KIRAPAY to their own chain.
8. **Auditor view** → finance opens dashboard with viewing key + decryptor service access. Sees all 30 amounts, recipient handles, totals matching ledger commitments. External regulator gets a time-limited scoped key showing only one country's payouts.

Each segment has a 30-second slice that hero's one sponsor's tech.

---

## 2. Architecture

```
sol/                                    ← repo root
├── apps/
│   └── web/                            ← Next.js 14 (App Router) + TS + Tailwind
│       ├── app/
│       │   ├── page.tsx                ← Landing
│       │   ├── dashboard/              ← Founder-side
│       │   │   ├── page.tsx            ← Treasury overview (Ika dWallet balance)
│       │   │   ├── invoices/           ← Create/manage invoices (KIRAPAY + Dodo)
│       │   │   ├── payroll/            ← Comp matrix upload, encrypt, run
│       │   │   ├── treasury/           ← dWallet policy editor
│       │   │   └── audit/              ← Issue/revoke viewing keys
│       │   ├── checkout/[id]/          ← Public KIRAPAY checkout page
│       │   ├── claim/[id]/             ← Cloak stealth claim page
│       │   └── api/
│       │       ├── kirapay/webhook/    ← Settlement webhook
│       │       ├── dodo/webhook/       ← Charge/sub webhook
│       │       └── payroll/run/        ← Server-side: orchestrate Encrypt → Ika co-sign → Cloak batch
│       ├── lib/
│       │   ├── cloak/                  ← Cloak SDK wrapper + helpers
│       │   ├── kirapay/                ← KIRAPAY API client (REST)
│       │   ├── ika/                    ← Ika dWallet SDK wrapper
│       │   ├── encrypt/                ← Encrypt FHE client + ciphertext encoders
│       │   ├── dodo/                   ← Dodo SDK wrapper
│       │   └── solana/                 ← Connection, Helius RPC, Privy
│       └── components/
│           ├── ui/                     ← Buttons, cards, modals
│           └── flows/                  ← PayrollWizard, InvoiceCheckout, AuditDashboard
├── programs/
│   └── envelope-policy/                ← Anchor program using `encrypt-anchor`
│                                          - Stores FHE-encrypted comp matrix
│                                          - Threshold/approval check via `#[encrypt_fn]`
│                                          - Emits batch instruction consumed by Cloak
├── packages/
│   └── shared/                         ← Cross-cutting types (Recipient, ShieldedBatch, ...)
├── docs/
│   ├── architecture.md
│   ├── sponsor-integration-checklist.md
│   └── demo-script.md
├── scripts/
│   ├── airdrop.ts                      ← Devnet funding helper
│   └── seed-comp-csv.ts                ← Generate fake 30-person comp CSV for demo
├── PLAN.md                             ← This file
├── README.md
├── CLAUDE.md
└── .env.example
```

---

## 3. Sponsor integration map

### 3.1 Cloak (highest confidence — mainnet, docs solid)

- **Install:** `npm install @cloak.dev/sdk @solana/web3.js`
- **Program ID:** `zh1eLd6rSphLejbFfJEneUwzHRfMKxgzrgkfwA6qRkW` (mainnet)
- **Relay URL:** `https://api.cloak.ag` (default)
- **Min balance:** keep 0.07 SOL+ for fees. Fee ≈ `5_000_000 + floor(gross * 3 / 1000)` lamports.
- **Core APIs we use:**
  - `transact({ inputUtxos, outputUtxos, externalAmount, depositor }, options)` → shield + transfer in one call (used for batch disbursement)
  - `createUtxo(amount, owner, mint)` / `createZeroUtxo(mint)` → build UTXOs per recipient
  - `generateUtxoKeypair()` → recipient stealth keypair
  - `fullWithdraw` / `partialWithdraw` → contractor claim flow
  - `sdk.send(connection, note, recipients, options?)` → multi-recipient send (per index)
  - Viewing keys: registration via `/architecture/viewing-keys-compliance` (need to read live; stub `lib/cloak/viewing-keys.ts`)
- **Optional Claude Code skills:** `npx @cloak.dev/claude-skills` installs `/cloak-shield`, `/cloak-send`, `/cloak-pay`, `/cloak-swap` → use these to prototype the SDK calls fast.
- **Risk:** medium. Batch UX for 30 outputs needs verification — single tx may exceed CU; might need chunking.
- **Day-1 spike:** `pnpm tsx scripts/cloak-spike.ts` — shield 0.1 SOL, send 0.05 to a test stealth address, partial-withdraw. Confirm fees + tx size.

### 3.2 Dodo Payments (high confidence — public docs)

- **Install:** `npm install dodopayments`
- **Init:** `const client = new DodoPayments({ bearerToken: process.env.DODO_API_KEY })`
- **Endpoints we call:**
  - `POST /payments` — create one-time charge (for invoice fiat fallback)
  - `POST /subscriptions` — Envelope's own SaaS subscription billing
  - `GET /webhook-signing-key` — for verification
- **Stablecoin support:** Dodo confirms stablecoin acceptance "worldwide (excluding India)" — Solana settlement details require their support contact, but for hackathon: use card → USD payout to Envelope account → manual wire to dWallet OR direct stablecoin payment from supported regions.
- **Webhook verification:** verify HMAC against signing key before mutating any state.
- **Risk:** low.

### 3.3 KIRAPAY (high confidence — REST docs confirmed)

- **Base:** `https://api.kira-pay.com/api` · **Auth:** `x-api-key` header (NOT Bearer)
- **Endpoints used:**
  - `POST /link/generate` → returns `{ url, price, originalPrice }`. Send `url` to customer.
  - `GET /link/{code}` (public) → public link details for our checkout page.
  - `GET /link/tokens/{chainId}` (public) → supported settlement tokens.
  - `GET /wallet/transactions/status/{hash}` (public) → polling fallback.
  - `POST /webhooks` (auth) → register `{ url, secret }`.
- **Webhook events:** `transaction.created`, `transaction.succeeded`, `transaction.refund`.
- **CRITICAL — Solana settlement caveat (from docs/payments/supported-chains-and-tokens):**
  > "For Solana it only supports native token and use 'sol' as a chainId and 'SOL' as an address while generating payment links."
  → **KIRAPAY cannot directly settle USDC on Solana.** Two paths:
  - **Path A (default for v1):** Settle SOL on Solana to dWallet → Jupiter-swap to USDC on settlement webhook. Adds one swap step but keeps everything on Solana.
  - **Path B (alt):** Settle USDC on Base (chainId 8453) to the dWallet's EVM address via Ika cross-chain custody. Funds live on Base; dWallet still controls them. Better demo of Ika's cross-chain story; requires Ika EVM signing to be stable.
  - **Recommendation:** demo both — primary checkout uses Path A (simple), but show Path B in the cross-chain narrative. Both money flows visible in dashboard.
- **Webhook signature:** HMAC-SHA256 of raw body using the `secret` we passed at registration → compare against `x-kirapay-signature`. (Algorithm/header inferred — verify against a real test event on D3 and adjust.)
- **Risk:** low–medium. Settlement caveat constrains the architecture but doesn't break it.
- **Day-3 spike:** create one test link via `POST /link/generate` with `tokenOut: { chainId: "sol", address: "SOL" }`, complete a payment from devnet, verify webhook fires.

### 3.4 Ika (medium confidence — Solana pre-alpha live)

- **Install:** `pnpm add @ika.xyz/sdk`
- **Status:** Solana Pre-Alpha live (per docs.ika.xyz). EdDSA support shipped Dec 2025 covering Solana + Cardano.
- **Frameworks supported:** Pinocchio, Anchor, Native (Solana programs) + TypeScript SDK for client.
- **Capabilities we use:**
  - Create dWallet (2PC-MPC keypair: user share + Ika network share)
  - Sign Solana transaction
  - Sign Ethereum / Bitcoin transactions cross-chain (pre-alpha — stub if not stable)
  - Policy: Solana program defines "which transactions can be signed under what conditions"
- **Action item:** read https://docs.ika.xyz/docs/sdk for actual TS API; the public landing didn't show signatures.
- **Risk:** medium. Pre-alpha = breakage risk. Plan B: use Ika dWallet for *Solana custody only* (still "decentralized custody" narrative for the track), sketch BTC/ETH cross-chain as roadmap if blocked.
- **Day-3 spike:** create a dWallet, fund with devnet SOL, sign a transfer through the 2PC MPC flow.

### 3.5 Encrypt (highest technical risk — pre-alpha, FHE)

- **Install crates (Rust on-chain):**
  - `encrypt-anchor` — recommended (rapid dev)
  - alternatives: `encrypt-pinocchio` (best CU), `encrypt-native`
  - DSL: `#[encrypt_fn]` macro + `EncryptCpi` trait
- **Flow:**
  1. Write encrypted logic in Rust with `#[encrypt_fn]`
  2. Compiler turns it into FHE computation graph (DAG)
  3. Deploy as Solana program; on-chain `execute_graph` creates ciphertext output accounts
  4. Off-chain executor processes the graph using real FHE (currently centralized in pre-alpha)
  5. Decryption via dedicated decryptor service when application requests
- **CRITICAL CAVEAT (from docs):** "all data is completely public and stored as plaintext on-chain" in pre-alpha. So for the hackathon, we treat REFHE as a *forward-compatible structure* — the program is shaped for FHE, demo claims privacy, and we're transparent in README that pre-alpha is plaintext.
- **What we encode:**
  - Comp matrix: `Map<contractor_id, encrypted(salary_lamports)>`
  - Approval threshold rule: `encrypted(amount) <= encrypted(band_ceiling[role])`
  - One real `#[encrypt_fn]` doing the threshold check — don't fake it.
- **Risk:** highest. Build LAST. Scope to one threshold check.
- **Day-5 spike:** write `programs/envelope-policy/src/lib.rs` with one `#[encrypt_fn]` that compares two encrypted u64s, deploy to devnet.

---

## 4. Execution timeline (no timeline limit per user, but burn-down sequence)

| Phase | Days (rough) | Goal | Exit criteria |
|---|---|---|---|
| **0. Spike Cloak** | D1 | De-risk the highest-frequency call path | Shield → batch send → partial withdraw works end-to-end on mainnet for 0.1 SOL |
| **1. Spike Ika** | D2 | dWallet creates + signs Solana tx | One Solana tx signed via 2PC-MPC, on devnet |
| **2. Spike KIRAPAY** | D3 | One real cross-chain intent settles | Customer pays from Base, USDC arrives on Solana |
| **3. Spike Dodo** | D4 | Webhook verified, payment lands | Test card payment confirmed by webhook + signing key |
| **4. Spike Encrypt** | D5 | One `#[encrypt_fn]` deployed on devnet | Threshold compares two ciphertexts |
| **5. Glue + UI** | D6–D9 | Wire all 5 into the founder dashboard + demo flows | All 5 used in one happy path |
| **6. Polish + video** | D10–D11 | README per sponsor, video script, recorded demo | Submission complete |

**Decision gates:**
- After D2 (Ika spike), if pre-alpha breaks: pivot scope to "Ika for Solana-only custody, BTC/ETH on roadmap." Don't lose >1 day on Ika.
- After D5 (Encrypt spike), if FHE compute path won't run: pivot to "Encrypt program shape with plaintext fallback" (per docs caveat — pre-alpha is plaintext anyway). Be transparent in README.

---

## 5. The non-negotiables (rubric-driven)

Each sponsor's judges will read the README looking for THEIR test. Pre-emptive answers:

### KIRAPAY (40% weight on depth)
- "Is KIRAPAY a core enabler or add-on?" → **Customer-facing pay-in is THE primary money-in flow.** Code reference: `apps/web/lib/kirapay/client.ts`, `apps/web/app/checkout/[id]/page.tsx`. Live demo: customer on Base sends ETH, USDC arrives in dWallet on Solana.

### Ika/Encrypt (40% weight on core integration)
- "Are they essential or used superficially?" → **Treasury IS a dWallet (Ika); compensation policy IS encrypted (Encrypt).** Code references: `programs/envelope-policy/src/lib.rs` (`#[encrypt_fn]` doing real threshold), `apps/web/lib/ika/client.ts`. Demo: founder cannot move treasury funds without 2PC-MPC co-sign; cannot run payroll without encrypted policy passing.

### Dodo (track scoring + traction)
- "Non-trivial integration + real-world utility?" → **Used in two roles: fiat invoice acceptance for end-customers AND Envelope's own SaaS billing.** Code reference: `apps/web/lib/dodo/client.ts`. Demo: card payment flow + verified webhook.

### Cloak (40% weight on integration depth)
- "Is privacy load-bearing?" → **Removing Cloak = every contractor's salary on a public block explorer forever. The product cannot ship without it.** Code reference: `apps/web/lib/cloak/client.ts`, `apps/web/app/api/payroll/run/route.ts`. Demo: 30-person payroll fires as one shielded batch; auditor opens scoped viewing key.

---

## 6. Risks, ranked

| # | Risk | Probability | Impact | Mitigation |
|---|---|---|---|---|
| 1 | Encrypt FHE compute on devnet doesn't run | High | Track score for Encrypt drops | Build last; one threshold check only; transparent README about pre-alpha plaintext |
| 2 | Cloak batch tx exceeds Solana CU limit at N=30 | Med | Demo breaks | Spike D1; if needed chunk into batches of N=10 |
| 3 | KIRAPAY only settles SOL (not USDC) on Solana → forced extra Jupiter swap step | Med | UX papercut; one more thing that can fail in demo | Pre-warm Jupiter route; if swap fails, show settled SOL balance and queue swap as "rebalancing" — still demoable |
| 4 | Ika pre-alpha breaks during demo | Med | One track score drops | Test full flow night before; have backup video clip |
| 5 | Surface area dilution — nothing feels deep | Med | All track scores drop | Cut treasury policy editor + audit dashboard to skeleton if behind schedule; payroll flow is the ONE thing polished |
| 6 | Privy / wallet onboarding glitch on demo day | Low | Recording breaks | Have pre-funded test accounts + recorded fallback |

---

## 7. What's NOT in v1 (cut to keep depth)

- Multi-org / multi-treasury (one org, one dWallet)
- Vendor payments separate from contractor payroll (treat both as "outflow")
- Treasury rebalancing / yield (mention as roadmap)
- Mobile app
- Cross-chain *payouts* (only cross-chain pay-in matters for the demo; payouts shielded on Solana only)
- Tax reporting / 1099 generation (mention as roadmap)
- Real auth/RBAC (Privy magic link is enough for demo)

---

## 8. Pitch sentence (for video opener)

> "Every salary your team pays in stablecoins is permanently readable on a block explorer. Every treasury move signals strategy to competitors. Every fiat customer is locked out of crypto checkout. Envelope fixes all three — KIRAPAY brings the customer in from any chain, Dodo brings them in from any country, Ika holds the treasury cross-chain without bridges, Encrypt keeps salary policy private, and Cloak fires payroll as one shielded batch. We built it for the crypto-native SaaS founder who can't ship payroll today without doxxing their team."

---

## 9. Submission checklist (per track)

### Cloak
- [ ] Working demo / live URL
- [ ] Public GitHub
- [ ] README: problem, target user, Cloak SDK usage explanation, setup, deployed program IDs
- [ ] Demo video <5 min walking the private payment flow end-to-end
- [ ] arena.colosseum.org submission

### Ika/Encrypt
- [ ] GitHub repo public
- [ ] README: problem, users, Ika+Encrypt usage, build/test/use instructions, program IDs
- [ ] <5 min video showing functionality + design choices

### Dodo (Superteam India)
- [ ] Dodo integrated meaningfully (subscription + payment)
- [ ] Defined user (crypto-native SaaS founder)
- [ ] Stablecoin + Solana benefit demonstrated
- [ ] Sign up at Superteam India hackathon hub
- [ ] Submit to global hackathon as well

### KIRAPAY
- [ ] Working prototype / live demo
- [ ] Public repo + README + setup
- [ ] Live transactions via KIRAPAY API in demo
- [ ] <5 min demo video
- [ ] Project write-up (Notion/Doc) explaining concept + architecture + KIRAPAY integration
