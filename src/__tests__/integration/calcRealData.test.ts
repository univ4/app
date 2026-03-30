import { calcAdmissionSignal } from "@/lib/calculators/calcAdmissionSignal";
import { calcAdmissionTrend } from "@/lib/calculators/calcAdmissionTrend";
import {
  calculateSusiGPA,
  type AcademicRecord,
  type SusiGpaRules,
} from "@/lib/calculators/calculateSusiGPA";

describe("calcAdmissionSignal - 실데이터 기반", () => {
  test("컷오프 동일 점수는 moderate", () => {
    const result = calcAdmissionSignal({
      myScore: 665.0,
      cutoff: 665.0,
      scoreType: "suneung",
    });

    expect(result.signal).toBe("moderate");
    expect(result.probability).toBe(0.7);
  });

  test("컷오프 +6점은 safe", () => {
    const result = calcAdmissionSignal({
      myScore: 671.0,
      cutoff: 665.0,
      scoreType: "suneung",
    });

    expect(result.signal).toBe("safe");
    expect(result.probability).toBe(0.85);
  });

  test("컷오프 -6점은 challenge", () => {
    const result = calcAdmissionSignal({
      myScore: 659.0,
      cutoff: 665.0,
      scoreType: "suneung",
    });

    expect(result.signal).toBe("challenge");
    expect(result.probability).toBe(0.4);
  });
});

describe("calculateSusiGPA - 실데이터 기반", () => {
  test("내신 2등급 중심 성적의 가중평균 계산", () => {
    const records: AcademicRecord[] = [
      { subject_name: "국어", credit_unit: 3, school_grade: 2, achievement_level: null },
      { subject_name: "수학", credit_unit: 3, school_grade: 2, achievement_level: null },
      { subject_name: "영어", credit_unit: 2, school_grade: 1, achievement_level: null },
      { subject_name: "과학", credit_unit: 2, school_grade: 3, achievement_level: null },
    ];
    const rules: SusiGpaRules = {
      include_subjects: ["국어", "수학", "영어", "과학"],
      career_choice_conversion: {},
    };

    const subjects = [
      { grade: 2, creditUnit: 3 },
      { grade: 2, creditUnit: 3 },
      { grade: 1, creditUnit: 2 },
      { grade: 3, creditUnit: 2 },
    ];
    const totalCredit = subjects.reduce((sum, x) => sum + x.creditUnit, 0);
    const expected = subjects.reduce((sum, x) => sum + x.grade * x.creditUnit, 0) / totalCredit;

    expect(expected).toBeCloseTo(2.0, 1);
    expect(calculateSusiGPA(records, rules)).toBeCloseTo(2.0, 2);
  });
});

describe("calcAdmissionTrend - 연도별 추이", () => {
  test("2개년 컷오프 상승 추세 감지", () => {
    const records = [
      { year: 2025, cutoffScore: 660.0, competitionRatio: 5.5 },
      { year: 2026, cutoffScore: 665.0, competitionRatio: 6.0 },
    ];

    const result = calcAdmissionTrend({ records });

    expect(result.trend).toBe("stable");
    expect(result.latestCutoff).toBe(665.0);
    expect(result.previousCutoff).toBe(660.0);
  });

  test("2개년 컷오프 3% 이상 상승 → up", () => {
    const records = [
      { year: 2025, cutoffScore: 640.0, competitionRatio: 5.0 },
      { year: 2026, cutoffScore: 660.0, competitionRatio: 6.0 },
    ];

    const result = calcAdmissionTrend({ records });

    expect(result.trend).toBe("up");
  });
});
