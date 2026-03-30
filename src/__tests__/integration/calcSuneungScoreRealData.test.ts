import {
  calculateSuneungScore,
  type SuneungScores,
  type UniversityScoringRules,
} from "@/lib/calculators/calculateSuneungScore";
import { checkSuneungMinimum } from "@/lib/calculators/checkSuneungMinimum";

describe("calculateSuneungScore 실데이터 검증", () => {
  test("건국대 자연계열 환산점수 계산", () => {
    const rule: UniversityScoringRules = {
      korean_ratio: 0.25,
      math_ratio: 0.35,
      english_ratio: 0.2,
      science_ratio: 0.2,
      science_2_bonus: 0.03,
      english_conversion_table: { "1": 200, "2": 195, "3": 187 },
    };
    const input: SuneungScores = {
      korean_standard_score: 130,
      math_standard_score: 140,
      english_grade: 2,
      sci1_standard_score: 65,
      sci2_standard_score: 68,
      sci2_is_type_two: true,
    };

    const result = calculateSuneungScore(input, rule);
    expect(result).not.toBeNull();

    expect(result!).toBeGreaterThan(120);
    expect(result!).toBeLessThan(170);

    const resultWithoutBonus = calculateSuneungScore(input, {
      ...rule,
      science_2_bonus: 0,
    });
    expect(resultWithoutBonus).not.toBeNull();
    expect(result!).toBeGreaterThan(resultWithoutBonus!);
  });

  test("영어 1등급 vs 2등급 환산점수 차이", () => {
    const rule: UniversityScoringRules = {
      korean_ratio: 0.25,
      math_ratio: 0.35,
      english_ratio: 0.2,
      science_ratio: 0.2,
      science_2_bonus: 0,
      english_conversion_table: { "1": 200, "2": 195, "3": 187 },
    };
    const base: Omit<SuneungScores, "english_grade"> = {
      korean_standard_score: 130,
      math_standard_score: 140,
      sci1_standard_score: 65,
      sci2_standard_score: 65,
      sci2_is_type_two: false,
    };

    const score1 = calculateSuneungScore({ ...base, english_grade: 1 }, rule);
    const score2 = calculateSuneungScore({ ...base, english_grade: 2 }, rule);
    expect(score1).not.toBeNull();
    expect(score2).not.toBeNull();
    expect(score1!).toBeGreaterThan(score2!);
  });

  test("수능최저 2개합5 충족 여부", () => {
    const grades = { korean: 2, math: 3, english: 2, sci1: 3, sci2: 4 };
    const result = checkSuneungMinimum(grades, {
      condition: "2개합5",
      subjects: ["korean", "math", "english", "sci1", "sci2"],
      english_limit: null,
    });

    expect(result.satisfied).toBe(true);
    expect(result.best_combination).toEqual(["korean", "english"]);
    expect(result.required_sum).toBe(5);
  });
});
