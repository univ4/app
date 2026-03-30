export interface CalcRealCompetitionRateParams {
  /** 명목 경쟁률 (0 이상) */
  nominalRate: number;
  /** 수능최저 충족률 0~1 (수능최저 없음 가정 시 1) */
  suneungMinimumRate: number;
  /** 결시율 0~1, 생략 시 0.1 (PRD P1-3 기본 가정) */
  absenceRate?: number;
}

export interface CalcRealCompetitionRateResult {
  /** 실질 경쟁률 = 명목 × 수능최저 충족률 × (1 − 결시율) */
  realRate: number;
  nominalRate: number;
  /** 명목 − 실질 */
  diffRate: number;
}

const DEFAULT_ABSENCE = 0.1;

function assertFinite(name: string, v: number): void {
  if (typeof v !== "number" || !Number.isFinite(v)) {
    throw new Error(`ValidationError: ${name} must be a finite number.`);
  }
}

/**
 * 논술전형 실질 경쟁률 (PRD v2 P1-3).
 * `실질 경쟁률 = 명목 경쟁률 × 수능최저 충족률 × (1 - 결시율)`
 */
export function calcRealCompetitionRate(
  params: CalcRealCompetitionRateParams,
): CalcRealCompetitionRateResult {
  const { nominalRate, suneungMinimumRate } = params;
  const absenceRate = params.absenceRate ?? DEFAULT_ABSENCE;

  assertFinite("nominalRate", nominalRate);
  assertFinite("suneungMinimumRate", suneungMinimumRate);
  assertFinite("absenceRate", absenceRate);

  if (nominalRate < 0) {
    throw new Error("ValidationError: nominalRate must be >= 0.");
  }
  if (suneungMinimumRate < 0 || suneungMinimumRate > 1) {
    throw new Error("ValidationError: suneungMinimumRate must be in [0, 1].");
  }
  if (absenceRate < 0 || absenceRate > 1) {
    throw new Error("ValidationError: absenceRate must be in [0, 1].");
  }

  const realRate = nominalRate * suneungMinimumRate * (1 - absenceRate);
  const diffRate = nominalRate - realRate;

  return {
    realRate,
    nominalRate,
    diffRate,
  };
}
