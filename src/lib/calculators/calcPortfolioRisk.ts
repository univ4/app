import type { AdmissionSignalTier } from "@/lib/calculators/calcAdmissionSignal";

export type PortfolioRiskCard = {
  university: string;
  department: string;
  admissionType: string;
  signal: AdmissionSignalTier;
  hasSuneungMinimum: boolean;
};

export type PortfolioRiskLevel = "balanced" | "aggressive" | "too_safe";

export type CalcPortfolioRiskResult = {
  safeCount: number;
  moderateCount: number;
  challengeCount: number;
  suneungMinimumCount: number;
  riskLevel: PortfolioRiskLevel;
  warnings: string[];
};

/**
 * 매뉴얼 §9.1 · PRD P1-7 — 수시 6장 포트폴리오 구성 리스크(Track 1, 순수 집계·규칙).
 */
export function calcPortfolioRisk(params: { cards: PortfolioRiskCard[] }): CalcPortfolioRiskResult {
  const cards = params.cards ?? [];
  const n = cards.length;

  let safeCount = 0;
  let moderateCount = 0;
  let challengeCount = 0;
  let suneungMinimumCount = 0;
  const univCounts = new Map<string, number>();

  for (const c of cards) {
    if (c.signal === "safe") safeCount += 1;
    else if (c.signal === "moderate") moderateCount += 1;
    else challengeCount += 1;
    if (c.hasSuneungMinimum) suneungMinimumCount += 1;
    const u = c.university.trim();
    if (u) univCounts.set(u, (univCounts.get(u) ?? 0) + 1);
  }

  const warnings: string[] = [];
  if (n > 6) warnings.push("6장을 초과했습니다");
  if (n > 0 && safeCount === 0) warnings.push("안정 지원이 없습니다. 전원 불합격 위험이 있습니다");
  if (challengeCount >= 4) warnings.push("도전 지원이 너무 많습니다");
  if (suneungMinimumCount >= 3) warnings.push("수능최저 리스크를 확인하세요");
  if ([...univCounts.values()].some((cnt) => cnt >= 2)) {
    warnings.push("동일 대학 중복 지원을 확인하세요");
  }

  let riskLevel: PortfolioRiskLevel = "balanced";
  if (n > 0) {
    if (safeCount === 0) {
      riskLevel = "aggressive";
    } else if (challengeCount >= 3) {
      riskLevel = "aggressive";
    } else if (safeCount >= 4 && challengeCount === 0) {
      riskLevel = "too_safe";
    }
  }

  return {
    safeCount,
    moderateCount,
    challengeCount,
    suneungMinimumCount,
    riskLevel,
    warnings,
  };
}
