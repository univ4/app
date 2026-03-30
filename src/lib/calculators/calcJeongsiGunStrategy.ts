import type { AdmissionSignalTier } from "@/lib/calculators/calcAdmissionSignal";

export type JeongsiGunCard = {
  university: string;
  signal: AdmissionSignalTier;
} | null;

export type CalcJeongsiGunStrategyParams = {
  gaCard: JeongsiGunCard;
  naCard: JeongsiGunCard;
  daCard: JeongsiGunCard;
};

export type JeongsiGunRiskLevel = "safe" | "moderate" | "danger";

export type CalcJeongsiGunStrategyResult = {
  riskLevel: JeongsiGunRiskLevel;
  warnings: string[];
  safeNetExists: boolean;
  recommendation: string;
};

/**
 * PRD P2-10 · 매뉴얼 §10 — 가·나·다군 조합 위험도(Track 1, LLM 없음).
 */
export function calcJeongsiGunStrategy(
  params: CalcJeongsiGunStrategyParams,
): CalcJeongsiGunStrategyResult {
  const { gaCard, naCard, daCard } = params;
  const cards = [gaCard, naCard, daCard];
  const picked = cards.filter((c): c is NonNullable<typeof c> => c != null);

  const safeNetExists = picked.some((c) => c.signal === "safe");
  const warnings: string[] = [];

  const names = picked.map((c) => c.university.trim()).filter((n) => n.length > 0);
  const uniqueNames = new Set(names);
  if (names.length >= 2 && uniqueNames.size < names.length) {
    warnings.push("동일 대학 중복 지원 확인");
  }

  const allThreeChallenge =
    picked.length === 3 && picked.every((c) => c.signal === "challenge");
  if (allThreeChallenge) {
    warnings.push("세 군이 모두 도전권입니다. 합격 불확실성이 큽니다.");
  }

  if (picked.length > 0 && !safeNetExists) {
    warnings.push("안전망 없음 경고 ⚠️");
  }

  let riskLevel: JeongsiGunRiskLevel;
  if (allThreeChallenge) {
    riskLevel = "danger";
  } else if (safeNetExists) {
    riskLevel = "safe";
  } else {
    riskLevel = "moderate";
  }

  const recommendation = buildJeongsiGunRecommendation(riskLevel, safeNetExists, picked.length);

  return { riskLevel, warnings, safeNetExists, recommendation };
}

function buildJeongsiGunRecommendation(
  riskLevel: JeongsiGunRiskLevel,
  safeNetExists: boolean,
  pickedCount: number,
): string {
  if (pickedCount === 0) {
    return "가·나·다군에서 지원할 대학을 각각 선택하면 조합 위험도와 정시자료 기반 패턴 요약을 확인할 수 있습니다.";
  }
  if (riskLevel === "danger") {
    return "세 군이 모두 도전권으로 구성되었습니다. 불합 시 다음 기회가 제한될 수 있으니, 안정·적정 신호가 나는 교를 최소 한 군에 포함하는 방안을 검토하세요.";
  }
  if (safeNetExists) {
    return "안정권 신호가 포함되어 있어 일부 군에서 합격 가능성이 상대적으로 높습니다. 지원 순위·등록 시나리오를 함께 점검하세요.";
  }
  return "선택한 조합에 안정권(컷 대비 여유 구간)이 없습니다. 점수·모집단 변경 시 불합 리스크가 크므로 군별 안배를 재검토하는 것이 좋습니다.";
}
