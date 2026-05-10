/**
 * Public checkout entry. Loads the invoice from the in-memory store; if it
 * already has a KIRAPAY link, redirects there. Otherwise renders an empty state.
 */
import { redirect } from "next/navigation";
import { Card, Eyebrow, Label, Pill } from "@/components/ui/primitives";
import { store } from "@/lib/store";

type Params = { params: { id: string } };

export default async function CheckoutPage({ params }: Params) {
  const invoice = store.invoices.get(params.id);
  if (!invoice) {
    return <ErrorShell title="Invoice not found" id={params.id} tone="neutral" />;
  }
  if (invoice.kiraLinkUrl) {
    redirect(invoice.kiraLinkUrl);
  }
  return <ErrorShell title="Invoice has no payment link" id={params.id} tone="warning" />;
}

function ErrorShell({
  title,
  id,
  tone,
}: {
  title: string;
  id: string;
  tone: "neutral" | "warning";
}) {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-24">
      <Card className="w-full max-w-md p-8 shadow-lift">
        <Eyebrow>Pay invoice</Eyebrow>
        <h1 className="mt-5 font-display text-[28px] leading-tight tracking-tighter">{title}</h1>
        <div className="mt-1 font-mono text-[12px] text-ink-3">#{id}</div>
        <div className="mt-8 pt-6 border-t border-rule">
          <Label>Payment status</Label>
          <div className="mt-3">
            <Pill tone={tone}>{tone === "warning" ? "Misconfigured" : "Unknown invoice"}</Pill>
          </div>
        </div>
      </Card>
    </main>
  );
}
