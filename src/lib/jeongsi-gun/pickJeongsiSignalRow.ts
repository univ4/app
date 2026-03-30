import type { AdmissionSignalTier } from "@/lib/calculators/calcAdmissionSignal";
import type { SignalScanRow } from "@/lib/signals/buildAdmissionSignalRows";

export type PickedJeongsiSignal = {
  signal: AdmissionSignalTier;
  probability: number;
  probability_percent: number;
  gap: number;
};

/**
 * 신호등 스캔 결과에서 대학별 대표 정시 행 1건(동일 대학 다행 시 id 오름차순 첫 행).
 */
export function pickJeongsiSignalForUniv(
  items: SignalScanRow[],
  univName: string,
): PickedJeongsiSignal | null {
  const trimmed = univName.trim();
  if (!trimmed) return null;
  const rows = items.filter(
    (r) => r.university_name === trimmed && r.admission_type === "정시",
  );
  if (rows.length === 0) return null;
  const sorted = [...rows].sort((a, b) => a.id - b.id);
  const row = sorted[0]!;
  return {
    signal: row.signal,
    probability: row.probability,
    probability_percent: row.probability_percent,
    gap: row.gap,
  };
}
