import { calcAdmissionSignal } from "@/lib/calculators/calcAdmissionSignal";
import { calcAdmissionTodos } from "@/lib/calculators/calcAdmissionTodos";
import { calcDDay } from "@/lib/calculators/calcDDay";
import { calcIntegratedStrategy } from "@/lib/calculators/calcIntegratedStrategy";
import { calcNapchiRisk } from "@/lib/calculators/calcNapchiRisk";
import { calcPlacementTable } from "@/lib/calculators/calcPlacementTable";
import { calcPortfolioRisk } from "@/lib/calculators/calcPortfolioRisk";
import { calculateSuneungScore } from "@/lib/calculators/calculateSuneungScore";
import {
  calculateSusiGPA,
  type AcademicRecord,
  type SusiGpaRules,
} from "@/lib/calculators/calculateSusiGPA";

describe("통합 플로우 테스트", () => {
  test("플로우 1: 성적 -> 신호등 계산", () => {
    const records: AcademicRecord[] = [
      { subject_name: "국어", credit_unit: 3, school_grade: 2, achievement_level: null },
      { subject_name: "수학", credit_unit: 3, school_grade: 2, achievement_level: null },
      { subject_name: "영어", credit_unit: 2, school_grade: 2, achievement_level: null },
    ];
    const rules: SusiGpaRules = {
      include_subjects: ["국어", "수학", "영어"],
      career_choice_conversion: {},
    };

    const gpa = calculateSusiGPA(records, rules);
    const signal = calcAdmissionSignal({
      myScore: gpa,
      cutoff: 2.3,
      scoreType: "gpa",
    });

    expect(gpa).toBeCloseTo(2.0, 2);
    expect(["moderate", "safe"]).toContain(signal.signal);
  });

  test("플로우 2: 수능 점수 -> 배치표", () => {
    const myScore = calculateSuneungScore(
      {
        korean_standard_score: 160,
        math_standard_score: 170,
        english_grade: 1,
        sci1_standard_score: 170,
        sci2_standard_score: 170,
      },
      {
        korean_ratio: 1,
        math_ratio: 1,
        english_ratio: 1,
        science_ratio: 1,
        science_2_bonus: 0,
        english_conversion_table: { "1": 170 },
      },
    );

    const placement = calcPlacementTable({
      myScore: myScore ?? 0,
      admissionRecords: [
        { univName: "A대", deptName: "공학", admissionType: "정시", cutoffScore: 660 },
        { univName: "B대", deptName: "공학", admissionType: "정시", cutoffScore: 670 },
        { univName: "C대", deptName: "공학", admissionType: "정시", cutoffScore: 678 },
      ],
    });

    const total = placement.safe.length + placement.moderate.length + placement.challenge.length;
    expect(myScore).toBe(670);
    expect(total).toBe(3);
    expect(
      [placement.safe.length, placement.moderate.length, placement.challenge.length].some(
        (count) => count > 0,
      ),
    ).toBe(true);
  });

  test("플로우 3: 포트폴리오 -> 통합 전략", () => {
    const cards = [
      {
        university: "서강대",
        department: "공학",
        admissionType: "학생부교과",
        signal: "safe" as const,
        hasSuneungMinimum: true,
      },
      {
        university: "한양대",
        department: "공학",
        admissionType: "학생부교과",
        signal: "moderate" as const,
        hasSuneungMinimum: true,
      },
      {
        university: "중앙대",
        department: "공학",
        admissionType: "학생부종합",
        signal: "challenge" as const,
        hasSuneungMinimum: false,
      },
      {
        university: "건국대",
        department: "공학",
        admissionType: "학생부교과",
        signal: "challenge" as const,
        hasSuneungMinimum: false,
      },
      {
        university: "홍익대",
        department: "공학",
        admissionType: "학생부교과",
        signal: "moderate" as const,
        hasSuneungMinimum: false,
      },
      {
        university: "아주대",
        department: "공학",
        admissionType: "학생부교과",
        signal: "safe" as const,
        hasSuneungMinimum: false,
      },
    ];

    const portfolio = calcPortfolioRisk({ cards });
    const napchi = calcNapchiRisk({
      card: { university: "서강대", signal: "safe" },
      suneungSignals: [
        { university: "성균관대", signal: "safe" },
        { university: "서강대", signal: "moderate" },
      ],
    });
    const integrated = calcIntegratedStrategy({
      susiCards: cards.map((c) => ({
        university: c.university,
        admissionType: c.admissionType,
        signal: c.signal,
      })),
      suneungScore: 670,
      jeongsiSignals: [
        { university: "성균관대", signal: "safe" },
        { university: "한양대", signal: "moderate" },
      ],
    });

    expect(["balanced", "aggressive", "too_safe"]).toContain(portfolio.riskLevel);
    expect(["low", "medium", "high"]).toContain(napchi.riskLevel);
    expect(integrated.napchiRisks.length).toBe(6);
    expect(integrated.allFailScenario.message.length).toBeGreaterThan(0);
  });

  test("플로우 4: D-Day -> TO-DO 생성", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, "0");
    const dd = String(tomorrow.getDate()).padStart(2, "0");
    const targetDate = `${yyyy}-${mm}-${dd}`;

    const dday = calcDDay(targetDate);
    const todos = calcAdmissionTodos({
      targetDate,
      eventType: "원서접수",
      dday: dday.dday,
    });

    expect(dday.dday).toBe(1);
    expect(dday.label).toBe("D-1");
    expect(todos.todos.length).toBeGreaterThan(0);
    expect(todos.todos.every((todo) => todo.category)).toBe(true);
  });
});
