import {
  calcRecordGapAnalysis,
  detectGibupGap,
} from "@/lib/calculators/calcRecordGapAnalysis";

const s500 = "가".repeat(500);
const s200 = "나".repeat(200);
const s300 = "다".repeat(300);

function baseGoodActivities() {
  return [
    { activityType: "자율활동", hours: 10, content: s200, grade: 1 },
    { activityType: "동아리활동", hours: 10, content: s200, grade: 1 },
    { activityType: "진로활동", hours: 10, content: s200, grade: 1 },
  ];
}

describe("calcRecordGapAnalysis", () => {
  it("모든 항목 양호", () => {
    const res = calcRecordGapAnalysis({
      subjectNotes: [{ subjectName: "국어", note: s500, grade: 1 }],
      activities: baseGoodActivities(),
      awards: [{ awardName: "교내 수학경시", grade: 1 }],
      behavior: [{ content: s300, grade: 3 }],
    });

    const critical = res.items.filter((i) => i.status === "critical");
    expect(critical).toHaveLength(0);
    expect(res.criticalCount).toBe(0);
    expect(res.overallScore).toBe(100);
  });

  it("세특 미입력 → critical", () => {
    const res = calcRecordGapAnalysis({
      subjectNotes: [{ subjectName: "수학", note: "", grade: 1 }],
      activities: baseGoodActivities(),
      awards: [{ awardName: "a", grade: 1 }],
      behavior: [{ content: s300, grade: 2 }],
    });

    const row = res.items.find((i) => i.section === "세특 (수학)");
    expect(row?.status).toBe("critical");
    expect(row?.message).toContain("미입력");
    expect(res.criticalCount).toBeGreaterThanOrEqual(1);
  });

  it("세특 200자 미만 → warning", () => {
    const res = calcRecordGapAnalysis({
      subjectNotes: [{ subjectName: "영어", note: "가".repeat(150), grade: 2 }],
      activities: baseGoodActivities(),
      awards: [{ awardName: "a", grade: 1 }],
      behavior: [{ content: s300, grade: 2 }],
    });

    const row = res.items.find((i) => i.section === "세특 (영어)");
    expect(row?.status).toBe("warning");
    expect(row?.message).toContain("200자 미만");
  });

  it("창체 미입력 → critical (영역별)", () => {
    const res = calcRecordGapAnalysis({
      subjectNotes: [{ subjectName: "국어", note: s500, grade: 1 }],
      activities: [],
      awards: [{ awardName: "a", grade: 1 }],
      behavior: [{ content: s300, grade: 2 }],
    });

    const 창체 = res.items.filter((i) => i.section.startsWith("창체"));
    expect(창체).toHaveLength(3);
    expect(창체.every((i) => i.status === "critical")).toBe(true);
  });

  it("수상경력 0건 → critical", () => {
    const res = calcRecordGapAnalysis({
      subjectNotes: [{ subjectName: "국어", note: s500, grade: 1 }],
      activities: baseGoodActivities(),
      awards: [],
      behavior: [{ content: s300, grade: 2 }],
    });

    const row = res.items.find((i) => i.section === "수상경력");
    expect(row?.status).toBe("critical");
    expect(row?.message).toContain("수상");
  });

  it("detectGibupGap 는 calcRecordGapAnalysis 와 동일 결과", () => {
    const params = {
      subjectNotes: [] as { subjectName: string; note: string; grade: number }[],
      activities: baseGoodActivities(),
      awards: [] as { awardName: string; grade: number }[],
      behavior: [] as { content: string; grade: number }[],
    };
    expect(detectGibupGap(params)).toEqual(calcRecordGapAnalysis(params));
  });

  it("세특 200자 이상 500자 미만 → 500자 미만 경고", () => {
    const note = "가".repeat(250);
    const res = calcRecordGapAnalysis({
      subjectNotes: [{ subjectName: "과학", note, grade: 1 }],
      activities: baseGoodActivities(),
      awards: [{ awardName: "a", grade: 1 }],
      behavior: [{ content: s300, grade: 2 }],
    });
    const row = res.items.find((i) => i.section === "세특 (과학)");
    expect(row?.status).toBe("warning");
    expect(row?.message).toContain("500자 미만");
  });

  it("창체 100자 미만·199자 구간 경고", () => {
    const resShort = calcRecordGapAnalysis({
      subjectNotes: [{ subjectName: "국어", note: s500, grade: 1 }],
      activities: [
        { activityType: "자율활동", hours: 0, content: "가".repeat(40), grade: 1 },
        { activityType: "동아리활동", hours: 0, content: s200, grade: 1 },
        { activityType: "진로활동", hours: 0, content: s200, grade: 1 },
      ],
      awards: [{ awardName: "a", grade: 1 }],
      behavior: [{ content: s300, grade: 2 }],
    });
    const 자율 = resShort.items.find((i) => i.section === "창체 (자율)");
    expect(자율?.message).toContain("100자 미만");

    const resMid = calcRecordGapAnalysis({
      subjectNotes: [{ subjectName: "국어", note: s500, grade: 1 }],
      activities: [
        { activityType: "자율활동", hours: 0, content: "나".repeat(150), grade: 1 },
        { activityType: "동아리활동", hours: 0, content: s200, grade: 1 },
        { activityType: "진로활동", hours: 0, content: s200, grade: 1 },
      ],
      awards: [{ awardName: "a", grade: 1 }],
      behavior: [{ content: s300, grade: 2 }],
    });
    const 자율2 = resMid.items.find((i) => i.section === "창체 (자율)");
    expect(자율2?.message).toContain("200자 미만");
  });

  it("행동특성 빈 문자열·짧은 글 경고", () => {
    const resCrit = calcRecordGapAnalysis({
      subjectNotes: [{ subjectName: "국어", note: s500, grade: 1 }],
      activities: baseGoodActivities(),
      awards: [{ awardName: "a", grade: 1 }],
      behavior: [{ content: "   ", grade: 1 }],
    });
    const b = resCrit.items.find((i) => i.section === "행동특성 (1학년)");
    expect(b?.status).toBe("critical");

    const resW = calcRecordGapAnalysis({
      subjectNotes: [{ subjectName: "국어", note: s500, grade: 1 }],
      activities: baseGoodActivities(),
      awards: [{ awardName: "a", grade: 1 }],
      behavior: [{ content: "가".repeat(50), grade: 2 }],
    });
    const b2 = resW.items.find((i) => i.section === "행동특성 (2학년)");
    expect(b2?.status).toBe("warning");
    expect(b2?.message).toContain("100자 미만");

    const resW2 = calcRecordGapAnalysis({
      subjectNotes: [{ subjectName: "국어", note: s500, grade: 1 }],
      activities: baseGoodActivities(),
      awards: [{ awardName: "a", grade: 1 }],
      behavior: [{ content: "나".repeat(150), grade: 3 }],
    });
    const b3 = resW2.items.find((i) => i.section === "행동특성 (3학년)");
    expect(b3?.status).toBe("warning");
    expect(b3?.message).toContain("300자 미만");
  });
});
