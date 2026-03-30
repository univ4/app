import type { AdmissionSignalTier } from "@/lib/calculators/calcAdmissionSignal";
import { CheckCircle2, MinusCircle, XCircle } from "lucide-react";

import { UncertaintyBadge } from "./UncertaintyBadge";

const TIER_UI: Record<
  AdmissionSignalTier,
  { label: string; tone: string; bgTone: string; Icon: typeof CheckCircle2 }
> = {
  safe: { label: "안정", tone: "text-emerald-600", bgTone: "bg-emerald-50", Icon: CheckCircle2 },
  moderate: { label: "적정", tone: "text-amber-500", bgTone: "bg-amber-50", Icon: MinusCircle },
  challenge: { label: "도전", tone: "text-rose-600", bgTone: "bg-rose-50", Icon: XCircle },
};

export type SignalLightProps = {
  signal: AdmissionSignalTier;
  probabilityPercent: number;
  gapLabel: string;
};

export function SignalLight({ signal, probabilityPercent, gapLabel }: SignalLightProps) {
  const ui = TIER_UI[signal];
  const signalAriaLabel = `신호등 ${ui.label}`;
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
      <span
        aria-label={signalAriaLabel}
        className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium ${ui.tone} ${ui.bgTone}`}
      >
        <ui.Icon aria-hidden className="size-4" />
        <span>{ui.label}</span>
      </span>
      <span className="text-muted-foreground text-xs sm:text-sm">
        합격 확률 <span className="font-medium text-foreground">{probabilityPercent}%</span>
      </span>
      <UncertaintyBadge />
      <span className="text-muted-foreground text-xs sm:text-sm">차이 {gapLabel}</span>
    </div>
  );
}
