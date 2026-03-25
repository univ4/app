/**
 * Z점수를 계산합니다.
 * @param rawScore 원점수
 * @param mean 평균
 * @param stddev 표준편차
 * @returns stddev가 0이면 `null`, 그 외에는 소수 2자리 반올림된 Z점수
 */
export function calculateZScore(
  rawScore: number,
  mean: number,
  stddev: number,
): number | null {
  if (stddev === 0) {
    return null;
  }

  if (!Number.isFinite(rawScore) || !Number.isFinite(mean) || !Number.isFinite(stddev)) {
    throw new Error("ValidationError: rawScore/mean/stddev must be finite numbers.");
  }

  if (stddev < 0) {
    throw new Error("ValidationError: stddev must be >= 0.");
  }

  const z = (rawScore - mean) / stddev;
  return Number(z.toFixed(2));
}
