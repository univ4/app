import { calcRealCompetitionRate } from "@/lib/calculators/calcRealCompetitionRate";

describe("calcRealCompetitionRate", () => {
  it("정상: 충족률 0.5, 결시율 0.1 — 실질 = 명목 × 0.5 × 0.9", () => {
    const r = calcRealCompetitionRate({
      nominalRate: 10,
      suneungMinimumRate: 0.5,
      absenceRate: 0.1,
    });
    expect(r.nominalRate).toBe(10);
    expect(r.realRate).toBe(4.5);
    expect(r.diffRate).toBe(5.5);
  });

  it("충족률 1.0 (수능최저 없음 가정)", () => {
    const r = calcRealCompetitionRate({
      nominalRate: 8,
      suneungMinimumRate: 1,
      absenceRate: 0.1,
    });
    expect(r.realRate).toBeCloseTo(7.2, 10);
    expect(r.diffRate).toBeCloseTo(0.8, 10);
  });

  it("결시율 0 엣지", () => {
    const r = calcRealCompetitionRate({
      nominalRate: 12,
      suneungMinimumRate: 0.25,
      absenceRate: 0,
    });
    expect(r.realRate).toBe(3);
    expect(r.diffRate).toBe(9);
  });

  it("명목 경쟁률 0 엣지", () => {
    const r = calcRealCompetitionRate({
      nominalRate: 0,
      suneungMinimumRate: 0.5,
      absenceRate: 0.1,
    });
    expect(r.realRate).toBe(0);
    expect(r.diffRate).toBe(0);
  });

  it("결시율 생략 시 기본 0.1", () => {
    const r = calcRealCompetitionRate({
      nominalRate: 20,
      suneungMinimumRate: 1,
    });
    expect(r.realRate).toBe(18);
    expect(r.diffRate).toBe(2);
  });

  it("음수·범위 초과 입력 검증", () => {
    expect(() =>
      calcRealCompetitionRate({
        nominalRate: -1,
        suneungMinimumRate: 0.5,
        absenceRate: 0.1,
      }),
    ).toThrow(/nominalRate must be >= 0/);

    expect(() =>
      calcRealCompetitionRate({
        nominalRate: 5,
        suneungMinimumRate: 1.01,
        absenceRate: 0.1,
      }),
    ).toThrow(/suneungMinimumRate must be in \[0, 1\]/);

    expect(() =>
      calcRealCompetitionRate({
        nominalRate: 5,
        suneungMinimumRate: -0.01,
        absenceRate: 0.1,
      }),
    ).toThrow(/suneungMinimumRate must be in \[0, 1\]/);

    expect(() =>
      calcRealCompetitionRate({
        nominalRate: 5,
        suneungMinimumRate: 0.5,
        absenceRate: 1.01,
      }),
    ).toThrow(/absenceRate must be in \[0, 1\]/);

    expect(() =>
      calcRealCompetitionRate({
        nominalRate: Number.NaN,
        suneungMinimumRate: 0.5,
        absenceRate: 0.1,
      }),
    ).toThrow(/nominalRate must be a finite number/);
  });
});
