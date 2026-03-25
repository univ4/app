import { calculateZScore } from "../calculateZScore";

describe("calculateZScore", () => {
  it("returns 1.55 for (92, 68.4, 15.2)", () => {
    expect(calculateZScore(92, 68.4, 15.2)).toBe(1.55);
  });

  it("returns 0.00 for equal score and mean", () => {
    expect(calculateZScore(55, 55, 10)).toBe(0);
  });

  it("returns null when stddev is 0", () => {
    expect(calculateZScore(60, 50, 0)).toBeNull();
  });

  it("returns negative score when raw < mean", () => {
    expect(calculateZScore(40, 60, 10)).toBe(-2);
  });

  it("throws ValidationError when input is undefined", () => {
    expect(() =>
      calculateZScore(undefined as unknown as number, 60, 10),
    ).toThrow("ValidationError");
  });
});
