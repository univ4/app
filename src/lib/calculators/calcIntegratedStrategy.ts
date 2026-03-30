import { calcNapchiRisk } from "@/lib/calculators/calcNapchiRisk";
import { calcPortfolioRisk, type PortfolioRiskCard } from "@/lib/calculators/calcPortfolioRisk";

export type IntegratedSignal = "safe" | "moderate" | "challenge";

export type CalcIntegratedStrategyParams = {
  susiCards: {
    university: string;
    admissionType: string;
    signal: IntegratedSignal;
  }[];
  /** 정시 예상 환산점수(참고). 요약 문구에만 반영. */
  suneungScore?: number;
  /** 정시 전형 신호등(대학 단위 요약). */
  jeongsiSignals?: { university: string; signal: IntegratedSignal }[];
};

export type NapchiRiskRow = {
  university: string;
  admissionType: string;
  riskLevel: "low" | "medium" | "high";
  message: string;
  opportunityCost: string;
};

export type CalcIntegratedStrategyResult = {
  napchiRisks: NapchiRiskRow[];
  allFailScenario: {
    jeongsiSafeUnivs: string[];
    message: string;
  };
  overallRisk: "balanced" | "aggressive" | "too_safe";
  summary: string;
};

function isStrongJeongsiSignal(signal: string): boolean {
  return signal === "safe" || signal === "moderate";
}

function normalizeJeongsi(jeongsiSignals: CalcIntegratedStrategyParams["jeongsiSignals"]) {
  const list = jeongsiSignals ?? [];
  return list.map((r) => ({
    university: r.university.trim(),
    signal: r.signal,
  }));
}

function buildOpportunityCost(params: {
  cardUniversity: string;
  riskLevel: "low" | "medium" | "high";
  jeongsiSignals: { university: string; signal: string }[];
}): string {
  const { cardUniversity, riskLevel, jeongsiSignals } = params;
  const u = cardUniversity.trim();
  const others = jeongsiSignals.filter(
    (s) => s.university.trim() !== u && isStrongJeongsiSignal(s.signal),
  );
  const names = [...new Set(others.map((r) => r.university.trim()))].filter(Boolean);

  if (riskLevel === "low") {
    return "도전·적정 위주이거나 정시 상향 대비가 제한적이어, 납치로 포기하는 정시 이익이 상대적으로 작습니다.";
  }
  if (riskLevel === "medium") {
    return "적정·안정 전형은 정시 목표와 비교해 등록·반수 여부를 검토하세요.";
  }
  if (names.length > 0) {
    const sample = names.slice(0, 3).join(", ");
    const more = names.length > 3 ? ` 외 ${names.length - 3}개교` : "";
    return `정시에서 ${sample}${more} 등 안정·적정 신호를, 수시 합격 후 등록 시 함께 포기할 수 있습니다.`;
  }
  return "안정권 수시인데 정시에서 비교할 타 대학 신호가 없거나 동일 대학 위주입니다. 정시 목표를 다시 확인하세요.";
}

function buildAllFailMessage(safeUnivs: string[]): string {
  if (safeUnivs.length === 0) {
    return "수시 전원 불합격 시 정시 안전망: 현재 스캔에서 정시 ‘안정’ 신호가 있는 대학이 없습니다. 모의고사·내신 입력 후 신호등을 갱신하세요.";
  }
  const sample = safeUnivs.slice(0, 8).join(", ");
  const more = safeUnivs.length > 8 ? ` 외 ${safeUnivs.length - 8}개교` : "";
  return `수시 전원 불합격 시 정시에서 안정권으로 지원 가능한 대학(정시 신호등 기준): ${sample}${more}.`;
}

function buildSummary(params: {
  overallRisk: CalcIntegratedStrategyResult["overallRisk"];
  susiCount: number;
  suneungScore?: number;
  highNapchi: number;
}): string {
  const { overallRisk, susiCount, suneungScore, highNapchi } = params;
  const riskKo =
    overallRisk === "balanced"
      ? "수시 포트폴리오는 균형에 가깝습니다."
      : overallRisk === "aggressive"
        ? "수시 포트폴리오가 공격적입니다. 불합 시 정시 안전망을 함께 점검하세요."
        : "수시 포트폴리오가 과도하게 안정 쪽입니다. 상향 기회를 검토해 보세요.";
  const scorePart =
    suneungScore != null && Number.isFinite(suneungScore)
      ? ` 정시 예상 환산 ${suneungScore}점 기준으로 신호등과 함께 봅니다.`
      : "";
  const napchiPart =
    highNapchi > 0
      ? ` 납치 리스크 ‘높음’ 카드 ${highNapchi}장: 등록 시 정시 기회비용이 클 수 있습니다.`
      : "";
  return `${riskKo}${scorePart} 수시 카드 ${susiCount}장.${napchiPart}`;
}

/**
 * PRD P2-6 · 매뉴얼 §9 — 수시·정시 통합 전략(Track 1).
 * `calcNapchiRisk`·`calcPortfolioRisk`를 조합한다.
 */
export function calcIntegratedStrategy(
  params: CalcIntegratedStrategyParams,
): CalcIntegratedStrategyResult {
  const susiCards = params.susiCards ?? [];
  const jeongsiSignals = normalizeJeongsi(params.jeongsiSignals);
  const suneungSignalsForNapchi = jeongsiSignals.map((r) => ({
    university: r.university,
    signal: r.signal,
  }));

  const portfolioInput: PortfolioRiskCard[] = susiCards.map((c) => ({
    university: c.university,
    department: "—",
    admissionType: c.admissionType,
    signal: c.signal,
    hasSuneungMinimum: false,
  }));
  const portfolio = calcPortfolioRisk({ cards: portfolioInput });

  const napchiRisks: NapchiRiskRow[] = susiCards.map((c) => {
    const nap = calcNapchiRisk({
      card: { university: c.university, signal: c.signal },
      suneungSignals: suneungSignalsForNapchi,
    });
    return {
      university: c.university.trim(),
      admissionType: c.admissionType,
      riskLevel: nap.riskLevel,
      message: nap.message,
      opportunityCost: buildOpportunityCost({
        cardUniversity: c.university,
        riskLevel: nap.riskLevel,
        jeongsiSignals: suneungSignalsForNapchi,
      }),
    };
  });

  const jeongsiSafeUnivs = [
    ...new Set(
      jeongsiSignals.filter((r) => r.signal === "safe").map((r) => r.university.trim()),
    ),
  ].filter(Boolean);

  const highNapchi = napchiRisks.filter((r) => r.riskLevel === "high").length;

  const summary = buildSummary({
    overallRisk: portfolio.riskLevel,
    susiCount: susiCards.length,
    suneungScore: params.suneungScore,
    highNapchi,
  });

  return {
    napchiRisks,
    allFailScenario: {
      jeongsiSafeUnivs,
      message: buildAllFailMessage(jeongsiSafeUnivs),
    },
    overallRisk: portfolio.riskLevel,
    summary,
  };
}
