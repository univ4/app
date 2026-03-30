import { calcNsuStrategy } from "@/lib/calculators/calcNsuStrategy";
import { calcPlacementTable } from "@/lib/calculators/calcPlacementTable";
import { calcScienceComboSimulator } from "@/lib/calculators/calcScienceComboSimulator";

describe("계산 전용 API 통합 테스트", () => {
  test("calcPlacementTable - 실제 컷오프 데이터 범위 검증", () => {
    const records = [
      { univName: "건국대", deptName: "경영학과", cutoffScore: 663.11, admissionType: "정시" },
      { univName: "건국대", deptName: "컴퓨터공학부", cutoffScore: 671.0, admissionType: "정시" },
      { univName: "건국대", deptName: "수학과", cutoffScore: 667.13, admissionType: "정시" },
    ];

    const result = calcPlacementTable({
      myScore: 665.0,
      admissionRecords: records,
    });

    expect(result.safe.length + result.moderate.length + result.challenge.length).toBe(
      records.length,
    );
    expect(result.moderate.find((r) => r.deptName === "경영학과")).toBeDefined();
    expect(result.challenge.find((r) => r.deptName === "컴퓨터공학부")).toBeDefined();
  });

  test("calcNsuStrategy - 재수생 정시 집중 전략", () => {
    const result = calcNsuStrategy({
      nsuYear: 1,
      suneungScore: 670,
      prevScore: 660,
      targetType: "jeongsi",
    });
    expect(result.jeongsiAdvantage).toBe(true);
    expect(result.recommendedStrategy).toContain("정시");
  });

  test("calcScienceComboSimulator - 과탐II 조합 가산점", () => {
    const rules = [
      { univName: "건국대", science2Bonus: 0.03, mathRatio: 0.35 },
      { univName: "서강대", science2Bonus: 0, mathRatio: 0.4 },
    ];
    const result = calcScienceComboSimulator({
      combo: { science1: "화학II", science2: "생명과학II" },
      scoringRules: rules,
    });
    expect(result.isSci2Combo).toBe(true);
    expect(result.advantageUnivs.find((u) => u.univName === "건국대")).toBeDefined();
  });
});
