import {
  calcAdmissionSignal,
  type CalcAdmissionSignalParams,
} from "@/lib/calculators/calcAdmissionSignal";

describe("calcAdmissionSignal", () => {
  it("수능: 컷+5 초과면 safe·0.85", () => {
    const r = calcAdmissionSignal({
      myScore: 501,
      cutoff: 495,
      scoreType: "suneung",
    });
    expect(r.signal).toBe("safe");
    expect(r.probability).toBe(0.85);
    expect(r.gap).toBe(6);
  });

  it("수능: 컷±5 밴드면 moderate·0.70", () => {
    const r = calcAdmissionSignal({
      myScore: 498,
      cutoff: 495,
      scoreType: "suneung",
    });
    expect(r.signal).toBe("moderate");
    expect(r.probability).toBe(0.7);
    expect(r.gap).toBe(3);
  });

  it("수능: 컷-5 미만이면 challenge·0.40", () => {
    const r = calcAdmissionSignal({
      myScore: 489,
      cutoff: 495,
      scoreType: "suneung",
    });
    expect(r.signal).toBe("challenge");
    expect(r.probability).toBe(0.4);
    expect(r.gap).toBe(-6);
  });

  it("교과: 컷-0.3 미만 등급이면 safe (낮을수록 유리)", () => {
    const r = calcAdmissionSignal({
      myScore: 1.5,
      cutoff: 1.9,
      scoreType: "gpa",
    });
    expect(r.signal).toBe("safe");
    expect(r.probability).toBe(0.85);
    expect(r.gap).toBeCloseTo(-0.4, 5);
  });

  it("교과: 컷±0.3 밴드면 moderate", () => {
    const r = calcAdmissionSignal({
      myScore: 2.0,
      cutoff: 2.05,
      scoreType: "gpa",
    });
    expect(r.signal).toBe("moderate");
    expect(r.probability).toBe(0.7);
  });

  it("교과: 컷+0.3 초과 등급이면 challenge", () => {
    const r = calcAdmissionSignal({
      myScore: 2.5,
      cutoff: 2.0,
      scoreType: "gpa",
    });
    expect(r.signal).toBe("challenge");
    expect(r.probability).toBe(0.4);
    expect(r.gap).toBe(0.5);
  });

  it("medShiftCoeff가 컷에 가산되어 수능 판정에 반영됨", () => {
    const base = calcAdmissionSignal({
      myScore: 500,
      cutoff: 500,
      scoreType: "suneung",
    });
    expect(base.signal).toBe("moderate");

    const shifted = calcAdmissionSignal({
      myScore: 500,
      cutoff: 500,
      scoreType: "suneung",
      medShiftCoeff: -6,
    });
    expect(shifted.signal).toBe("safe");
  });

  it("비유한 수치는 ValidationError", () => {
    const bad = { myScore: NaN, cutoff: 1, scoreType: "gpa" as const };
    expect(() => calcAdmissionSignal(bad as CalcAdmissionSignalParams)).toThrow(
      "ValidationError",
    );
  });
});
