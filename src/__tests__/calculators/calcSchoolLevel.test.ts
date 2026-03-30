import { calcSchoolLevel, zScoreBandLabel, ZSCORE_REFERENCE_DISCLAIMER } from "@/lib/calculators/calcSchoolLevel";

describe("calcSchoolLevel", () => {
  it("정상 계산: Z점수 양수(단일 과목)", () => {
    const out = calcSchoolLevel({
      subjects: [{ subjectName: "수학", rawScore: 90, classAvg: 70, stdDev: 10 }],
    });
    expect(out.subjectZScores).toEqual([{ subjectName: "수학", zScore: 2 }]);
    expect(out.avgZScore).toBe(2);
    expect(out.levelLabel).toBe("상위권");
    expect(out.disclaimer).toBe(ZSCORE_REFERENCE_DISCLAIMER);
  });

  it("정상 계산: Z점수 음수", () => {
    const out = calcSchoolLevel({
      subjects: [{ subjectName: "국어", rawScore: 40, classAvg: 60, stdDev: 10 }],
    });
    expect(out.subjectZScores).toEqual([{ subjectName: "국어", zScore: -2 }]);
    expect(out.avgZScore).toBe(-2);
    expect(out.levelLabel).toBe("하위권");
  });

  it("stdDev=0 인 과목은 skip하고 나머지로 평균 Z 산출", () => {
    const out = calcSchoolLevel({
      subjects: [
        { subjectName: "skip", rawScore: 100, classAvg: 50, stdDev: 0 },
        { subjectName: "ok", rawScore: 80, classAvg: 70, stdDev: 10 },
      ],
    });
    expect(out.subjectZScores).toEqual([{ subjectName: "ok", zScore: 1 }]);
    expect(out.avgZScore).toBe(1);
    expect(out.levelLabel).toBe("중위권");
  });

  it("빈 배열 입력 시 판별 불가", () => {
    const out = calcSchoolLevel({ subjects: [] });
    expect(out.avgZScore).toBe(0);
    expect(out.levelLabel).toBe("판별 불가");
    expect(out.subjectZScores).toEqual([]);
    expect(out.disclaimer).toBe(ZSCORE_REFERENCE_DISCLAIMER);
  });

  it("비유한·누락 수치 과목은 제외", () => {
    const out = calcSchoolLevel({
      subjects: [
        { subjectName: "bad", rawScore: NaN, classAvg: 60, stdDev: 10 },
        { subjectName: "ok", rawScore: 70, classAvg: 70, stdDev: 10 },
      ],
    });
    expect(out.subjectZScores).toEqual([{ subjectName: "ok", zScore: 0 }]);
    expect(out.avgZScore).toBe(0);
    expect(out.levelLabel).toBe("중위권");
  });
});

describe("zScoreBandLabel", () => {
  it("경계: 1.5는 중위권, 1.51은 상위권, 음수는 하위권", () => {
    expect(zScoreBandLabel(1.5)).toBe("중위권");
    expect(zScoreBandLabel(1.51)).toBe("상위권");
    expect(zScoreBandLabel(-0.01)).toBe("하위권");
  });

  it("비유한 Z는 판별 불가", () => {
    expect(zScoreBandLabel(Number.NaN)).toBe("판별 불가");
  });
});
