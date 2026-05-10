/**
 * Envelope UI primitives.
 *
 * Intentionally tiny — we want consistency without a UI library.
 * Use these instead of inline classes everywhere.
 */
import * as React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  asChild?: boolean;
};

export function Button({
  variant = "secondary",
  size = "md",
  className = "",
  ...rest
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 font-medium transition-colors duration-150 ease-out disabled:opacity-50 disabled:pointer-events-none";
  const sizes: Record<string, string> = {
    sm: "h-8 px-3 text-[13px] rounded",
    md: "h-10 px-4 text-[14px] rounded",
    lg: "h-11 px-5 text-[15px] rounded-lg",
  };
  const variants: Record<string, string> = {
    primary: "bg-accent text-paper hover:bg-accent-ink",
    secondary:
      "bg-paper-2 text-ink border border-rule hover:bg-paper-3 hover:border-rule-strong",
    ghost: "text-ink-2 hover:text-ink hover:bg-paper-3",
  };
  return <button {...rest} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} />;
}

export function Card({
  children,
  className = "",
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: React.ElementType;
}) {
  return (
    <Tag className={`bg-paper-2 border border-rule rounded-lg ${className}`}>{children}</Tag>
  );
}

export function Label({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`text-[11px] uppercase tracking-[0.12em] text-ink-3 font-medium ${className}`}
    >
      {children}
    </span>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 text-[12px] text-ink-2">
      <span className="h-px w-6 bg-ink-3" />
      {children}
    </span>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: "default" | "positive" | "warning";
}) {
  const toneCls =
    tone === "positive" ? "text-positive" : tone === "warning" ? "text-warning" : "text-ink";
  return (
    <Card className="p-5">
      <Label>{label}</Label>
      <div className={`mt-3 text-[28px] font-display leading-none num ${toneCls}`}>{value}</div>
      {hint && <div className="mt-3 text-[13px] text-ink-2">{hint}</div>}
    </Card>
  );
}

export function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "positive" | "warning" | "negative" | "accent";
}) {
  const toneCls = {
    neutral: "bg-paper-3 text-ink-2 border-rule",
    positive: "bg-positive-soft text-positive border-positive/20",
    warning: "bg-warning-soft text-warning border-warning/20",
    negative: "bg-negative-soft text-negative border-negative/20",
    accent: "bg-accent-soft text-accent-ink border-accent/15",
  }[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 h-6 text-[11px] font-medium rounded border ${toneCls}`}
    >
      {children}
    </span>
  );
}

export function HRule({ className = "" }: { className?: string }) {
  return <hr className={`border-0 h-px bg-rule ${className}`} />;
}
