import {
  calcPortfolioRisk,
  type PortfolioRiskCard,
} from "@/lib/calculators/calcPortfolioRisk";

const base = {
  university: "서강대",
  department: "자연계열",
  admissionType: "학생부교과",
  hasSuneungMinimum: false,
};

describe("calcPortfolioRisk", () => {
  it("cards 생략 시 빈 배열로 처리", () => {
    const r = (
      calcPortfolioRisk as (p: { cards?: PortfolioRiskCard[] }) => ReturnType<typeof calcPortfolioRisk>
    )({});
    expect(r.safeCount).toBe(0);
    expect(r.warnings).toHaveLength(0);
  });

  it("균형 포트폴리오(안정·적정·도전 혼합) → balanced, 경고 없음", () => {
    const r = calcPortfolioRisk({
      cards: [
        { ...base, university: "A", signal: "safe" },
        { ...base, university: "B", signal: "safe" },
        { ...base, university: "C", signal: "moderate" },
        { ...base, university: "D", signal: "moderate" },
        { ...base, university: "E", signal: "challenge" },
        { ...base, university: "F", signal: "challenge" },
      ],
    });
    expect(r.riskLevel).toBe("balanced");
    expect(r.safeCount).toBe(2);
    expect(r.moderateCount).toBe(2);
    expect(r.challengeCount).toBe(2);
    expect(r.warnings).toHaveLength(0);
  });

  it("안정 0장 → 경고 + aggressive", () => {
    const r = calcPortfolioRisk({
      cards: [
        { ...base, university: "A", signal: "moderate" },
        { ...base, university: "B", signal: "challenge" },
      ],
    });
    expect(r.warnings).toContain("안정 지원이 없습니다. 전원 불합격 위험이 있습니다");
    expect(r.riskLevel).toBe("aggressive");
  });

  it("도전 4장 이상 → 경고", () => {
    const r = calcPortfolioRisk({
      cards: [
        { ...base, university: "A", signal: "safe" },
        { ...base, university: "B", signal: "challenge" },
        { ...base, university: "C", signal: "challenge" },
        { ...base, university: "D", signal: "challenge" },
        { ...base, university: "E", signal: "challenge" },
      ],
    });
    expect(r.warnings).toContain("도전 지원이 너무 많습니다");
    expect(r.riskLevel).toBe("aggressive");
  });

  it("6장 초과 → 경고", () => {
    const cards = Array.from({ length: 7 }, (_, i) => ({
      ...base,
      university: `U${i}`,
      signal: "safe" as const,
    }));
    const r = calcPortfolioRisk({ cards });
    expect(r.warnings).toContain("6장을 초과했습니다");
  });

  it("수능최저 3장 이상 → 경고", () => {
    const r = calcPortfolioRisk({
      cards: [
        { ...base, university: "A", signal: "safe", hasSuneungMinimum: true },
        { ...base, university: "B", signal: "safe", hasSuneungMinimum: true },
        { ...base, university: "C", signal: "moderate", hasSuneungMinimum: true },
      ],
    });
    expect(r.warnings).toContain("수능최저 리스크를 확인하세요");
    expect(r.suneungMinimumCount).toBe(3);
  });

  it("동일 대학 2장 이상 → 경고", () => {
    const r = calcPortfolioRisk({
      cards: [
        { ...base, university: "한양대", department: "x", signal: "safe" },
        { ...base, university: "한양대", department: "y", signal: "moderate" },
      ],
    });
    expect(r.warnings).toContain("동일 대학 중복 지원을 확인하세요");
  });
});
