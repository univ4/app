import {
  calculateSuneungScore,
  type SuneungScores,
  type UniversityScoringRules,
} from "@/lib/calculators/calculateSuneungScore";

const baseScores: SuneungScores = {
  korean_standard_score: 131,
  math_standard_score: 145,
  english_grade: 2,
  sci1_standard_score: 68,
  sci2_standard_score: 65,
  sci2_is_type_two: true,
};

const baseRules: UniversityScoringRules = {
  korean_ratio: 0.2,
  math_ratio: 0.35,
  english_ratio: 0.1,
  science_ratio: 0.35,
  science_2_bonus: 0.03,
  english_conversion_table: {
    "1": 100,
    "2": 96,
    "3": 92,
  },
};

describe("calculateSuneungScore", () => {
  it("calculates score with science2 bonus", () => {
    expect(calculateSuneungScore(baseScores, baseRules)).toBe(111.78);
  });

  it("reflects difference between English grade 1 and 2 conversion", () => {
    const grade1 = calculateSuneungScore(
      { ...baseScores, english_grade: 1 },
      baseRules,
    );
    const grade2 = calculateSuneungScore(
      { ...baseScores, english_grade: 2 },
      baseRules,
    );
    expect(grade1).toBeGreaterThan(grade2);
  });

  it("works without science2 bonus when bonus is zero", () => {
    const result = calculateSuneungScore(baseScores, {
      ...baseRules,
      science_2_bonus: 0,
    });
    expect(result).toBe(109.83);
  });

  it("returns null when English conversion mapping is missing and english_ratio > 0", () => {
    expect(calculateSuneungScore({ ...baseScores, english_grade: 9 }, baseRules)).toBeNull();
  });

  it("treats missing English mapping as zero when english_ratio is 0", () => {
    const score = calculateSuneungScore(
      { ...baseScores, english_grade: 9 },
      { ...baseRules, english_ratio: 0 },
    );
    expect(score).not.toBeNull();
    expect(score).toBe(102.17);
  });

  it("throws ValidationError when rules are invalid", () => {
    expect(() =>
      calculateSuneungScore(baseScores, {
        ...baseRules,
        math_ratio: Number.NaN,
      }),
    ).toThrow("ValidationError");
  });

  describe("엣지: 표준점수 경계값", () => {
    it("국어·수학·과탐 표준점수 0이어도 유한 환산점수 반환", () => {
      const zeroSci: SuneungScores = {
        korean_standard_score: 0,
        math_standard_score: 0,
        english_grade: 2,
        sci1_standard_score: 0,
        sci2_standard_score: 0,
        sci2_is_type_two: false,
      };
      const v = calculateSuneungScore(zeroSci, baseRules);
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
    });

    it("과탐 만점에 가까운 값에서도 유한값", () => {
      const high: SuneungScores = {
        ...baseScores,
        sci1_standard_score: 70,
        sci2_standard_score: 70,
        sci2_is_type_two: true,
      };
      expect(Number.isFinite(calculateSuneungScore(high, baseRules))).toBe(true);
    });
  });
});
