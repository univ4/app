import {
  calcSuneungMinimumProbability,
  suneungMinimumRiskLevel,
} from "@/lib/calculators/calcSuneungMinimumProbability";
import { checkSuneungMinimum } from "@/lib/calculators/checkSuneungMinimum";

const baseScores = [
  { subject: "korean", grade: 1 },
  { subject: "math", grade: 2 },
  { subject: "english", grade: 2 },
  { subject: "sci1", grade: 2 },
  { subject: "sci2", grade: 2 },
] as const;

const req3합6 = {
  minGradeSum: 6,
  subjectCount: 3,
  hankoSaRequired: false,
  englishMaxGrade: 2 as const,
};

describe("suneungMinimumRiskLevel", () => {
  it("경계: 0.78 이상 safe, 0.5~0.78 caution, 50% 미만 danger", () => {
    expect(suneungMinimumRiskLevel(0.78)).toBe("safe");
    expect(suneungMinimumRiskLevel(0.779)).toBe("caution");
    expect(suneungMinimumRiskLevel(0.5)).toBe("caution");
    expect(suneungMinimumRiskLevel(0.499)).toBe("danger");
    expect(suneungMinimumRiskLevel(0)).toBe("danger");
  });
});

describe("calcSuneungMinimumProbability", () => {
  it("충족 확실: 회차 추이로 분산을 낮추면 높은 확률·safe", () => {
    const r = calcSuneungMinimumProbability({
      scores: [...baseScores],
      requirement: req3합6,
      trend: [
        { subject: "korean", grades: [1, 1, 1] },
        { subject: "math", grades: [2, 2, 2] },
        { subject: "english", grades: [2, 2, 2] },
        { subject: "sci1", grades: [2, 2, 2] },
        { subject: "sci2", grades: [2, 2, 2] },
      ],
      sampleCount: 12_000,
      seed: 7,
    });
    expect(r.probability).toBeGreaterThan(0.92);
    expect(r.riskLevel).toBe("safe");
    expect(r.expectedGradeSum).toBe(5);
  });

  it("미충족: 등급이 높아 기대합이 기준을 크게 초과 → 낮은 확률·danger", () => {
    const r = calcSuneungMinimumProbability({
      scores: [
        { subject: "korean", grade: 7 },
        { subject: "math", grade: 8 },
        { subject: "english", grade: 8 },
        { subject: "sci1", grade: 8 },
      ],
      requirement: {
        minGradeSum: 6,
        subjectCount: 3,
        hankoSaRequired: false,
        englishMaxGrade: 2,
      },
      sampleCount: 6000,
      seed: 11,
    });
    expect(r.probability).toBeLessThan(0.15);
    expect(r.riskLevel).toBe("danger");
    expect(r.expectedGradeSum).toBeGreaterThan(6);
  });

  it("한국사 포함: 한국사 불충족 시 확률 하락", () => {
    const withoutHanko = calcSuneungMinimumProbability({
      scores: [
        { subject: "korean", grade: 2 },
        { subject: "math", grade: 2 },
        { subject: "sci1", grade: 2 },
        { subject: "hankosa", grade: 3 },
      ],
      requirement: {
        minGradeSum: 6,
        subjectCount: 3,
        hankoSaRequired: false,
      },
      sampleCount: 10_000,
      seed: 99,
    });
    const withHanko = calcSuneungMinimumProbability({
      scores: [
        { subject: "korean", grade: 2 },
        { subject: "math", grade: 2 },
        { subject: "sci1", grade: 2 },
        { subject: "hankosa", grade: 3 },
      ],
      requirement: {
        minGradeSum: 6,
        subjectCount: 3,
        hankoSaRequired: true,
        hankoSaMaxGrade: 2,
      },
      sampleCount: 10_000,
      seed: 99,
    });
    expect(withHanko.probability).toBeLessThanOrEqual(withoutHanko.probability);
    expect(withHanko.probability).toBeLessThan(0.95);
  });

  it("추이 반영: 추이 분산이 크면 단일 점수만 쓸 때와 확률이 달라짐", () => {
    const pointOnly = calcSuneungMinimumProbability({
      scores: [
        { subject: "korean", grade: 3 },
        { subject: "math", grade: 3 },
        { subject: "sci1", grade: 3 },
      ],
      requirement: { minGradeSum: 9, subjectCount: 3, hankoSaRequired: false },
      sampleCount: 15_000,
      seed: 3,
    });
    const withTrend = calcSuneungMinimumProbability({
      scores: [
        { subject: "korean", grade: 3 },
        { subject: "math", grade: 3 },
        { subject: "sci1", grade: 3 },
      ],
      requirement: { minGradeSum: 9, subjectCount: 3, hankoSaRequired: false },
      trend: [{ subject: "korean", grades: [1, 2, 3, 4, 5] }],
      sampleCount: 15_000,
      seed: 3,
    });
    expect(withTrend.probability).not.toBe(pointOnly.probability);
  });

  it("checkSuneungMinimum과 동일 규칙: 기대 합 기준점에서 본체 충족과 정합", () => {
    const grades = { korean: 1, math: 2, english: 2, sci1: 2, sci2: 2 };
    const rule = {
      condition: "3개합6" as const,
      subjects: ["korean", "math", "sci1", "sci2"] as string[],
      english_limit: 2 as const,
    };
    expect(checkSuneungMinimum(grades, rule).satisfied).toBe(true);
    const r = calcSuneungMinimumProbability({
      scores: [...baseScores],
      requirement: req3합6,
      sampleCount: 5000,
      seed: 42,
    });
    expect(r.expectedGradeSum).toBe(5);
    expect(r.probability).toBeGreaterThan(0.5);
  });

  it("엣지: subjectCount가 과목 수보다 크면 ValidationError", () => {
    expect(() =>
      calcSuneungMinimumProbability({
        scores: [
          { subject: "korean", grade: 2 },
          { subject: "math", grade: 2 },
        ],
        requirement: {
          minGradeSum: 4,
          subjectCount: 3,
          hankoSaRequired: false,
        },
      }),
    ).toThrow(/ValidationError/);
  });

  it("엣지: englishMaxGrade만 있고 영어 점수 없으면 ValidationError", () => {
    expect(() =>
      calcSuneungMinimumProbability({
        scores: [
          { subject: "korean", grade: 2 },
          { subject: "math", grade: 2 },
          { subject: "sci1", grade: 2 },
        ],
        requirement: {
          minGradeSum: 6,
          subjectCount: 3,
          hankoSaRequired: false,
          englishMaxGrade: 2,
        },
      }),
    ).toThrow(/englishMaxGrade requires an english score/);
  });

  it("엣지: 잘못된 sampleCount", () => {
    expect(() =>
      calcSuneungMinimumProbability({
        scores: [...baseScores],
        requirement: req3합6,
        sampleCount: 0,
      }),
    ).toThrow(/ValidationError/);
  });
});
