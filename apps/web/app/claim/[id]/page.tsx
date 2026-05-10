/**
 * Stealth claim page. URL contains `{runId}_{contractorId}`. Looks up the
 * payroll record and shows the recipient's amount + claim actions.
 */
import { Button, Card, Eyebrow, HRule, Label, Pill } from "@/components/ui/primitives";
import { store } from "@/lib/store";

type Params = { params: { id: string } };

function parseClaimId(id: string): { runId: string; contractorId: string } | null {
  const idx = id.lastIndexOf("_");
  if (idx === -1) return null;
  // run ids are run_xxxxx, contractor ids are c_xxxxx — find the split correctly
  // claim id format: `run_xxxxx_c_xxxxx`. Splitting at last `_` gives wrong half.
  // Look for `_c_` pattern.
  const m = id.match(/^(run_[a-z0-9]+)_(c_[a-z0-9]+)$/i);
  if (!m) return null;
  return { runId: m[1]!, contractorId: m[2]! };
}

export default function ClaimPage({ params }: Params) {
  const parsed = parseClaimId(params.id);
  if (!parsed) return <Shell title="Invalid claim link" id={params.id} />;

  const run = store.payrollRuns[parsed.runId];
  if (!run) return <Shell title="Claim not found" id={params.id} />;

  const recipient = run.recipients.find((r) => r.contractorId === parsed.contractorId);
  if (!recipient) return <Shell title="Claim not found" id={params.id} />;

  const lamports = BigInt(recipient.lamports);
  const sol = Number(lamports) / 1e9;

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-24">
      <Card className="w-full max-w-lg p-8 shadow-lift">
        <Eyebrow>You&apos;ve been paid</Eyebrow>
        <h1 className="mt-5 font-display text-[40px] leading-none tracking-tighter num">
          ${recipient.monthlyUsd.toLocaleString()}
        </h1>
        <div className="mt-2 text-[14px] text-ink-2">
          <span className="font-mono num">{sol.toFixed(4)} SOL</span> on Solana {run.network === "mainnet-beta" ? "mainnet" : "devnet"}
        </div>
        <div className="mt-1 font-mono text-[12px] text-ink-3">claim · {params.id}</div>

        <HRule className="my-7" />

        <Label>Choose how to receive</Label>
        <div className="mt-4 space-y-2">
          <Button variant="primary" className="w-full justify-between">
            Withdraw to wallet
            <span className="text-[12px] opacity-70 font-mono">shielded</span>
          </Button>
          <Button variant="secondary" className="w-full justify-between">
            Off-ramp to local currency
            <span className="text-[12px] opacity-70 font-mono">card / bank</span>
          </Button>
          <Button variant="secondary" className="w-full justify-between">
            Forward to another chain
            <span className="text-[12px] opacity-70 font-mono">cross-chain</span>
          </Button>
        </div>

        <div className="mt-7 flex items-center justify-between text-[11px] text-ink-3">
          <span>batch {recipient.chunkIndex + 1} of {run.totalChunks}</span>
          <Pill tone={run.cloakStatus === "settled" ? "positive" : "neutral"}>
            {run.cloakStatus === "settled" ? "shielded" : "approved"}
          </Pill>
        </div>
      </Card>
    </main>
  );
}

function Shell({ title, id }: { title: string; id: string }) {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-24">
      <Card className="w-full max-w-md p-8 shadow-lift">
        <Eyebrow>Claim</Eyebrow>
        <h1 className="mt-5 font-display text-[28px] leading-tight tracking-tighter">{title}</h1>
        <div className="mt-1 font-mono text-[12px] text-ink-3">#{id}</div>
      </Card>
    </main>
  );
}
