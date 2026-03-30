import { calcNsuStrategy } from "@/lib/calculators/calcNsuStrategy";

describe("calcNsuStrategy", () => {
  it("재수 1년 + 점수 향상 → 정시 강화·정시 유리", () => {
    const r = calcNsuStrategy({
      nsuYear: 1,
      prevScore: 400,
      suneungScore: 420,
      gpa: 2.5,
      targetType: "jeongsi",
    });
    expect(r.jeongsiAdvantage).toBe(true);
    expect(r.scoreImprovement).toBe(20);
    expect(r.recommendedStrategy).toContain("20");
    expect(r.recommendedStrategy).toContain("상승");
    expect(r.susiCaution.length).toBeGreaterThanOrEqual(2);
  });

  it("재수 1년 + 점수 하락 → 수시 분산·정시 불리", () => {
    const r = calcNsuStrategy({
      nsuYear: 1,
      prevScore: 430,
      suneungScore: 410,
      gpa: 2.8,
      targetType: "both",
    });
    expect(r.jeongsiAdvantage).toBe(false);
    expect(r.scoreImprovement).toBe(-20);
    expect(r.recommendedStrategy).toContain("하락");
    expect(r.keyUnivTypes.some((s) => s.includes("수시"))).toBe(true);
  });

  it("삼수 이상 → 정시 집중·정시 유리", () => {
    const r = calcNsuStrategy({
      nsuYear: 2,
      prevScore: 400,
      suneungScore: 405,
      gpa: 3.2,
      targetType: "jeongsi",
    });
    expect(r.jeongsiAdvantage).toBe(true);
    expect(r.recommendedStrategy).toContain("삼수");
    expect(r.recommendedStrategy).toContain("정시");
    expect(r.warnings.some((w) => w.includes("3.2"))).toBe(true);
  });

  it("내신 없음 → 정시 권고 경고·정시 유리(기본)", () => {
    const r = calcNsuStrategy({
      nsuYear: 1,
      targetType: "both",
    });
    expect(r.jeongsiAdvantage).toBe(true);
    expect(r.warnings.some((w) => w.includes("내신"))).toBe(true);
    expect(r.recommendedStrategy).toContain("내신");
  });

  it("targetType susi일 때 목표 문구 포함", () => {
    const r = calcNsuStrategy({
      nsuYear: 1,
      suneungScore: 410,
      prevScore: 400,
      gpa: 2,
      targetType: "susi",
    });
    expect(r.recommendedStrategy).toContain("수시");
  });

  it("비정상 nsuYear는 1년으로 간주", () => {
    const r = calcNsuStrategy({
      nsuYear: Number.NaN,
      targetType: "both",
    });
    expect(r.recommendedStrategy).not.toContain("삼수");
    expect(r.jeongsiAdvantage).toBe(true);
  });

  it("삼수 이상 + 점수 하락 시 정시 집중과 하락 경고 병행", () => {
    const r = calcNsuStrategy({
      nsuYear: 3,
      prevScore: 420,
      suneungScore: 400,
      gpa: 2,
      targetType: "both",
    });
    expect(r.jeongsiAdvantage).toBe(true);
    expect(r.recommendedStrategy).toContain("하락");
    expect(r.scoreImprovement).toBe(-20);
  });
});
