"use client";

import type { AdmissionSignalTier } from "@/lib/calculators/calcAdmissionSignal";

const TIER_LABEL: Record<AdmissionSignalTier, { emoji: string; label: string }> = {
  safe: { emoji: "🟢", label: "안정" },
  moderate: { emoji: "🟡", label: "적정" },
  challenge: { emoji: "🔴", label: "도전" },
};

export type GunSelectorProps = {
  universities: string[];
  gaUniv: string;
  naUniv: string;
  daUniv: string;
  onGaChange: (v: string) => void;
  onNaChange: (v: string) => void;
  onDaChange: (v: string) => void;
  /** 선택된 대학에 대한 정시 신호등(모의고사·규칙이 있을 때만) */
  signalByUniv: Partial<Record<string, AdmissionSignalTier>>;
};

function GunRow(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  universities: string[];
  signal: AdmissionSignalTier | null | undefined;
}) {
  const { label, value, onChange, universities, signal } = props;
  const tierUi = signal ? TIER_LABEL[signal] : null;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 shrink-0 font-medium text-foreground">{label}</div>
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-4">
        <select
          className="border-input bg-background text-foreground focus-visible:ring-ring h-10 w-full min-w-0 rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none sm:max-w-xs"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${label} 대학 선택`}
        >
          <option value="">— 미선택 —</option>
          {universities.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
        <div className="text-muted-foreground text-sm whitespace-nowrap">
          {tierUi ? (
            <span className="text-foreground">
              <span aria-hidden>{tierUi.emoji}</span> {tierUi.label}
            </span>
          ) : value ? (
            <span>신호 계산 불가(모의고사·규칙 확인)</span>
          ) : (
            <span>대학을 선택하면 신호등이 표시됩니다</span>
          )}
        </div>
      </div>
    </div>
  );
}

export function GunSelector({
  universities,
  gaUniv,
  naUniv,
  daUniv,
  onGaChange,
  onNaChange,
  onDaChange,
  signalByUniv,
}: GunSelectorProps) {
  return (
    <div className="space-y-3">
      <GunRow
        label="가군"
        value={gaUniv}
        onChange={onGaChange}
        universities={universities}
        signal={gaUniv ? signalByUniv[gaUniv] : undefined}
      />
      <GunRow
        label="나군"
        value={naUniv}
        onChange={onNaChange}
        universities={universities}
        signal={naUniv ? signalByUniv[naUniv] : undefined}
      />
      <GunRow
        label="다군"
        value={daUniv}
        onChange={onDaChange}
        universities={universities}
        signal={daUniv ? signalByUniv[daUniv] : undefined}
      />
    </div>
  );
}
