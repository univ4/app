import { calculateAdmissionProbability } from "@/lib/calculators/calculateAdmissionProbability";

describe("calculateAdmissionProbability", () => {
  it("returns 적정 when score is within ±5 range", () => {
    expect(calculateAdmissionProbability(924.5, 918.2, -3.2)).toBe("안정");
  });

  it("returns 도전 when score is below adjusted cutline-5", () => {
    expect(calculateAdmissionProbability(900, 918.2, -3.2)).toBe("도전");
  });

  it("uses original cutline when discount is zero", () => {
    expect(calculateAdmissionProbability(930, 918.2, 0)).toBe("안정");
  });

  it("returns 적정 when score equals cutline boundary", () => {
    expect(calculateAdmissionProbability(915, 920, 0)).toBe("적정");
  });

  it("throws ValidationError for invalid number input", () => {
    expect(() =>
      calculateAdmissionProbability(Number.NaN, 920, 0),
    ).toThrow("ValidationError");
  });
});
