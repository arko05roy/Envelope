"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/primitives";
import { useOrg } from "@/lib/hooks/useOrg";
import { api } from "@/lib/api/fetcher";
import type { Invoice } from "@/lib/store";

type Rail = "kirapay" | "dodo";

export function NewInvoiceDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (invoice: Invoice) => void;
}) {
  const { pubkey } = useOrg();
  const [rail, setRail] = useState<Rail>("kirapay");
  const [amountUsd, setAmountUsd] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => amountRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const amountNum = Number(amountUsd);
  const amountValid = Number.isFinite(amountNum) && amountNum > 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amountValid) {
      setErr("Enter an amount above zero");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const body: Record<string, unknown> = { amountUsd: amountNum, rail };
      if (rail === "dodo") {
        if (!customerEmail) throw new Error("Customer email is required for card invoices");
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
      setErr(e instanceof Error ? e.message : "Couldn't create the invoice");
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-ink/45 backdrop-blur-md"
        style={{
          backgroundImage:
            "radial-gradient(120% 60% at 50% 0%, rgba(42,61,95,0.10), transparent 60%)",
        }}
        aria-hidden
      />

      {/* panel */}
      <div className="dialog-in relative w-full max-w-md">
        <div className="relative overflow-hidden rounded-[18px] border border-rule bg-paper-2 shadow-lift">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/35 to-transparent" />

          <div className="max-h-[92vh] overflow-y-auto p-7">
            {/* header */}
            <div className="flex items-start justify-between gap-4">
              <span className="text-[11px] uppercase tracking-[0.16em] text-ink-3 font-medium">
                New invoice
              </span>
              <button
                onClick={onClose}
                aria-label="Close"
                className="-mr-1 -mt-1 h-7 w-7 rounded-full text-ink-3 transition-colors hover:bg-paper-3 hover:text-ink"
              >
                ×
              </button>
            </div>
            <h2 className="mt-3 font-display text-[26px] leading-[1.15] tracking-tighter text-ink">
              Get paid from any chain —
              <br />
              <span className="text-ink-2">or a card.</span>
            </h2>

            <form onSubmit={submit} className="mt-6 space-y-5">
              {/* rail picker */}
              <div className="grid grid-cols-2 gap-2.5">
                <RailCard
                  active={rail === "kirapay"}
                  onClick={() => setRail("kirapay")}
                  title="Crypto"
                  sub="Pay from any chain"
                />
                <RailCard
                  active={rail === "dodo"}
                  onClick={() => setRail("dodo")}
                  title="Card / fiat"
                  sub="Card · UPI · SEPA"
                />
              </div>

              {/* amount — the headline field */}
              <div>
                <span className="text-[10.5px] uppercase tracking-[0.14em] text-ink-3">
                  Amount (USD)
                </span>
                <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-rule bg-paper px-4 transition-colors focus-within:border-rule-strong focus-within:ring-2 focus-within:ring-accent/15">
                  <span className="select-none font-display text-[22px] leading-none text-ink-3">
                    $
                  </span>
                  <input
                    ref={amountRef}
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={amountUsd}
                    onChange={(e) => setAmountUsd(e.target.value)}
                    placeholder="1,250.00"
                    className="h-14 flex-1 bg-transparent font-display text-[24px] tracking-tight text-ink placeholder:text-ink-4 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                </div>
              </div>

              {rail === "dodo" && (
                <div className="grid grid-cols-1 gap-3">
                  <SmallField
                    label="Customer email"
                    value={customerEmail}
                    onChange={setCustomerEmail}
                    type="email"
                    placeholder="customer@acme.com"
                    required
                  />
                  <SmallField
                    label="Customer name (optional)"
                    value={customerName}
                    onChange={setCustomerName}
                    placeholder="Acme Inc"
                  />
                </div>
              )}

              <SmallField
                label="Description (optional)"
                value={description}
                onChange={setDescription}
                placeholder="May 2026 — design retainer"
              />

              <p className="flex items-start gap-2 text-[12px] leading-relaxed text-ink-3">
                <span className="mt-[1px] text-ink-4">⊕</span>
                {rail === "kirapay"
                  ? "We generate a hosted payment link. The payer can use any token on any chain — funds settle as USDC to your treasury."
                  : "We generate a hosted card checkout. Funds settle as USDC to your treasury after capture."}
              </p>

              {err && <div className="text-[13px] text-negative">{err}</div>}

              <div className="flex gap-2 pt-1">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="flex-1"
                  disabled={busy || !amountValid}
                >
                  {busy ? "Creating…" : "Create invoice →"}
                </Button>
                <Button type="button" variant="ghost" size="lg" onClick={onClose}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <style jsx>{`
        .dialog-in {
          animation: dialogIn 0.32s cubic-bezier(0.2, 0.8, 0.2, 1) both;
        }
        @keyframes dialogIn {
          from {
            opacity: 0;
            transform: translateY(10px) scale(0.985);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}

function RailCard({
  active,
  onClick,
  title,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-3.5 py-3 text-left transition-all duration-150 ${
        active
          ? "border-accent/60 bg-accent-soft ring-2 ring-accent/10"
          : "border-rule bg-paper hover:border-rule-strong"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`h-2 w-2 rounded-full ${active ? "bg-accent" : "bg-ink-4"}`}
          aria-hidden
        />
        <span className="text-[14px] font-medium text-ink">{title}</span>
      </div>
      <div className="mt-1 text-[11.5px] text-ink-3">{sub}</div>
    </button>
  );
}

function SmallField({
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
      <span className="text-[10.5px] uppercase tracking-[0.14em] text-ink-3">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="mt-1.5 h-10 w-full rounded-lg border border-rule bg-paper px-3 text-[14px] text-ink placeholder:text-ink-4 transition-colors focus:border-rule-strong focus:outline-none focus:ring-2 focus:ring-accent/15"
      />
    </label>
  );
}
