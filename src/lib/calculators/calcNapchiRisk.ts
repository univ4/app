import type { AdmissionSignalTier } from "@/lib/calculators/calcAdmissionSignal";

export type CalcNapchiRiskParams = {
  card: { university: string; signal: AdmissionSignalTier };
  suneungSignals: { university: string; signal: string }[];
};

export type NapchiRiskLevel = "low" | "medium" | "high";

export type CalcNapchiRiskResult = {
  riskLevel: NapchiRiskLevel;
  message: string;
};

function isStrongJeonsiSignal(signal: string): boolean {
  return signal === "safe" || signal === "moderate";
}

/**
 * 매뉴얼 §9.2 · PRD P1-7 — 수시 납치(정시 포기) 기회비용 요약(Track 1 휴리스틱).
 * 정시 목록에 안정·적정 신호가 다른 대학으로 존재하면, 수시 안정 합격 시 기회비용이 커질 수 있음을 high로 표시.
 */
export function calcNapchiRisk(params: CalcNapchiRiskParams): CalcNapchiRiskResult {
  const { card, suneungSignals } = params;
  const u = card.university.trim();

  if (card.signal === "challenge") {
    return {
      riskLevel: "low",
      message: "도전 전형은 납치로 인한 정시 포기 부담이 상대적으로 낮습니다.",
    };
  }

  if (card.signal === "moderate") {
    return {
      riskLevel: "medium",
      message: "적정 전형입니다. 정시 전형과 비교해 등록 여부를 검토하세요.",
    };
  }

  if (!suneungSignals.length) {
    return {
      riskLevel: "low",
      message: "정시 비교 데이터가 없습니다. 신호등 스캔 후 다시 확인하세요.",
    };
  }

  const hasOtherJeonsiOption = suneungSignals.some(
    (s) => s.university.trim() !== u && isStrongJeonsiSignal(s.signal),
  );

  if (hasOtherJeonsiOption) {
    return {
      riskLevel: "high",
      message:
        "정시에서 유사 이상의 신호가 다른 대학에 있습니다. 안정권 수시 합격 시 하향 등록·기회비용이 클 수 있습니다.",
    };
  }

  return {
    riskLevel: "medium",
    message: "안정권 수시 지원입니다. 정시 목표와 비교해 등록·반수 여부를 검토하세요.",
  };
}
