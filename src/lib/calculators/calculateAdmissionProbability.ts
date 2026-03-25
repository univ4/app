export type AdmissionProbability = "안정" | "적정" | "도전";

/**
 * 70% 컷 기준 합격 가능성을 판정합니다.
 * @param score 환산점수
 * @param cutline 70% 컷
 * @param discountFactor 의대 증원 보정값(커트라인에 더해지는 값)
 * @returns `"안정" | "적정" | "도전"`
 */
export function calculateAdmissionProbability(
  score: number,
  cutline: number,
  discountFactor: number,
): "안정" | "적정" | "도전" {
  if (
    !Number.isFinite(score) ||
    !Number.isFinite(cutline) ||
    !Number.isFinite(discountFactor)
  ) {
    throw new Error("ValidationError: score/cutline/discountFactor must be numbers.");
  }

  const adjustedCutline = Number((cutline + discountFactor).toFixed(2));

  if (score > adjustedCutline + 5) {
    return "안정";
  }

  if (score < adjustedCutline - 5) {
    return "도전";
  }

  return "적정";
}
