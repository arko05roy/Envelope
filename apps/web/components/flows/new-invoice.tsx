"use client";

import { useState } from "react";
import { Button, Card, Label } from "@/components/ui/primitives";
import { useOrg } from "@/lib/hooks/useOrg";
import { api } from "@/lib/api/fetcher";
import type { Invoice } from "@/lib/store";

export function NewInvoiceDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (invoice: Invoice) => void;
}) {
  const { pubkey } = useOrg();
  const [rail, setRail] = useState<"kirapay" | "dodo">("kirapay");
  const [amountUsd, setAmountUsd] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const body: Record<string, unknown> = {
        amountUsd: Number(amountUsd),
        rail,
      };
      if (rail === "dodo") {
        if (!customerEmail) throw new Error("Customer email required for Dodo invoices");
        body.customerEmail = customerEmail;
        if (customerName) body.customerName = customerName;
      }
      if (description) body.description = description;
      const j = await api<{ invoice: Invoice }>(pubkey, "/api/invoices", {
        method: "POST",
        body: JSON.stringify(body),
      });
      onCreated(j.invoice);
      const url = j.invoice.kiraLinkUrl ?? j.invoice.dodoCheckoutUrl;
      if (url) window.open(url, "_blank");
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-ink/40 backdrop-blur-sm">
      <Card className="w-full max-w-md p-7 shadow-lift">
        <div className="flex items-center justify-between">
          <Label>New invoice</Label>
          <button onClick={onClose} className="text-ink-3 hover:text-ink text-[18px] leading-none">×</button>
        </div>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <div>
            <Label>Rail</Label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <RailPick active={rail === "kirapay"} onClick={() => setRail("kirapay")}>
                <div className="text-[14px] font-medium text-ink">Crypto</div>
                <div className="text-[11px] text-ink-2">Pay from any chain</div>
              </RailPick>
              <RailPick active={rail === "dodo"} onClick={() => setRail("dodo")}>
                <div className="text-[14px] font-medium text-ink">Card / fiat</div>
                <div className="text-[11px] text-ink-2">Card · UPI · SEPA</div>
              </RailPick>
            </div>
          </div>

          <Input label="Amount (USD)" value={amountUsd} onChange={setAmountUsd} type="number" placeholder="56" required />

          {rail === "dodo" && (
            <>
              <Input label="Customer email" value={customerEmail} onChange={setCustomerEmail} type="email" placeholder="customer@acme.com" required />
              <Input label="Customer name (optional)" value={customerName} onChange={setCustomerName} placeholder="Acme Inc" />
            </>
          )}

          <Input label="Description (optional)" value={description} onChange={setDescription} placeholder="May 2026 services" />

          {err && <div className="text-[13px] text-negative">{err}</div>}

          <div className="flex gap-2 pt-2">
            <Button type="submit" variant="primary" disabled={busy} className="flex-1">
              {busy ? "Creating…" : "Create invoice"}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

function RailPick({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left px-3 py-2.5 rounded border transition-colors duration-150 ${
        active ? "border-accent bg-accent-soft" : "border-rule hover:border-rule-strong"
      }`}
    >
      {children}
    </button>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <Label>{label}</Label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="mt-2 w-full h-10 px-3 text-[14px] bg-paper border border-rule rounded focus:border-rule-strong focus:outline-none focus:ring-2 focus:ring-accent/20"
      />
    </label>
  );
}
