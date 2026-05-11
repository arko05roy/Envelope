"use client";

import { useEffect, useRef, useState } from "react";

const steps = [
  {
    number: "I",
    title: "Connect your treasury",
    description:
      "Bring your wallet and your contractor roster. Funds land from any chain or a card, and settle into one treasury you control.",
    panel: {
      heading: "Treasury",
      rows: [
        { label: "Inbound", value: "Any chain · card · bank" },
        { label: "Custody", value: "MPC, no single key" },
        { label: "Roster", value: "Contractors across countries" },
      ],
    },
  },
  {
    number: "II",
    title: "Set the policy",
    description:
      "Salary bands, monthly caps, and co-signers. Compensation figures are encrypted before they touch a database. Reviewers get scoped keys, never the vault.",
    panel: {
      heading: "Policy",
      rows: [
        { label: "Salary bands", value: "Encrypted" },
        { label: "Monthly cap", value: "Enforced on-chain" },
        { label: "Co-signers", value: "Required to release" },
      ],
    },
  },
  {
    number: "III",
    title: "Run payroll",
    description:
      "Approve once. Every contractor is paid in a single shielded batch. The public ledger shows one entry — no names, no amounts, no roster.",
    panel: {
      heading: "Payroll run",
      rows: [
        { label: "Approval", value: "One signature" },
        { label: "Settlement", value: "Shielded batch on Solana" },
        { label: "Public ledger", value: "Sees nothing" },
      ],
    },
  },
];

export function HowItWorksSection() {
  const [activeStep, setActiveStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const active = steps[activeStep];

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      className="relative py-24 lg:py-32 bg-foreground text-background overflow-hidden"
    >
      {/* Diagonal lines pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `repeating-linear-gradient(
              -45deg,
              transparent,
              transparent 40px,
              currentColor 40px,
              currentColor 41px
            )`,
          }}
        />
      </div>

      <div className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-12">
        {/* Header */}
        <div className="mb-16 lg:mb-24">
          <span className="inline-flex items-center gap-3 text-sm font-mono text-background/50 mb-6">
            <span className="w-8 h-px bg-background/30" />
            How it works
          </span>
          <h2
            className={`text-4xl lg:text-6xl font-display tracking-tight transition-all duration-700 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            Three steps.
            <br />
            <span className="text-background/50">One shielded batch.</span>
          </h2>
        </div>

        {/* Main content */}
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24">
          {/* Steps */}
          <div className="space-y-0">
            {steps.map((step, index) => (
              <button
                key={step.number}
                type="button"
                onClick={() => setActiveStep(index)}
                className={`w-full text-left py-8 border-b border-background/10 transition-all duration-500 group ${
                  activeStep === index ? "opacity-100" : "opacity-40 hover:opacity-70"
                }`}
              >
                <div className="flex items-start gap-6">
                  <span className="font-display text-3xl text-background/30">{step.number}</span>
                  <div className="flex-1">
                    <h3 className="text-2xl lg:text-3xl font-display mb-3 group-hover:translate-x-2 transition-transform duration-300">
                      {step.title}
                    </h3>
                    <p className="text-background/60 leading-relaxed">{step.description}</p>

                    {/* Progress indicator */}
                    {activeStep === index && (
                      <div className="mt-4 h-px bg-background/20 overflow-hidden">
                        <div
                          className="h-full bg-background w-0"
                          style={{ animation: "progress 5s linear forwards" }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Visual panel */}
          <div className="lg:sticky lg:top-32 self-start">
            <div className="border border-background/10 overflow-hidden">
              {/* Header */}
              <div className="px-6 py-4 border-b border-background/10 flex items-center justify-between">
                <span className="text-sm font-mono text-background/40">
                  Step {active.number} — {active.panel.heading}
                </span>
                <span className="flex items-center gap-2 text-xs font-mono text-background/40">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  Live
                </span>
              </div>

              {/* Rows */}
              <div className="p-8 min-h-[280px] flex flex-col justify-center">
                <div className="space-y-px">
                  {active.panel.rows.map((row, i) => (
                    <div
                      key={`${active.number}-${row.label}`}
                      className="panel-row-reveal flex items-center justify-between gap-6 py-5 border-b border-background/10 last:border-b-0"
                      style={{ animationDelay: `${i * 90}ms` }}
                    >
                      <span className="text-sm text-background/40 font-mono">{row.label}</span>
                      <span className="text-lg lg:text-xl font-display text-background text-right">
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer dots */}
              <div className="px-6 py-4 border-t border-background/10 flex items-center gap-2">
                {steps.map((s, i) => (
                  <span
                    key={s.number}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === activeStep ? "w-8 bg-background" : "w-1.5 bg-background/20"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes progress {
          from {
            width: 0%;
          }
          to {
            width: 100%;
          }
        }

        .panel-row-reveal {
          opacity: 0;
          transform: translateX(-8px);
          animation: rowReveal 0.45s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        @keyframes rowReveal {
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </section>
  );
}
