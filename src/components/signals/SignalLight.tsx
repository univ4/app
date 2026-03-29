import type { AdmissionSignalTier } from "@/lib/calculators/calcAdmissionSignal";

const TIER_UI: Record<
  AdmissionSignalTier,
  { emoji: string; label: string; tone: string }
> = {
  safe: { emoji: "🟢", label: "안정", tone: "text-emerald-800" },
  moderate: { emoji: "🟡", label: "적정", tone: "text-amber-800" },
  challenge: { emoji: "🔴", label: "도전", tone: "text-red-800" },
};

export type SignalLightProps = {
  signal: AdmissionSignalTier;
  probabilityPercent: number;
  gapLabel: string;
};

export function SignalLight({ signal, probabilityPercent, gapLabel }: SignalLightProps) {
  const ui = TIER_UI[signal];
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
      <span className={`inline-flex items-center gap-1 font-medium ${ui.tone}`}>
        <span aria-hidden>{ui.emoji}</span>
        <span>{ui.label}</span>
      </span>
      <span className="text-muted-foreground text-xs sm:text-sm">
        합격 확률 <span className="font-medium text-foreground">{probabilityPercent}%</span>
      </span>
      <span className="text-muted-foreground text-xs sm:text-sm">차이 {gapLabel}</span>
    </div>
  );
}
