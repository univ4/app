import { calcAdmissionTrend } from "@/lib/calculators/calcAdmissionTrend";

describe("calcAdmissionTrend", () => {
  it("상승 추이(up): 변화율이 2% 초과", () => {
    const r = calcAdmissionTrend({
      records: [
        { year: 2024, cutoffScore: 100, competitionRatio: 5 },
        { year: 2025, cutoffScore: 105.1, competitionRatio: 5.2 },
      ],
    });
    expect(r.trend).toBe("up");
    expect(r.changeRate).toBeCloseTo(5.1, 5);
    expect(r.latestCutoff).toBe(105.1);
    expect(r.previousCutoff).toBe(100);
    expect(r.analysis).toContain("상승");
    expect(r.analysis).toContain("의대 증원");
  });

  it("하락 추이(down): 변화율이 -2% 미만", () => {
    const r = calcAdmissionTrend({
      records: [
        { year: 2024, cutoffScore: 100, competitionRatio: 3 },
        { year: 2025, cutoffScore: 97, competitionRatio: 3.1 },
      ],
    });
    expect(r.trend).toBe("down");
    expect(r.changeRate).toBeCloseTo(-3, 5);
    expect(r.analysis).toContain("하락");
    expect(r.analysis).toContain("외부 요인");
  });

  it("유지(stable): 변화율이 -2%~2% 구간", () => {
    const r = calcAdmissionTrend({
      records: [
        { year: 2023, cutoffScore: 100, competitionRatio: 1 },
        { year: 2025, cutoffScore: 101.5, competitionRatio: 1.1 },
      ],
    });
    expect(r.trend).toBe("stable");
    expect(r.changeRate).toBeCloseTo(1.5, 5);
    expect(r.analysis).toContain("유지");
  });

  it("정확히 ±2% 경계는 stable", () => {
    const upEdge = calcAdmissionTrend({
      records: [
        { year: 2024, cutoffScore: 100, competitionRatio: 1 },
        { year: 2025, cutoffScore: 102, competitionRatio: 1 },
      ],
    });
    expect(upEdge.trend).toBe("stable");

    const downEdge = calcAdmissionTrend({
      records: [
        { year: 2024, cutoffScore: 100, competitionRatio: 1 },
        { year: 2025, cutoffScore: 98, competitionRatio: 1 },
      ],
    });
    expect(downEdge.trend).toBe("stable");
  });

  it("데이터 1개 이하이면 비교 불가·stable", () => {
    const empty = calcAdmissionTrend({ records: [] });
    expect(empty.trend).toBe("stable");
    expect(empty.changeRate).toBe(0);
    expect(empty.latestCutoff).toBe(0);
    expect(empty.previousCutoff).toBe(0);
    expect(empty.analysis).toContain("최소 2개");

    const one = calcAdmissionTrend({
      records: [{ year: 2025, cutoffScore: 400, competitionRatio: 2 }],
    });
    expect(one.trend).toBe("stable");
    expect(one.changeRate).toBe(0);
    expect(one.latestCutoff).toBe(400);
    expect(one.previousCutoff).toBe(400);
    expect(one.analysis).toContain("최소 2개");
  });

  it("직전 컷이 0이면 비교 불가 처리", () => {
    const r = calcAdmissionTrend({
      records: [
        { year: 2024, cutoffScore: 0, competitionRatio: 0 },
        { year: 2025, cutoffScore: 100, competitionRatio: 1 },
      ],
    });
    expect(r.trend).toBe("stable");
    expect(r.changeRate).toBe(0);
    expect(r.analysis).toContain("최소 2개");
  });

  it("의학 계열 deptName이면 추가 안내", () => {
    const r = calcAdmissionTrend({
      records: [
        { year: 2024, cutoffScore: 500, competitionRatio: 1 },
        { year: 2025, cutoffScore: 510, competitionRatio: 1 },
      ],
      deptName: "의예과",
    });
    expect(r.analysis).toContain("의료 계열");
  });

  it("동일 연도 중복 시 마지막 값 사용", () => {
    const r = calcAdmissionTrend({
      records: [
        { year: 2025, cutoffScore: 100, competitionRatio: 1 },
        { year: 2025, cutoffScore: 110, competitionRatio: 1 },
        { year: 2024, cutoffScore: 100, competitionRatio: 1 },
      ],
    });
    expect(r.previousCutoff).toBe(100);
    expect(r.latestCutoff).toBe(110);
    expect(r.trend).toBe("up");
  });
});
