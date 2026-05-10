"use client";

import { useState } from "react";
import { Button, Card, Eyebrow, Label } from "@/components/ui/primitives";

export function OnboardingDialog({
  initialName,
  onSave,
}: {
  initialName: string;
  onSave: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState(initialName);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErr("Enter your organization name");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await onSave(name.trim());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <Card className="p-8 shadow-lift">
        <Eyebrow>Welcome</Eyebrow>
        <h1 className="mt-4 font-display text-[32px] leading-tight tracking-tighter">
          What&apos;s your organization called?
        </h1>
        <p className="mt-3 text-[14px] text-ink-2 leading-relaxed">
          This appears on invoices and contractor claim pages. You can change it later.
        </p>
        <form onSubmit={submit} className="mt-7 space-y-4">
          <div>
            <Label>Organization name</Label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Labs"
              className="mt-2 w-full h-11 px-3 text-[15px] bg-paper border border-rule rounded focus:border-rule-strong focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
          {err && <div className="text-[13px] text-negative">{err}</div>}
          <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy}>
            {busy ? "Saving…" : "Continue →"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
