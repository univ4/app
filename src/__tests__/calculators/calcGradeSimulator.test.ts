import { calcGradeSimulator } from "@/lib/calculators/calcGradeSimulator";

describe("calcGradeSimulator", () => {
  const base = (
    overrides: Partial<Parameters<typeof calcGradeSimulator>[0]> = {},
  ) =>
    calcGradeSimulator({
      currentSubjects: [
        {
          subjectName: "국어",
          currentGrade: 3,
          creditUnit: 2,
          semester: "3-1",
        },
      ],
      targetGrades: [{ subjectName: "국어", targetGrade: 2 }],
      ...overrides,
    });

  it("단일 과목 등급 향상 시 평균이 목표 등급으로 반영된다", () => {
    const r = base();
    expect(r.currentAvgGrade).toBe(3);
    expect(r.simulatedAvgGrade).toBe(2);
    expect(r.gradeChange).toBe(-1);
    expect(r.improvableSubjects[0]?.gradeImpact).toBeCloseTo(1, 5);
  });

  it("고단위 과목 향상의 평균 개선 효과가 저단위 과목보다 크다", () => {
    const r = calcGradeSimulator({
      currentSubjects: [
        { subjectName: "수학", currentGrade: 4, creditUnit: 5, semester: "3-1" },
        { subjectName: "체육", currentGrade: 4, creditUnit: 1, semester: "3-1" },
      ],
      targetGrades: [
        { subjectName: "수학", targetGrade: 2 },
        { subjectName: "체육", targetGrade: 2 },
      ],
    });
    const math = r.improvableSubjects.find((x) => x.subjectName === "수학");
    const pe = r.improvableSubjects.find((x) => x.subjectName === "체육");
    expect(math && pe && math.gradeImpact > pe.gradeImpact).toBe(true);
  });

  it("목표 등급이 현재와 같으면 평균·변화량이 없다", () => {
    const r = calcGradeSimulator({
      currentSubjects: [
        { subjectName: "영어", currentGrade: 3, creditUnit: 2, semester: "3-1" },
      ],
      targetGrades: [{ subjectName: "영어", targetGrade: 3 }],
    });
    expect(r.gradeChange).toBe(0);
    expect(r.simulatedAvgGrade).toBe(r.currentAvgGrade);
    expect(r.improvableSubjects[0]?.gradeImpact).toBe(0);
  });

  it("컷오프가 있으면 신호등 변화를 반환한다 (challenge → moderate)", () => {
    const r = calcGradeSimulator({
      currentSubjects: [
        { subjectName: "국어", currentGrade: 4, creditUnit: 2, semester: "3-1" },
        { subjectName: "수학", currentGrade: 4, creditUnit: 2, semester: "3-1" },
      ],
      targetGrades: [
        { subjectName: "국어", targetGrade: 3 },
        { subjectName: "수학", targetGrade: 3 },
      ],
      cutoffGrade: 3,
    });
    expect(r.currentAvgGrade).toBe(4);
    expect(r.simulatedAvgGrade).toBe(3);
    expect(r.signalChange?.before).toBe("challenge");
    expect(r.signalChange?.after).toBe("moderate");
  });

  it("빈 과목 목록이면 ValidationError", () => {
    expect(() =>
      calcGradeSimulator({
        currentSubjects: [],
        targetGrades: [],
      }),
    ).toThrow(/currentSubjects must not be empty/);
  });

  it("학기별 목표 등급이 동일 과목명 행에 각각 적용된다", () => {
    const r = calcGradeSimulator({
      currentSubjects: [
        { subjectName: "국어", currentGrade: 4, creditUnit: 2, semester: "2-1" },
        { subjectName: "국어", currentGrade: 3, creditUnit: 2, semester: "3-1" },
      ],
      targetGrades: [
        { subjectName: "국어", targetGrade: 2, semester: "2-1" },
        { subjectName: "국어", targetGrade: 2, semester: "3-1" },
      ],
    });
    expect(r.simulatedAvgGrade).toBe(2);
  });

  it("단위수 0인 행은 제외하고, 전부 0이면 ValidationError", () => {
    expect(() =>
      calcGradeSimulator({
        currentSubjects: [
          { subjectName: "A", currentGrade: 3, creditUnit: 0, semester: "3-1" },
        ],
        targetGrades: [],
      }),
    ).toThrow(/at least one subject with creditUnit > 0/);
  });

  it("currentSubjects·targetGrades가 배열이 아니면 ValidationError", () => {
    expect(() =>
      calcGradeSimulator({
        currentSubjects: null as never,
        targetGrades: [],
      }),
    ).toThrow(/currentSubjects must be an array/);

    expect(() =>
      calcGradeSimulator({
        currentSubjects: [
          { subjectName: "국어", currentGrade: 3, creditUnit: 2, semester: "3-1" },
        ],
        targetGrades: null as never,
      }),
    ).toThrow(/targetGrades must be an array/);
  });

  it("목표 등급이 유한수가 아니면 ValidationError", () => {
    expect(() =>
      calcGradeSimulator({
        currentSubjects: [
          { subjectName: "국어", currentGrade: 3, creditUnit: 2, semester: "3-1" },
        ],
        targetGrades: [{ subjectName: "국어", targetGrade: Number.NaN }],
      }),
    ).toThrow(/targetGrade/);
  });
});
