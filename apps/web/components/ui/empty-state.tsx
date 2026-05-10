import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="px-8 py-16 text-center">
      <div className="mx-auto h-10 w-10 rounded-full border border-rule-strong flex items-center justify-center">
        <svg viewBox="0 0 16 16" className="h-4 w-4 text-ink-3" fill="none" stroke="currentColor" strokeWidth="1.4">
          <rect x="2" y="3.5" width="12" height="9" rx="1" />
          <path d="M2 4.5 L8 9 L14 4.5" />
        </svg>
      </div>
      <h3 className="mt-5 font-display text-[22px] tracking-tight">{title}</h3>
      {description && <p className="mt-2 text-[14px] text-ink-2 max-w-md mx-auto leading-relaxed">{description}</p>}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}

export function ConnectWalletState() {
  return (
    <EmptyState
      title="Connect your wallet"
      description="Envelope uses your wallet as your account. Connect Phantom or Solflare to continue."
    />
  );
}
