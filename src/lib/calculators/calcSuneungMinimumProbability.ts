import {
  type SuneungGrades,
  type SuneungMinimumRule,
  checkSuneungMinimum,
} from "@/lib/calculators/checkSuneungMinimum";

/** 국·수·영·탐1·탐2 (수능최저 ‘N개합’ 풀). */
export type SumEligibleSubject = "korean" | "math" | "english" | "sci1" | "sci2";

export interface SuneungMinimumProbabilityScore {
  subject: string;
  grade: number;
}

export interface SuneungMinimumProbabilityRequirement {
  minGradeSum: number;
  subjectCount: number;
  hankoSaRequired: boolean;
  hankoSaMaxGrade?: number;
  /**
   * (선택) 영어 최대 허용 등급(이하). 미주입 시 `checkSuneungMinimum`의 `english_limit` 없음.
   * DB `english_limit`과 동일 의미.
   */
  englishMaxGrade?: number | null;
}

export interface SuneungMinimumProbabilityTrend {
  subject: string;
  grades: number[];
}

export interface CalcSuneungMinimumProbabilityParams {
  scores: SuneungMinimumProbabilityScore[];
  requirement: SuneungMinimumProbabilityRequirement;
  trend?: SuneungMinimumProbabilityTrend[];
  /**
   * `N개합` 조합에 쓰는 과목 풀(국·수·영·탐 등). 미지정 시 `scores`의 hankosa 제외 전부.
   * 영어는 `englishMaxGrade`만 있고 합산 풀에 없을 때 `scores`에만 포함하면 된다.
   */
  subjectsForSum?: string[];
  /** 몬테카를로 표본 수 (기본 10_000). */
  sampleCount?: number;
  /** 재현용 시드 (기본 1). */
  seed?: number;
}

export interface CalcSuneungMinimumProbabilityResult {
  probability: number;
  expectedGradeSum: number;
  riskLevel: "safe" | "caution" | "danger";
}

export interface GradeDistribution {
  mean: number;
  stddev: number;
}

const DEFAULT_STDDEV = 0.85;
const MIN_STDDEV = 0.12;
const MC_DEFAULT = 10_000;
const MC_MAX = 1_000_000;
const DEFAULT_HANKO_MAX = 4;

const SUBJECT_ALIASES: Record<string, SumEligibleSubject | "hankosa"> = {
  korean: "korean",
  math: "math",
  english: "english",
  sci1: "sci1",
  sci2: "sci2",
  hankosa: "hankosa",
  국어: "korean",
  국: "korean",
  수학: "math",
  수: "math",
  영어: "english",
  영: "english",
  탐구1: "sci1",
  탐구2: "sci2",
  한국사: "hankosa",
  korean_history: "hankosa",
};

function normalizeSubject(raw: string): SumEligibleSubject | "hankosa" | null {
  const k = raw.trim().toLowerCase();
  return SUBJECT_ALIASES[k] ?? SUBJECT_ALIASES[raw.trim()] ?? null;
}

function assertGradeScale(label: string, g: number): void {
  if (!Number.isFinite(g)) {
    throw new Error(`ValidationError: ${label} grade must be finite.`);
  }
  if (g < 1 || g > 9) {
    throw new Error(`ValidationError: ${label} grade must be between 1 and 9.`);
  }
}

function mean(vals: number[]): number {
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function sampleStddev(vals: number[]): number {
  if (vals.length < 2) return DEFAULT_STDDEV;
  const m = mean(vals);
  const v = vals.reduce((s, x) => s + (x - m) ** 2, 0) / (vals.length - 1);
  return Math.max(MIN_STDDEV, Math.sqrt(v));
}

/** Mulberry32 PRNG (결정론적 몬테카를로). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normalRandom(rand: () => number, mu: number, sigma: number): number {
  const u1 = Math.max(rand(), Number.EPSILON);
  const u2 = rand();
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mu + sigma * z0;
}

function sampleDiscreteGrade(rand: () => number, dist: GradeDistribution): number {
  const g = Math.round(normalRandom(rand, dist.mean, dist.stddev));
  return Math.min(9, Math.max(1, g));
}

export function suneungMinimumRiskLevel(probability: number): "safe" | "caution" | "danger" {
  if (!Number.isFinite(probability)) {
    throw new Error("ValidationError: probability must be finite.");
  }
  const p = Math.min(1, Math.max(0, probability));
  if (p >= 0.78) return "safe";
  if (p >= 0.5) return "caution";
  return "danger";
}

function buildSuneungGradesFromSampled(sampled: Map<SumEligibleSubject, number>): SuneungGrades {
  const d = (s: SumEligibleSubject) => sampled.get(s) ?? 9;
  return {
    korean: d("korean"),
    math: d("math"),
    english: d("english"),
    sci1: d("sci1"),
    sci2: d("sci2"),
  };
}

function expectedBestSum(
  means: Map<SumEligibleSubject, number>,
  pool: SumEligibleSubject[],
  pick: number,
): number {
  const sorted = [...pool].sort((a, b) => (means.get(a) ?? 9) - (means.get(b) ?? 9));
  const take = sorted.slice(0, pick);
  return take.reduce((s, sub) => s + (means.get(sub) ?? 9), 0);
}

/**
 * 모의고사 과목별 등급(및 선택적 회차 추이)을 과목당 정규분포로 두고,
 * 몬테카를로로 `N개합`·영어·한국사 조건 동시 충족 확률을 추정한다 (Track1, LLM 없음).
 */
function isSumEligibleKey(k: string): k is SumEligibleSubject {
  return k === "korean" || k === "math" || k === "english" || k === "sci1" || k === "sci2";
}

export function calcSuneungMinimumProbability(
  params: CalcSuneungMinimumProbabilityParams,
): CalcSuneungMinimumProbabilityResult {
  const { scores, requirement, trend, subjectsForSum } = params;
  const sampleCount = params.sampleCount ?? MC_DEFAULT;
  const seed = params.seed ?? 1;

  if (!Array.isArray(scores) || scores.length === 0) {
    throw new Error("ValidationError: scores must be a non-empty array.");
  }
  if (
    !Number.isInteger(requirement.subjectCount) ||
    requirement.subjectCount < 1 ||
    requirement.subjectCount > 5
  ) {
    throw new Error("ValidationError: requirement.subjectCount must be an integer 1–5.");
  }
  if (!Number.isFinite(requirement.minGradeSum) || requirement.minGradeSum < 1) {
    throw new Error("ValidationError: requirement.minGradeSum must be >= 1.");
  }
  if (!Number.isInteger(sampleCount) || sampleCount < 1 || sampleCount > MC_MAX) {
    throw new Error(`ValidationError: sampleCount must be an integer 1–${MC_MAX}.`);
  }

  const trendMap = new Map<SumEligibleSubject | "hankosa", number[]>();
  for (const t of trend ?? []) {
    const key = normalizeSubject(t.subject);
    if (!key) {
      throw new Error(`ValidationError: unknown trend subject "${t.subject}".`);
    }
    if (!Array.isArray(t.grades) || t.grades.length === 0) {
      throw new Error("ValidationError: trend.grades must be a non-empty array when trend is given.");
    }
    for (const g of t.grades) assertGradeScale(`trend.${t.subject}`, g);
    trendMap.set(key, t.grades);
  }

  const byKey = new Map<SumEligibleSubject | "hankosa", number>();
  for (const row of scores) {
    const key = normalizeSubject(row.subject);
    if (!key) {
      throw new Error(`ValidationError: unknown subject "${row.subject}".`);
    }
    assertGradeScale(row.subject, row.grade);
    if (byKey.has(key)) {
      throw new Error(`ValidationError: duplicate subject "${row.subject}".`);
    }
    byKey.set(key, row.grade);
  }

  if (requirement.hankoSaRequired) {
    if (!byKey.has("hankosa")) {
      throw new Error("ValidationError: hankoSaRequired but no 한국사 score in scores.");
    }
  }

  let sumPool: SumEligibleSubject[];
  if (subjectsForSum != null && subjectsForSum.length > 0) {
    sumPool = [];
    const seen = new Set<string>();
    for (const raw of subjectsForSum) {
      const k = normalizeSubject(raw);
      if (!k || k === "hankosa") {
        throw new Error(`ValidationError: invalid subjectsForSum entry "${raw}".`);
      }
      if (!isSumEligibleKey(k)) {
        throw new Error(`ValidationError: subjectsForSum must use sum-eligible subjects, got "${raw}".`);
      }
      if (!byKey.has(k)) {
        throw new Error(`ValidationError: subjectsForSum includes "${raw}" but no score for it.`);
      }
      if (seen.has(k)) continue;
      seen.add(k);
      sumPool.push(k);
    }
  } else {
    sumPool = [];
    for (const k of byKey.keys()) {
      if (k !== "hankosa") sumPool.push(k);
    }
  }

  if (sumPool.length < requirement.subjectCount) {
    throw new Error(
      "ValidationError: not enough subjects in sum pool for requirement.subjectCount.",
    );
  }

  const dists = new Map<SumEligibleSubject | "hankosa", GradeDistribution>();
  const means = new Map<SumEligibleSubject, number>();

  for (const key of byKey.keys()) {
    const point = byKey.get(key)!;
    const series = trendMap.get(key);
    const mu = series ? mean(series) : point;
    const sigma = series ? sampleStddev(series) : DEFAULT_STDDEV;
    dists.set(key, { mean: mu, stddev: sigma });
    if (key !== "hankosa") means.set(key, mu);
  }

  if (
    requirement.englishMaxGrade != null &&
    requirement.englishMaxGrade !== undefined &&
    !byKey.has("english")
  ) {
    throw new Error("ValidationError: englishMaxGrade requires an english score in scores.");
  }

  const rule: SuneungMinimumRule = {
    condition: `${requirement.subjectCount}개합${requirement.minGradeSum}`,
    subjects: [...sumPool],
    english_limit:
      requirement.englishMaxGrade == null || requirement.englishMaxGrade === undefined
        ? null
        : requirement.englishMaxGrade,
  };

  const hankoMax = requirement.hankoSaMaxGrade ?? DEFAULT_HANKO_MAX;
  const rand = mulberry32(seed);
  let satisfiedCount = 0;

  const sampleSubjects: SumEligibleSubject[] = [];
  for (const k of byKey.keys()) {
    if (isSumEligibleKey(k)) sampleSubjects.push(k);
  }

  for (let i = 0; i < sampleCount; i += 1) {
    const sampled = new Map<SumEligibleSubject, number>();
    for (const sub of sampleSubjects) {
      const d = dists.get(sub)!;
      sampled.set(sub, sampleDiscreteGrade(rand, d));
    }

    const grades = buildSuneungGradesFromSampled(sampled);
    const ok = checkSuneungMinimum(grades, rule).satisfied;

    let hankoOk = true;
    if (requirement.hankoSaRequired) {
      const hd = dists.get("hankosa")!;
      const hg = sampleDiscreteGrade(rand, hd);
      hankoOk = hg <= hankoMax;
    }

    if (ok && hankoOk) satisfiedCount += 1;
  }

  const probability = satisfiedCount / sampleCount;
  const expectedGradeSum = expectedBestSum(means, sumPool, requirement.subjectCount);

  return {
    probability,
    expectedGradeSum,
    riskLevel: suneungMinimumRiskLevel(probability),
  };
}

/**
 * DB `suneung_minimum.subjects`와 `SuneungGrades`로 `calcSuneungMinimumProbability`용 `scores` 배열을 만든다.
 * 인식하지 못하는 과목 키는 건너뛴다.
 */
export function probabilityScoresFromRuleSubjects(
  grades: SuneungGrades,
  ruleSubjects: string[],
): SuneungMinimumProbabilityScore[] {
  const out: SuneungMinimumProbabilityScore[] = [];
  const seen = new Set<string>();
  for (const sub of ruleSubjects) {
    if (seen.has(sub)) continue;
    seen.add(sub);
    switch (sub) {
      case "korean":
        out.push({ subject: "korean", grade: grades.korean });
        break;
      case "math":
        out.push({ subject: "math", grade: grades.math });
        break;
      case "english":
        out.push({ subject: "english", grade: grades.english });
        break;
      case "sci1":
        out.push({ subject: "sci1", grade: grades.sci1 });
        break;
      case "sci2":
        out.push({ subject: "sci2", grade: grades.sci2 });
        break;
      default:
        break;
    }
  }
  return out;
}
