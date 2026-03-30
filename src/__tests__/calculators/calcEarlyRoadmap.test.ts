import { calcEarlyRoadmap } from "@/lib/calculators/calcEarlyRoadmap";

describe("calcEarlyRoadmap", () => {
  it("고1 1학기 + top → 내신 목표가 강화된 문구(1.7등급 이내)", () => {
    const r = calcEarlyRoadmap({
      currentGrade: 1,
      currentSemester: 1,
      targetUnivType: "top",
      targetDept: "liberal",
    });
    const g1s1 = r.phases.find((p) => p.phase === "고1 1학기");
    expect(g1s1?.gpaTarget).toContain("1.7");
    expect(r.summary).toContain("상향");
  });

  it("고1 2학기 + mid → 기본 로드맵(전 과목 2등급·1~2등급 유지)", () => {
    const r = calcEarlyRoadmap({
      currentGrade: 1,
      currentSemester: 2,
      targetUnivType: "mid",
      targetDept: "liberal",
    });
    expect(r.phases.find((p) => p.phase === "고1 1학기")?.gpaTarget).toBe("전 과목 2등급 이내");
    expect(r.phases.find((p) => p.phase === "고1 2학기")?.gpaTarget).toBe("주요 과목 1~2등급 유지");
    expect(r.summary).toContain("기본값");
  });

  it("고2 1학기 + local → 완화된 내신 목표 문구", () => {
    const r = calcEarlyRoadmap({
      currentGrade: 2,
      currentSemester: 1,
      targetUnivType: "local",
      targetDept: "art",
    });
    const g2s1 = r.phases.find((p) => p.phase === "고2 1학기");
    expect(g2s1?.gpaTarget).toContain("지역");
    expect(r.summary).toContain("하향");
  });

  it("고2 2학기 + science → 이공 계열 활동이 단계에 포함", () => {
    const r = calcEarlyRoadmap({
      currentGrade: 2,
      currentSemester: 2,
      targetUnivType: "mid",
      targetDept: "science",
    });
    const g2s2 = r.phases.find((p) => p.phase === "고2 2학기");
    const joined = (g2s2?.activities ?? []).join(" ");
    expect(joined).toMatch(/과탐|수능/);
    expect(joined.length).toBeGreaterThan(10);
  });
});
