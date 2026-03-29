import { calcNapchiRisk } from "@/lib/calculators/calcNapchiRisk";

describe("calcNapchiRisk", () => {
  it("challenge → low", () => {
    const r = calcNapchiRisk({
      card: { university: "세종대", signal: "challenge" },
      suneungSignals: [{ university: "연세대", signal: "safe" }],
    });
    expect(r.riskLevel).toBe("low");
  });

  it("moderate → medium", () => {
    const r = calcNapchiRisk({
      card: { university: "한양대", signal: "moderate" },
      suneungSignals: [{ university: "연세대", signal: "safe" }],
    });
    expect(r.riskLevel).toBe("medium");
  });

  it("safe + 정시에 다른 대학 안정/적정 신호 → high", () => {
    const r = calcNapchiRisk({
      card: { university: "세종대", signal: "safe" },
      suneungSignals: [
        { university: "세종대", signal: "safe" },
        { university: "서울대", signal: "safe" },
      ],
    });
    expect(r.riskLevel).toBe("high");
  });

  it("safe + 정시 목록 비어 있음 → low", () => {
    const r = calcNapchiRisk({
      card: { university: "세종대", signal: "safe" },
      suneungSignals: [],
    });
    expect(r.riskLevel).toBe("low");
  });
});
