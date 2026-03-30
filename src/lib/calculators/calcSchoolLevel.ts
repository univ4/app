import { calculateZScore } from "./calculateZScore";

/** PRD P1-2: 학생부종합 참고 문구(Track 1 산출물 공통) */
export const ZSCORE_REFERENCE_DISCLAIMER = "학생부종합 참고지표로만 활용하세요.";

/**
 * 단일 Z점수에 대한 밴드 라벨 (평균 Z 또는 과목 Z 동일 기준).
 * Z > 1.5 → 상위권, 0 ≤ Z ≤ 1.5 → 중위권, Z < 0 → 하위권
 */
export function zScoreBandLabel(z: number): string {
  if (!Number.isFinite(z)) {
    return "판별 불가";
  }
  if (z > 1.5) {
    return "상위권";
  }
  if (z >= 0) {
    return "중위권";
  }
  return "하위권";
}

export type CalcSchoolLevelSubjectInput = {
  subjectName: string;
  rawScore: number;
  classAvg: number;
  stdDev: number;
  studentCount?: number;
};

export function calcSchoolLevel(params: {
  subjects: CalcSchoolLevelSubjectInput[];
}): {
  avgZScore: number;
  levelLabel: string;
  subjectZScores: { subjectName: string; zScore: number }[];
  disclaimer: string;
} {
  const disclaimer = ZSCORE_REFERENCE_DISCLAIMER;
  const subjectZScores: { subjectName: string; zScore: number }[] = [];

  for (const s of params.subjects) {
    const { stdDev, rawScore, classAvg } = s;
    if (!Number.isFinite(rawScore) || !Number.isFinite(classAvg) || !Number.isFinite(stdDev)) {
      continue;
    }
    if (stdDev <= 0) {
      continue;
    }

    const z = calculateZScore(rawScore, classAvg, stdDev);
    if (z === null) {
      continue;
    }

    subjectZScores.push({ subjectName: s.subjectName, zScore: z });
  }

  if (subjectZScores.length === 0) {
    return {
      avgZScore: 0,
      levelLabel: "판별 불가",
      subjectZScores: [],
      disclaimer,
    };
  }

  const sum = subjectZScores.reduce((acc, row) => acc + row.zScore, 0);
  const avgZScore = Number((sum / subjectZScores.length).toFixed(2));

  return {
    avgZScore,
    levelLabel: zScoreBandLabel(avgZScore),
    subjectZScores,
    disclaimer,
  };
}
