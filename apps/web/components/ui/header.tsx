import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-rule">
      <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <Logo className="h-5 w-5 text-ink" />
          <span className="font-display text-[18px] tracking-tight">Envelope</span>
        </Link>
        <nav className="flex items-center gap-1">
          <Link
            href="/dashboard"
            className="px-3 h-9 inline-flex items-center text-[13px] text-ink-2 hover:text-ink rounded hover:bg-paper-3 transition-colors duration-150"
          >
            Dashboard
          </Link>
          <Link
            href="/dashboard/payroll"
            className="px-3 h-9 inline-flex items-center text-[13px] text-ink-2 hover:text-ink rounded hover:bg-paper-3 transition-colors duration-150"
          >
            Payroll
          </Link>
          <Link
            href="/dashboard/audit"
            className="px-3 h-9 inline-flex items-center text-[13px] text-ink-2 hover:text-ink rounded hover:bg-paper-3 transition-colors duration-150"
          >
            Audit
          </Link>
          <span className="mx-2 h-5 w-px bg-rule" />
          <Link
            href="/dashboard"
            className="px-3 h-9 inline-flex items-center text-[13px] bg-accent text-paper rounded hover:bg-accent-ink transition-colors duration-150"
          >
            Open app
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Logo({ className = "" }: { className?: string }) {
  // Simple envelope mark — flap suggests an opening seal.
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="1.5" y="4.5" width="17" height="13" rx="1.5" />
      <path d="M1.5 6 L10 12 L18.5 6" />
    </svg>
  );
}
