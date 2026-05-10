/**
 * Cloak stealth claim page for a contractor.
 *
 * The contractor opens a one-time link emailed by Envelope. The link contains
 * the encrypted UTXO note. They sign in with a wallet, decrypt the note, and
 * either (a) full-withdraw to their wallet, or (b) off-ramp to fiat via Dodo,
 * or (c) forward via KIRAPAY to their preferred chain.
 */
type Params = { params: { id: string } };

export default function ClaimPage({ params }: Params) {
  return (
    <main className="mx-auto max-w-xl px-6 py-24">
      <h1 className="text-2xl font-bold">You&apos;ve been paid</h1>
      <p className="mt-2 text-zinc-400">Claim id: {params.id}</p>
      {/* TODO: load encrypted note from URL fragment, decrypt with claim key,
          show amount + 3 actions: withdraw, fiat off-ramp (Dodo), bridge (KIRAPAY). */}
    </main>
  );
}
