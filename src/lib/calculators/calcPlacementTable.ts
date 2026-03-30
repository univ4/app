import { calcAdmissionSignal } from "@/lib/calculators/calcAdmissionSignal";

export type PlacementTableRow = {
  univName: string;
  deptName: string;
  cutoff: number;
  gap: number;
};

export type PlacementTableAdmissionInput = {
  univName: string;
  deptName: string;
  cutoffScore: number;
  admissionType: string;
  /** DB `med_shift_coeff`; applied when `applyMedShift` is true */
  medShiftCoeff?: number | null;
};

export type CalcPlacementTableParams = {
  myScore: number;
  admissionRecords: PlacementTableAdmissionInput[];
  /**
   * 의대 증원 등 컷 보정. `true`이면 각 행의 `medShiftCoeff`(없으면 0)를 `calcAdmissionSignal`에 전달한다.
   */
  applyMedShift?: boolean;
  /**
   * 추가 전역 보정(테스트·확장용). `applyMedShift`일 때 각 행 계수에 더해진다.
   */
  medShiftCoeff?: number;
};

export type CalcPlacementTableResult = {
  safe: PlacementTableRow[];
  moderate: PlacementTableRow[];
  challenge: PlacementTableRow[];
};

function assertFinite(n: number, label: string) {
  if (!Number.isFinite(n)) {
    throw new Error(`ValidationError: ${label} must be a finite number.`);
  }
}

function comparePlacementRows(a: PlacementTableRow, b: PlacementTableRow): number {
  if (b.gap !== a.gap) return b.gap - a.gap;
  const u = a.univName.localeCompare(b.univName, "ko");
  if (u !== 0) return u;
  return a.deptName.localeCompare(b.deptName, "ko");
}

/**
 * PRD P2-12 · 매뉴얼 §3.1 — 정시 컷 대비 안정/적정/도전 배치(±5점 밴드, `calcAdmissionSignal`과 동일).
 * `admission_type === "정시"`인 행만 분류한다.
 */
export function calcPlacementTable(params: CalcPlacementTableParams): CalcPlacementTableResult {
  const { myScore, admissionRecords, applyMedShift = false, medShiftCoeff: extraMed = 0 } = params;

  assertFinite(myScore, "myScore");
  assertFinite(extraMed, "medShiftCoeff");

  const safe: PlacementTableRow[] = [];
  const moderate: PlacementTableRow[] = [];
  const challenge: PlacementTableRow[] = [];

  for (const rec of admissionRecords) {
    if (rec.admissionType !== "정시") continue;

    const cutoff = rec.cutoffScore;
    assertFinite(cutoff, "cutoffScore");

    const rowMed =
      applyMedShift && rec.medShiftCoeff != null && Number.isFinite(Number(rec.medShiftCoeff))
        ? Number(rec.medShiftCoeff)
        : 0;
    const med = applyMedShift ? rowMed + extraMed : 0;

    const { signal, gap } = calcAdmissionSignal({
      myScore,
      cutoff,
      scoreType: "suneung",
      medShiftCoeff: med,
    });

    const row: PlacementTableRow = {
      univName: rec.univName,
      deptName: rec.deptName,
      cutoff,
      gap,
    };

    if (signal === "safe") safe.push(row);
    else if (signal === "moderate") moderate.push(row);
    else challenge.push(row);
  }

  safe.sort(comparePlacementRows);
  moderate.sort(comparePlacementRows);
  challenge.sort(comparePlacementRows);

  return { safe, moderate, challenge };
}
