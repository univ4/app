import { checkSuneungMinimum } from "@/lib/calculators/checkSuneungMinimum";

describe("checkSuneungMinimum", () => {
  it("Happy Path 1: 3개합6 충족 (국1/수1/영2/과탐1_1/과탐2_1)", () => {
    const result = checkSuneungMinimum(
      { korean: 1, math: 1, english: 2, sci1: 1, sci2: 1 },
      {
        condition: "3개합6",
        subjects: ["korean", "math", "sci1", "sci2"],
        english_limit: 2,
      },
    );

    expect(result.best_combination).toEqual(["korean", "math", "sci1"]);
    expect(result.achieved_sum).toBe(3);
    expect(result.required_sum).toBe(6);
    expect(result.gap).toBe(-3);
    expect(result.satisfied).toBe(true);
    expect(result.english_satisfied).toBe(true);
  });

  it("Happy Path 2: 2개합4 충족 (동급 조합 허용)", () => {
    const result = checkSuneungMinimum(
      { korean: 2, math: 2, english: 2, sci1: 2, sci2: 2 },
      {
        condition: "2개합4",
        subjects: ["math", "sci1", "korean", "sci2"],
        english_limit: 2,
      },
    );

    expect(result.achieved_sum).toBe(4);
    expect(result.required_sum).toBe(4);
    expect(result.gap).toBe(0);
    expect(result.satisfied).toBe(true);
    expect(result.best_combination.length).toBe(2);
    expect(["math", "sci1", "korean", "sci2"]).toEqual(
      expect.arrayContaining(result.best_combination),
    );
  });

  it("Edge Case 3: 3개합6 미충족", () => {
    const result = checkSuneungMinimum(
      { korean: 3, math: 2, english: 3, sci1: 2, sci2: 3 },
      {
        condition: "3개합6",
        subjects: ["korean", "math", "sci1", "sci2"],
        english_limit: 3,
      },
    );

    expect(result.achieved_sum).toBe(7);
    expect(result.gap).toBe(1);
    expect(result.satisfied).toBe(false);
  });

  it("Edge Case 4: 본 조건 충족 but english_limit 미충족", () => {
    const result = checkSuneungMinimum(
      { korean: 1, math: 1, english: 3, sci1: 1, sci2: 1 },
      {
        condition: "3개합6",
        subjects: ["korean", "math", "sci1", "sci2"],
        english_limit: 2,
      },
    );

    expect(result.achieved_sum).toBe(3);
    expect(result.english_satisfied).toBe(false);
    expect(result.satisfied).toBe(false);
  });

  it("Edge Case 5: english_limit이 null이면 영어 조건 무시", () => {
    const result = checkSuneungMinimum(
      { korean: 1, math: 1, english: 9, sci1: 1, sci2: 1 },
      {
        condition: "3개합6",
        subjects: ["korean", "math", "sci1", "sci2"],
        english_limit: null,
      },
    );

    expect(result.english_satisfied).toBe(true);
    expect(result.satisfied).toBe(true);
  });

  it("경계값 6: gap=0 이면 satisfied=true", () => {
    const result = checkSuneungMinimum(
      { korean: 2, math: 2, english: 2, sci1: 3, sci2: 3 },
      {
        condition: "2개합4",
        subjects: ["korean", "math", "sci1", "sci2"],
        english_limit: 2,
      },
    );

    expect(result.gap).toBe(0);
    expect(result.satisfied).toBe(true);
  });

  it("경계값 7: subjects가 2개인데 3개합6이면 조합 불가", () => {
    const result = checkSuneungMinimum(
      { korean: 1, math: 1, english: 1, sci1: 1, sci2: 1 },
      {
        condition: "3개합6",
        subjects: ["korean", "math"],
        english_limit: 2,
      },
    );

    expect(result.best_combination).toEqual([]);
    expect(result.achieved_sum).toBe(Number.POSITIVE_INFINITY);
    expect(result.satisfied).toBe(false);
  });

  describe("ONE_GRADE (예: 1개1등급)", () => {
    it("happy: 후보 중 최저 등급이 1이면 충족", () => {
      const result = checkSuneungMinimum(
        { korean: 2, math: 1, english: 2, sci1: 3, sci2: 3 },
        {
          condition: "1개1등급",
          subjects: ["korean", "math", "sci1"],
          english_limit: 2,
        },
      );
      expect(result.satisfied).toBe(true);
      expect(result.best_combination).toEqual(["math"]);
      expect(result.achieved_sum).toBe(1);
    });

    it("엣지: 모든 후보 등급이 2 이상이면 미충족", () => {
      const result = checkSuneungMinimum(
        { korean: 2, math: 2, english: 1, sci1: 2, sci2: 2 },
        {
          condition: "1개1등급",
          subjects: ["korean", "math"],
          english_limit: 2,
        },
      );
      expect(result.satisfied).toBe(false);
      expect(result.achieved_sum).toBe(2);
    });
  });
});
