import { calcIntegratedStrategy } from "@/lib/calculators/calcIntegratedStrategy";

describe("calcIntegratedStrategy", () => {
  it("수시 safe 카드 + 정시에서 타 대학 안정·적정 신호 → 높은 납치 리스크", () => {
    const r = calcIntegratedStrategy({
      susiCards: [
        { university: "서강대", admissionType: "학생부교과", signal: "safe" },
      ],
      jeongsiSignals: [
        { university: "한양대", signal: "safe" },
        { university: "성균관대", signal: "moderate" },
      ],
    });
    expect(r.napchiRisks).toHaveLength(1);
    expect(r.napchiRisks[0].riskLevel).toBe("high");
    expect(r.napchiRisks[0].opportunityCost).toContain("한양대");
  });

  it("수시 challenge 카드 → 납치 리스크 낮음", () => {
    const r = calcIntegratedStrategy({
      susiCards: [
        { university: "서강대", admissionType: "학생부종합", signal: "challenge" },
      ],
      jeongsiSignals: [{ university: "한양대", signal: "safe" }],
    });
    expect(r.napchiRisks[0].riskLevel).toBe("low");
    expect(r.overallRisk).toBe("aggressive");
  });

  it("수시 전원 불합격 시나리오: 정시 안전망(안정 신호 대학) 집계", () => {
    const r = calcIntegratedStrategy({
      susiCards: [{ university: "A대", admissionType: "논술전형", signal: "moderate" }],
      jeongsiSignals: [
        { university: "성균관대", signal: "safe" },
        { university: "한양대", signal: "safe" },
        { university: "중앙대", signal: "challenge" },
      ],
    });
    expect(r.allFailScenario.jeongsiSafeUnivs).toEqual(["성균관대", "한양대"]);
    expect(r.allFailScenario.message).toContain("성균관대");
    expect(r.allFailScenario.message).toContain("한양대");
  });

  it("빈 포트폴리오: 납치 행 없음·요약은 균형", () => {
    const r = calcIntegratedStrategy({
      susiCards: [],
      jeongsiSignals: [],
    });
    expect(r.napchiRisks).toEqual([]);
    expect(r.overallRisk).toBe("balanced");
    expect(r.summary).toContain("수시 카드 0장");
    expect(r.allFailScenario.jeongsiSafeUnivs).toEqual([]);
  });

  it("정시 예상 점수 옵션은 요약에 포함", () => {
    const r = calcIntegratedStrategy({
      susiCards: [{ university: "A", admissionType: "교과", signal: "safe" }],
      jeongsiSignals: [],
      suneungScore: 712.5,
    });
    expect(r.summary).toContain("712.5");
  });

  it("적정 수시는 기회비용 문구가 중간 안내", () => {
    const r = calcIntegratedStrategy({
      susiCards: [{ university: "A", admissionType: "학생부교과", signal: "moderate" }],
      jeongsiSignals: [],
    });
    expect(r.napchiRisks[0].opportunityCost).toContain("등록·반수");
  });

  it("납치 high 시 타 대학 4개 이상이면 기회비용에 '외 N개교'", () => {
    const r = calcIntegratedStrategy({
      susiCards: [{ university: "서강대", admissionType: "학생부교과", signal: "safe" }],
      jeongsiSignals: [
        { university: "한양대", signal: "safe" },
        { university: "성균관대", signal: "moderate" },
        { university: "중앙대", signal: "safe" },
        { university: "경희대", signal: "moderate" },
      ],
    });
    expect(r.napchiRisks[0].opportunityCost).toContain("외 1개교");
  });

  it("정시 안정 대학이 9개 초과일 때 안전망 메시지에 '외 N개교'", () => {
    const jeongsiSignals = Array.from({ length: 10 }, (_, i) => ({
      university: `테스트대${i}`,
      signal: "safe" as const,
    }));
    const r = calcIntegratedStrategy({ susiCards: [], jeongsiSignals });
    expect(r.allFailScenario.message).toContain("외 2개교");
  });

  it("높은 납치 카드가 여러 장이면 요약에 건수 표시", () => {
    const r = calcIntegratedStrategy({
      susiCards: [
        { university: "A", admissionType: "교과", signal: "safe" },
        { university: "B", admissionType: "교과", signal: "safe" },
      ],
      jeongsiSignals: [
        { university: "C", signal: "safe" },
        { university: "D", signal: "moderate" },
      ],
    });
    expect(r.summary).toContain("납치 리스크");
    expect(r.summary).toContain("2장");
  });

});
