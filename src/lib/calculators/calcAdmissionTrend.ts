/**
 * P2-9 연도별 입결 추이 — Track 1 (매뉴얼 §11: 최근 2개년 컷오프 비교, ±2% 밴드)
 */

export type AdmissionTrendRecord = {
  year: number;
  cutoffScore: number;
  competitionRatio: number;
};

export type CalcAdmissionTrendParams = {
  records: AdmissionTrendRecord[];
  /** 모집단위명 — 의대·의학 계열 여부에 따라 분석 문구 보강 */
  deptName?: string;
};

export type CalcAdmissionTrendResult = {
  trend: "up" | "down" | "stable";
  changeRate: number;
  latestCutoff: number;
  previousCutoff: number;
  analysis: string;
};

const THRESHOLD_PCT = 2;

function isMedicalDept(deptName: string | undefined): boolean {
  if (!deptName?.trim()) return false;
  const s = deptName;
  return /의예|의학|의대|치의|한의|약학|수의/.test(s);
}

function normalizeRecords(records: AdmissionTrendRecord[]): AdmissionTrendRecord[] {
  const byYear = new Map<number, AdmissionTrendRecord>();
  for (const r of records) {
    const y = r.year;
    if (!Number.isInteger(y)) continue;
    if (!Number.isFinite(r.cutoffScore)) continue;
    const cr = Number.isFinite(r.competitionRatio) ? r.competitionRatio : 0;
    byYear.set(y, { year: y, cutoffScore: r.cutoffScore, competitionRatio: cr });
  }
  return [...byYear.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, v]) => v);
}

function buildAnalysis(params: {
  trend: "up" | "down" | "stable";
  changeRate: number;
  latestCutoff: number;
  previousCutoff: number;
  comparable: boolean;
  deptName?: string;
}): string {
  const { trend, changeRate, latestCutoff, previousCutoff, comparable, deptName } = params;

  const baseExternal =
    "의대 증원, 정원·지원자 구조 변화, 전형·반영비 변경 등 외부 요인으로 실제 컷은 추이와 다를 수 있습니다.";

  if (!comparable) {
    return `연도별 컷오프를 비교하려면 최소 2개 학년도의 유효한 컷 데이터가 필요합니다. ${baseExternal}`;
  }

  const rateStr = `${changeRate >= 0 ? "+" : ""}${changeRate.toFixed(2)}%`;
  let direction: string;
  if (trend === "up") {
    direction = "최근 2개년 기준 컷오프가 상승 추세입니다.";
  } else if (trend === "down") {
    direction = "최근 2개년 기준 컷오프가 하락 추세입니다.";
  } else {
    direction = "최근 2개년 기준 컷오프는 큰 변동 없이 유지되는 구간으로 보입니다.";
  }

  const medNote = isMedicalDept(deptName)
    ? " 의·약·치의 등 의료 계열은 증원·수험생 선택 변화의 영향이 특히 클 수 있습니다."
    : "";

  return `${direction} (직전 ${previousCutoff.toFixed(2)}점 → 최신 ${latestCutoff.toFixed(2)}점, 변화율 ${rateStr}).${medNote} ${baseExternal}`;
}

/**
 * 최근 2개년(정렬 후 마지막 두 연도) 컷오프를 비교한다.
 * 변화율 > 2% → up, < -2% → down, 그 외 stable.
 */
export function calcAdmissionTrend(params: CalcAdmissionTrendParams): CalcAdmissionTrendResult {
  const sorted = normalizeRecords(params.records ?? []);

  if (sorted.length === 0) {
    return {
      trend: "stable",
      changeRate: 0,
      latestCutoff: 0,
      previousCutoff: 0,
      analysis: buildAnalysis({
        trend: "stable",
        changeRate: 0,
        latestCutoff: 0,
        previousCutoff: 0,
        comparable: false,
        deptName: params.deptName,
      }),
    };
  }

  if (sorted.length === 1) {
    const only = sorted[0]!;
    return {
      trend: "stable",
      changeRate: 0,
      latestCutoff: only.cutoffScore,
      previousCutoff: only.cutoffScore,
      analysis: buildAnalysis({
        trend: "stable",
        changeRate: 0,
        latestCutoff: only.cutoffScore,
        previousCutoff: only.cutoffScore,
        comparable: false,
        deptName: params.deptName,
      }),
    };
  }

  const prev = sorted[sorted.length - 2]!;
  const latest = sorted[sorted.length - 1]!;
  const previousCutoff = prev.cutoffScore;
  const latestCutoff = latest.cutoffScore;

  if (previousCutoff === 0) {
    return {
      trend: "stable",
      changeRate: 0,
      latestCutoff,
      previousCutoff,
      analysis: buildAnalysis({
        trend: "stable",
        changeRate: 0,
        latestCutoff,
        previousCutoff,
        comparable: false,
        deptName: params.deptName,
      }),
    };
  }

  const changeRate = ((latestCutoff - previousCutoff) / previousCutoff) * 100;

  let trend: "up" | "down" | "stable";
  if (changeRate > THRESHOLD_PCT) {
    trend = "up";
  } else if (changeRate < -THRESHOLD_PCT) {
    trend = "down";
  } else {
    trend = "stable";
  }

  return {
    trend,
    changeRate,
    latestCutoff,
    previousCutoff,
    analysis: buildAnalysis({
      trend,
      changeRate,
      latestCutoff,
      previousCutoff,
      comparable: true,
      deptName: params.deptName,
    }),
  };
}
