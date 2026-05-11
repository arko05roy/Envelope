/**
 * Tunable, product-meaningful constants. Sourced from env so nothing here is
 * a magic literal baked into a component or route handler.
 *
 * `USD_PER_SOL` is a demo valuation rate — it keeps a full payroll batch under
 * ~1 SOL on devnet. A production deployment settles USDC and this goes away.
 */
const LAMPORTS_PER_SOL = 1_000_000_000;

function num(v: string | undefined, fallback: number): number {
  const n = v != null ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const USD_PER_SOL = num(
  process.env.USD_PER_SOL ?? process.env.NEXT_PUBLIC_USD_PER_SOL,
  500_000,
);

/** Default monthly spending cap (USD) applied when a workspace is first set up. */
export const DEFAULT_MONTHLY_CAP_USD = num(process.env.DEFAULT_MONTHLY_CAP_USD, 100_000);

export function usdToLamports(usd: number): bigint {
  return BigInt(Math.round((usd / USD_PER_SOL) * LAMPORTS_PER_SOL));
}

export function lamportsToUsd(lamports: bigint | number | string): number {
  return (Number(lamports) / LAMPORTS_PER_SOL) * USD_PER_SOL;
}
