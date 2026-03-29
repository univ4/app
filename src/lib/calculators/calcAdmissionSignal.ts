export type AdmissionSignalTier = "safe" | "moderate" | "challenge";

export type CalcAdmissionSignalParams = {
  myScore: number;
  cutoff: number;
  scoreType: "suneung" | "gpa";
  /** 컷오프에 가산되는 보정(예: 의대 증원 연쇄). 음수면 컷이 내려가 유리해짐. */
  medShiftCoeff?: number;
};

export type CalcAdmissionSignalResult = {
  signal: AdmissionSignalTier;
  /** P1-17 구간 대표 확률(0~1): 안정 0.85, 적정 0.70, 도전 0.40 */
  probability: number;
  /** 내 점수 − 컷오프(교과·수능 공통; 등급은 낮을수록 유리) */
  gap: number;
};

function assertFinite(n: number, label: string) {
  if (!Number.isFinite(n)) {
    throw new Error(`ValidationError: ${label} must be a finite number.`);
  }
}

/**
 * 매뉴얼 §3.1 · PRD P0-4 / P1-17 — 입결 컷 대비 신호등·대표 확률.
 * 수능: ±5점 밴드, 교과: ±0.3등급 밴드(낮은 등급이 유리).
 */
export function calcAdmissionSignal(
  params: CalcAdmissionSignalParams,
): CalcAdmissionSignalResult {
  const { myScore, cutoff, scoreType, medShiftCoeff = 0 } = params;

  assertFinite(myScore, "myScore");
  assertFinite(cutoff, "cutoff");
  assertFinite(medShiftCoeff, "medShiftCoeff");

  const adjustedCutoff = Number((cutoff + medShiftCoeff).toFixed(4));
  const gap = Number((myScore - cutoff).toFixed(4));

  if (scoreType === "suneung") {
    if (myScore > adjustedCutoff + 5) {
      return { signal: "safe", probability: 0.85, gap };
    }
    if (myScore < adjustedCutoff - 5) {
      return { signal: "challenge", probability: 0.4, gap };
    }
    return { signal: "moderate", probability: 0.7, gap };
  }

  if (myScore < adjustedCutoff - 0.3) {
    return { signal: "safe", probability: 0.85, gap };
  }
  if (myScore > adjustedCutoff + 0.3) {
    return { signal: "challenge", probability: 0.4, gap };
  }
  return { signal: "moderate", probability: 0.7, gap };
}
