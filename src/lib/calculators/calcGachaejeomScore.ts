/**
 * P1-10 수능 가채점(원점수) → 표준점수·백분위 추정 (Track 1, 근사).
 * 원점수 분포는 2026학년도 가정 상수(평균·표준편차·만점)로 두고,
 * 표준점수는 수능 관례에 맞춰 평균 100·표준편차 20 스케일로 선형 변환합니다.
 */

export const GACHAEJEOM_WARNING =
  "가채점 기반 추정값입니다. 실제 성적과 다를 수 있습니다.";

export type GachaejeomKoreanMathSubject = {
  rawScore: number;
  subject: string;
};

export type GachaejeomScienceSubject = {
  rawScore: number;
  subjectName: string;
};

export type CalcGachaejeomScoreParams = {
  korean: GachaejeomKoreanMathSubject;
  math: GachaejeomKoreanMathSubject;
  english: { grade: number };
  science1: GachaejeomScienceSubject;
  science2: GachaejeomScienceSubject;
};

export type GachaejeomEstimatedArea = {
  standardScore: number;
  percentile: number;
};

export type CalcGachaejeomScoreResult = {
  estimatedScores: {
    korean: GachaejeomEstimatedArea;
    math: GachaejeomEstimatedArea;
    science1: GachaejeomEstimatedArea;
    science2: GachaejeomEstimatedArea;
  };
  warning: string;
};

/** 국어 원점수 분포 (만점 150) */
const KOREAN_RAW = { mean: 63, sd: 16, maxRaw: 150 } as const;
/** 수학 원점수 분포 (만점 150) */
const MATH_RAW = { mean: 68, sd: 20, maxRaw: 150 } as const;
/** 탐구 원점수 분포 (과목당 만점 75) */
const SCI_RAW = { mean: 50, sd: 10, maxRaw: 75 } as const;

const STD_CENTER = 100;
const STD_SCALE = 20;
const STD_MIN = 20;
const STD_MAX = 180;

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/** 표준정규 누적분포 Φ(z) — Abramowitz–Stegun 근사 */
export function standardNormalCdf(z: number): number {
  if (!Number.isFinite(z)) return 0.5;
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const erfApprox =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-x * x);
  const phi = 0.5 * (1 + sign * erfApprox);
  return clamp(phi, 0, 1);
}

function assertLabel(s: string, field: string) {
  if (typeof s !== "string" || s.trim().length === 0) {
    throw new Error(`ValidationError: ${field} must be a non-empty string.`);
  }
}

function assertFiniteNumber(n: unknown, field: string) {
  if (typeof n !== "number" || !Number.isFinite(n)) {
    throw new Error(`ValidationError: ${field} must be a finite number.`);
  }
}

function rawToEstimated(
  raw: number,
  mean: number,
  sd: number,
  maxRaw: number,
): GachaejeomEstimatedArea {
  const r = clamp(raw, 0, maxRaw);
  const z = sd > 0 ? (r - mean) / sd : 0;
  const standardScore = clamp(STD_CENTER + STD_SCALE * z, STD_MIN, STD_MAX);
  const percentile = clamp(standardNormalCdf(z) * 100, 0.01, 99.99);
  return {
    standardScore: Number(standardScore.toFixed(2)),
    percentile: Number(percentile.toFixed(2)),
  };
}

/**
 * 가채점 원점수로부터 표준점수·백분위(근사)를 산출합니다.
 * `english.grade`는 절대평가 등급으로, 본 함수에서는 환산에 쓰이지 않고 API·UI에서 `calculateSuneungScore` 입력으로 넘깁니다.
 */
export function calcGachaejeomScore(params: CalcGachaejeomScoreParams): CalcGachaejeomScoreResult {
  assertFiniteNumber(params.korean?.rawScore, "korean.rawScore");
  assertFiniteNumber(params.math?.rawScore, "math.rawScore");
  assertFiniteNumber(params.english?.grade, "english.grade");
  assertFiniteNumber(params.science1?.rawScore, "science1.rawScore");
  assertFiniteNumber(params.science2?.rawScore, "science2.rawScore");

  assertLabel(params.korean?.subject ?? "", "korean.subject");
  assertLabel(params.math?.subject ?? "", "math.subject");
  assertLabel(params.science1?.subjectName ?? "", "science1.subjectName");
  assertLabel(params.science2?.subjectName ?? "", "science2.subjectName");

  const eg = params.english.grade;
  if (!Number.isInteger(eg) || eg < 1 || eg > 9) {
    throw new Error("ValidationError: english.grade must be an integer from 1 to 9.");
  }

  return {
    estimatedScores: {
      korean: rawToEstimated(params.korean.rawScore, KOREAN_RAW.mean, KOREAN_RAW.sd, KOREAN_RAW.maxRaw),
      math: rawToEstimated(params.math.rawScore, MATH_RAW.mean, MATH_RAW.sd, MATH_RAW.maxRaw),
      science1: rawToEstimated(params.science1.rawScore, SCI_RAW.mean, SCI_RAW.sd, SCI_RAW.maxRaw),
      science2: rawToEstimated(params.science2.rawScore, SCI_RAW.mean, SCI_RAW.sd, SCI_RAW.maxRaw),
    },
    warning: GACHAEJEOM_WARNING,
  };
}
