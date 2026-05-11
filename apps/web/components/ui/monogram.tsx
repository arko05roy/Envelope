/**
 * Deterministic gradient monogram — same seed always yields the same look.
 * Used as a workspace / treasury avatar. Size via className (h-/w-/text-).
 */
function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function initialsOf(label: string, seed: string): string {
  const words = label.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  if (words.length === 1 && words[0].length >= 2) return words[0].slice(0, 2).toUpperCase();
  if (words.length === 1) return words[0][0].toUpperCase();
  return seed.slice(0, 2).toUpperCase();
}

export function Monogram({
  seed,
  label,
  className = "h-10 w-10 text-[15px]",
  rounded = "rounded-xl",
}: {
  seed: string;
  label?: string;
  className?: string;
  rounded?: string;
}) {
  const h = hashSeed(seed || "envelope");
  const hue = h % 360;
  const hue2 = (hue + 34) % 360;
  const bg = `linear-gradient(140deg, hsl(${hue} 46% 44%), hsl(${hue2} 52% 28%))`;
  return (
    <div
      aria-hidden
      className={`${rounded} ${className} relative flex shrink-0 select-none items-center justify-center overflow-hidden font-display tracking-tight text-paper`}
      style={{ background: bg }}
    >
      <span
        className="pointer-events-none absolute inset-0 opacity-25"
        style={{ background: "radial-gradient(120% 90% at 25% 15%, rgba(255,255,255,0.5), transparent 55%)" }}
      />
      <span className="relative">{initialsOf(label ?? "", seed || "")}</span>
    </div>
  );
}
