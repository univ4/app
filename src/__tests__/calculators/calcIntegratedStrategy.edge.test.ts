/**
 * calcNapchiRisk를 스텁해 high + 빈 정시 목록일 때 기회비용 대체 문구를 검증한다.
 */
jest.mock("@/lib/calculators/calcNapchiRisk", () => ({
  calcNapchiRisk: jest.fn(() => ({
    riskLevel: "high" as const,
    message: "mock",
  })),
}));

import { calcIntegratedStrategy } from "@/lib/calculators/calcIntegratedStrategy";

describe("calcIntegratedStrategy (napchi stub)", () => {
  it("납치 high인데 타 대학 이름이 없을 때 기회비용 대체 문구", () => {
    const r = calcIntegratedStrategy({
      susiCards: [{ university: "서강대", admissionType: "학생부교과", signal: "safe" }],
      jeongsiSignals: [],
    });
    expect(r.napchiRisks[0].opportunityCost).toContain("안정권 수시인데");
  });
});
