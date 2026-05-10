import Link from "next/link";
import { WalletButton } from "./wallet-button";

export function SiteHeader() {
  return (
    <header className="border-b border-rule">
      <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <Logo className="h-5 w-5 text-ink" />
          <span className="font-display text-[18px] tracking-tight">Envelope</span>
        </Link>
        <nav className="flex items-center gap-1">
          <NavLink href="/dashboard">Dashboard</NavLink>
          <NavLink href="/dashboard/contractors">People</NavLink>
          <NavLink href="/dashboard/payroll">Payroll</NavLink>
          <span className="mx-2 h-5 w-px bg-rule" />
          <WalletButton />
        </nav>
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="px-3 h-9 inline-flex items-center text-[13px] text-ink-2 hover:text-ink rounded hover:bg-paper-3 transition-colors duration-150">
      {children}
    </Link>
  );
}

function Logo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="1.5" y="4.5" width="17" height="13" rx="1.5" />
      <path d="M1.5 6 L10 12 L18.5 6" />
    </svg>
  );
}
