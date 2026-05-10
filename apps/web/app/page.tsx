export default function LandingPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-24">
      <span className="inline-block text-xs font-semibold uppercase tracking-widest text-envelope-accent">
        Envelope
      </span>
      <h1 className="mt-3 text-5xl font-bold tracking-tight">
        Pay your global team without doxxing them.
      </h1>
      <p className="mt-6 text-lg text-zinc-400 leading-relaxed">
        Private, programmable treasury &amp; payroll OS for crypto-native
        businesses. Customers pay you from any chain or any country. Your
        treasury sits cross-chain. Your payroll runs in one shielded batch.
        Your auditor sees exactly what they should — and nothing more.
      </p>
      <div className="mt-10 flex gap-3">
        <a
          href="/dashboard"
          className="px-5 py-3 rounded-md bg-envelope-accent text-black font-semibold"
        >
          Open dashboard
        </a>
        <a
          href="https://github.com/your-org/envelope"
          className="px-5 py-3 rounded-md border border-envelope-border text-zinc-200"
        >
          GitHub
        </a>
      </div>
      <ul className="mt-16 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <li className="rounded border border-envelope-border p-4">
          <div className="text-envelope-accent">KIRAPAY</div>
          <p className="text-zinc-400">Cross-chain customer pay-in → USDC on Solana.</p>
        </li>
        <li className="rounded border border-envelope-border p-4">
          <div className="text-envelope-accent">Dodo Payments</div>
          <p className="text-zinc-400">Fiat in 220+ countries + our own subscription billing.</p>
        </li>
        <li className="rounded border border-envelope-border p-4">
          <div className="text-envelope-accent">Ika dWallet</div>
          <p className="text-zinc-400">Cross-chain MPC custody with programmable policy.</p>
        </li>
        <li className="rounded border border-envelope-border p-4">
          <div className="text-envelope-accent">Encrypt + Cloak</div>
          <p className="text-zinc-400">FHE salary policy + shielded batch payroll.</p>
        </li>
      </ul>
    </main>
  );
}
