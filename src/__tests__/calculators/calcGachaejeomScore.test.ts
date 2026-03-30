import {
  calcGachaejeomScore,
  GACHAEJEOM_WARNING,
  standardNormalCdf,
} from "@/lib/calculators/calcGachaejeomScore";

const baseParams = {
  korean: { rawScore: 63, subject: "언어와매체" },
  math: { rawScore: 68, subject: "미적분" },
  english: { grade: 2 },
  science1: { rawScore: 50, subjectName: "생명과학Ⅰ" },
  science2: { rawScore: 50, subjectName: "지구과학Ⅰ" },
};

describe("calcGachaejeomScore", () => {
  it("정상 입력: 분포 중심 원점수면 표준점수 약 100·백분위 약 50", () => {
    const r = calcGachaejeomScore(baseParams);
    expect(r.estimatedScores.korean.standardScore).toBe(100);
    expect(r.estimatedScores.math.standardScore).toBe(100);
    expect(r.estimatedScores.science1.standardScore).toBe(100);
    expect(r.estimatedScores.science2.standardScore).toBe(100);
    expect(r.estimatedScores.korean.percentile).toBeCloseTo(50, 0);
    expect(r.estimatedScores.math.percentile).toBeCloseTo(50, 0);
  });

  it("만점 입력: 국·수는 상한(180) 클램프, 탐구는 분포상 만점이 180 미만", () => {
    const r = calcGachaejeomScore({
      ...baseParams,
      korean: { rawScore: 150, subject: "언어와매체" },
      math: { rawScore: 150, subject: "미적분" },
      science1: { rawScore: 75, subjectName: "물리학Ⅰ" },
      science2: { rawScore: 75, subjectName: "화학Ⅰ" },
    });
    expect(r.estimatedScores.korean.standardScore).toBe(180);
    expect(r.estimatedScores.math.standardScore).toBe(180);
    expect(r.estimatedScores.science1.standardScore).toBe(150);
    expect(r.estimatedScores.science2.standardScore).toBe(150);
    expect(r.estimatedScores.korean.percentile).toBeLessThanOrEqual(99.99);
  });

  it("최저점 입력: 탐구는 하한(20) 클램프, 국·수는 분포상 0점이어도 20 초과일 수 있음", () => {
    const r = calcGachaejeomScore({
      ...baseParams,
      korean: { rawScore: 0, subject: "화법과작문" },
      math: { rawScore: 0, subject: "확률과통계" },
      science1: { rawScore: 0, subjectName: "생명과학Ⅰ" },
      science2: { rawScore: 0, subjectName: "화학Ⅰ" },
    });
    expect(r.estimatedScores.korean.standardScore).toBe(21.25);
    expect(r.estimatedScores.math.standardScore).toBe(32);
    expect(r.estimatedScores.science1.standardScore).toBe(20);
    expect(r.estimatedScores.science2.standardScore).toBe(20);
  });

  it("경고 문구 고정", () => {
    const r = calcGachaejeomScore(baseParams);
    expect(r.warning).toBe(GACHAEJEOM_WARNING);
  });

  it("빈 과목명이면 ValidationError", () => {
    expect(() =>
      calcGachaejeomScore({
        ...baseParams,
        science1: { rawScore: 50, subjectName: "   " },
      }),
    ).toThrow(/ValidationError/u);
  });

  it("영어 등급 범위 밖이면 ValidationError", () => {
    expect(() =>
      calcGachaejeomScore({
        ...baseParams,
        english: { grade: 10 },
      }),
    ).toThrow(/ValidationError/u);
  });

  it("원점수가 유한하지 않으면 ValidationError", () => {
    expect(() =>
      calcGachaejeomScore({
        ...baseParams,
        korean: { rawScore: Number.NaN, subject: "언어와매체" },
      }),
    ).toThrow(/ValidationError/u);
  });
});

describe("standardNormalCdf", () => {
  it("z=0에서 약 0.5", () => {
    expect(standardNormalCdf(0)).toBeCloseTo(0.5, 5);
  });

  it("음의 z에서 0.5 미만", () => {
    expect(standardNormalCdf(-2)).toBeLessThan(0.5);
    expect(standardNormalCdf(-2)).toBeGreaterThan(0);
  });

  it("비유한 z는 0.5", () => {
    expect(standardNormalCdf(Number.NaN)).toBe(0.5);
  });
});
